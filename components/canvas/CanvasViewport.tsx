'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize2, Layers as LayersIcon, Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import { CanvasScreen } from './CanvasScreen';
import { CanvasScreen as ScreenType } from './types';
import { cn } from '@/lib/utils';

interface CanvasViewportProps {
  screens: ScreenType[];
  favorites: string[];
  zoom: number;
  canvasPosition: { x: number; y: number };
  showGrid: boolean;
  showLayers: boolean;
  onZoomChange: (zoom: number) => void;
  onCanvasPositionChange: (position: { x: number; y: number }) => void;
  onScreenSelect: (screen: ScreenType) => void;
  onScreenUpdate: (screenId: string, updates: Partial<ScreenType>) => void;
  onScreenDuplicate: (screen: ScreenType) => void;
  onScreenFavorite: (screenId: string) => void;
  onScreenPreview: (screenId: string) => void;
}

export function CanvasViewport({
  screens,
  favorites,
  zoom,
  canvasPosition,
  showGrid,
  showLayers,
  onZoomChange,
  onCanvasPositionChange,
  onScreenSelect,
  onScreenUpdate,
  onScreenDuplicate,
  onScreenFavorite,
  onScreenPreview
}: CanvasViewportProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ width: 0, height: 0, x: 0, y: 0 });

  // Handle wheel events for pan and zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      onZoomChange(Math.max(25, Math.min(200, zoom * delta)));
    } else {
      onCanvasPositionChange({
        x: canvasPosition.x - e.deltaX,
        y: canvasPosition.y - e.deltaY
      });
    }
  }, [zoom, canvasPosition, onZoomChange, onCanvasPositionChange]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.addEventListener('wheel', handleWheel, { passive: false });
      return () => viewport.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  // Canvas panning
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('canvas-container')) {
      if (e.button === 0 || e.button === 1) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - canvasPosition.x, y: e.clientY - canvasPosition.y });
        e.preventDefault();
      }
    }
  };

  // Screen dragging
  const handleScreenMouseDown = (e: React.MouseEvent, screen: ScreenType) => {
    if (screen.locked) return;
    
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const viewport = viewportRef.current;
    if (!viewport) return;
    
    setDragOffset({
      x: (e.clientX - rect.left) * (zoom / 100),
      y: (e.clientY - rect.top) * (zoom / 100)
    });
    setIsDragging(screen.id);
    onScreenSelect(screen);
  };

  // Screen resizing
  const handleResizeStart = (e: React.MouseEvent, screen: ScreenType, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    setIsResizing(screen.id);
    setResizeStart({
      width: screen.size.width,
      height: screen.size.height,
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isPanning && !isDragging && !isResizing) {
      onCanvasPositionChange({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
    
    if (isDragging && !isResizing) {
      const viewport = viewportRef.current;
      if (!viewport) return;
      
      const rect = viewport.getBoundingClientRect();
      const x = (e.clientX - rect.left - canvasPosition.x - dragOffset.x) / (zoom / 100);
      const y = (e.clientY - rect.top - canvasPosition.y - dragOffset.y) / (zoom / 100);
      
      onScreenUpdate(isDragging, {
        position: { x: Math.max(0, x), y: Math.max(0, y) }
      });
    }
    
    if (isResizing) {
      const deltaX = (e.clientX - resizeStart.x) / (zoom / 100);
      const deltaY = (e.clientY - resizeStart.y) / (zoom / 100);
      
      onScreenUpdate(isResizing, {
        size: {
          width: Math.max(200, resizeStart.width + deltaX),
          height: Math.max(150, resizeStart.height + deltaY)
        }
      });
    }
  }, [isPanning, panStart, isDragging, isResizing, canvasPosition, dragOffset, zoom, resizeStart, onCanvasPositionChange, onScreenUpdate]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setIsDragging(null);
    setIsResizing(null);
  }, []);

  useEffect(() => {
    if (isPanning || isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isPanning, isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const fitToScreen = () => {
    onZoomChange(100);
    onCanvasPositionChange({ x: 0, y: 0 });
  };

  return (
    <div className="flex-1 flex relative">
      <div 
        ref={viewportRef}
        className={cn(
          "flex-1 relative overflow-hidden bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100",
          showLayers && "mr-64"
        )}
        onMouseDown={handleCanvasMouseDown}
        style={{ 
          cursor: isPanning ? 'grabbing' : isDragging ? 'move' : isResizing ? 'nwse-resize' : 'grab',
          userSelect: 'none',
          WebkitUserSelect: 'none'
        }}
      >
        {/* Canvas Grid Background */}
        {showGrid && (
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(rgba(148, 163, 184, 0.15) 1px, transparent 1px),
                linear-gradient(90deg, rgba(148, 163, 184, 0.15) 1px, transparent 1px)
              `,
              backgroundSize: `${20 * (zoom / 100)}px ${20 * (zoom / 100)}px`,
              backgroundPosition: `${canvasPosition.x}px ${canvasPosition.y}px`
            }}
          />
        )}

        {/* Canvas Container */}
        <div
          ref={canvasRef}
          className="absolute canvas-container"
          style={{
            transform: `translate(${canvasPosition.x}px, ${canvasPosition.y}px) scale(${zoom / 100})`,
            transformOrigin: '0 0',
            transition: isPanning || isDragging || isResizing ? 'none' : 'transform 0.1s ease-out',
            userSelect: 'none',
            WebkitUserSelect: 'none'
          }}
        >
          {/* Render Screens */}
          {screens.map(screen => (
            <div key={screen.id} style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
              <CanvasScreen
                screen={screen}
                isDragging={isDragging === screen.id}
                isFavorite={favorites.includes(screen.id)}
                onMouseDown={(e) => handleScreenMouseDown(e, screen)}
                onClick={() => onScreenSelect(screen)}
                onFavorite={() => onScreenFavorite(screen.id)}
                onPreview={() => onScreenPreview(screen.id)}
                onToggleLock={() => onScreenUpdate(screen.id, { locked: !screen.locked })}
                onEdit={() => onScreenSelect(screen)}
                onDuplicate={() => onScreenDuplicate(screen)}
                onExport={() => {/* Handle export */}}
              />
              
              {/* Resize handle */}
              {screen.selected && !screen.locked && (
                <div
                  className="absolute w-4 h-4 bg-blue-500 rounded-full cursor-nwse-resize hover:bg-blue-600 transition-colors"
                  style={{
                    left: screen.position.x + screen.size.width - 8,
                    top: screen.position.y + screen.size.height - 8,
                    userSelect: 'none',
                    WebkitUserSelect: 'none'
                  }}
                  onMouseDown={(e) => handleResizeStart(e, screen, 'se')}
                />
              )}
            </div>
          ))}
        </div>

        {/* Zoom Controls */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white rounded-lg shadow-lg border border-slate-200 px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onZoomChange(Math.max(25, zoom - 10))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-slate-700 min-w-[50px] text-center">
            {Math.round(zoom)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onZoomChange(Math.min(200, zoom + 10))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={fitToScreen}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Layers Panel */}
      {showLayers && (
        <div className="absolute right-0 top-0 bottom-0 w-64 bg-white border-l border-slate-200 shadow-lg z-30">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
              <LayersIcon className="h-4 w-4" />
              Layers
            </h3>
          </div>
          <div className="p-4 space-y-2 overflow-y-auto" style={{ height: 'calc(100% - 60px)' }}>
            {screens.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No screens yet</p>
            ) : (
              screens.map((screen, index) => (
                <div
                  key={screen.id}
                  className={cn(
                    "p-2 rounded-lg border cursor-pointer transition-all",
                    screen.selected 
                      ? "border-blue-500 bg-blue-50" 
                      : "border-slate-200 hover:bg-slate-50"
                  )}
                  onClick={() => onScreenSelect(screen)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700 truncate flex-1">
                      {screen.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onScreenUpdate(screen.id, { visible: !screen.visible });
                        }}
                      >
                        {screen.visible ? (
                          <Eye className="h-3 w-3 text-slate-400" />
                        ) : (
                          <EyeOff className="h-3 w-3 text-slate-400" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onScreenUpdate(screen.id, { locked: !screen.locked });
                        }}
                      >
                        {screen.locked ? (
                          <Lock className="h-3 w-3 text-slate-400" />
                        ) : (
                          <Unlock className="h-3 w-3 text-slate-400" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {screen.type} • {screen.size.width}×{screen.size.height}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}