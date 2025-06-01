import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { fragment, files, previewId } = await request.json();
    
    // Use provided preview ID or create a new one
    const currentPreviewId = previewId || randomUUID();
    
    // Ensure the public/previews directory exists
    const previewsDir = join(process.cwd(), 'public', 'previews');
    const projectDir = join(previewsDir, currentPreviewId);
    
    try {
      await mkdir(projectDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, that's okay
    }

    // If files object is provided, use it (new format)
    if (files && Object.keys(files).length > 0) {
      // Process each file
      for (const [filePath, fileData] of Object.entries(files)) {
        const relativePath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
        const fullPath = join(projectDir, relativePath);
        
        // Ensure directory exists for the file
        const fileDir = join(projectDir, relativePath.split('/').slice(0, -1).join('/'));
        try {
          await mkdir(fileDir, { recursive: true });
        } catch (error) {
          // Directory might already exist
        }
        
        // Write the file
        await writeFile(fullPath, (fileData as any).code || '', 'utf8');
      }
      
      // Create index.html if it doesn't exist
      let indexPath = join(projectDir, 'index.html');
      const hasIndex = files['/index.html'] || files['index.html'];
      
      if (!hasIndex) {
        // Create a default index.html that includes other files
        let indexContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview</title>`;
        
        // Add CSS files
        for (const filePath of Object.keys(files)) {
          if (filePath.endsWith('.css')) {
            const relativePath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
            indexContent += `\n    <link rel="stylesheet" href="${relativePath}">`;
          }
        }
        
        indexContent += `\n</head>\n<body>\n    <div id="root"></div>`;
        
        // Add JS files
        for (const filePath of Object.keys(files)) {
          if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
            const relativePath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
            indexContent += `\n    <script src="${relativePath}"></script>`;
          }
        }
        
        indexContent += `\n</body>\n</html>`;
        
        await writeFile(indexPath, indexContent, 'utf8');
      }
      
      return NextResponse.json({
        url: `/previews/${currentPreviewId}/index.html`,
        id: currentPreviewId,
        status: 'success'
      });
    }
    
    // Legacy support for fragment format
    if (!fragment || !fragment.code) {
      return NextResponse.json({ error: 'No code provided' }, { status: 400 });
    }

    // Determine file type and create appropriate content
    const filePath = fragment.file_path || 'index.html';
    const fileExtension = filePath.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'html') {
      // Handle HTML files
      const fileName = `${currentPreviewId}.html`;
      const fullFilePath = join(previewsDir, fileName);
      
      // Ensure the HTML is complete
      let htmlContent = fragment.code;
      if (!htmlContent.includes('<!DOCTYPE html>')) {
        htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview</title>
</head>
<body>
${htmlContent}
</body>
</html>`;
      }

      await writeFile(fullFilePath, htmlContent, 'utf8');
      
      // Return the URL where the file can be accessed
      const previewUrl = `/previews/${fileName}`;
      
      return NextResponse.json({
        url: previewUrl,
        id: currentPreviewId,
        status: 'success'
      });
      
    } else if (fileExtension === 'css') {
      // Handle CSS files - create an HTML wrapper that includes the CSS
      const fileName = `${currentPreviewId}.html`;
      const fullFilePath = join(previewsDir, fileName);
      
      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CSS Preview</title>
    <style>
${fragment.code}
    </style>
</head>
<body>
    <div class="preview-container">
        <h1>CSS Preview</h1>
        <p>This is a preview of your CSS styles.</p>
        <div class="sample-content">
            <button>Sample Button</button>
            <div class="box">Sample Box</div>
        </div>
    </div>
</body>
</html>`;

      await writeFile(fullFilePath, htmlContent, 'utf8');
      
      const previewUrl = `/previews/${fileName}`;
      
      return NextResponse.json({
        url: previewUrl,
        id: currentPreviewId,
        status: 'success'
      });
      
    } else if (fileExtension === 'js') {
      // Handle JavaScript files - create an HTML wrapper that includes the JS
      const fileName = `${currentPreviewId}.html`;
      const fullFilePath = join(previewsDir, fileName);
      
      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JavaScript Preview</title>
</head>
<body>
    <div id="app">
        <h1>JavaScript Preview</h1>
        <p>Check the console for JavaScript output.</p>
        <div id="output"></div>
    </div>
    <script>
${fragment.code}
    </script>
</body>
</html>`;

      await writeFile(fullFilePath, htmlContent, 'utf8');
      
      const previewUrl = `/previews/${fileName}`;
      
      return NextResponse.json({
        url: previewUrl,
        id: currentPreviewId,
        status: 'success'
      });
      
    } else {
      // Default to HTML handling for unknown file types
      const fileName = `${currentPreviewId}.html`;
      const fullFilePath = join(previewsDir, fileName);
      
      let htmlContent = fragment.code;
      if (!htmlContent.includes('<!DOCTYPE html>')) {
        htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview</title>
</head>
<body>
${htmlContent}
</body>
</html>`;
      }

      await writeFile(fullFilePath, htmlContent, 'utf8');
      
      const previewUrl = `/previews/${fileName}`;
      
      return NextResponse.json({
        url: previewUrl,
        id: currentPreviewId,
        status: 'success'
      });
    }
    
  } catch (error) {
    console.error('Sandbox API error:', error);
    return NextResponse.json(
      { error: 'Failed to create preview' }, 
      { status: 500 }
    );
  }
} 