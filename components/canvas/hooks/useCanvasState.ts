import { useState, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { CanvasScreen, ScreenType, SCREEN_SIZES } from '../types';
import { SandboxManager } from '@/lib/sandbox-manager';

export function useCanvasState() {
  const [screens, setScreens] = useState<CanvasScreen[]>([]);
  const [selectedScreen, setSelectedScreen] = useState<CanvasScreen | null>(null);
  const [zoom, setZoom] = useState(100);
  const [canvasPosition, setCanvasPosition] = useState({ x: 0, y: 0 });
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const addScreen = useCallback((prompt: string, screenType: ScreenType) => {
    const newScreen: CanvasScreen = {
      id: uuidv4(),
      name: `Screen ${screens.length + 1}`,
      prompt,
      position: { 
        x: 100 + (screens.length % 3) * 420, 
        y: 100 + Math.floor(screens.length / 3) * 520
      },
      size: SCREEN_SIZES[screenType],
      selected: false,
      type: screenType === 'watch' || screenType === 'tv' ? 'desktop' : screenType,
      locked: false,
      visible: true,
      loading: true,
      streamingContent: ''
    };
    
    setScreens(prev => [...prev, newScreen]);
    return newScreen;
  }, [screens.length]);

  const updateScreen = useCallback((screenId: string, updates: Partial<CanvasScreen>) => {
    setScreens(prev => prev.map(s => 
      s.id === screenId ? { ...s, ...updates } : s
    ));
    
    if (selectedScreen?.id === screenId) {
      setSelectedScreen(prev => prev ? { ...prev, ...updates } : null);
    }
  }, [selectedScreen]);

  const deleteScreen = useCallback((screenId: string) => {
    setScreens(prev => prev.filter(s => s.id !== screenId));
    if (selectedScreen?.id === screenId) {
      setSelectedScreen(null);
    }
  }, [selectedScreen]);

  const duplicateScreen = useCallback((screen: CanvasScreen) => {
    const newScreen: CanvasScreen = {
      ...screen,
      id: uuidv4(),
      name: `${screen.name} (copy)`,
      position: { 
        x: screen.position.x + 50, 
        y: screen.position.y + 50 
      },
      selected: false,
      sandboxManager: screen.sandboxManager ? new SandboxManager() : undefined
    };
    
    if (screen.files && newScreen.sandboxManager) {
      Object.entries(screen.files).forEach(([filename, file]) => {
        newScreen.sandboxManager!.addFile(filename, file.code);
      });
      newScreen.files = newScreen.sandboxManager.getState().files;
    }
    
    setScreens(prev => [...prev, newScreen]);
    return newScreen;
  }, []);

  const selectScreen = useCallback((screen: CanvasScreen | null) => {
    setSelectedScreen(screen);
    if (screen) {
      setScreens(prev => prev.map(s => ({ ...s, selected: s.id === screen.id })));
    }
  }, []);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  }, []);

  return {
    screens,
    selectedScreen,
    zoom,
    canvasPosition,
    isGenerating,
    abortControllerRef,
    setScreens,
    setZoom,
    setCanvasPosition,
    setIsGenerating,
    addScreen,
    updateScreen,
    deleteScreen,
    duplicateScreen,
    selectScreen,
    stopGeneration
  };
}