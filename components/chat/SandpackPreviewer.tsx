import React, { useState, useMemo } from 'react';
import Split from 'react-split';
import {
  SandpackProvider,
  SandpackPreview,
  SandpackFileExplorer,
  useActiveCode,
  useSandpack,
  SandpackStack,
  FileTabs,
} from "@codesandbox/sandpack-react";
import Editor from "@monaco-editor/react";
import { RotateCw, Loader2, Code, Eye } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SandboxFile } from '@/lib/sandbox-manager';
import { cn } from '@/lib/utils';
import '../../split-gutter.css'; // Make sure this CSS file is imported

// A self-contained, VS Code-like theme for Sandpack.
// This theme uses static hex codes and does NOT depend on external CSS variables.
const isolatedDarkTheme = {
  colors: {
    surface1: "#1e1e1e",      // Editor background, file explorer background
    surface2: "#252526",      // Inactive tabs, toolbar background
    surface3: "#37373d",      // Hovered items, active tabs
    clickable: "#c8c8c8",     // Icons, secondary text
    base: "#d4d4d4",          // Default text color
    disabled: "#6a6a6a",      // Disabled text
    hover: "#ffffff",         // Hovered text
    accent: "#007acc",        // Primary color for borders, highlights
    error: "#f44747",
    errorSurface: "#2d1a1a",
  },
  syntax: {
    plain: "#d4d4d4",
    comment: { color: "#6a9955", fontStyle: "italic" },
    keyword: "#569cd6",
    tag: "#569cd6",
    punctuation: "#d4d4d4",
    definition: "#9cdcfe",
    property: "#9cdcfe",
    static: "#b5cea8",
    string: "#ce9178",
  },
  font: {
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
    mono: '"Fira Mono", "DejaVu Sans Mono", Menlo, Consolas, "Liberation Mono", Monaco, "Lucida Console", monospace',
    size: "14px",
    lineHeight: "22px",
  },
};

// --- Monaco Editor Component ---
// This component replaces the default SandpackCodeEditor with Monaco
function MonacoCodeEditor() {
  const { code, updateCode } = useActiveCode();
  const { sandpack } = useSandpack();
  const getLanguage = (path: string) => path.split('.').pop() || 'javascript';

  return (
    // FIX: Using 100% height to be flexible within its container
    <SandpackStack style={{ height: '90vh', margin: 0, width: '100%' }}>
      <FileTabs />
      <div style={{ flex: 1, background: '#1e1e1e', overflow: 'hidden' }}>
        <Editor
          width="100%"
          height="90vh" // FIX: Use 100% height to fill the container
          key={sandpack.activeFile}
          language={getLanguage(sandpack.activeFile)}
          theme="vs-dark" // This is Monaco's built-in dark theme, which matches our isolated theme
          defaultValue={code}
          onChange={(value) => updateCode(value || "")}
          options={{ minimap: { enabled: true }, scrollBeyondLastLine: false, fontSize: 14 }}
        />
      </div>
    </SandpackStack>
  );
}

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
  
  const sandpackFiles = useMemo(() => {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(files)) {
      out[k] = { code: v.code, active: v.active, hidden: v.hidden };
    }
    const hasHtml = Object.keys(out).some(key => key.endsWith('.html'));
    const jsEntry = Object.keys(out).find(key => ['/script.js', '/index.js', '/App.jsx', '/App.tsx'].includes(key));
    if (jsEntry && !hasHtml) {
        out['/index.html'] = {
            code: `<div id="root"></div>\n<div id="app"></div>\n<script src="${jsEntry.substring(1)}"></script>`,
            hidden: true,
        };
    }
    return out;
  }, [files]);

  if (Object.keys(files).length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <Code className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="font-medium">Code Preview</p>
          <p className="text-sm text-muted-foreground">Click an artifact to see its preview.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col border border-border" style={{ minHeight: 0 }}>
      {/* Toolbar with static colors, independent of page theme */}
      <div className="flex border-b flex-shrink-0 p-1.5 items-center justify-between" style={{ backgroundColor: isolatedDarkTheme.colors.surface2, borderColor: '#333' }}>
        <div className="flex items-center bg-black/20 p-1 rounded-md">
           <TooltipProvider delayDuration={0}>
             <Tooltip><TooltipTrigger asChild>
                <button 
                  onClick={() => handleTabChange('code')} 
                  className={cn(
                    'px-3 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition-colors', 
                    activeTab === 'code' ? 'shadow-sm' : 'hover:bg-white/10'
                  )}
                  style={{
                    backgroundColor: activeTab === 'code' ? isolatedDarkTheme.colors.surface1 : 'transparent',
                    color: isolatedDarkTheme.colors.base,
                  }}
                >
                  <Code className="w-4 h-4" /> Code
                </button>
             </TooltipTrigger><TooltipContent>View Code</TooltipContent></Tooltip>
           </TooltipProvider>
           <TooltipProvider delayDuration={0}>
             <Tooltip><TooltipTrigger asChild>
                <button 
                  onClick={() => handleTabChange('preview')} 
                  className={cn(
                    'px-3 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition-colors', 
                    activeTab === 'preview' ? 'shadow-sm' : 'hover:bg-white/10'
                  )}
                  style={{
                    backgroundColor: activeTab === 'preview' ? isolatedDarkTheme.colors.surface1 : 'transparent',
                    color: isolatedDarkTheme.colors.base,
                  }}
                >
                  <Eye className="w-4 h-4" /> Preview
                </button>
             </TooltipTrigger><TooltipContent>View Preview</TooltipContent></Tooltip>
           </TooltipProvider>
        </div>
        <div className="flex items-center gap-2" style={{ color: isolatedDarkTheme.colors.clickable }}>
          {isStreaming && (
            <span className="text-xs flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" style={{ color: isolatedDarkTheme.colors.accent }} />
              Streaming...
            </span>
          )}
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild><button onClick={() => setSandpackKey(Date.now())} className="p-2 rounded-md hover:bg-white/10"><RotateCw className="w-4 h-4" /></button></TooltipTrigger>
              <TooltipContent>Refresh Preview</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {/* Main Content Area with Sandpack */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <SandpackProvider
          key={sandpackKey}
          template="react"
          files={sandpackFiles}
          theme={isolatedDarkTheme} // Use the new isolated theme
          options={{
            autorun: true,
            recompileMode: 'delayed',
            recompileDelay: 500,
            showNavigator: true,
          }}
        >
          {/* Code View with Resizable Split Panes */}
          <div className="h-full w-full" style={{ display: activeTab === 'code' ? 'flex' : 'none' }}>
            <Split className="flex h-full w-full" gutterSize={8} minSize={[150, 400]} sizes={[20, 80]}>
              <div className="h-full overflow-auto" style={{ backgroundColor: isolatedDarkTheme.colors.surface1 }}>
                {/* FIX: Use 100% height */}
                <SandpackFileExplorer style={{ height: '90vh' }} />
              </div>
              <div className="h-full overflow-hidden">
                <MonacoCodeEditor />
              </div>
            </Split>
          </div>
          
          {/* Preview View */}
          <div className="h-full w-full" style={{ display: activeTab === 'preview' ? 'block' : 'none' }}>
            {/* FIX: Use 100% height */}
            <SandpackPreview style={{ height: "89vh", width: "100%" }} showOpenInCodeSandbox={false} showRefreshButton={false} />
          </div>
        </SandpackProvider>
      </div>
    </div>
  );
}