export interface ExtractedCodeBlock {
  language: string;
  filename: string;
  code: string;
  isComplete: boolean;
  dependencies?: string[];
  imports?: string[];
  exports?: string[];
  fileType?: 'component' | 'utility' | 'style' | 'config' | 'entry' | 'test';
  framework?: 'react' | 'vue' | 'svelte' | 'angular' | 'vanilla' | 'next' | 'vite' | null;
}

/**
 * Extracts code blocks from XML format with <files> and <file> tags.
 * @param content The content to parse for XML files format.
 * @returns An object containing the text parts and an array of enhanced code blocks.
 */
export function extractXMLCodeBlocks(content: string): { text: string; codeBlocks: ExtractedCodeBlock[] } {
    // Handle both complete and incomplete XML during streaming
    const completeFilesRegex = /<files>([\s\S]*?)<\/files>/g;
    const incompleteFilesRegex = /<files>([\s\S]*?)$/g;
    const fileRegex = /<file\s+path="([^"]+)"\s*>\s*```(\w+)?\s*([\s\S]*?)```\s*<\/file>/g;
    const incompleteFileRegex = /<file\s+path="([^"]+)"\s*>\s*```(\w+)?\s*([\s\S]*?)$/g;
    
    // Fallback patterns for XML without code fences (raw content)
    const rawFileRegex = /<file\s+path="([^"]+)"\s*>\s*([\s\S]*?)\s*<\/file>/g;
    const incompleteRawFileRegex = /<file\s+path="([^"]+)"\s*>\s*([\s\S]*?)$/g;
    
    const codeBlocks: ExtractedCodeBlock[] = [];
    let textParts: string[] = [];
    let lastIndex = 0;
    
    // Performance optimized - removed debug logging
    
    // Try complete files first
    let filesMatch;
    let filesContent = '';
    let foundFiles = false;
    
    // Check for complete <files>...</files> blocks
    while ((filesMatch = completeFilesRegex.exec(content)) !== null) {
        foundFiles = true;
        textParts.push(content.substring(lastIndex, filesMatch.index));
        lastIndex = filesMatch.index + filesMatch[0].length;
        filesContent = filesMatch[1];
        
        // Process complete files - try with code fences first
        processXMLFiles(filesContent, fileRegex, codeBlocks, true);
        
        // If no code blocks found, try without code fences (raw content)
        if (codeBlocks.length === 0) {
            processRawXMLFiles(filesContent, rawFileRegex, codeBlocks, true);
        }
    }
    
    // If no complete files found, try incomplete (streaming) files
    if (!foundFiles) {
        incompleteFilesRegex.lastIndex = 0;
        const incompleteMatch = incompleteFilesRegex.exec(content);
        if (incompleteMatch) {
            textParts.push(content.substring(lastIndex, incompleteMatch.index));
            lastIndex = incompleteMatch.index + incompleteMatch[0].length;
            filesContent = incompleteMatch[1];
            
            // Process incomplete files - try with code fences first
            processXMLFiles(filesContent, fileRegex, codeBlocks, true);
            processXMLFiles(filesContent, incompleteFileRegex, codeBlocks, false);
            
            // If no code blocks found, try without code fences (raw content)
            if (codeBlocks.length === 0) {
                processRawXMLFiles(filesContent, rawFileRegex, codeBlocks, true);
                processRawXMLFiles(filesContent, incompleteRawFileRegex, codeBlocks, false);
            }
        }
    }
    
    // Add any remaining text after the last files block
    textParts.push(content.substring(lastIndex));
    
    // Post-process code blocks for relationships and missing files
    const enhancedCodeBlocks = postProcessCodeBlocks(codeBlocks);
    
    // Performance: removed debug logging
    
    return {
        text: textParts.join('').trim(),
        codeBlocks: enhancedCodeBlocks,
    };
}

function processRawXMLFiles(
    filesContent: string,
    regex: RegExp,
    codeBlocks: ExtractedCodeBlock[],
    isComplete: boolean
): void {
    regex.lastIndex = 0;
    let fileMatch;
    
    while ((fileMatch = regex.exec(filesContent)) !== null) {
        const filePath = fileMatch[1];
        const code = fileMatch[2].trim(); // Raw content without code fences
        const language = getLanguageFromPath(filePath);
        
        // Skip files with minimal content, but allow incomplete ones during streaming
        if (code.length < 10 && isComplete) {
            continue;
        }
        
        // Skip placeholder content
        if (code.includes('(no changes)')) {
            continue;
        }
        
        // Analyze the code block for enhanced metadata
        const analysis = analyzeCodeBlock(code, language, filePath);
        
        codeBlocks.push({
            language,
            filename: analysis.filename,
            code,
            isComplete,
            dependencies: analysis.dependencies,
            imports: analysis.imports,
            exports: analysis.exports,
            fileType: analysis.fileType,
            framework: analysis.framework
        });
    }
}

function processXMLFiles(
    filesContent: string,
    regex: RegExp,
    codeBlocks: ExtractedCodeBlock[],
    isComplete: boolean
): void {
    regex.lastIndex = 0;
    let fileMatch;
    
    while ((fileMatch = regex.exec(filesContent)) !== null) {
        const filePath = fileMatch[1];
        const language = fileMatch[2] || getLanguageFromPath(filePath);
        const code = fileMatch[3];
        
        // Skip files with minimal content, but allow incomplete ones during streaming
        if (code.trim().length < 10 && isComplete) {
            continue;
        }
        
        // Skip placeholder content
        if (code.includes('(no changes)')) {
            continue;
        }
        
        // Analyze the code block for enhanced metadata
        const analysis = analyzeCodeBlock(code, language, filePath);
        
        codeBlocks.push({
            language,
            filename: analysis.filename,
            code,
            isComplete,
            dependencies: analysis.dependencies,
            imports: analysis.imports,
            exports: analysis.exports,
            fileType: analysis.fileType,
            framework: analysis.framework,
        });
    }
}

/**
 * Extracts all code blocks from a markdown string with intelligent analysis.
 * Now also supports XML format detection.
 * @param markdown The markdown text to parse.
 * @returns An object containing the text parts and an array of enhanced code blocks.
 */
export function extractAllCodeBlocks(markdown: string): { text: string; codeBlocks: ExtractedCodeBlock[] } {
    // Try XML format first
    const xmlResult = extractXMLCodeBlocks(markdown);
    if (xmlResult.codeBlocks.length > 0) {
        return xmlResult;
    }
    
    // Fallback to traditional markdown format
    const markdownResult = extractMarkdownCodeBlocks(markdown);
    if (markdownResult.codeBlocks.length > 0) {
        return markdownResult;
    }
    
    // Final fallback: check if the entire content looks like HTML/code
    // This handles cases where the model outputs raw code without any wrapper
    if (isRawCodeContent(markdown)) {
        const language = detectLanguageFromContent(markdown);
        return {
            text: '',
            codeBlocks: [{
                language,
                filename: 'index.html',
                code: markdown.trim(),
                isComplete: true,
                fileType: 'entry',
                framework: detectFramework(markdown, language)
            }]
        };
    }
    
    return markdownResult;
}

function extractMarkdownCodeBlocks(markdown: string): { text: string; codeBlocks: ExtractedCodeBlock[] } {
    const codeBlockRegex = /```(\w+)?\s*(?:{\s*filename\s*=\s*["']?([^"'}\s]+)["']?\s*})?\n([\s\S]*?)\n```/g;
    
    let lastIndex = 0;
    const codeBlocks: ExtractedCodeBlock[] = [];
    const textParts: string[] = [];
    
    let match;
    while ((match = codeBlockRegex.exec(markdown)) !== null) {
        // Add the text before this code block
        const textBeforeBlock = markdown.substring(lastIndex, match.index);
        textParts.push(textBeforeBlock);
        lastIndex = match.index + match[0].length;

        const language = match[1] || 'text';
        let filename = match[2] || getDefaultFilename(language);
        const code = match[3];
        
        // Try to extract filename from markdown headers like **filename.ext**
        if (!match[2]) { // Only if no explicit filename was provided
            const headerMatch = textBeforeBlock.match(/\*\*([^*]+\.(html|css|js|jsx|ts|tsx|vue|svelte|py|rs|go|java|cpp|c|php|rb))\*\*/i);
            if (headerMatch) {
                filename = headerMatch[1];
            }
        }
        
        // Analyze the code block for enhanced metadata
        const analysis = analyzeCodeBlock(code, language, filename);
        
        codeBlocks.push({
            language,
            filename: analysis.filename,
            code,
            isComplete: true,
            dependencies: analysis.dependencies,
            imports: analysis.imports,
            exports: analysis.exports,
            fileType: analysis.fileType,
            framework: analysis.framework,
        });
    }

    // Add any remaining text after the last code block
    textParts.push(markdown.substring(lastIndex));
    
    // Post-process code blocks for relationships and missing files
    const enhancedCodeBlocks = postProcessCodeBlocks(codeBlocks);
    
    return {
        text: textParts.join('').trim(),
        codeBlocks: enhancedCodeBlocks,
    };
}

function getLanguageFromPath(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const extMap: Record<string, string> = {
        'html': 'html',
        'css': 'css',
        'scss': 'scss',
        'sass': 'sass',
        'js': 'javascript',
        'jsx': 'jsx',
        'ts': 'typescript',
        'tsx': 'tsx',
        'vue': 'vue',
        'svelte': 'svelte',
        'py': 'python',
        'rs': 'rust',
        'go': 'go',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c',
        'php': 'php',
        'rb': 'ruby',
        'swift': 'swift',
        'kt': 'kotlin',
        'json': 'json',
        'yaml': 'yaml',
        'yml': 'yaml',
        'xml': 'xml',
        'toml': 'toml',
    };
    return extMap[ext || ''] || 'text';
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
  // Use the same logic as extractAllCodeBlocks - supports all three fallback levels
  // This ensures streaming content is detected even if it's raw HTML
  return extractAllCodeBlocks(markdown);
}

// Helper function to detect if content is raw code (no markdown wrapper)
function isRawCodeContent(content: string): boolean {
    const trimmed = content.trim();
    
    // Check for HTML doctype or opening tags anywhere in first 100 chars
    const firstChunk = trimmed.substring(0, 100).toLowerCase();
    if (firstChunk.includes('<!doctype html') || 
        firstChunk.includes('<html') ||
        firstChunk.includes('<?xml')) {
        return true;
    }
    
    // Also check if entire content looks like HTML (more lenient)
    if (trimmed.match(/<!DOCTYPE\s+html/i) || 
        trimmed.match(/<html[^>]*>/i) ||
        trimmed.match(/<head[^>]*>/i) && trimmed.match(/<body[^>]*>/i)) {
        return true;
    }
    
    // Check for React/JSX
    if (trimmed.match(/^import\s+React/m) || 
        trimmed.match(/^export\s+(default\s+)?function/m) ||
        trimmed.match(/^const\s+\w+\s*=\s*\(.*\)\s*=>/m)) {
        return true;
    }
    
    // Check for CSS
    if (trimmed.match(/^[.#]?\w+\s*{/m) || 
        trimmed.match(/^@(import|media|keyframes)/m)) {
        return true;
    }
    
    return false;
}

// Helper function to detect language from raw content
function detectLanguageFromContent(content: string): string {
    const trimmed = content.trim();
    
    if (trimmed.match(/^<!DOCTYPE\s+html/i) || trimmed.match(/^<html/i)) {
        return 'html';
    }
    if (trimmed.match(/^import\s+React/m) || trimmed.match(/^export\s+default/m)) {
        return trimmed.includes('.tsx') || trimmed.includes('FC<') ? 'tsx' : 'jsx';
    }
    if (trimmed.match(/^[.#]?\w+\s*{/m)) {
        return 'css';
    }
    if (trimmed.match(/^{/)) {
        return 'json';
    }
    
    return 'html'; // Default to HTML for web content
}

// Fast detection for triggering early artifact display
export function shouldShowArtifact(content: string): boolean {
  // First check if raw HTML is being output
  if (isRawCodeContent(content)) {
    return true;
  }
  
  // Show artifact if we detect XML format indicators OR traditional code blocks
  const earlyIndicators = [
    // XML format indicators
    /<files>/i,
    /<file\s+path="/i,
    // Traditional markdown code blocks
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
    // HTML patterns - detect as early as possible
    /<html[^>]*>/i,
    /<!DOCTYPE\s+html/i,
    /<style[^>]*>/i,
    /<script[^>]*>/i,
    // Even partial HTML indicators
    /<!DOCTYPE/i,
    /<head>/i,
    /<body>/i,
  ];
  
  return earlyIndicators.some(pattern => pattern.test(content));
}

// Enhanced code analysis for intelligent file organization
interface CodeAnalysis {
  filename: string;
  dependencies: string[];
  imports: string[];
  exports: string[];
  fileType: 'component' | 'utility' | 'style' | 'config' | 'entry' | 'test';
  framework: 'react' | 'vue' | 'svelte' | 'angular' | 'vanilla' | 'next' | 'vite' | null;
}

export function analyzeCodeBlock(code: string, language: string, originalFilename: string): CodeAnalysis {
  const analysis: CodeAnalysis = {
    filename: originalFilename,
    dependencies: [],
    imports: [],
    exports: [],
    fileType: 'utility',
    framework: null,
  };

  // Detect framework from code patterns
  analysis.framework = detectFramework(code, language);
  
  // Extract imports and dependencies
  const importResult = extractImports(code, language);
  analysis.imports = importResult.imports;
  analysis.dependencies = importResult.dependencies;
  
  // Extract exports
  analysis.exports = extractExports(code, language);
  
  // Determine file type
  analysis.fileType = determineFileType(code, language, analysis.framework);
  
  // Generate smart filename if needed
  analysis.filename = generateSmartFilename(code, language, originalFilename, analysis);
  
  return analysis;
}

function detectFramework(code: string, language: string): CodeAnalysis['framework'] {
  if (language === 'vue' || code.includes('<template>')) return 'vue';
  if (language === 'svelte' || code.includes('<script>') && code.includes('<style>')) return 'svelte';
  
  // React detection patterns
  const reactPatterns = [
    /import.*React/,
    /from ['"]react['"]/,
    /useState|useEffect|useContext|useReducer|useMemo|useCallback/,
    /jsx|tsx/i,
    /function\s+\w+\s*\([^)]*\)\s*{[\s\S]*return\s*\(/,
    /const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*{[\s\S]*return\s*\(/,
    /const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\(/,
    /<[A-Z]\w*[^>]*>/,
    /className=/,
    /onClick=/,
    /onChange=/,
  ];
  
  if (reactPatterns.some(pattern => pattern.test(code))) {
    // Check for Next.js patterns
    if (code.includes('next/') || code.includes('getServerSideProps') || code.includes('getStaticProps')) {
      return 'next';
    }
    return 'react';
  }
  
  // Angular detection
  if (code.includes('@Component') || code.includes('@NgModule') || code.includes('@Injectable')) {
    return 'angular';
  }
  
  // Vite detection
  if (code.includes('vite') || code.includes('import.meta.env')) {
    return 'vite';
  }
  
  return 'vanilla';
}

function extractImports(code: string, _language: string): { imports: string[]; dependencies: string[] } {
  const imports: string[] = [];
  const dependencies: string[] = [];
  
  // ES6 imports
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const importPath = match[1];
    imports.push(importPath);
    
    // Check if it's a package dependency (not relative path)
    if (!importPath.startsWith('./') && !importPath.startsWith('../') && !importPath.startsWith('/')) {
      dependencies.push(importPath.split('/')[0]);
    }
  }
  
  // CommonJS requires
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = requireRegex.exec(code)) !== null) {
    const requirePath = match[1];
    imports.push(requirePath);
    
    if (!requirePath.startsWith('./') && !requirePath.startsWith('../') && !requirePath.startsWith('/')) {
      dependencies.push(requirePath.split('/')[0]);
    }
  }
  
  // CSS imports
  const cssImportRegex = /@import\s+['"]([^'"]+)['"]/g;
  while ((match = cssImportRegex.exec(code)) !== null) {
    imports.push(match[1]);
  }
  
  return { imports: [...new Set(imports)], dependencies: [...new Set(dependencies)] };
}

function extractExports(code: string, _language: string): string[] {
  const exports: string[] = [];
  
  // ES6 exports
  const exportRegex = /export\s+(?:default\s+)?(?:(?:const|let|var|function|class)\s+)?(\w+)/g;
  let match;
  while ((match = exportRegex.exec(code)) !== null) {
    exports.push(match[1]);
  }
  
  // Named exports
  const namedExportRegex = /export\s+\{([^}]+)\}/g;
  while ((match = namedExportRegex.exec(code)) !== null) {
    const names = match[1].split(',').map(name => name.trim().split(' as ')[0]);
    exports.push(...names);
  }
  
  return [...new Set(exports)];
}

function determineFileType(code: string, language: string, framework: string | null): CodeAnalysis['fileType'] {
  // Test files
  if (code.includes('test(') || code.includes('describe(') || code.includes('it(') || 
      code.includes('expect(') || code.includes('jest') || code.includes('vitest')) {
    return 'test';
  }
  
  // Config files
  if (code.includes('module.exports') && (code.includes('webpack') || code.includes('vite') || 
      code.includes('rollup') || code.includes('babel'))) {
    return 'config';
  }
  
  // Style files
  if (language === 'css' || language === 'scss' || language === 'sass' || 
      code.includes('@media') || code.includes('body {') || code.includes('html {')) {
    return 'style';
  }
  
  // Entry files
  if (code.includes('ReactDOM.render') || code.includes('createRoot') || 
      code.includes('new Vue') || code.includes('document.getElementById') ||
      code.includes('window.') || language === 'html') {
    return 'entry';
  }
  
  // Component files
  if (framework === 'react' && (code.includes('function ') || code.includes('const ')) &&
      (code.includes('return (') || code.includes('return <'))) {
    return 'component';
  }
  
  if (framework === 'vue' && code.includes('<template>')) {
    return 'component';
  }
  
  return 'utility';
}

function generateSmartFilename(code: string, language: string, originalFilename: string, analysis: CodeAnalysis): string {
  // Use original filename if it's already good
  if (originalFilename !== getDefaultFilename(language)) {
    return originalFilename;
  }
  
  // Generate smarter filename based on content
  const componentMatch = code.match(/(?:function|const)\s+([A-Z]\w+)/);
  const classMatch = code.match(/class\s+([A-Z]\w+)/);
  const exportMatch = code.match(/export\s+default\s+(\w+)/);
  
  let baseName = '';
  
  if (componentMatch) {
    baseName = componentMatch[1];
  } else if (classMatch) {
    baseName = classMatch[1];
  } else if (exportMatch) {
    baseName = exportMatch[1];
  }
  
  if (baseName) {
    const ext = getFileExtension(language);
    return `${baseName}.${ext}`;
  }
  
  // Use file type for better naming
  const typeMap = {
    'component': 'Component',
    'utility': 'utils',
    'style': 'styles',
    'config': 'config',
    'entry': 'index',
    'test': 'test'
  };
  
  const ext = getFileExtension(language);
  return `${typeMap[analysis.fileType] || 'file'}.${ext}`;
}

function postProcessCodeBlocks(codeBlocks: ExtractedCodeBlock[]): ExtractedCodeBlock[] {
  // Find missing dependencies and suggest files
  const processedBlocks = [...codeBlocks];
  const existingFiles = new Set(codeBlocks.map(block => block.filename));
  
  for (const block of codeBlocks) {
    // Check for missing imports that could be other files
    for (const importPath of block.imports || []) {
      if (importPath.startsWith('./') || importPath.startsWith('../')) {
        const expectedFilename = resolveImportPath(importPath, block.filename);
        if (!existingFiles.has(expectedFilename)) {
          // Could suggest missing file - silently skip for now
        }
      }
    }
  }
  
  // Sort files by logical order (entry files first, then components, then utilities)
  const orderMap = { 'entry': 0, 'component': 1, 'utility': 2, 'style': 3, 'config': 4, 'test': 5 };
  
  return processedBlocks.sort((a, b) => {
    const aOrder = orderMap[a.fileType || 'utility'];
    const bOrder = orderMap[b.fileType || 'utility'];
    return aOrder - bOrder;
  });
}

function resolveImportPath(importPath: string, currentFile: string): string {
  // Simple resolution - in a real app you'd want more sophisticated logic
  const currentDir = currentFile.split('/').slice(0, -1).join('/');
  
  if (importPath.startsWith('./')) {
    return `${currentDir}/${importPath.slice(2)}`;
  } else if (importPath.startsWith('../')) {
    const upLevels = importPath.split('/').filter(part => part === '..').length;
    const pathParts = currentDir.split('/').slice(0, -upLevels);
    const remainingPath = importPath.split('/').slice(upLevels).join('/');
    return `${pathParts.join('/')}/${remainingPath}`;
  }
  
  return importPath;
}