'use client';

import React, { useState } from 'react';
import { ChevronDown, Brain, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ThinkingCardProps {
  stepsMarkdown: string;
  isStreaming?: boolean;
}

export function ThinkingCard({ stepsMarkdown, isStreaming = false }: ThinkingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!stepsMarkdown?.trim()) {
    return null;
  }

  return (
    <div className="mb-4">
      <div 
        className={cn(
          "relative border rounded-lg transition-all duration-300 ease-in-out",
          "bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30",
          "border-purple-200 dark:border-purple-800",
          isStreaming && "animate-pulse shadow-lg shadow-purple-200/50 dark:shadow-purple-900/30"
        )}
      >
        {/* Thinking Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "w-full px-4 py-3 flex items-center justify-between",
            "hover:bg-gradient-to-r hover:from-purple-100 hover:to-blue-100",
            "dark:hover:from-purple-900/50 dark:hover:to-blue-900/50",
            "transition-all duration-200 rounded-lg",
            "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          )}
          aria-expanded={isExpanded}
          aria-controls="thinking-content"
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full",
              "bg-gradient-to-br from-purple-500 to-blue-500",
              "text-white shadow-md",
              isStreaming && "animate-pulse"
            )}>
              {isStreaming ? (
                <div className="flex space-x-0.5">
                  <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              ) : (
                <Brain className="w-4 h-4" />
              )}
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-purple-900 dark:text-purple-100">
                  {isStreaming ? 'Thinking...' : 'Reasoning Steps'}
                </span>
                {!isStreaming && (
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                )}
              </div>
              <span className="text-sm text-purple-700 dark:text-purple-300">
                {isStreaming ? 'AI is processing your request' : 'Click to view the thought process'}
              </span>
            </div>
          </div>
          
          <ChevronDown 
            className={cn(
              "w-5 h-5 text-purple-600 dark:text-purple-400 transition-transform duration-200",
              isExpanded && "rotate-180"
            )}
          />
        </button>

        {/* Thinking Content */}
        <div
          id="thinking-content"
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            isExpanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="px-4 pb-4 border-t border-purple-200 dark:border-purple-800">
            <div className={cn(
              "mt-3 p-4 rounded-lg",
              "bg-white/70 dark:bg-gray-900/70",
              "border border-purple-100 dark:border-purple-900",
              "backdrop-blur-sm"
            )}>
              <div className="prose prose-sm prose-purple dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
                    li: ({ children }) => <li className="text-sm">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold text-purple-900 dark:text-purple-100">{children}</strong>,
                    em: ({ children }) => <em className="italic text-purple-800 dark:text-purple-200">{children}</em>,
                    code: ({ children }) => (
                      <code className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 font-mono text-xs">
                        {children}
                      </code>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-purple-300 dark:border-purple-700 pl-4 italic text-purple-700 dark:text-purple-300">
                        {children}
                      </blockquote>
                    ),
                  }}
                >
                  {stepsMarkdown}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>

        {/* Animated border effect for streaming */}
        {isStreaming && (
          <div className={cn(
            "absolute inset-0 rounded-lg",
            "bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400",
            "opacity-20 animate-pulse",
            "-z-10"
          )} />
        )}
      </div>
    </div>
  );
}