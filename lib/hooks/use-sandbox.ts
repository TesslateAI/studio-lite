import { useEffect, useState, useRef } from 'react';
import { SandboxManager, SandboxState } from '../sandbox-manager';

export function useSandbox() {
  const sandboxManagerRef = useRef<SandboxManager | undefined>(undefined);
  const [state, setState] = useState<SandboxState>({
    files: {},
    template: 'static',
    isStreaming: false,
    isShowingCodeViewer: false,
    activeTab: 'preview',
    currentPreviewId: null,
  });

  useEffect(() => {
    // Create sandbox manager instance
    const manager = new SandboxManager();
    sandboxManagerRef.current = manager;

    // Subscribe to state changes
    const unsubscribe = manager.subscribe((newState) => {
      setState(newState);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    ...state,
    sandboxManager: sandboxManagerRef.current,
  };
} 