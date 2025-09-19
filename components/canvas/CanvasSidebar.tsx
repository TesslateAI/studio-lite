'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Loader2, Info, Sparkles, FileText, AlertCircle } from 'lucide-react';
import { ScreenType } from './types';
import { cn } from '@/lib/utils';

interface ScreenPrompt {
  id: string;
  prompt: string;
  screenType: ScreenType;
}

interface CanvasSidebarProps {
  onGenerateBatch: (prompts: ScreenPrompt[], context?: string, designSystemHTML?: string) => void;
  isGenerating: boolean;
  onStopGeneration: () => void;
  generatingCount: number;
  selectedModel?: string;
}

export function CanvasSidebar({ 
  onGenerateBatch, 
  isGenerating, 
  onStopGeneration,
  generatingCount,
  selectedModel 
}: CanvasSidebarProps) {
  const [flowContext, setFlowContext] = useState<string>('');
  const [screenPrompts, setScreenPrompts] = useState<ScreenPrompt[]>([
    { id: '1', prompt: '', screenType: 'desktop' }
  ]);
  const [isAutoFlowing, setIsAutoFlowing] = useState(false);
  const [autoFlowError, setAutoFlowError] = useState<string | null>(null);
  const [autoflowDesignSystem, setAutoflowDesignSystem] = useState<string | undefined>(undefined);
  const textareaRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({});
  const contextRef = useRef<HTMLTextAreaElement | null>(null);

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

  const handleAutoFlow = async () => {
    if (!flowContext.trim() || flowContext.length < 5) {
      return;
    }

    setIsAutoFlowing(true);
    
    try {
      // Call AI API to generate screen suggestions
      const response = await fetch('/api/canvas/autoflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: flowContext,
          modelId: selectedModel
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Autoflow error:', error);
        setAutoFlowError(error.error || 'Failed to generate flow');
        setIsAutoFlowing(false);
        
        // Clear error after 3 seconds
        setTimeout(() => setAutoFlowError(null), 3000);
        return;
      }

      const data = await response.json();
      const { screens, designSystemHTML, userJourney } = data.data;

      // Convert AI suggestions to screen prompts
      const autoPrompts: ScreenPrompt[] = screens.map((screen: any, index: number) => ({
        id: (Date.now() + index).toString(),
        prompt: screen.prompt,
        screenType: screen.screenType as ScreenType
      }));

      // Set the auto-generated prompts
      setScreenPrompts(autoPrompts);
      setIsAutoFlowing(false);
      setAutoFlowError(null);
      
      // Show success message with journey info
      setAutoFlowError(`✨ Generated ${autoPrompts.length} screens: ${userJourney || 'Complete user flow'}`);
      setTimeout(() => setAutoFlowError(null), 5000);
      
      // Store design system HTML in state so it can be used when user clicks Generate
      setAutoflowDesignSystem(designSystemHTML);
      
      // Don't auto-submit - let user review and click Generate manually
    } catch (error) {
      console.error('Failed to generate autoflow:', error);
      setIsAutoFlowing(false);
      setAutoFlowError('Failed to generate flow. Please try again.');
      setTimeout(() => setAutoFlowError(null), 3000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validPrompts = screenPrompts.filter(p => p.prompt.trim());
    if (validPrompts.length > 0) {
      // Pass prompts, context, and design system (if from autoflow)
      onGenerateBatch(validPrompts, flowContext, autoflowDesignSystem);
      // Clear everything after generation starts
      setScreenPrompts([{ id: '1', prompt: '', screenType: 'desktop' }]);
      setFlowContext('');
      setAutoflowDesignSystem(undefined);
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

  // Auto-resize context textarea
  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.style.height = 'auto';
      contextRef.current.style.height = contextRef.current.scrollHeight + 'px';
    }
  }, [flowContext]);

  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col p-5 space-y-5 overflow-y-auto">
        {generatingCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Generating {generatingCount} screens...</span>
          </div>
        )}

        {/* Context Section */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-gray-900">Context</Label>
          <div className="relative">
            <textarea
              ref={contextRef}
              value={flowContext}
              onChange={(e) => {
                setFlowContext(e.target.value);
                // Auto-resize
                if (contextRef.current) {
                  contextRef.current.style.height = 'auto';
                  contextRef.current.style.height = contextRef.current.scrollHeight + 'px';
                }
              }}
              placeholder="a cryptocurrency trading platform. with bold components and fonts, rounded corners, dark theme."
              className="w-full p-3 pr-8 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white placeholder:text-gray-400"
              style={{ minHeight: '100px' }}
              disabled={isGenerating}
            />
            <button
              type="button"
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
              title="Edit context"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>
          
          {/* Context actions */}
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 text-xs text-purple-600 hover:text-purple-700 font-medium">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="9" x2="15" y2="9" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              <span>Enhance prompt</span>
            </button>
            <button className="ml-auto flex items-center gap-1 text-xs text-gray-500 hover:text-gray-600">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </button>
          </div>
          
          <div className="flex justify-between text-xs text-gray-400">
            <span>Min. 5 characters</span>
            <span>{flowContext.length}</span>
          </div>
        </div>

        {/* Create Flow Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-semibold text-gray-900">Create Flow</Label>
              {autoflowDesignSystem && (
                <span className="text-xs font-normal text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                  AI Ready
                </span>
              )}
            </div>
            <button 
              type="button"
              onClick={handleAutoFlow}
              disabled={!flowContext.trim() || flowContext.length < 5 || isGenerating || isAutoFlowing}
              className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              title={isAutoFlowing ? 'Generating flow...' : 'Generate screens using AI'}
            >
              {isAutoFlowing ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3" />
                  <span>Autoflow</span>
                </>
              )}
            </button>
          </div>

          {/* Error/Success message */}
          {autoFlowError && (
            <div className={cn(
              "flex items-start gap-2 p-2 rounded-lg text-xs transition-all",
              autoFlowError.includes('✨') 
                ? "bg-green-50 border border-green-200 text-green-600"
                : "bg-red-50 border border-red-200 text-red-600"
            )}>
              {autoFlowError.includes('✨') ? (
                <Sparkles className="h-3 w-3 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              )}
              <span>{autoFlowError}</span>
            </div>
          )}

          {/* Screen list */}
          <div className="space-y-2">
            {screenPrompts.map((prompt, index) => (
              <div key={prompt.id} className="group relative bg-white rounded-lg border border-gray-200 p-3 hover:border-gray-300 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600">Screen {index + 1}</span>
                      <Select 
                        value={prompt.screenType} 
                        onValueChange={(value) => updatePrompt(prompt.id, { screenType: value as ScreenType })}
                      >
                        <SelectTrigger className="h-6 w-20 text-xs border-0 bg-gray-50 hover:bg-gray-100">
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
                      placeholder="Describe this screen..."
                      className="w-full p-2 text-sm resize-none focus:outline-none bg-gray-50 rounded border border-transparent focus:border-purple-300 focus:bg-white transition-colors"
                      style={{ minHeight: '50px' }}
                      disabled={isGenerating}
                    />
                  </div>
                  {screenPrompts.length > 1 && (
                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                      onClick={() => removePrompt(prompt.id)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add screen button */}
          <button
            type="button"
            onClick={addPrompt}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isGenerating || screenPrompts.length >= 10}
          >
            <Plus className="h-4 w-4" />
            <span>Add Screen</span>
          </button>

          {screenPrompts.length >= 10 && (
            <p className="text-xs text-gray-500 text-center">
              Maximum 10 screens per flow
            </p>
          )}
        </div>

        {/* Generate button */}
        <form onSubmit={handleSubmit} className="mt-6">
          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            disabled={!hasValidPrompts || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Generate</span>
              </>
            )}
          </button>

          {isGenerating && (
            <button
              type="button"
              onClick={onStopGeneration}
              className="w-full mt-2 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Stop Generation
            </button>
          )}
        </form>
      </div>
    </div>
  );
}