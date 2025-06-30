import React, { useState, useRef } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ChevronDown, Clipboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface CollapsibleCodeBlockProps {
    language: string;
    code: string;
    filename?: string;
    blockId?: string; // Add unique ID for tracking collapse state
}

// Global store for code block collapse states
const codeBlockStates = new Map<string, boolean>();

export const CollapsibleCodeBlock: React.FC<CollapsibleCodeBlockProps> = ({ language, code, filename, blockId }) => {
    const blockKey = blockId || `${language}-${filename || 'unknown'}`;
    const [isCopied, setIsCopied] = useState(false);
    
    // Use ref to maintain state across re-renders during streaming
    const [isOpen, setIsOpenState] = useState(() => {
        return codeBlockStates.get(blockKey) ?? true;
    });
    
    const setIsOpen = (open: boolean) => {
        codeBlockStates.set(blockKey, open);
        setIsOpenState(open);
    };

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent the accordion from toggling
        navigator.clipboard.writeText(code);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleToggle = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

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
                <div className="bg-[#282c34] rounded-b-md overflow-auto max-h-96">
                    <SyntaxHighlighter
                        language={language}
                        style={oneDark}
                        PreTag="div"
                        customStyle={{ 
                            margin: 0, 
                            padding: '1rem', 
                            borderTop: '1px solid hsl(var(--border))',
                            fontSize: '14px',
                            lineHeight: '1.5'
                        }}
                        wrapLongLines={true}
                    >
                        {code}
                    </SyntaxHighlighter>
                </div>
            )}
        </div>
    );
};