'use client';

import { Button } from '@/components/ui/button';
import { 
  Star, 
  Eye, 
  Lock, 
  Unlock, 
  Edit2, 
  Copy, 
  Figma, 
  Loader2, 
  X 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CanvasScreen as ScreenType } from './types';
import { SandpackPreviewer } from '@/components/chat/SandpackPreviewer';

interface CanvasScreenProps {
  screen: ScreenType;
  isDragging: boolean;
  isFavorite: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: () => void;
  onFavorite: () => void;
  onPreview: () => void;
  onToggleLock: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onExport: () => void;
}

export function CanvasScreen({
  screen,
  isDragging,
  isFavorite,
  onMouseDown,
  onClick,
  onFavorite,
  onPreview,
  onToggleLock,
  onEdit,
  onDuplicate,
  onExport
}: CanvasScreenProps) {
  // Show streaming preview if content is being generated
  const showStreamingPreview = screen.loading && screen.streamingContent && screen.streamingContent.length > 100;

  return (
    <div
      className={cn(
        "absolute bg-white rounded-lg shadow-lg border-2 transition-all",
        screen.selected 
          ? "border-blue-500 shadow-xl shadow-blue-500/20" 
          : "border-slate-200 hover:border-slate-300 hover:shadow-xl",
        !screen.visible && "opacity-30",
        screen.locked && "cursor-not-allowed"
      )}
      style={{
        left: screen.position.x,
        top: screen.position.y,
        width: screen.size.width,
        height: screen.size.height,
        cursor: screen.locked ? 'not-allowed' : isDragging ? 'move' : 'grab'
      }}
      onMouseDown={onMouseDown}
      onClick={() => !isDragging && onClick()}
    >
      {/* Screen Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs font-medium text-slate-700 truncate">{screen.name}</span>
          {screen.modelUsed && (
            <span className="text-[10px] text-slate-400 px-1.5 py-0.5 bg-slate-50 rounded">
              {screen.modelUsed}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onFavorite();
            }}
          >
            <Star className={cn(
              "h-3 w-3",
              isFavorite 
                ? "text-yellow-500 fill-yellow-500" 
                : "text-slate-400"
            )} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
          >
            <Eye className="h-3 w-3 text-slate-400" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onToggleLock();
            }}
          >
            {screen.locked ? (
              <Lock className="h-3 w-3 text-slate-400" />
            ) : (
              <Unlock className="h-3 w-3 text-slate-400" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Edit2 className="h-3 w-3 text-slate-400" />
          </Button>
        </div>
      </div>
      
      {/* Screen Content */}
      <div className="p-4 h-[calc(100%-40px)] overflow-hidden">
        {screen.loading ? (
          showStreamingPreview ? (
            // Show streaming preview while generating
            <div className="w-full h-full rounded overflow-hidden bg-slate-50 relative">
              <div className="absolute top-2 left-2 z-10 flex items-center gap-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded">
                <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                <span className="text-xs text-slate-600">Generating...</span>
              </div>
              <div className="w-full h-full overflow-auto p-2">
                <pre className="text-[10px] text-slate-600 font-mono whitespace-pre-wrap break-all">
                  {screen.streamingContent?.slice(-2000)}
                </pre>
              </div>
            </div>
          ) : (
            // Show loading spinner if no content yet
            <div className="w-full h-full rounded flex flex-col items-center justify-center text-slate-400 bg-slate-50">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <span className="text-sm">Generating design...</span>
            </div>
          )
        ) : screen.error ? (
          <div className="w-full h-full rounded flex flex-col items-center justify-center text-red-400 bg-red-50">
            <X className="h-8 w-8 mb-2" />
            <span className="text-sm text-center px-4">{screen.error}</span>
          </div>
        ) : screen.files ? (
          <div className="w-full h-full rounded overflow-hidden">
            <SandpackPreviewer 
              files={screen.files}
              isStreaming={false}
              activeTab="preview"
              enableSmartRefresh={true}
            />
          </div>
        ) : (
          <div className="w-full h-full rounded flex items-center justify-center text-slate-400 bg-gradient-to-br from-slate-50 to-slate-100">
            <span className="text-sm">Ready to generate</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {!screen.loading && screen.files && (
        <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 hover:opacity-100 transition-opacity">
          <Button
            variant="secondary"
            size="sm"
            className="h-7 text-xs gap-1 bg-white/90 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
          >
            <Copy className="h-3 w-3" />
            Copy
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="h-7 text-xs gap-1 bg-white/90 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              onExport();
            }}
          >
            <Figma className="h-3 w-3" />
            Export
          </Button>
        </div>
      )}
    </div>
  );
}