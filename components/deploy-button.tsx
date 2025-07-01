"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, ExternalLink, Copy, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeployButtonProps {
  className?: string;
  projectData?: any;
  onDeploymentComplete?: (url: string, projectName: string) => void;
}

export function DeployButton({ className, projectData, onDeploymentComplete }: DeployButtonProps) {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const getHtmlContent = () => {
    // Try to get HTML from projectData first
    if (projectData?.html) {
      return projectData.html;
    }
    
    // Try to get HTML from sandpack preview iframe
    const iframe = document.querySelector('.sandpack-preview iframe') as HTMLIFrameElement;
    if (iframe?.contentDocument?.documentElement) {
      return iframe.contentDocument.documentElement.outerHTML;
    }
    
    // Default HTML if nothing else is available
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated UI</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; padding: 2rem; }
        h1 { color: #333; }
    </style>
</head>
<body>
    <h1>Generated UI</h1>
    <p>This is a default template. Generate some UI to see your creation deployed!</p>
</body>
</html>`;
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    
    try {
      const htmlContent = getHtmlContent();
      
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          htmlContent,
          projectName: projectName || undefined // Include if updating existing deployment
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Deployment failed');
      }

      const result = await response.json();
      setDeploymentUrl(result.url);
      setProjectName(result.projectName);
      
      // Notify parent component if callback provided
      if (onDeploymentComplete) {
        onDeploymentComplete(result.url, result.projectName);
      }
    } catch (error) {
      console.error('Deployment error:', error);
      alert(`Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleCopyUrl = async () => {
    if (deploymentUrl) {
      try {
        await navigator.clipboard.writeText(deploymentUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy URL:', error);
      }
    }
  };

  const handleOpenInNewTab = () => {
    if (deploymentUrl) {
      window.open(deploymentUrl, '_blank');
    }
  };

  if (deploymentUrl) {
    return (
      <div className={cn("flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg", className)}>
        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">
            Deployed successfully!
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 truncate">
            {deploymentUrl}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopyUrl}
            className="h-8 w-8 p-0 text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100"
          >
            {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleOpenInNewTab}
            className="h-8 w-8 p-0 text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={handleDeploy}
            disabled={isDeploying}
            className="ml-2 text-xs"
          >
            {isDeploying ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Updating...
              </>
            ) : (
              'Update'
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      onClick={handleDeploy}
      disabled={isDeploying}
      className={cn("bg-[#5E62FF] hover:bg-[#7A7DFF] text-white", className)}
    >
      {isDeploying ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Deploying...
        </>
      ) : (
        <>
          <Share2 className="mr-2 h-4 w-4" />
          Deploy & Share
        </>
      )}
    </Button>
  );
}