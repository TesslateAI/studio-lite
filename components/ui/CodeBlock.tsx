import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ChevronDown, Clipboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface CollapsibleCodeBlockProps {
    language: string;
    code: string;
    filename?: string;
}

export const CollapsibleCodeBlock: React.FC<CollapsibleCodeBlockProps> = ({ language, code, filename }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent the accordion from toggling
        navigator.clipboard.writeText(code);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="my-4 rounded-lg border bg-secondary/30 text-sm">
            <div className="flex w-full items-center justify-between px-4 py-2 text-left font-medium">
                <button
                    className="flex-grow flex items-center gap-2 text-left"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <span className="font-mono text-muted-foreground">{filename || language}</span>
                </button>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={handleCopy}>
                        {isCopied ? 'Copied!' : 'Copy'}
                    </Button>
                    <button onClick={() => setIsOpen(!isOpen)}>
                        <ChevronDown
                            className={cn('h-5 w-5 transition-transform', isOpen && 'rotate-180')}
                        />
                    </button>
                </div>
            </div>
            {isOpen && (
                <div className="bg-[#282c34] rounded-b-md overflow-hidden">
                    <SyntaxHighlighter
                        language={language}
                        style={oneDark}
                        PreTag="div"
                        customStyle={{ margin: 0, padding: '1rem', borderTop: '1px solid hsl(var(--border))' }}
                    >
                        {code}
                    </SyntaxHighlighter>
                </div>
            )}
        </div>
    );
};