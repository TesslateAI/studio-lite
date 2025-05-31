import { useState } from 'react'
import { Button } from '@/components/ui/button'

type CopyButtonProps = {
  content: string
  className?: string
  variant?: string
}

export function CopyButton({ content, className, variant }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1000)
  }

  return (
    <Button
      type="button"
      variant={variant as any}
      className={className}
      onClick={handleCopy}
    >
      {copied ? 'Copied!' : 'Copy'}
    </Button>
  )
} 