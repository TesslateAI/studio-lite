import { useState } from 'react'
import { ExecutionResult } from '@/lib/types'
import { CopyButton } from '@/components/copy-button'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { RotateCw, Zap } from 'lucide-react'

export function FragmentWeb({ result, isStreaming }: { result: ExecutionResult; isStreaming?: boolean }) {
  const [iframeKey, setIframeKey] = useState(0)
  if (!result) return null

  function refreshIframe() {
    setIframeKey((prevKey) => prevKey + 1)
  }

  return (
    <div className="flex flex-col w-full h-full">
      <iframe
        key={iframeKey}
        className="h-full w-full"
        sandbox="allow-forms allow-scripts allow-same-origin"
        loading="lazy"
        src={result.url}
      />
      <div className="p-2 border-t">
        <div className="flex items-center bg-muted dark:bg-white/10 rounded-2xl">
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="link"
                  className="text-muted-foreground"
                  onClick={refreshIframe}
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {isStreaming && (
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div className="flex items-center text-muted-foreground px-2">
                    <Zap className="h-3 w-3 animate-pulse text-[#5E62FF]" />
                    <span className="text-xs ml-1">Live</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Streaming in real-time</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <span className="text-muted-foreground text-xs flex-1 text-ellipsis overflow-hidden whitespace-nowrap">
            {result.url}
          </span>
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <CopyButton
                  variant="link"
                  content={result.url}
                  className="text-muted-foreground"
                />
              </TooltipTrigger>
              <TooltipContent>Copy URL</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  )
}