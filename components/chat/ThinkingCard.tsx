import { useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
export function ThinkingCard({ stepsMarkdown }: { stepsMarkdown: string }) {
const [expanded, setExpanded] = useState(false);
if (!stepsMarkdown) return null;
return (
<div className="mt-2 rounded-lg border bg-secondary/30 text-sm overflow-hidden">
<button
className="flex w-full items-center justify-between px-4 py-2 text-left font-medium text-muted-foreground hover:bg-secondary/50 transition-colors"
onClick={() => setExpanded(e => !e)}
>
<div className="flex items-center gap-2">
<Sparkles className="h-4 w-4 text-[#5E62FF] animate-pulse" />
<span>Show thought process</span>
</div>
<ChevronDown
className={cn('h-5 w-5 transition-transform', expanded && 'rotate-180')}
/>
</button>
{expanded && (
<div className="prose prose-sm dark:prose-invert max-w-none p-4 border-t bg-secondary/20">
<ReactMarkdown remarkPlugins={[remarkGfm]}>
{stepsMarkdown}
</ReactMarkdown>
</div>
)}
</div>
);
}