import { useState } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { VariantProps } from 'class-variance-authority'

type CopyButtonProps = {
  content: string
  className?: string
  variant?: VariantProps<typeof buttonVariants>["variant"]
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
      variant={variant}
      className={className}
      onClick={handleCopy}
    >
      {copied ? 'Copied!' : 'Copy'}
    </Button>
  )
}