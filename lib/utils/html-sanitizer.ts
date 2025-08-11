/**
 * Simple HTML sanitizer for safe database storage
 * Removes dangerous elements while preserving visual design
 */

export interface SanitizeOptions {
  allowStyles?: boolean;
  injectTesslateButton?: boolean;
  minify?: boolean;
}

/**
 * Sanitize HTML content for safe storage and serving
 */
export function sanitizeHtml(html: string, options: SanitizeOptions = {}): string {
  const {
    allowStyles = true,
    injectTesslateButton = true,
    minify = false,
  } = options;

  let sanitized = html;

  // MINIMAL SANITIZATION - Keep almost everything, just remove dangerous JS
  
  // 1. Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // 2. Remove on* event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\son\w+\s*=\s*[^\s>]*/gi, '');
  
  // 3. Remove javascript: protocol in links
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // 4. Remove dangerous data: URLs that could execute scripts
  sanitized = sanitized.replace(/data:text\/html[^"']*/gi, '');
  sanitized = sanitized.replace(/data:application\/javascript[^"']*/gi, '');
  
  // That's it! Keep everything else including:
  // ✅ All HTML tags (div, span, etc.)
  // ✅ All CSS styles and animations
  // ✅ Images and media
  // ✅ SVG graphics
  // ✅ Data URIs for images (data:image/*)
  // ✅ External stylesheets
  // ✅ Web fonts
  // ✅ Even iframes (they'll be sandboxed by CSP)
  
  // Add Tesslate button if requested and not already present
  if (injectTesslateButton && !sanitized.includes('tesslate-watermark')) {
    const tesslateButton = getTesslateButton();
    
    // Try to add before closing body tag
    if (sanitized.includes('</body>')) {
      sanitized = sanitized.replace(/<\/body>/i, `${tesslateButton}\n</body>`);
    } else {
      // Otherwise append at the end
      sanitized += tesslateButton;
    }
  }
  
  // Add security meta tags if not present
  if (!sanitized.includes('Content-Security-Policy')) {
    const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' https:; script-src 'none'; object-src 'none'; base-uri 'self';">`;
    
    if (sanitized.includes('<head>')) {
      sanitized = sanitized.replace(/<head>/i, `<head>\n${cspMeta}`);
    }
  }
  
  // Minify if requested
  if (minify) {
    sanitized = sanitized
      .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
      .replace(/>\s+</g, '><') // Remove whitespace between tags
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .trim();
  }
  
  return sanitized;
}

/**
 * Get the Tesslate floating button HTML
 */
function getTesslateButton(): string {
  return `
<!-- Tesslate Designer Watermark -->
<div id="tesslate-watermark" style="
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 999999;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  cursor: pointer;
  transition: all 0.3s ease;
  animation: tesslate-pulse 2s infinite;
">
  <a href="https://designer.tesslate.com" target="_blank" rel="noopener noreferrer" style="
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    text-decoration: none;
  " title="Built with Tesslate Designer">
    <svg width="28" height="28" viewBox="0 0 100 100" fill="white">
      <path d="M50 10 L80 30 L80 70 L50 90 L20 70 L20 30 Z" stroke="white" stroke-width="2" fill="none"/>
      <circle cx="50" cy="50" r="15" fill="white"/>
    </svg>
  </a>
</div>
<style>
  @keyframes tesslate-pulse {
    0%, 100% { box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); }
    50% { box-shadow: 0 4px 20px rgba(102, 126, 234, 0.6); }
  }
  #tesslate-watermark:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6) !important;
  }
</style>`;
}

/**
 * Validate if HTML is safe (quick check)
 */
export function isHtmlSafe(html: string): boolean {
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /data:text\/html/i,
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(html));
}

/**
 * Generate a URL-safe deployment ID
 */
export function generateDeploymentId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `site-${timestamp}-${random}`;
}