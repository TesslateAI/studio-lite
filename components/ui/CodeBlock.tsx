import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface CollapsibleCodeBlockProps {
    language: string;
    code: string;
    filename?: string;
    blockId?: string;
}

// Global state for collapse states only
const collapseStates = new Map<string, boolean>();

export const CollapsibleCodeBlock: React.FC<CollapsibleCodeBlockProps> = ({ 
    language, 
    code, 
    filename, 
    blockId 
}) => {
    const stableId = blockId || `${language}-${filename || 'unknown'}`;
    const [isCopied, setIsCopied] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLPreElement>(null);
    const lastCodeRef = useRef<string>('');
    
    // Get initial collapse state
    const [isOpen, setIsOpenLocal] = useState(() => {
        return collapseStates.get(stableId) ?? true;
    });
    
    const setIsOpen = (open: boolean) => {
        collapseStates.set(stableId, open);
        setIsOpenLocal(open);
    };
    
    // Update content preserving scroll
    useEffect(() => {
        if (!contentRef.current || !containerRef.current || !isOpen) return;
        
        // Always set content when opening or when code changes
        if (contentRef.current.textContent !== code) {
            // Save current scroll position
            const scrollTop = containerRef.current.scrollTop;
            const scrollLeft = containerRef.current.scrollLeft;
            
            // Update content
            contentRef.current.textContent = code;
            lastCodeRef.current = code;
            
            // Restore scroll position immediately
            containerRef.current.scrollTop = scrollTop;
            containerRef.current.scrollLeft = scrollLeft;
        }
    }, [code, isOpen]);

    const handleCopy = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(code);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    }, [code]);

    const handleToggle = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(!isOpen);
    }, [isOpen]);

    return (
        <div className="my-4 rounded-lg border bg-secondary/30 text-sm">
            <div 
                className="flex w-full items-center justify-between px-4 py-2 text-left font-medium cursor-pointer hover:bg-secondary/50 transition-colors"
                onClick={handleToggle}
            >
                <div className="flex items-center gap-2">
                    <ChevronDown
                        className={cn('h-4 w-4 transition-transform text-muted-foreground', isOpen && 'rotate-180')}
                    />
                    <span className="font-mono text-muted-foreground">{filename || language}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleCopy} 
                        disabled={isCopied}
                        className="text-xs"
                    >
                        {isCopied ? 'Copied!' : 'Copy'}
                    </Button>
                </div>
            </div>
            {isOpen && (
                <div 
                    ref={containerRef}
                    className="bg-[#282c34] rounded-b-md border-t border-border overflow-auto"
                    style={{ 
                        height: '384px',
                        WebkitOverflowScrolling: 'touch',
                    }}
                >
                    <pre 
                        ref={contentRef}
                        className="p-4 text-gray-300 font-mono text-sm leading-relaxed"
                        style={{
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                            color: '#abb2bf',
                        }}
                    />
                </div>
            )}
        </div>
    );
};

CollapsibleCodeBlock.displayName = 'CollapsibleCodeBlock';