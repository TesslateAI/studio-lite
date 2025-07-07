import { Terminal, ArrowUpRight, Loader2 } from 'lucide-react';
import { DeployButton } from '@/components/deploy-button';

export function GenerationCard({ 
  title, 
  onOpenArtifact,
  isLoading,
  projectData 
}: { 
  title: string, 
  onOpenArtifact: () => void,
  isLoading?: boolean,
  projectData?: any 
}) {
  // Convert codeBlocks to files format for DeployButton
  const files = projectData?.codeBlocks ? projectData.codeBlocks.reduce((acc: Record<string, { code: string }>, block: any) => {
    // Use filename as key, ensuring it starts with /
    const filePath = block.filename.startsWith('/') ? block.filename : `/${block.filename}`;
    acc[filePath] = { code: block.code };
    return acc;
  }, {}) : undefined;
  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent card click when clicking deploy button
    if ((e.target as HTMLElement).closest('[data-deploy-button]')) {
      e.stopPropagation();
      return;
    }
    onOpenArtifact();
  };

  return (
    <div className="mt-2 space-y-2">
      <div
        className="flex items-center justify-between rounded-lg border bg-secondary/50 p-3 hover:bg-secondary hover:cursor-pointer transition-colors"
        onClick={handleCardClick}
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
      
      {!isLoading && (
        <div data-deploy-button>
          <DeployButton projectData={projectData} files={files} className="w-full" />
        </div>
      )}
    </div>
  );
}
