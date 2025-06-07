// components/chat/SandpackPreviewer.tsx

import React, { useState, useMemo } from 'react';
import Split from 'react-split';
import {
  SandpackProvider,
  SandpackPreview,
  SandpackFileExplorer,
  SandpackLayout,
  SandpackPredefinedTemplate, // 1. Import the template type
} from "@codesandbox/sandpack-react";
import { RotateCw, Loader2, Code, Eye } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MonacoEditor } from '../MonacoEditor';
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
const isolatedDarkTheme = {
  colors: { surface1: "#1e1e1e", surface2: "#252526", surface3: "#37373d", clickable: "#c8c8c8", base: "#d4d4d4", disabled: "#6a6a6a", hover: "#ffffff", accent: "#007acc", error: "#f44747", errorSurface: "#2d1a1a" },
  syntax: { plain: "#d4d4d4", comment: { color: "#6a9955", fontStyle: "italic" }, keyword: "#569cd6", tag: "#569cd6", punctuation: "#d4d4d4", definition: "#9cdcfe", property: "#9cdcfe", static: "#b5cea8", string: "#ce9178" },
  font: { body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"', mono: '"Fira Mono", "DejaVu Sans Mono", Menlo, Consolas, "Liberation Mono", Monaco, "Lucida Console", monospace', size: "14px", lineHeight: "22px" },
};

// --- Main SandpackPreviewer Component ---
interface SandpackPreviewerProps {
  files: Record<string, SandboxFile>;
  isStreaming?: boolean;
  activeTab?: 'code' | 'preview';
  onTabChange?: (tab: 'code' | 'preview') => void;
}

export function SandpackPreviewer({
  files,
  isStreaming = false,
  activeTab: controlledActiveTab = 'preview',
  onTabChange
}: SandpackPreviewerProps) {
  const [localActiveTab, setLocalActiveTab] = useState<'code' | 'preview'>(controlledActiveTab);
  const [sandpackKey, setSandpackKey] = useState<number>(Date.now());

  const activeTab = onTabChange ? controlledActiveTab : localActiveTab;

  const handleTabChange = (tab: 'code' | 'preview') => {
    if (onTabChange) { onTabChange(tab); }
    else { setLocalActiveTab(tab); }
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
        out['/index.html'] = out[htmlEntryPointPath];
        delete out[htmlEntryPointPath];
      } else if (!htmlEntryPointPath) {
        // Fallback: create a default HTML file
        const cssFile = Object.keys(out).find(p => p.toLowerCase().endsWith('.css'));
        const jsFile = Object.keys(out).find(p => p.toLowerCase().endsWith('.js'));
        const defaultHtmlCode = `<!DOCTYPE html><html><head><title>Preview</title>${cssFile ? `<link rel="stylesheet" href="${cssFile.substring(1)}"/>` : ''}</head><body><div id="root"></div><div id="app"></div>${jsFile ? `<script type="module" src="${jsFile.substring(1)}"></script>` : ''}</body></html>`;
        out['/index.html'] = { code: defaultHtmlCode, hidden: true };
      }
    }

    // Ensure at least one file is active
    const hasActiveFile = Object.values(out).some(f => f.active);
    if (!hasActiveFile && Object.keys(out).length > 0) {
      const firstVisibleFile = Object.keys(out).find(p => !out[p].hidden) || Object.keys(out)[0];
      if (firstVisibleFile) out[firstVisibleFile].active = true;
    }

    return { files: out, template: detectedTemplate };
  }, [files]);

  if (Object.keys(files).length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background text-foreground">
        <div className="text-center"><Code className="h-10 w-10 text-muted-foreground mx-auto mb-2" /><p className="font-medium">Code Preview</p><p className="text-sm text-muted-foreground">Click an artifact to see its preview.</p></div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col border border-border" style={{ minHeight: 0 }}>
      {/* Toolbar remains the same */}
      <div className="flex border-b flex-shrink-0 p-1.5 items-center justify-between" style={{ backgroundColor: isolatedDarkTheme.colors.surface2, borderColor: '#333' }}>
        <div className="flex items-center bg-black/20 p-1 rounded-md">
            <TooltipProvider delayDuration={0}><Tooltip><TooltipTrigger asChild><button onClick={() => handleTabChange('code')} className={cn('px-3 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition-colors', activeTab === 'code' ? 'shadow-sm' : 'hover:bg-white/10')} style={{backgroundColor: activeTab === 'code' ? isolatedDarkTheme.colors.surface1 : 'transparent', color: isolatedDarkTheme.colors.base,}}><Code className="w-4 h-4" /> Code</button></TooltipTrigger><TooltipContent>View Code</TooltipContent></Tooltip></TooltipProvider>
            <TooltipProvider delayDuration={0}><Tooltip><TooltipTrigger asChild><button onClick={() => handleTabChange('preview')} className={cn('px-3 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition-colors', activeTab === 'preview' ? 'shadow-sm' : 'hover:bg-white/10')} style={{backgroundColor: activeTab === 'preview' ? isolatedDarkTheme.colors.surface1 : 'transparent', color: isolatedDarkTheme.colors.base,}}><Eye className="w-4 h-4" /> Preview</button></TooltipTrigger><TooltipContent>View Preview</TooltipContent></Tooltip></TooltipProvider>
        </div>
        <div className="flex items-center gap-2" style={{ color: isolatedDarkTheme.colors.clickable }}>
            {isStreaming && (<span className="text-xs flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" style={{ color: isolatedDarkTheme.colors.accent }} />Streaming...</span>)}
            <TooltipProvider delayDuration={0}><Tooltip><TooltipTrigger asChild><button onClick={() => setSandpackKey(Date.now())} className="p-2 rounded-md hover:bg-white/10"><RotateCw className="w-4 h-4" /></button></TooltipTrigger><TooltipContent>Refresh Preview</TooltipContent></Tooltip></TooltipProvider>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <SandpackProvider
          key={`${sandpackKey}-${template}`} // Key now includes template to force re-mount
          template={template} // Use the dynamically detected template
          files={sandpackFiles}
          theme={isolatedDarkTheme}
          options={{ autorun: true, recompileMode: 'delayed', recompileDelay: 500 }}
        >
          <div style={{ display: activeTab === 'code' ? 'flex' : 'none', height: '100%' }}>
            <SandpackLayout>
              <Split className="flex h-full w-full" gutterSize={8} minSize={[200, 400]} sizes={[25, 75]}>
                <SandpackFileExplorer style={{ height: '100%' }} />
                <MonacoEditor />
              </Split>
            </SandpackLayout>
          </div>
          <div style={{ display: activeTab === 'preview' ? 'block' : 'none', height: '90vh' }}>
            <SandpackPreview style={{ height: "90vh", width: "100%" }} showOpenInCodeSandbox={false} showRefreshButton={false} />
          </div>
        </SandpackProvider>
      </div>
    </div>
  );
} 