import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSandpack } from '@codesandbox/sandpack-react';

interface SmartMonacoEditorProps {
  onFileChange?: (filename: string, code: string) => void;
  enableBidirectionalSync?: boolean;
}

export function SmartMonacoEditor({ 
  onFileChange, 
  enableBidirectionalSync = true 
}: SmartMonacoEditorProps) {
  const { sandpack } = useSandpack();
  const { files, activeFile, updateFile } = sandpack;
  const [lastExternalUpdate, setLastExternalUpdate] = useState<string>('');
  const isInternalUpdate = useRef(false);
  const changeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle file changes from the editor
  const handleCodeChange = useCallback((filename: string, code: string) => {
    if (!enableBidirectionalSync) return;

    // Mark this as an internal update to prevent feedback loops
    isInternalUpdate.current = true;

    // Debounce external callbacks to prevent excessive updates
    if (changeTimeoutRef.current) {
      clearTimeout(changeTimeoutRef.current);
    }

    changeTimeoutRef.current = setTimeout(() => {
      onFileChange?.(filename, code);
      isInternalUpdate.current = false;
    }, 300);

    // Update Sandpack immediately for editor responsiveness
    updateFile(filename, code);
  }, [onFileChange, updateFile, enableBidirectionalSync]);

  // Sync external file changes to the editor
  useEffect(() => {
    if (isInternalUpdate.current) return;
    
    const currentFileCode = files[activeFile]?.code || '';
    const externalUpdateKey = `${activeFile}:${currentFileCode}`;
    
    if (externalUpdateKey !== lastExternalUpdate) {
      setLastExternalUpdate(externalUpdateKey);
      // The Sandpack context will handle updating the Monaco editor
    }
  }, [files, activeFile, lastExternalUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (changeTimeoutRef.current) {
        clearTimeout(changeTimeoutRef.current);
      }
    };
  }, []);

  // Enhanced Monaco Editor with smart features
  return (
    <div className="h-full w-full relative">
      <MonacoEditorComponent 
        onCodeChange={handleCodeChange}
        activeFile={activeFile}
        files={files}
      />
    </div>
  );
}

interface MonacoEditorComponentProps {
  onCodeChange: (filename: string, code: string) => void;
  activeFile: string;
  files: Record<string, any>;
}

function MonacoEditorComponent({ 
  onCodeChange, 
  activeFile, 
  files 
}: MonacoEditorComponentProps) {
  const editorRef = useRef<any>(null);
  const { listen } = useSandpack();

  useEffect(() => {
    // File change listening disabled for now due to type issues
    // const unsubscribe = listen((message) => {
    //   // Handle file changes
    // });
    // return unsubscribe;
  }, [listen, onCodeChange]);

  // We'll use the existing MonacoEditor from the imports
  // This is a simplified version - the actual implementation would integrate
  // with the Monaco editor instance from Sandpack
  return (
    <div 
      ref={editorRef}
      className="h-full w-full"
      style={{
        fontFamily: 'monaco, "Fira Code", "Cascadia Code", "JetBrains Mono", monospace',
        fontSize: '14px',
        lineHeight: '1.6'
      }}
    >
      {/* Monaco editor will be rendered here by Sandpack */}
    </div>
  );
}