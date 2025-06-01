import React, { useState, useMemo, useEffect } from 'react';
import {
  SandpackProvider,
  SandpackCodeEditor,
  SandpackPreview,
} from "@codesandbox/sandpack-react";
import { dracula } from "@codesandbox/sandpack-themes";
import { RotateCw, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SandboxFile } from '@/lib/sandbox-manager';

type AllowedSandpackTemplate =
  | 'static'
  | 'react'
  | 'react-ts'
  | 'vue'
  | 'vanilla'
  | 'angular'
  | 'solid'
  | 'svelte';

// Custom theme to prevent black blocks
const customTheme = {
  ...dracula,
  colors: {
    ...dracula.colors,
    surface1: '#18181b',
    surface2: '#18181b',
    surface3: '#18181b',
  }
};

// Helper to detect template type
function detectTemplate(files: Record<string, SandboxFile>): AllowedSandpackTemplate {
  const fileKeys = Object.keys(files);
  
  // Check for specific file patterns
  if (fileKeys.some(f => f.includes('index.html'))) return 'static';
  if (fileKeys.some(f => f.includes('App.tsx'))) return 'react-ts';
  if (fileKeys.some(f => f.includes('App.jsx') || f.includes('App.js'))) return 'react';
  if (fileKeys.some(f => f.includes('App.vue'))) return 'vue';
  if (fileKeys.some(f => f.includes('.js'))) return 'vanilla';
  
  // Default to static for HTML/CSS files
  return 'static';
}

interface SandpackPreviewerProps {
  files: Record<string, SandboxFile>;
  isStreaming?: boolean;
  activeTab?: 'code' | 'preview';
  onTabChange?: (tab: 'code' | 'preview') => void;
}

export function SandpackPreviewer({ 
  files, 
  isStreaming = false,
  activeTab: controlledActiveTab,
  onTabChange
}: SandpackPreviewerProps) {
  const [localActiveTab, setLocalActiveTab] = useState<'editor' | 'preview'>('preview');
  const [sandpackKey, setSandpackKey] = useState<number>(Date.now());
  
  // Debug logging
  useEffect(() => {
    console.log('SandpackPreviewer - files:', files);
    console.log('SandpackPreviewer - isStreaming:', isStreaming);
    console.log('SandpackPreviewer - file count:', Object.keys(files).length);
  }, [files, isStreaming]);
  
  // Use controlled tab if provided, otherwise use local state
  const activeTab = controlledActiveTab || localActiveTab;
  
  const handleTabChange = (tab: 'editor' | 'preview') => {
    if (onTabChange) {
      onTabChange(tab === 'editor' ? 'code' : 'preview');
    } else {
      setLocalActiveTab(tab);
    }
  };

  // Auto-switch to code tab when streaming starts
  useEffect(() => {
    if (isStreaming && activeTab === 'preview') {
      handleTabChange('editor');
    }
  }, [isStreaming]);

  // Auto-switch to preview tab when streaming completes
  useEffect(() => {
    if (!isStreaming && activeTab === 'editor' && Object.keys(files).length > 0) {
      // Small delay to ensure code is fully loaded
      const timer = setTimeout(() => {
        handleTabChange('preview');
        // Don't force re-render here as it causes issues
      }, 300); // Increased delay
      return () => clearTimeout(timer);
    }
  }, [isStreaming]);

  // Inject CSS to fix Sandpack styling
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .sp-preview-container,
      .sp-preview-iframe,
      .sp-stack,
      .sp-preview,
      .sp-preview-actions,
      .sp-layout {
        background: white !important;
      }
      .sp-preview iframe {
        background: white !important;
      }
      .sp-preview-container iframe {
        background: white !important;
      }
      .sp-wrapper .sp-preview-container,
      .sp-wrapper .sp-preview-iframe {
        background: white !important;
      }
      /* Force the iframe content to have a white background */
      .sp-preview iframe[src] {
        background-color: white !important;
      }
      /* Ensure the preview area has proper dimensions */
      .sp-preview-container {
        min-height: 400px !important;
        height: 100% !important;
      }
      /* Fix any dark overlays */
      .sp-overlay {
        background: transparent !important;
      }
      /* Add streaming animation */
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      .streaming-indicator {
        animation: pulse 1.5s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Detect template first
  const template = detectTemplate(files);

  // Convert files to Sandpack format
  const sandpackFiles = useMemo(() => {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(files)) {
      out[k] = {
        code: v.code,
        active: v.active,
        hidden: v.hidden,
      };
    }
    
    // Ensure we have a proper entry point for different templates
    if (template === 'static' && !out['/index.html']) {
      // Create a basic HTML file if missing
      out['/index.html'] = {
        code: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview</title>
</head>
<body>
    <h1>No HTML file provided</h1>
</body>
</html>`,
        active: true,
      };
    } else if (template === 'vanilla' && !out['/index.js']) {
      // Create a basic JS entry point if missing
      out['/index.js'] = {
        code: `console.log('No JavaScript entry point provided');`,
        active: true,
      };
    }
    
    return out;
  }, [files, template]);

  // For static/vanilla, add Tailwind CDN as an external resource if referenced
  const externalResources = useMemo(() => {
    if (template === 'static' || template === 'vanilla') {
      // Add tailwind CDN if referenced in HTML
      const html = files['/index.html']?.code || '';
      if (html.includes('tailwindcss') || html.includes('tailwind')) {
        return ["https://cdn.tailwindcss.com"];
      }
    }
    return [];
  }, [files, template]);

  // Get visible files and active file
  const visibleFiles = Object.keys(sandpackFiles);
  const activeFile = visibleFiles.find(f => sandpackFiles[f].active) || visibleFiles[0];

  // Show loading state if no files
  if (Object.keys(files).length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white text-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
          <p>Waiting for code...</p>
        </div>
      </div>
    );
  }

  // Check if all files are empty
  const hasContent = Object.values(files).some(file => file.code && file.code.trim().length > 0);
  
  if (!hasContent && !isStreaming) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white text-black">
        <div className="text-center">
          <p className="text-gray-500">No content to preview yet.</p>
          <p className="text-sm text-gray-400 mt-2">Start typing some code to see the preview.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-white" style={{ minHeight: 0 }}>
      <div className="flex border-b flex-shrink-0 bg-gray-100">
        {/* <button
          onClick={() => handleTabChange('editor')}
          className={`px-4 py-2 text-sm font-medium focus:outline-none transition-colors duration-150 ${
            activeTab === 'editor'
              ? 'border-b-2 border-blue-500 text-blue-600 bg-white'
              : 'text-gray-600 bg-gray-100 hover:text-gray-900'
          }`}
        >
          <span className="flex items-center gap-2">
            Editor
            {isStreaming && activeTab === 'editor' && (
              <Loader2 className="w-3 h-3 animate-spin" />
            )}
          </span>
        </button> */}
        <button
          onClick={() => handleTabChange('preview')}
          className={`px-4 py-2 text-sm font-medium focus:outline-none transition-colors duration-150 ${
            activeTab === 'preview'
              ? 'border-b-2 border-black text-black bg-white focus:text-black focus:bg-white hover:text-black hover:bg-white'
              : 'text-black bg-gray-100 hover:text-black focus:text-black focus:bg-gray-100'
          }`}
        >
          Preview
        </button>
        <div className="ml-auto mr-2 flex items-center gap-2">
          {isStreaming && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Streaming...
            </span>
          )}
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setSandpackKey(Date.now())}
                  title="Force Sandpack Refresh"
                  className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Refresh Preview</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <div className={`flex-1 min-h-0 overflow-hidden bg-white ${isStreaming ? 'streaming-indicator' : ''}`}>
        <SandpackProvider
          key={sandpackKey}
          template={template}
          files={sandpackFiles}
          theme={{
            colors: {
              surface1: '#ffffff',
              surface2: '#ffffff',
              surface3: '#ffffff',
              disabled: '#f3f4f6',
              base: '#ffffff',
              clickable: '#ffffff',
              hover: '#f9fafb',
              accent: '#3b82f6',
              error: '#ef4444',
              errorSurface: '#fef2f2',
              warning: '#f59e0b',
              warningSurface: '#fffbeb',
            },
            syntax: {
              plain: '#1f2937',
              comment: '#6b7280',
              keyword: '#7c3aed',
              tag: '#dc2626',
              punctuation: '#374151',
              definition: '#059669',
              property: '#0891b2',
              static: '#7c2d12',
              string: '#0f766e',
            },
            font: {
              body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
              mono: '"Fira Mono", "DejaVu Sans Mono", Menlo, Consolas, "Liberation Mono", Monaco, "Lucida Console", monospace',
              size: '13px',
              lineHeight: '20px',
            },
          }}
          options={{
            externalResources,
            autorun: true,
            recompileMode: 'delayed',
            recompileDelay: 300,
          }}
        >
          {/* {activeTab === 'editor' ? (
            <div className="h-full w-full bg-white">
              <SandpackCodeEditor 
                style={{ 
                  height: "100%", 
                  width: "100%",
                  backgroundColor: '#ffffff'
                }} 
                readOnly={isStreaming} // Make read-only while streaming
              />
            </div>
          ) : ( */}
            <div className="h-full w-full bg-white relative">
              {isStreaming && (
                <div className="absolute top-2 right-2 z-10 bg-white rounded-lg shadow-md p-2 flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                  <span className="text-xs text-gray-600">Updating preview...</span>
                </div>
              )}
              <div className="h-full w-full" style={{ backgroundColor: 'white' }}>
                <SandpackPreview 
                  style={{ 
                    height: "90vh", 
                    width: "100%",
                    border: "none",
                    backgroundColor: '#ffffff'
                  }} 
                  showOpenInCodeSandbox={false}
                  showRefreshButton={true}
                  showNavigator={false}
                />
              </div>
            </div>
          {/* )} */}
        </SandpackProvider>
      </div>
    </div>
  );
} 