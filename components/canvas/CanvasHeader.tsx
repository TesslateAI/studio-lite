'use client';

import { Button } from '@/components/ui/button';
import { ChatPicker } from '@/components/chat/chat-picker';
import { Grid3x3, Layers, Eye, EyeOff, LayoutGrid } from 'lucide-react';
import { Model } from '@/lib/types';

interface CanvasHeaderProps {
  screenCount: number;
  models: Model[];
  selectedModel: string;
  onModelChange: (model: string) => void;
  userPlan: 'free' | 'plus' | 'pro';
  showGrid: boolean;
  showLayers: boolean;
  onToggleGrid: () => void;
  onToggleLayers: () => void;
  onAutoLayout: () => void;
}

export function CanvasHeader({ 
  screenCount, 
  models, 
  selectedModel, 
  onModelChange,
  userPlan,
  showGrid,
  showLayers,
  onToggleGrid,
  onToggleLayers,
  onAutoLayout
}: CanvasHeaderProps) {
  return (
    <div className="absolute top-0 left-0 right-0 h-12 bg-white border-b border-slate-200 z-50 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-500">AI Design Canvas • {screenCount} screens</span>
      </div>
      
      <div className="flex items-center gap-3">
        {models.length > 0 && (
          <ChatPicker
            models={models}
            selectedModel={selectedModel}
            onSelectedModelChange={onModelChange}
            userPlan={userPlan}
          />
        )}
        <div className="h-6 w-px bg-slate-200" />
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-2 text-slate-600 h-7"
          onClick={onAutoLayout}
          disabled={screenCount === 0}
        >
          <LayoutGrid className="h-3 w-3" />
          <span className="text-xs">Auto Layout</span>
        </Button>
        <Button 
          variant={showGrid ? "secondary" : "ghost"} 
          size="sm" 
          className="gap-2 text-slate-600 h-7"
          onClick={onToggleGrid}
        >
          {showGrid ? <EyeOff className="h-3 w-3" /> : <Grid3x3 className="h-3 w-3" />}
          <span className="text-xs">Grid</span>
        </Button>
        <Button 
          variant={showLayers ? "secondary" : "ghost"} 
          size="sm" 
          className="gap-2 text-slate-600 h-7"
          onClick={onToggleLayers}
        >
          {showLayers ? <Eye className="h-3 w-3" /> : <Layers className="h-3 w-3" />}
          <span className="text-xs">Layers</span>
        </Button>
      </div>
    </div>
  );
}