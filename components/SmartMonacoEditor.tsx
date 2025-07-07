import React, { useRef, useEffect, useState, useCallback } from 'react';
import Editor from "@monaco-editor/react";
import { useSandpack, useActiveCode, SandpackStack, FileTabs } from '@codesandbox/sandpack-react';

interface SmartMonacoEditorProps {
  onFileChange?: (filename: string, code: string) => void;
  enableBidirectionalSync?: boolean;
}

export function SmartMonacoEditor({ 
  onFileChange, 
  enableBidirectionalSync = true 
}: SmartMonacoEditorProps) {
  const { code, updateCode } = useActiveCode();
  const { sandpack } = useSandpack();
  const { activeFile } = sandpack;
  const changeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle file changes from the editor
  const handleCodeChange = useCallback((value: string | undefined) => {
    const newCode = value || '';
    
    // Update Sandpack immediately for editor responsiveness
    updateCode(newCode);
    
    if (!enableBidirectionalSync) return;

    // Debounce external callbacks to prevent excessive updates
    if (changeTimeoutRef.current) {
      clearTimeout(changeTimeoutRef.current);
    }

    changeTimeoutRef.current = setTimeout(() => {
      onFileChange?.(activeFile, newCode);
    }, 300);
  }, [onFileChange, activeFile, updateCode, enableBidirectionalSync]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (changeTimeoutRef.current) {
        clearTimeout(changeTimeoutRef.current);
      }
    };
  }, []);

  // Get language from file extension
  const getLanguage = (filePath: string): string => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'css':
        return 'css';
      case 'html':
        return 'html';
      case 'json':
        return 'json';
      default:
        return 'plaintext';
    }
  };

  return (
    <SandpackStack style={{ height: '90vh', margin: 0 }}>
      <FileTabs />
      <div style={{ flex: 1, paddingTop: 8, background: "#1e1e1e" }}>
        <Editor
          width="100%"
          height="90vh"
          key={activeFile}
          language={getLanguage(activeFile)}
          theme="vs-dark"
          value={code}
          onChange={handleCodeChange}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            readOnly: false,
            automaticLayout: true,
          }}
        />
      </div>
    </SandpackStack>
  );
}

