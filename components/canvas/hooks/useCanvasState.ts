import { useState, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { CanvasScreen, ScreenType, SCREEN_SIZES, ScreenGroup } from '../types';
import { SandboxManager } from '@/lib/sandbox-manager';
import { smartAutoLayout, findNonOverlappingPosition, calculateBatchLayout } from '../utils/autoLayout';

export function useCanvasState() {
  const [screens, setScreens] = useState<CanvasScreen[]>([]);
  const [groups, setGroups] = useState<ScreenGroup[]>([]);
  const [selectedScreen, setSelectedScreen] = useState<CanvasScreen | null>(null);
  const [zoom, setZoom] = useState(100);
  const [canvasPosition, setCanvasPosition] = useState({ x: 0, y: 0 });
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const addScreen = useCallback((prompt: string, screenType: ScreenType, position?: { x: number; y: number }, context?: string, designSystemHTML?: string) => {
    // Create a new group for single screen
    const groupId = uuidv4();
    const groupName = `Group ${groups.length + 1}`;
    const screenSize = SCREEN_SIZES[screenType];
    
    // If no position specified, find a non-overlapping position
    const finalPosition = position || findNonOverlappingPosition(screens, screenSize);
    
    const screenId = uuidv4();
    
    const newScreen: CanvasScreen = {
      id: screenId,
      name: `Screen ${screens.length + 1}`,
      prompt,
      position: finalPosition,
      size: screenSize,
      selected: false,
      type: screenType === 'watch' || screenType === 'tv' ? 'desktop' : screenType,
      locked: false,
      visible: true,
      loading: true,
      streamingContent: '',
      groupId,
      context
    };
    
    // Create the group for single screen
    const newGroup: ScreenGroup = {
      id: groupId,
      name: groupName,
      context: context || '',
      screenIds: [screenId],
      createdAt: Date.now(),
      designSystemHTML
    };
    
    setGroups(prev => [...prev, newGroup]);
    
    setScreens(prev => [...prev, newScreen]);
    return newScreen;
  }, [screens, groups]);

  const updateScreen = useCallback((screenId: string, updates: Partial<CanvasScreen>) => {
    setScreens(prev => prev.map(s => 
      s.id === screenId ? { ...s, ...updates } : s
    ));
    
    if (selectedScreen?.id === screenId) {
      setSelectedScreen(prev => prev ? { ...prev, ...updates } : null);
    }
  }, [selectedScreen]);

  const deleteScreen = useCallback((screenId: string) => {
    // Also update group if this was the last screen in a group
    const screen = screens.find(s => s.id === screenId);
    if (screen?.groupId) {
      setGroups(prev => prev.map(group => {
        if (group.id === screen.groupId) {
          return {
            ...group,
            screenIds: group.screenIds.filter(id => id !== screenId)
          };
        }
        return group;
      }).filter(g => g.screenIds.length > 0)); // Remove empty groups
    }
    
    setScreens(prev => prev.filter(s => s.id !== screenId));
    if (selectedScreen?.id === screenId) {
      setSelectedScreen(null);
    }
  }, [selectedScreen, screens]);

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

  const applyAutoLayout = useCallback(() => {
    const layoutedScreens = smartAutoLayout(screens);
    setScreens(layoutedScreens);
  }, [screens]);

  const addBatchScreens = useCallback((prompts: Array<{ prompt: string; screenType: ScreenType }>, context?: string, designSystemHTML?: string) => {
    // Create a new group for this batch
    const groupId = uuidv4();
    const groupName = `Group ${groups.length + 1}`;
    const screenIds: string[] = [];
    
    // Group screens by type for better layout
    const screenGroups = new Map<ScreenType, typeof prompts>();
    prompts.forEach(item => {
      const type = item.screenType;
      if (!screenGroups.has(type)) {
        screenGroups.set(type, []);
      }
      screenGroups.get(type)!.push(item);
    });
    
    const newScreens: CanvasScreen[] = [];
    let currentGroupOffset = 0;
    
    // Process each group separately for better layout
    screenGroups.forEach((groupPrompts, screenType) => {
      const screenSize = SCREEN_SIZES[screenType];
      
      // Calculate positions for this group
      const positions = calculateBatchLayout(
        [...screens, ...newScreens], // Include already added screens from previous groups
        groupPrompts.length,
        screenSize,
        { startX: 100 + currentGroupOffset }
      );
      
      groupPrompts.forEach((item, index) => {
        const position = positions[index] || { x: 100, y: 100 };
        
        const screenId = uuidv4();
        screenIds.push(screenId);
        
        newScreens.push({
          id: screenId,
          name: `Screen ${screens.length + newScreens.length + 1}`,
          prompt: item.prompt,
          position,
          size: screenSize,
          selected: false,
          type: screenType === 'watch' || screenType === 'tv' ? 'desktop' as const : screenType,
          locked: false,
          visible: true,
          loading: true,
          streamingContent: '',
          groupId,
          context
        });
      });
      
      // Update offset for next group
      const groupWidth = Math.min(3, groupPrompts.length) * (screenSize.width + 50);
      currentGroupOffset += groupWidth + 100;
    });
    
    // Create the group with design system
    const newGroup: ScreenGroup = {
      id: groupId,
      name: groupName,
      context: context || '',
      screenIds,
      createdAt: Date.now(),
      designSystemHTML
    };
    
    setGroups(prev => [...prev, newGroup]);
    setScreens(prev => [...prev, ...newScreens]);
    return newScreens;
  }, [screens, groups]);

  return {
    screens,
    groups,
    selectedScreen,
    zoom,
    canvasPosition,
    isGenerating,
    abortControllerRef,
    setScreens,
    setGroups,
    setZoom,
    setCanvasPosition,
    setIsGenerating,
    addScreen,
    addBatchScreens,
    updateScreen,
    deleteScreen,
    duplicateScreen,
    selectScreen,
    stopGeneration,
    applyAutoLayout
  };
}