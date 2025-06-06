import { Message } from '@/lib/messages'
import { FragmentSchema } from '@/lib/schema'
import { ExecutionResult } from '@/lib/types'
import { DeepPartial } from 'ai'
import { Terminal, Clipboard, Check } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { ThinkingCard } from './ThinkingCard'
import { GenerationCard } from './GenerationCard'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

function CodeBlock({ className, children }: React.PropsWithChildren<{ className?: string }>) {
  const [copied, setCopied] = useState(false)
  const language = className ? className.replace('language-', '') : ''
  const code = String(children).trim()

  const recognizedLanguages = [
    'html', 'js', 'javascript', 'ts', 'typescript', 'css', 'json', 'python', 'py', 'jsx', 'tsx', 'vue', 'svelte', 'bash', 'sh', 'shell', 'sql', 'md', 'markdown'
  ]

  const isFilenameOrExtension =
    /^\.?[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(code) || 
    /^\.[a-zA-Z0-9]+$/.test(code)

  if (recognizedLanguages.includes(language) && !isFilenameOrExtension) {
    const handleCopy = () => {
      navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
    return (
      <div className="relative group">
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-1 rounded-md bg-black/60 text-white text-xs shadow-md opacity-80 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
          title={copied ? 'Copied!' : 'Copy code'}
          aria-label={copied ? 'Copied!' : 'Copy code'}
        >
          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Clipboard className="w-4 h-4" />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
        <SyntaxHighlighter language={language} style={oneDark} PreTag="div">
          {code}
        </SyntaxHighlighter>
      </div>
    )
  }

  return <code className="bg-gray-100 px-1 rounded text-sm">{children}</code>
}

export function Chat({
  messages,
  isLoading,
  setCurrentPreview,
}: {
  messages: Message[]
  isLoading: boolean
  setCurrentPreview: (preview: {
    fragment: DeepPartial<FragmentSchema> | undefined
    result: ExecutionResult | undefined
  }) => void
}) {
  const chatContainerRef = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (chatContainer) {
      chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: 'smooth',
      });
    }
  })

  return (
    <div className="w-full flex flex-col items-center">
      <div
        id="chat-container"
        ref={chatContainerRef}
        className="flex-1 w-full max-w-2xl pb-12 gap-2 overflow-y-auto"
      >
        {messages.map((message: Message, index: number) => {
          if (message.type === 'thinking') {
            return (
              <div className="w-full my-2 flex" key={index}>
                <ThinkingCard
                  stepsMarkdown={message.stepsMarkdown || ''}
                />
              </div>
            );
          }

          const thinkContent = message.content?.find(
            c => c.type === 'text' && c.text?.trim().startsWith('<think>')
          );
          if (thinkContent && thinkContent.text) {
            const stepsMarkdown = thinkContent.text.replace(/^<think>\s*/i, '');
            return (
              <div className="w-full my-2 flex" key={index}>
                <ThinkingCard stepsMarkdown={stepsMarkdown} />
              </div>
            );
          }

          return (
            <div className="w-full my-2 flex" key={index}>
              {message.noBackground ? (
                <div className="">
                  {message.content?.map((content, id: number) => {
                    if (content.type === 'text' && content.text) {
                      return (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{ code: CodeBlock }}
                          key={id}
                        >
                          {content.text}
                        </ReactMarkdown>
                      );
                    }
                    if (content.type === 'image' && content.image) {
                      return (
                        <img
                          key={id}
                          src={content.image}
                          alt="fragment"
                          className="mr-2 inline-block w-12 h-12 object-cover rounded-lg bg-white mb-2"
                        />
                      );
                    }
                    return null;
                  })}
                </div>
              ) : (
                <div
                  className={`inline-block px-4 whitespace-pre-wrap font-sans max-w-xl break-words align-top ${
                    message.role !== 'user'
                      ? ''
                      : 'bg-gradient-to-b from-black/5 to-black/10 dark:from-black/30 dark:to-black/50 py-2 rounded-xl ml-auto'
                  }`}
                >
                  {message.content?.map((content, id: number) => {
                    if (content.type === 'text' && content.text) {
                      if (message.role !== 'user') {
                        return (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{ code: CodeBlock }}
                            key={id}
                          >
                            {content.text}
                          </ReactMarkdown>
                        );
                      } else {
                        return <span key={id}>{content.text}</span>;
                      }
                    }
                    if (content.type === 'image' && content.image) {
                      return (
                        <img
                          key={id}
                          src={content.image}
                          alt="fragment"
                          className="mr-2 inline-block w-12 h-12 object-cover rounded-lg bg-white mb-2"
                        />
                      );
                    }
                    return null;
                  })}
                  {message.object && (
                    <div
                      onClick={() =>
                        setCurrentPreview({
                          fragment: message.object,
                          result: message.result,
                        })
                      }
                      className="py-2 pl-2 w-full md:w-max flex items-center border rounded-xl select-none hover:bg-white dark:hover:bg-white/5 hover:cursor-pointer mt-2"
                    >
                      <div className="rounded-[0.5rem] w-10 h-10 bg-black/5 dark:bg-white/5 self-stretch flex items-center justify-center">
                        <Terminal strokeWidth={2} className="text-[#FF8800]" />
                      </div>
                      <div className="pl-2 pr-4 flex flex-col">
                        <span className="font-bold font-sans text-sm text-primary">
                          {message.object.title}
                        </span>
                        <span className="font-sans text-sm text-muted-foreground">
                          Click to see fragment
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {isLoading && (
          <GenerationCard onOpenArtifact={() => {}} />
        )}
      </div>
    </div>
  )
}