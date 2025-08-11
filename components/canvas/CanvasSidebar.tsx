'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Loader2, Info, Sparkles } from 'lucide-react';
import { ScreenType } from './types';
import { cn } from '@/lib/utils';

interface ScreenPrompt {
  id: string;
  prompt: string;
  screenType: ScreenType;
}

interface CanvasSidebarProps {
  onGenerateBatch: (prompts: ScreenPrompt[]) => void;
  isGenerating: boolean;
  onStopGeneration: () => void;
  generatingCount: number;
}

export function CanvasSidebar({ 
  onGenerateBatch, 
  isGenerating, 
  onStopGeneration,
  generatingCount 
}: CanvasSidebarProps) {
  const [screenPrompts, setScreenPrompts] = useState<ScreenPrompt[]>([
    { id: '1', prompt: '', screenType: 'desktop' }
  ]);
  const textareaRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({});

  const addPrompt = () => {
    const newPrompt: ScreenPrompt = {
      id: Date.now().toString(),
      prompt: '',
      screenType: 'desktop'
    };
    setScreenPrompts([...screenPrompts, newPrompt]);
  };

  const removePrompt = (id: string) => {
    if (screenPrompts.length > 1) {
      setScreenPrompts(screenPrompts.filter(p => p.id !== id));
    }
  };

  const updatePrompt = (id: string, updates: Partial<ScreenPrompt>) => {
    setScreenPrompts(screenPrompts.map(p => 
      p.id === id ? { ...p, ...updates } : p
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validPrompts = screenPrompts.filter(p => p.prompt.trim());
    if (validPrompts.length > 0) {
      onGenerateBatch(validPrompts);
      // Clear prompts after generation starts
      setScreenPrompts([{ id: '1', prompt: '', screenType: 'desktop' }]);
    }
  };

  const hasValidPrompts = screenPrompts.some(p => p.prompt.trim());

  // Auto-resize textareas
  useEffect(() => {
    screenPrompts.forEach(prompt => {
      const textarea = textareaRefs.current[prompt.id];
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
      }
    });
  }, [screenPrompts]);

  return (
    <div className="w-80 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col p-4 space-y-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold text-slate-900">Design Prompts</Label>
          {generatingCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-blue-600">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Generating {generatingCount} screens...</span>
            </div>
          )}
        </div>

        {/* Prompt list */}
        <div className="space-y-3">
          {screenPrompts.map((prompt, index) => (
            <div key={prompt.id} className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-slate-700">
                  Screen {index + 1}
                </Label>
                <div className="flex items-center gap-2">
                  <Select 
                    value={prompt.screenType} 
                    onValueChange={(value) => updatePrompt(prompt.id, { screenType: value as ScreenType })}
                  >
                    <SelectTrigger className="h-7 w-24 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desktop">Desktop</SelectItem>
                      <SelectItem value="mobile">Mobile</SelectItem>
                      <SelectItem value="tablet">Tablet</SelectItem>
                      <SelectItem value="watch">Watch</SelectItem>
                      <SelectItem value="tv">TV</SelectItem>
                    </SelectContent>
                  </Select>
                  {screenPrompts.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => removePrompt(prompt.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              <textarea
                ref={(el) => { textareaRefs.current[prompt.id] = el; }}
                value={prompt.prompt}
                onChange={(e) => {
                  updatePrompt(prompt.id, { prompt: e.target.value });
                  // Auto-resize
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                placeholder="Describe your design..."
                className="w-full p-2 border border-slate-200 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                style={{ minHeight: '60px' }}
                disabled={isGenerating}
              />
            </div>
          ))}
        </div>

        {/* Add screen button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addPrompt}
          className="w-full gap-2 border-dashed"
          disabled={isGenerating || screenPrompts.length >= 10}
        >
          <Plus className="h-4 w-4" />
          Add Screen
        </Button>

        {screenPrompts.length >= 10 && (
          <p className="text-xs text-slate-500 text-center">
            Maximum 10 screens at once
          </p>
        )}

        {/* Coming soon features */}
        <div className="space-y-2 pt-4 border-t">
          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
            <Info className="h-4 w-4 text-slate-400" />
            <span className="text-xs text-slate-500">
              Image upload & prompt enhancement coming soon
            </span>
          </div>
        </div>

        {/* Generate button */}
        <form onSubmit={handleSubmit} className="space-y-2">
          <Button
            type="submit"
            className="w-full h-10 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium"
            disabled={!hasValidPrompts || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate {screenPrompts.filter(p => p.prompt.trim()).length} Screen{screenPrompts.filter(p => p.prompt.trim()).length !== 1 ? 's' : ''}
              </>
            )}
          </Button>

          {isGenerating && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onStopGeneration}
              className="w-full"
            >
              Stop Generation
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}