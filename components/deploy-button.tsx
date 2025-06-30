"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, ExternalLink, Copy, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeployButtonProps {
  className?: string;
  projectData?: any;
}

export function DeployButton({ className, projectData }: DeployButtonProps) {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateRandomSubdomain = () => {
    const adjectives = ['swift', 'bright', 'clever', 'bold', 'quick', 'smart', 'zen', 'cool', 'epic', 'pure'];
    const nouns = ['app', 'site', 'demo', 'ui', 'web', 'code', 'build', 'lab', 'studio', 'craft'];
    const numbers = Math.floor(Math.random() * 1000);
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${adjective}-${noun}-${numbers}`;
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    
    try {
      const subdomain = generateRandomSubdomain();
      const fullUrl = `https://${subdomain}.designer.tesslate.com`;
      
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subdomain,
          projectData: projectData || {
            html: document.querySelector('.sandpack-preview iframe')?.contentDocument?.documentElement?.outerHTML || '<html><body><h1>Default Project</h1></body></html>',
            timestamp: new Date().toISOString()
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Deployment failed');
      }

      const result = await response.json();
      setDeploymentUrl(result.url);
    } catch (error) {
      console.error('Deployment error:', error);
      alert('Deployment failed. Please try again.');
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