'use client';

import React, { useState, useRef, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThinkingCardProps {
  stepsMarkdown: string;
  isStreaming?: boolean;
}

export function ThinkingCard({ stepsMarkdown, isStreaming = false }: ThinkingCardProps) {
  // Use useRef to maintain state during streaming
  const expandedStateRef = useRef<boolean>(false);
  const [isExpanded, setIsExpandedState] = useState(false);
  
  const setIsExpanded = useCallback((expanded: boolean) => {
    expandedStateRef.current = expanded;
    setIsExpandedState(expanded);
  }, []);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExpanded(!expandedStateRef.current);
  }, [setIsExpanded]);

  if (!stepsMarkdown?.trim()) {
    return null;
  }

  return (
    <div className="mb-4">
      <div className={cn(
        "border rounded-lg",
        "bg-muted/30 border-border"
      )}>
        {/* Simple Header */}
        <button
          onClick={handleToggle}
          className={cn(
            "w-full px-4 py-2.5 flex items-center justify-between",
            "hover:bg-muted/50 transition-colors",
            "focus:outline-none"
          )}
          aria-expanded={isExpanded}
          aria-controls="thinking-content"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground font-mono">
              {isStreaming ? 'thinking...' : 'thinking'}
            </span>
          </div>
          
          <ChevronDown 
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              isExpanded && "rotate-180"
            )}
          />
        </button>

        {/* Content */}
        <div
          id="thinking-content"
          className={cn(
            "overflow-hidden transition-all",
            isExpanded ? "max-h-[600px]" : "max-h-0"
          )}
        >
          <div className="px-4 pb-3 border-t border-border">
            <div className="mt-3 font-mono text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {stepsMarkdown}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}