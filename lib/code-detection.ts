export function parseFileName(filename: string): { name: string; extension: string } {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return { name: filename, extension: '' };
  }
  return {
    name: filename.substring(0, lastDotIndex),
    extension: filename.substring(lastDotIndex + 1),
  };
}

export interface CodeBlockInfo {
  type: 'text' | 'first-code-fence' | 'first-code-fence-generating';
  content: string;
  filename: { name: string; extension: string };
  language: string;
}

export function splitByFirstCodeFence(markdown: string): CodeBlockInfo[] {
  const result: CodeBlockInfo[] = [];
  const lines = markdown.split('\n');
  let inFirstCodeFence = false;
  let codeFenceFound = false;
  let textBuffer: string[] = [];
  let codeBuffer: string[] = [];
  let fenceTag = '';
  let extractedFilename: string | null = null;

  const codeFenceRegex = /^```([^\n]*)$/;

  for (const line of lines) {
    const match = line.match(codeFenceRegex);

    if (!codeFenceFound) {
      if (match && !inFirstCodeFence) {
        // OPENING the first code fence
        inFirstCodeFence = true;
        fenceTag = match[1] || '';
        
        // Extract filename from {filename=...} syntax
        const fileMatch = fenceTag.match(/{\s*filename\s*=\s*([^}]+)\s*}/);
        extractedFilename = fileMatch ? fileMatch[1].trim() : null;
        
        if (textBuffer.length > 0) {
          result.push({
            type: 'text',
            content: textBuffer.join('\n'),
            filename: { name: '', extension: '' },
            language: '',
          });
          textBuffer = [];
        }
      } else if (match && inFirstCodeFence) {
        // CLOSING the first code fence
        codeFenceFound = true;
        
        const parsedFilename = extractedFilename
          ? parseFileName(extractedFilename)
          : { name: '', extension: '' };

        const bracketIndex = fenceTag.indexOf('{');
        const language = bracketIndex > -1
          ? fenceTag.substring(0, bracketIndex).trim()
          : fenceTag.trim();

        result.push({
          type: 'first-code-fence',
          content: codeBuffer.join('\n'),
          filename: parsedFilename,
          language,
        });
        
        codeBuffer = [];
      } else if (inFirstCodeFence) {
        codeBuffer.push(line);
      } else {
        textBuffer.push(line);
      }
    } else {
      textBuffer.push(line);
    }
  }

  // Handle remaining text
  if (textBuffer.length > 0) {
    result.push({
      type: 'text',
      content: textBuffer.join('\n'),
      filename: { name: '', extension: '' },
      language: '',
    });
  }

  // Handle unclosed code fence (still generating)
  if (inFirstCodeFence && !codeFenceFound) {
    const parsedFilename = extractedFilename
      ? parseFileName(extractedFilename)
      : { name: '', extension: '' };

    const bracketIndex = fenceTag.indexOf('{');
    const language = bracketIndex > -1
      ? fenceTag.substring(0, bracketIndex).trim()
      : fenceTag.trim();

    result.push({
      type: 'first-code-fence-generating',
      content: codeBuffer.join('\n'),
      filename: parsedFilename,
      language,
    });
  }

  return result;
}

// Helper to detect code fence start
export function detectCodeFenceStart(content: string): {
  detected: boolean;
  language: string;
  filename: string | null;
} {
  const codeFenceRegex = /```(\w+)?(?:\s*{\s*filename\s*=\s*([^}]+)\s*})?/;
  const match = content.match(codeFenceRegex);
  
  if (match) {
    return {
      detected: true,
      language: match[1] || '',
      filename: match[2] ? match[2].trim() : null,
    };
  }
  
  return { detected: false, language: '', filename: null };
}

// Helper to check if content has a complete code fence
export function hasCompleteCodeFence(content: string): boolean {
  const openCount = (content.match(/```/g) || []).length;
  return openCount >= 2 && openCount % 2 === 0;
}

// Extract code blocks from content
export interface ExtractedCodeBlock {
  language: string;
  filename: string | null;
  code: string;
  isComplete: boolean;
}

export function extractFirstCodeBlock(content: string): ExtractedCodeBlock | null {
  const lines = content.split('\n');
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let language = '';
  let filename: string | null = null;
  let foundEnd = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (!inCodeBlock && line.startsWith('```')) {
      inCodeBlock = true;
      const fenceInfo = detectCodeFenceStart(line);
      language = fenceInfo.language;
      filename = fenceInfo.filename;
    } else if (inCodeBlock && line === '```') {
      foundEnd = true;
      break;
    } else if (inCodeBlock) {
      codeLines.push(line);
    }
  }

  if (!inCodeBlock) {
    return null;
  }

  return {
    language,
    filename,
    code: codeLines.join('\n'),
    isComplete: foundEnd,
  };
}

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