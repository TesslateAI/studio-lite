import React, { useState, useMemo } from 'react';
import {
  SandpackProvider,
  SandpackCodeEditor,
  SandpackPreview,
} from "@codesandbox/sandpack-react";
import { dracula } from "@codesandbox/sandpack-themes";
import { RotateCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type AllowedSandpackTemplate =
  | 'static'
  | 'react'
  | 'react-ts'
  | 'vue'
  | 'vanilla'
  | 'angular'
  | 'solid'
  | 'svelte';

// Helper to detect template type
function detectTemplate(files: Record<string, { code: string }>): AllowedSandpackTemplate {
  if (files['/index.html']) return 'static';
  if (files['/App.js'] || files['/App.jsx']) return 'react';
  if (files['/App.tsx']) return 'react-ts';
  if (files['/main.js'] && files['/App.vue']) return 'vue';
  if (files['/src/index.js']) return 'vanilla';
  // fallback
  return 'vanilla';
}

export function SandpackPreviewer({ files }: { files: Record<string, { code: string, active?: boolean, hidden?: boolean }> }) {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [sandpackKey, setSandpackKey] = useState<number>(Date.now());

  // Convert files to Sandpack format (string or { code, ... })
  const sandpackFiles = useMemo(() => {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(files)) {
      out[k] = v;
    }
    return out;
  }, [files]);

  const template = detectTemplate(files);

  // For static/vanilla, add Tailwind CDN as an external resource if referenced
  const externalResources = useMemo(() => {
    if (template === 'static' || template === 'vanilla') {
      // Add tailwind CDN if referenced in HTML
      const html = files['/index.html']?.code || '';
      if (html.includes('tailwindcss')) {
        return ["https://cdn.tailwindcss.com"];
      }
    }
    return [];
  }, [files, template]);

  // Get visible files and active file
  const visibleFiles = Object.keys(sandpackFiles);
  const activeFile = visibleFiles.find(f => sandpackFiles[f].active) || visibleFiles[0];

  return (
    <div className="w-full h-full flex-1 bg-[#18181b] rounded-lg shadow-md mt-6" style={{ minHeight: 0, backgroundColor: '#18181b' }}>
      <div className="flex border-b border-neutral-200 bg-white" style={{ background: '#18181b', borderColor: '#18181b' }}>
        <button
          onClick={() => setActiveTab('editor')}
          className={`px-4 py-2 text-sm font-medium focus:outline-none transition-colors duration-150 ${
            activeTab === 'editor'
              ? 'border-b-2 border-white text-white bg-[#18181b]'
              : 'text-zinc-300 bg-[#18181b] hover:text-white'
          }`}
        >
          Editor
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-2 text-sm font-medium focus:outline-none transition-colors duration-150 ${
            activeTab === 'preview'
              ? 'border-b-2 border-white text-white bg-[#18181b]'
              : 'text-zinc-300 bg-[#18181b] hover:text-white'
          }`}
        >
          Preview
        </button>
        <div className="ml-auto mr-2 flex items-center">
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setSandpackKey(Date.now())}
                  title="Force Sandpack Refresh"
                  className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <RotateCw className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Refresh Sandpack</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <div className="flex-grow overflow-hidden relative h-full" style={{ minHeight: 0, backgroundColor: '#18181b' }}>
        <SandpackProvider
          key={sandpackKey}
          template={template}
          files={sandpackFiles}
          theme={dracula}
        >
          {activeTab === "editor" ? (
            <SandpackCodeEditor style={{ height: "87vh", width: "100%" }} />
          ) : (
            <SandpackPreview style={{ height: "87vh", width: "100%" }} />
          )}
        </SandpackProvider>
      </div>
    </div>
  );
} 