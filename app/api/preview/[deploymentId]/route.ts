import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/queries';
import { deployments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deploymentId: string }> }
) {
  try {
    const { deploymentId } = await params;
    
    if (!deploymentId) {
      return new NextResponse('Deployment ID required', { status: 400 });
    }

    // Fetch deployment from database
    const deployment = await db
      .select()
      .from(deployments)
      .where(eq(deployments.deploymentId, deploymentId))
      .limit(1);

    if (!deployment || deployment.length === 0) {
      // Return a nice 404 page
      return new NextResponse(generate404Page(), {
        status: 404,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    }

    const site = deployment[0];

    // Check if deployment is expired
    if (site.expiresAt && new Date(site.expiresAt) < new Date()) {
      return new NextResponse(generateExpiredPage(), {
        status: 410, // Gone
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // Check if deployment is public
    if (!site.isPublic) {
      return new NextResponse(generatePrivatePage(), {
        status: 403,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // Increment view count (non-blocking)
    db.update(deployments)
      .set({ viewCount: site.viewCount + 1 })
      .where(eq(deployments.id, site.id))
      .execute()
      .catch(console.error);

    // Combine HTML with CSS if available
    let finalHtml = site.htmlContent;
    
    if (site.cssContent) {
      // Inject CSS into the HTML head if not already included
      if (!finalHtml.includes('<style>') && !finalHtml.includes('<link')) {
        const styleTag = `<style>${site.cssContent}</style>`;
        if (finalHtml.includes('</head>')) {
          finalHtml = finalHtml.replace('</head>', `${styleTag}\n</head>`);
        } else if (finalHtml.includes('<head>')) {
          finalHtml = finalHtml.replace('<head>', `<head>\n${styleTag}`);
        } else {
          // No head tag, add it
          finalHtml = `<!DOCTYPE html><html><head>${styleTag}</head><body>${finalHtml}</body></html>`;
        }
      }
    }

    // Return the HTML with STRICT security headers that allow styles but block ALL scripts
    return new NextResponse(finalHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=()',
        // CRITICAL: This CSP allows EVERYTHING except JavaScript execution
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' data: https:",  // Allow inline styles and data URIs
          "script-src 'none'",  // BLOCK ALL JAVASCRIPT
          "object-src 'none'",  // Block plugins
          "base-uri 'none'",    // Prevent base tag hijacking
          "form-action 'none'", // Block form submissions
          "frame-ancestors 'self' https://designer.tesslate.com", // Allow embedding only from your domain
        ].join('; '),
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    });

  } catch (error) {
    console.error('Error serving deployment:', error);
    return new NextResponse(generateErrorPage(), {
      status: 500,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  }
}

function generate404Page(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - Page Not Found | Tesslate Designer</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        .container {
            text-align: center;
            padding: 2rem;
            max-width: 500px;
        }
        h1 { font-size: 6rem; margin-bottom: 1rem; text-shadow: 2px 2px 4px rgba(0,0,0,0.2); }
        h2 { font-size: 1.5rem; margin-bottom: 1rem; font-weight: 400; }
        p { margin-bottom: 2rem; opacity: 0.9; }
        a {
            display: inline-block;
            padding: 0.75rem 2rem;
            background: white;
            color: #667eea;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            transition: transform 0.3s ease;
        }
        a:hover { transform: translateY(-2px); }
    </style>
</head>
<body>
    <div class="container">
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <a href="https://designer.tesslate.com">Go to Tesslate Designer</a>
    </div>
</body>
</html>`;
}

function generateExpiredPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Expired | Tesslate Designer</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        .container { text-align: center; padding: 2rem; max-width: 500px; }
        h1 { font-size: 3rem; margin-bottom: 1rem; }
        p { margin-bottom: 2rem; opacity: 0.9; }
        a {
            display: inline-block;
            padding: 0.75rem 2rem;
            background: white;
            color: #667eea;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>This page has expired</h1>
        <p>The deployment you're looking for has expired and is no longer available.</p>
        <a href="https://designer.tesslate.com">Create a New Design</a>
    </div>
</body>
</html>`;
}

function generatePrivatePage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Private Page | Tesslate Designer</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        .container { text-align: center; padding: 2rem; max-width: 500px; }
        h1 { font-size: 3rem; margin-bottom: 1rem; }
        p { margin-bottom: 2rem; opacity: 0.9; }
        a {
            display: inline-block;
            padding: 0.75rem 2rem;
            background: white;
            color: #667eea;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Private Page</h1>
        <p>This deployment is private and cannot be accessed publicly.</p>
        <a href="https://designer.tesslate.com">Go to Tesslate Designer</a>
    </div>
</body>
</html>`;
}

function generateErrorPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error | Tesslate Designer</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        .container { text-align: center; padding: 2rem; max-width: 500px; }
        h1 { font-size: 3rem; margin-bottom: 1rem; }
        p { margin-bottom: 2rem; opacity: 0.9; }
        a {
            display: inline-block;
            padding: 0.75rem 2rem;
            background: white;
            color: #667eea;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Oops! Something went wrong</h1>
        <p>We're having trouble loading this page. Please try again later.</p>
        <a href="https://designer.tesslate.com">Go to Tesslate Designer</a>
    </div>
</body>
</html>`;
}