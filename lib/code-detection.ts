export interface ExtractedCodeBlock {
  language: string;
  filename: string;
  code: string;
  isComplete: boolean;
}

/**
 * Extracts all code blocks from a markdown string.
 * @param markdown The markdown text to parse.
 * @returns An object containing the text parts and an array of code blocks.
 */
export function extractAllCodeBlocks(markdown: string): { text: string; codeBlocks: ExtractedCodeBlock[] } {
    const codeBlockRegex = /```(\w+)?\s*(?:{\s*filename\s*=\s*["']?([^"'}\s]+)["']?\s*})?\n([\s\S]*?)\n```/g;
    
    let lastIndex = 0;
    const codeBlocks: ExtractedCodeBlock[] = [];
    const textParts: string[] = [];
    
    let match;
    while ((match = codeBlockRegex.exec(markdown)) !== null) {
        // Add the text before this code block
        textParts.push(markdown.substring(lastIndex, match.index));
        lastIndex = match.index + match[0].length;

        const language = match[1] || 'text';
        const filename = match[2] || getDefaultFilename(language);
        const code = match[3];
        
        codeBlocks.push({
            language,
            filename,
            code,
            isComplete: true,
        });
    }

    // Add any remaining text after the last code block
    textParts.push(markdown.substring(lastIndex));
    
    return {
        text: textParts.join('').trim(),
        codeBlocks,
    };
}

function getDefaultFilename(language: string): string {
    const lang = language.toLowerCase();
    switch (lang) {
        case 'html': return 'index.html';
        case 'css': return 'styles.css';
        case 'javascript':
        case 'js': return 'script.js';
        case 'typescript':
        case 'ts': return 'script.ts';
        case 'jsx': return 'App.jsx';
        case 'tsx': return 'App.tsx';
        default: return `file.${lang}`;
    }
}

// RESTORING a function that was removed by mistake, which sandbox-manager.ts needs.
// Map language to file extension
export function getFileExtension(language: string): string {
  const languageMap: Record<string, string> = {
    'javascript': 'js',
    'js': 'js',
    'typescript': 'ts',
    'ts': 'ts',
    'jsx': 'jsx',
    'tsx': 'tsx',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'json': 'json',
    'python': 'py',
    'py': 'py',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'go': 'go',
    'rust': 'rs',
    'php': 'php',
    'ruby': 'rb',
    'swift': 'swift',
    'kotlin': 'kt',
    'vue': 'vue',
    'svelte': 'svelte',
  };

  return languageMap[language.toLowerCase()] || language;
}

// RESTORING a function that was removed by mistake, which sandbox-manager.ts needs.
// Determine appropriate file path from language and filename
export function determineFilePath(language: string, filename: string | null): string {
  // Always use /index.html for HTML code
  if (language.toLowerCase() === 'html') {
    return '/index.html';
  }
  if (filename) {
    return filename.startsWith('/') ? filename : `/${filename}`;
  }

  // Default file paths based on language
  const defaultPaths: Record<string, string> = {
    'html': '/index.html',
    'css': '/styles.css',
    'scss': '/styles.scss',
    'javascript': '/script.js',
    'js': '/script.js',
    'typescript': '/script.ts',
    'ts': '/script.ts',
    'jsx': '/App.jsx',
    'tsx': '/App.tsx',
    'vue': '/App.vue',
    'svelte': '/App.svelte',
    'python': '/main.py',
    'py': '/main.py',
  };

  return defaultPaths[language.toLowerCase()] || `/file.${getFileExtension(language)}`;
}


// Enhanced streaming detection functions for early artifact display
export function detectCodeBlockStart(content: string): { hasCodeBlock: boolean; language?: string; filename?: string } {
  // Look for the start of a code block: ```language or ```language{filename="..."}
  const codeBlockStartRegex = /```(\w+)?\s*(?:{\s*filename\s*=\s*["']?([^"'}\s\n]+)["']?\s*})?/;
  const match = content.match(codeBlockStartRegex);
  
  if (match) {
    return {
      hasCodeBlock: true,
      language: match[1] || 'text',
      filename: match[2]
    };
  }
  
  return { hasCodeBlock: false };
}

export function extractStreamingCodeBlocks(markdown: string): { text: string; codeBlocks: ExtractedCodeBlock[] } {
  // First extract all complete code blocks
  const complete = extractAllCodeBlocks(markdown);
  
  // Also look for incomplete/streaming code blocks that might not be complete yet
  const partialBlockRegex = /```(\w+)?\s*(?:{\s*filename\s*=\s*["']?([^"'}\s]+)["']?\s*})?\n([\s\S]*?)(?:\n```|$)/g;
  
  const allCodeBlocks: ExtractedCodeBlock[] = [...complete.codeBlocks];
  let textParts: string[] = [];
  let lastIndex = 0;
  
  // Extract text parts while preserving content before code blocks
  const codeBlockRegex = /```(\w+)?\s*(?:{\s*filename\s*=\s*["']?([^"'}\s]+)["']?\s*})?\n([\s\S]*?)(?:\n```|$)/g;
  let match;
  
  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    // Add text before this code block
    textParts.push(markdown.substring(lastIndex, match.index));
    lastIndex = match.index + match[0].length;
    
    const language = match[1] || 'text';
    const filename = match[2] || getDefaultFilename(language);
    const code = match[3];
    const isComplete = match[0].endsWith('\n```');
    
    // Only add if it's not already captured in complete blocks
    if (!complete.codeBlocks.some(block => 
      block.language === language && 
      block.filename === filename && 
      block.code === code &&
      block.isComplete
    )) {
      allCodeBlocks.push({
        language,
        filename,
        code,
        isComplete,
      });
    }
  }
  
  // Add any remaining text after the last code block
  textParts.push(markdown.substring(lastIndex));
  
  // Always preserve the original text, don't override it
  return {
    text: complete.text || textParts.join('').trim(),
    codeBlocks: allCodeBlocks,
  };
}

// Fast detection for triggering early artifact display
export function shouldShowArtifact(content: string): boolean {
  // Show artifact if we detect common code patterns early
  const earlyIndicators = [
    /```html/i,
    /```css/i, 
    /```javascript/i,
    /```js/i,
    /```typescript/i,
    /```ts/i,
    /```jsx/i,
    /```tsx/i,
    /```vue/i,
    /```svelte/i,
    /<html[^>]*>/i,
    /<!\s*DOCTYPE\s+html/i,
    /<style[^>]*>/i,
    /<script[^>]*>/i,
    /function\s+\w+\s*\(/,
    /const\s+\w+\s*=/,
    /import\s+.*from/,
    /export\s+(default\s+)?/
  ];
  
  return earlyIndicators.some(pattern => pattern.test(content));
}