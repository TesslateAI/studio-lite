import { Terminal, ArrowUpRight, Loader2 } from 'lucide-react';

export function GenerationCard({ 
  title, 
  onOpenArtifact,
  isLoading 
}: { 
  title: string, 
  onOpenArtifact: () => void,
  isLoading?: boolean 
}) {
  return (
    <div
      className="mt-2 flex items-center justify-between rounded-lg border bg-secondary/50 p-3 hover:bg-secondary hover:cursor-pointer transition-colors"
      onClick={onOpenArtifact}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Terminal className="h-5 w-5" />
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">{title}</span>
          <span className="text-xs text-muted-foreground">
            {isLoading ? "Streaming code..." : "Click to preview artifact"}
          </span>
        </div>
      </div>
      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}
