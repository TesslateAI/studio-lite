// components/chat/SandpackPreviewer.tsx

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Split from 'react-split';
import {
  SandpackProvider,
  SandpackPreview,
  SandpackFileExplorer,
  SandpackLayout,
  SandpackPredefinedTemplate, // 1. Import the template type
} from "@codesandbox/sandpack-react";
import { RotateCw, Loader2, Code, Eye, Download, GripVertical, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MonacoEditor } from '../MonacoEditor';
import { SmartMonacoEditor } from '../SmartMonacoEditor';
import { SandboxFile } from '@/lib/sandbox-manager';
import { cn } from '@/lib/utils';
import '../../split-gutter.css';

// --- Type Definition ---
type SandpackFileMap = Record<string, {
  code: string;
  active?: boolean;
  hidden?: boolean;
}>;

// --- Boilerplate Constants ---
const reactIndexJsCode = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`.trim();

const reactStylesCssCode = `body { font-family: sans-serif; }`;
const reactIndexHtmlCode = `<!DOCTYPE html><html><head><title>React Preview</title></head><body><div id="root"></div></body></html>`;

// --- Isolated Dark Theme (no changes) ---
// --- Isolated Dark Theme for Code Editor ---
const isolatedDarkTheme = {
  colors: { surface1: "#1e1e1e", surface2: "#252526", surface3: "#37373d", clickable: "#c8c8c8", base: "#d4d4d4", disabled: "#6a6a6a", hover: "#ffffff", accent: "#007acc", error: "#f44747", errorSurface: "#2d1a1a" },
  syntax: { plain: "#d4d4d4", comment: { color: "#6a9955", fontStyle: "italic" }, keyword: "#569cd6", tag: "#569cd6", punctuation: "#d4d4d4", definition: "#9cdcfe", property: "#9cdcfe", static: "#b5cea8", string: "#ce9178" },
  font: { body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"', mono: '"Fira Mono", "DejaVu Sans Mono", Menlo, Consolas, "Liberation Mono", Monaco, "Lucida Console", monospace', size: "14px", lineHeight: "22px" },
} as const;

// --- Light Theme for Preview iframe ---
const isolatedLightTheme = {
  colors: { surface1: "#ffffff", surface2: "#f8f8f8", surface3: "#e8e8e8", clickable: "#333333", base: "#333333", disabled: "#999999", hover: "#000000", accent: "#007acc", error: "#d32f2f", errorSurface: "#ffebee" },
  syntax: { plain: "#24292e", comment: { color: "#6a737d", fontStyle: "italic" }, keyword: "#d73a49", tag: "#22863a", punctuation: "#24292e", definition: "#6f42c1", property: "#005cc5", static: "#032f62", string: "#032f62" },
  font: { body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"', mono: '"Fira Mono", "DejaVu Sans Mono", Menlo, Consolas, "Liberation Mono", Monaco, "Lucida Console", monospace', size: "14px", lineHeight: "22px" },
} as const;

// --- Main SandpackPreviewer Component ---
interface SandpackPreviewerProps {
  files: Record<string, SandboxFile>;
  isStreaming?: boolean;
  activeTab?: 'code' | 'preview';
  onTabChange?: (tab: 'code' | 'preview') => void;
  onFileChange?: (filename: string, code: string) => void;
  enableSmartRefresh?: boolean;
  artifactVersion?: number;
  totalVersions?: number;
  onVersionChange?: (version: number) => void;
  onClose?: () => void;
}

// Helper function to determine if sandbox should refresh
function shouldRefreshSandpack(currentFiles: Record<string, SandboxFile>, lastFilesHash: string): boolean {
  if (!lastFilesHash) return true;
  
  try {
    const lastFiles = JSON.parse(lastFilesHash) as Record<string, SandboxFile>;
    const currentFilenames = Object.keys(currentFiles);
    const lastFilenames = Object.keys(lastFiles);
    
    // Only remount if file structure changed
    if (currentFilenames.length !== lastFilenames.length) {
      return true;
    }
    
    if (!currentFilenames.every(name => lastFilenames.includes(name))) {
      return true;
    }
    
    // Don't remount for content changes - let Sandpack handle those
    return false;
  } catch {
    return true;
  }
}

function detectStructuralChange(currentCode: string, lastCode: string): boolean {
  // Check for changes in imports/exports
  const importPattern = /import\s+.*from\s+['"][^'"]+['"]/g;
  const exportPattern = /export\s+(?:default\s+)?(?:const|let|var|function|class)\s+\w+/g;
  
  const currentImports = currentCode.match(importPattern) || [];
  const lastImports = lastCode.match(importPattern) || [];
  const currentExports = currentCode.match(exportPattern) || [];
  const lastExports = lastCode.match(exportPattern) || [];
  
  if (currentImports.length !== lastImports.length || currentExports.length !== lastExports.length) {
    return true;
  }
  
  // Check for component/function structure changes
  const componentPattern = /(?:function|const)\s+[A-Z]\w*|class\s+[A-Z]\w*/g;
  const currentComponents = currentCode.match(componentPattern) || [];
  const lastComponents = lastCode.match(componentPattern) || [];
  
  return currentComponents.length !== lastComponents.length;
}

export function SandpackPreviewer({
  files,
  isStreaming = false,
  activeTab: controlledActiveTab = 'preview',
  onTabChange,
  onFileChange,
  enableSmartRefresh = true,
  artifactVersion = 0,
  totalVersions = 0,
  onVersionChange,
  onClose
}: SandpackPreviewerProps) {
  const [localActiveTab, setLocalActiveTab] = useState<'code' | 'preview'>(controlledActiveTab);
  const [sandpackKey, setSandpackKey] = useState<number>(Date.now());
  const [lastFilesHash, setLastFilesHash] = useState<string>('');
  const [forceRefresh, setForceRefresh] = useState(0);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeTab = onTabChange ? controlledActiveTab : localActiveTab;

  const handleTabChange = (tab: 'code' | 'preview') => {
    // Allow tab switching anytime for smooth UX
    if (onTabChange) { onTabChange(tab); }
    else { setLocalActiveTab(tab); }
  };

  const handleDownload = () => {
    const htmlFile = Object.entries(files).find(([path]) => path.toLowerCase().endsWith('.html'));
    if (htmlFile) {
      const [filename, file] = htmlFile;
      const blob = new Blob([file.code], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename.replace('/', '') || 'index.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // This hook now returns both the files and the detected template type.
  const { files: sandpackFiles, template } = useMemo((): { files: SandpackFileMap, template: SandpackPredefinedTemplate } => { // 2. Add explicit return type here
    if (Object.keys(files).length === 0) {
      return { files: {}, template: 'static' };
    }

    let detectedTemplate: 'react' | 'static' = 'static';
    const out: SandpackFileMap = {};
    for (const [path, file] of Object.entries(files)) {
      out[path] = { ...file };
    }

    // --- React Project Detection ---
    const isReactProject = Object.entries(out).some(([path, file]) =>
      /^\/App\.(jsx|tsx)$/.test(path) ||
      (path.endsWith('.js') && file.code.includes('import React'))
    );

    if (isReactProject) {
      detectedTemplate = 'react';
      // Inject React boilerplate if missing
      if (!out['/index.js']) out['/index.js'] = { code: reactIndexJsCode, hidden: true };
      if (!out['/styles.css']) out['/styles.css'] = { code: reactStylesCssCode, hidden: true };
      if (!out['/index.html']) out['/index.html'] = { code: reactIndexHtmlCode, hidden: true };
    } else {
      // --- Static HTML Project Logic ---
      detectedTemplate = 'static';
      let htmlEntryPointPath = Object.keys(out).find(p => p.toLowerCase().endsWith('.html') && out[p].code.toLowerCase().includes('<html'));

      if (htmlEntryPointPath && htmlEntryPointPath.toLowerCase() !== '/index.html') {
        out['/index.html'] = { ...out[htmlEntryPointPath] };
        // Keep the original file, but make it non-active
        out[htmlEntryPointPath].active = false;
      } else if (!htmlEntryPointPath) {
        // Fallback: create a default HTML file
        const cssFile = Object.keys(out).find(p => p.toLowerCase().endsWith('.css'));
        const jsFile = Object.keys(out).find(p => p.toLowerCase().endsWith('.js'));
        const defaultHtmlCode = `<!DOCTYPE html><html><head><title>Preview</title>${cssFile ? `<link rel="stylesheet" href="${cssFile.substring(1)}"/>` : ''}</head><body><div id="root"></div><div id="app"></div>${jsFile ? `<script type="module" src="${jsFile.substring(1)}"></script>` : ''}</body></html>`;
        out['/index.html'] = { code: defaultHtmlCode, hidden: true };
      }
    }

    // Ensure at least one non-hidden file is active and files are visible in editor
    const hasActiveFile = Object.values(out).some(f => f.active);
    if (!hasActiveFile && Object.keys(out).length > 0) {
      const firstVisibleFile = Object.keys(out).find(p => !out[p].hidden) || Object.keys(out)[0];
      if (firstVisibleFile) {
        out[firstVisibleFile].active = true;
        out[firstVisibleFile].hidden = false; // Ensure it's visible
      }
    }
    
    // Hide boilerplate files but keep user files visible
    Object.keys(out).forEach(path => {
      // Hide React boilerplate files
      if (path === '/index.js' || (path === '/styles.css' && out[path].code === reactStylesCssCode)) {
        out[path].hidden = true;
      } 
      // Hide auto-generated index.html if it's our boilerplate
      else if (path === '/index.html' && (out[path].code === reactIndexHtmlCode || out[path].code.includes('<div id="root"></div><div id="app"></div>'))) {
        out[path].hidden = true;
      }
      // Show all user-created files
      else {
        out[path].hidden = false;
      }
    });

    return { files: out, template: detectedTemplate };
  }, [files]);

  // Smart refresh logic - NEVER remount during streaming to preserve scroll
  useEffect(() => {
    const currentFilesHash = JSON.stringify(files);
    
    // During streaming, NEVER remount - just update files
    if (isStreaming) {
      // Don't update state that causes re-renders during streaming
      return;
    }
    
    // Only check for remount when NOT streaming
    if (currentFilesHash !== lastFilesHash && !isStreaming) {
      const shouldRefresh = shouldRefreshSandpack(files, lastFilesHash);
      
      if (shouldRefresh) {
        // Only remount for major structural changes when not streaming
        setSandpackKey(Date.now());
        setLastFilesHash(currentFilesHash);
      } else {
        setLastFilesHash(currentFilesHash);
      }
    }

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [files, isStreaming, lastFilesHash]);

  if (Object.keys(files).length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white rounded-xl">
        <div className="text-center p-6">
          <Code className="h-10 w-10 text-gray-400 mx-auto mb-2" />
          <p className="font-medium text-gray-900">Code Preview</p>
          <p className="text-sm text-gray-500">Click an artifact to see its preview.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-xl overflow-hidden border border-border" style={{ minHeight: 0 }}>
      {/* Toolbar with drag handle */}
      <div className="flex border-b border-border flex-shrink-0 p-2 items-center justify-between bg-gray-50">
        <div className="flex items-center gap-2">
          <div className="cursor-move p-1 hover:bg-white/10 rounded" style={{ color: isolatedDarkTheme.colors.clickable }}>
            <GripVertical className="w-4 h-4" />
          </div>
          <div className="flex items-center bg-background/50 p-1 rounded-lg border border-border/50">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => handleTabChange('code')} 
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all duration-200',
                      activeTab === 'code' 
                        ? 'bg-background text-foreground shadow-sm' 
                        : 'hover:bg-muted/50 text-muted-foreground'
                    )}
                  >
                    <Code className="w-4 h-4" /> Code
                  </button>
                </TooltipTrigger>
                <TooltipContent>View Code</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => handleTabChange('preview')} 
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all duration-200', 
                      activeTab === 'preview' 
                        ? 'bg-background text-foreground shadow-sm' 
                        : 'hover:bg-muted/50 text-muted-foreground'
                    )}
                  >
                    <Eye className="w-4 h-4" /> Preview
                  </button>
                </TooltipTrigger>
                <TooltipContent>View Preview</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <div className="flex items-center gap-2" style={{ color: isolatedDarkTheme.colors.clickable }}>
            {isStreaming && (<span className="text-xs flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" style={{ color: isolatedDarkTheme.colors.accent }} />Streaming...</span>)}
            
            {/* Version navigation */}
            {totalVersions > 1 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-background/50 rounded-md border border-border/50">
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onVersionChange?.(Math.max(0, artifactVersion - 1))}
                        disabled={artifactVersion === 0}
                        className="p-1 rounded hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Previous Version</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <span className="text-xs px-2">
                  v{artifactVersion + 1} / {totalVersions}
                </span>
                
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onVersionChange?.(Math.min(totalVersions - 1, artifactVersion + 1))}
                        disabled={artifactVersion === totalVersions - 1}
                        className="p-1 rounded hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Next Version</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
            
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={handleDownload} className="p-2 rounded-md hover:bg-muted/50 transition-all duration-200">
                    <Download className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Download HTML</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={() => setSandpackKey(Date.now())} className="p-2 rounded-md hover:bg-muted/50 transition-all duration-200">
                    <RotateCw className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Refresh Preview</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {onClose && (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={onClose} className="p-2 rounded-md hover:bg-muted/50 transition-all duration-200">
                      <X className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Close Preview</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden bg-white">
        {/* Single Sandpack Instance for both Code and Preview */}
        <SandpackProvider
          key={sandpackKey}
          template={template}
          files={sandpackFiles}
          theme={activeTab === 'code' ? isolatedDarkTheme : isolatedLightTheme}
          options={{ 
            autorun: activeTab === 'preview', 
            initMode: 'immediate',
            recompileMode: 'delayed',
            recompileDelay: isStreaming ? 100 : 200
          }}
        >
          {/* Code Editor Tab */}
          <div style={{ display: activeTab === 'code' ? 'block' : 'none', height: '100%' }}>
            <SandpackLayout>
              <Split className="flex h-full w-full" gutterSize={8} minSize={[200, 400]} sizes={[25, 75]}>
                <SandpackFileExplorer style={{ height: '100%' }} />
                {onFileChange ? (
                  <SmartMonacoEditor 
                    onFileChange={onFileChange}
                    enableBidirectionalSync={true}
                  />
                ) : (
                  <MonacoEditor />
                )}
              </Split>
            </SandpackLayout>
          </div>
          
          {/* Preview Tab */}
          <div style={{ display: activeTab === 'preview' ? 'block' : 'none', height: '90vh' }}>
            <SandpackPreview 
              style={{ height: "90vh", width: "100%" }} 
              showOpenInCodeSandbox={false} 
              showRefreshButton={false}
              showNavigator={false}
            />
          </div>
        </SandpackProvider>
      </div>
    </div>
  );
} 