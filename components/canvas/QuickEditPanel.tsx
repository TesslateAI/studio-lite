'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  X, 
  Wand2, 
  Loader2, 
  Copy, 
  Trash2, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CanvasScreen } from './types';
import TextareaAutosize from 'react-textarea-autosize';

interface QuickEditPanelProps {
  screen: CanvasScreen | null;
  isOpen: boolean;
  onClose: () => void;
  onRegenerate: (prompt: string) => void;
  onUpdateName: (name: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleLock: () => void;
  onToggleVisibility: () => void;
}

export function QuickEditPanel({
  screen,
  isOpen,
  onClose,
  onRegenerate,
  onUpdateName,
  onDuplicate,
  onDelete,
  onToggleLock,
  onToggleVisibility
}: QuickEditPanelProps) {
  const [editPrompt, setEditPrompt] = useState('');
  const [screenName, setScreenName] = useState(screen?.name || '');

  if (!screen) return null;

  const handleRegenerate = () => {
    if (editPrompt.trim()) {
      onRegenerate(editPrompt);
      setEditPrompt('');
    }
  };

  return (
    <div className={cn(
      "absolute right-0 top-12 bottom-0 w-80 bg-white border-l border-slate-200 shadow-xl transition-transform duration-300 z-40",
      isOpen ? "translate-x-0" : "translate-x-full"
    )}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Quick Edit</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {/* Screen Name */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700">
              Screen Name
            </Label>
            <Input
              value={screenName}
              onChange={(e) => {
                setScreenName(e.target.value);
                onUpdateName(e.target.value);
              }}
              className="text-sm"
            />
          </div>

          {/* Original Prompt */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700">
              Original Prompt
            </Label>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">{screen.prompt || "No prompt"}</p>
            </div>
          </div>

          {/* Quick Edit */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700">
              Refine Design
            </Label>
            <TextareaAutosize
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder="Describe changes to make..."
              className="w-full p-3 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              minRows={3}
              maxRows={6}
              disabled={screen.loading}
            />
          </div>

          <Button
            onClick={handleRegenerate}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            disabled={!editPrompt.trim() || screen.loading}
          >
            {screen.loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Regenerate
              </>
            )}
          </Button>

          {/* Quick Actions */}
          <div className="space-y-2 pt-4 border-t">
            <Label className="text-xs font-semibold text-slate-700">
              Quick Actions
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs"
                onClick={onDuplicate}
              >
                <Copy className="h-3 w-3 mr-1" />
                Duplicate
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={onDelete}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs"
                onClick={onToggleLock}
              >
                {screen.locked ? (
                  <>
                    <Unlock className="h-3 w-3 mr-1" />
                    Unlock
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3 mr-1" />
                    Lock
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs"
                onClick={onToggleVisibility}
              >
                {screen.visible ? (
                  <>
                    <EyeOff className="h-3 w-3 mr-1" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3 mr-1" />
                    Show
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Screen Properties */}
          <div className="space-y-2 pt-4 border-t">
            <Label className="text-xs font-semibold text-slate-700">
              Screen Properties
            </Label>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Position:</span>
                <span>X: {Math.round(screen.position.x)}, Y: {Math.round(screen.position.y)}</span>
              </div>
              <div className="flex justify-between">
                <span>Size:</span>
                <span>{screen.size.width} × {screen.size.height}</span>
              </div>
              <div className="flex justify-between">
                <span>Type:</span>
                <span className="capitalize">{screen.type}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span>{screen.loading ? 'Generating...' : 'Ready'}</span>
              </div>
              {screen.modelUsed && (
                <div className="flex justify-between">
                  <span>Model:</span>
                  <span>{screen.modelUsed}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}