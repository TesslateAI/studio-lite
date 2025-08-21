'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { CanvasHeader } from '@/components/canvas/CanvasHeader';
import { CanvasSidebar } from '@/components/canvas/CanvasSidebar';
import { CanvasViewport } from '@/components/canvas/CanvasViewport';
import { QuickEditPanel } from '@/components/canvas/QuickEditPanel';
import { useCanvasState } from '@/components/canvas/hooks/useCanvasState';
import { generateDesign } from '@/components/canvas/services/aiGenerator';
import { ScreenType } from '@/components/canvas/types';
import { SandpackPreviewer } from '@/components/chat/SandpackPreviewer';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import useSWR from 'swr';
import { Model } from '@/lib/types';
import { User } from '@/lib/db/schema';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ScreenPrompt {
  id: string;
  prompt: string;
  screenType: ScreenType;
}

export default function CanvasPage() {
  // Auth and model data
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const { data: stripeData } = useSWR(user && !user.isGuest ? '/api/stripe/user' : null, fetcher);
  const { data: modelsData } = useSWR<{ models: Model[] }>('/api/models', fetcher);
  
  const models: Model[] = modelsData?.models || [];
  const userPlan = (user?.isGuest ? 'free' : (stripeData?.planName?.toLowerCase() || 'free')) as 'free' | 'plus' | 'pro';
  
  // Canvas state management
  const {
    screens,
    selectedScreen,
    zoom,
    canvasPosition,
    isGenerating,
    abortControllerRef,
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
  } = useCanvasState();

  // Local state
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showLayers, setShowLayers] = useState(false);
  const [generatingScreens, setGeneratingScreens] = useState<Set<string>>(new Set());

  // Set default model
  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      const defaultModel = models.find(m => m.access === 'free')?.id || models[0]?.id;
      if (defaultModel) {
        setSelectedModel(defaultModel);
      }
    }
  }, [models, selectedModel]);

  // Handle screen selection
  const handleScreenSelect = useCallback((screen: typeof screens[0]) => {
    selectScreen(screen);
    setIsRightSidebarOpen(true);
  }, [selectScreen]);

  // Handle batch generation
  const handleGenerateBatch = useCallback(async (prompts: ScreenPrompt[]) => {
    if (!selectedModel) {
      console.error('No model selected');
      return;
    }

    setIsGenerating(true);
    const newGeneratingIds = new Set<string>();

    // Use addBatchScreens to create all screens with proper layout
    const batchPrompts = prompts.map(p => ({ 
      prompt: p.prompt, 
      screenType: p.screenType 
    }));
    
    const newScreens = addBatchScreens(batchPrompts);
    
    newScreens.forEach(screen => {
      newGeneratingIds.add(screen.id);
    });

    setGeneratingScreens(newGeneratingIds);

    // Generate designs concurrently
    const generatePromises = newScreens.map(async (screen) => {
      const abortController = new AbortController();
      
      try {
        await generateDesign({
          prompt: screen.prompt,
          screenType: screen.type as ScreenType,
          selectedModel,
          onStreamingUpdate: (content) => {
            updateScreen(screen.id, { 
              streamingContent: content,
              modelUsed: models.find(m => m.id === selectedModel)?.name 
            });
          },
          onComplete: (files, sandboxManager) => {
            updateScreen(screen.id, {
              loading: false,
              files,
              sandboxManager,
              streamingContent: undefined
            });
            setGeneratingScreens(prev => {
              const next = new Set(prev);
              next.delete(screen.id);
              return next;
            });
          },
          onError: (error) => {
            updateScreen(screen.id, {
              loading: false,
              error
            });
            setGeneratingScreens(prev => {
              const next = new Set(prev);
              next.delete(screen.id);
              return next;
            });
          },
          signal: abortController.signal
        });
      } catch (error) {
        console.error('Generation error:', error);
      }
    });

    // Wait for all generations to complete
    await Promise.allSettled(generatePromises);
    setIsGenerating(false);
  }, [selectedModel, models, addScreen, updateScreen, setIsGenerating]);

  // Handle regeneration from quick edit
  const handleRegenerate = useCallback(async (prompt: string) => {
    if (!selectedScreen || !selectedModel) return;

    updateScreen(selectedScreen.id, { 
      loading: true, 
      error: undefined,
      streamingContent: '' 
    });

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    await generateDesign({
      prompt: `${selectedScreen.prompt}\n\nAdditional requirements: ${prompt}`,
      screenType: selectedScreen.type as ScreenType,
      selectedModel,
      onStreamingUpdate: (content) => {
        updateScreen(selectedScreen.id, { 
          streamingContent: content,
          modelUsed: models.find(m => m.id === selectedModel)?.name
        });
      },
      onComplete: (files, sandboxManager) => {
        updateScreen(selectedScreen.id, {
          loading: false,
          files,
          sandboxManager,
          streamingContent: undefined
        });
      },
      onError: (error) => {
        updateScreen(selectedScreen.id, {
          loading: false,
          error
        });
      },
      signal: abortController.signal
    });
  }, [selectedScreen, selectedModel, models, updateScreen, abortControllerRef]);

  // Handle favorites
  const toggleFavorite = useCallback((screenId: string) => {
    setFavorites(prev => 
      prev.includes(screenId) 
        ? prev.filter(id => id !== screenId)
        : [...prev, screenId]
    );
  }, []);

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-80px)] w-full flex relative bg-slate-50">
        {/* Header */}
        <CanvasHeader
          screenCount={screens.length}
          models={models}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          userPlan={userPlan}
          showGrid={showGrid}
          showLayers={showLayers}
          onToggleGrid={() => setShowGrid(!showGrid)}
          onToggleLayers={() => setShowLayers(!showLayers)}
          onAutoLayout={applyAutoLayout}
        />

        {/* Main Content */}
        <div className="flex w-full h-full pt-12">
          {/* Sidebar */}
          <CanvasSidebar
            onGenerateBatch={handleGenerateBatch}
            isGenerating={isGenerating}
            onStopGeneration={stopGeneration}
            generatingCount={generatingScreens.size}
          />

          {/* Viewport */}
          <CanvasViewport
            screens={screens}
            favorites={favorites}
            zoom={zoom}
            canvasPosition={canvasPosition}
            showGrid={showGrid}
            showLayers={showLayers}
            onZoomChange={setZoom}
            onCanvasPositionChange={setCanvasPosition}
            onScreenSelect={handleScreenSelect}
            onScreenUpdate={updateScreen}
            onScreenDuplicate={duplicateScreen}
            onScreenFavorite={toggleFavorite}
            onScreenPreview={setShowPreview}
          />

          {/* Quick Edit Panel */}
          <QuickEditPanel
            screen={selectedScreen}
            isOpen={isRightSidebarOpen}
            onClose={() => setIsRightSidebarOpen(false)}
            onRegenerate={handleRegenerate}
            onUpdateName={(name) => selectedScreen && updateScreen(selectedScreen.id, { name })}
            onDuplicate={() => selectedScreen && duplicateScreen(selectedScreen)}
            onDelete={() => {
              if (selectedScreen) {
                deleteScreen(selectedScreen.id);
                setIsRightSidebarOpen(false);
              }
            }}
            onToggleLock={() => selectedScreen && updateScreen(selectedScreen.id, { locked: !selectedScreen.locked })}
            onToggleVisibility={() => selectedScreen && updateScreen(selectedScreen.id, { visible: !selectedScreen.visible })}
          />
        </div>

        {/* Full Preview Modal */}
        {showPreview && screens.find(s => s.id === showPreview)?.files && (
          <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-8">
            <div className="relative bg-white rounded-lg w-full h-full max-w-7xl max-h-[90vh] overflow-hidden">
              <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-md">
                <span className="text-sm font-medium">
                  {screens.find(s => s.id === showPreview)?.name}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white"
                onClick={() => setShowPreview(null)}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="w-full h-full">
                <SandpackPreviewer 
                  files={screens.find(s => s.id === showPreview)!.files!}
                  isStreaming={false}
                  activeTab="preview"
                  enableSmartRefresh={true}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}