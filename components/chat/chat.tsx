import { Message } from '@/lib/messages'
import { FragmentSchema } from '@/lib/schema'
import { ExecutionResult } from '@/lib/types'
import { DeepPartial } from 'ai'
import { LoaderIcon, Terminal } from 'lucide-react'
import { useEffect } from 'react'
import { ThinkingCard } from './ThinkingCard'
import { GenerationCard } from './GenerationCard'
import ReactMarkdown from 'react-markdown'

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
  useEffect(() => {
    const chatContainer = document.getElementById('chat-container')
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight
    }
  }, [JSON.stringify(messages)])

  return (
    <div className="w-full flex flex-col items-center">
      <div id="chat-container" className="w-full max-w-2xl pb-12 gap-2 overflow-y-auto max-h-full">
        {messages.map((message: any, index: number) => {
          if (message.type === 'thinking') {
            return (
              <div className="w-full my-2 flex" key={index}>
                <ThinkingCard
                  seconds={message.seconds}
                  stepsMarkdown={message.stepsMarkdown}
                  running={message.running}
                />
              </div>
            );
          }
          // Check for <think> in any text content (legacy fallback)
          const thinkContent = message.content && message.content.find(
            (c: any) => c.type === 'text' && c.text.trim().startsWith('<think>')
          );
          if (thinkContent) {
            const stepsMarkdown = thinkContent.text.replace(/^<think>\s*/i, '');
            return (
              <div className="w-full my-2 flex" key={index}>
                <ThinkingCard seconds={3} stepsMarkdown={stepsMarkdown} running={false} />
              </div>
            );
          }
          // Default rendering for other messages
          return (
            <div className="w-full my-2 flex" key={index}>
              {message.noBackground ? (
                <div className="">
                  {message.content && message.content.map((content: any, id: number) => {
                    if (content.type === 'text') {
                      return <ReactMarkdown key={id}>{content.text}</ReactMarkdown>;
                    }
                    if (content.type === 'image') {
                      return (
                        <img
                          key={id}
                          src={content.image}
                          alt="fragment"
                          className="mr-2 inline-block w-12 h-12 object-cover rounded-lg bg-white mb-2"
                        />
                      );
                    }
                  })}
                </div>
              ) : (
                <div
                  className={`inline-block px-4 shadow-sm whitespace-pre-wrap font-sans max-w-xl break-words align-top ${
                    message.role !== 'user'
                      ? 'bg-muted'
                      : 'bg-gradient-to-b from-black/5 to-black/10 dark:from-black/30 dark:to-black/50 py-2 rounded-xl ml-auto'
                  }`}
                >
                  {message.content && message.content.map((content: any, id: number) => {
                    if (content.type === 'text') {
                      return content.text;
                    }
                    if (content.type === 'image') {
                      return (
                        <img
                          key={id}
                          src={content.image}
                          alt="fragment"
                          className="mr-2 inline-block w-12 h-12 object-cover rounded-lg bg-white mb-2"
                        />
                      );
                    }
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

// Add this to your global CSS or Tailwind config:
// .animate-spin-slow { animation: spin 2s linear infinite; } 