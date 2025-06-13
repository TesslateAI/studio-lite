import { Message } from '@/lib/messages';
import { useLayoutEffect, useRef, memo, useCallback, useState, useEffect } from 'react';
import { ThinkingCard } from './ThinkingCard';
import { GenerationCard } from './GenerationCard';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Bot, User, Pencil, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { CollapsibleCodeBlock } from '../ui/CodeBlock';

const MemoizedMessage = memo(({
  message,
  onOpenArtifact,
  isStreamingResponse,
  onEdit,
  onRetry,
  isLastUserMessage,
  isLastAssistantMessage,
}: {
  message: Message,
  onOpenArtifact: (messageId: string) => void,
  isStreamingResponse: boolean,
  onEdit: (messageId: string) => void,
  onRetry: () => void,
  isLastUserMessage: boolean,
  isLastAssistantMessage: boolean,
}) => {
  const isUser = message.role === 'user';
  const [imgSrc, setImgSrc] = useState("/44959608-1a8b-4b19-8b7a-5172b49f8fbc.png");

  useEffect(() => {
    const img = new window.Image();
    img.src = "/44959608-1a8b-4b19-8b7a-5172b49f8fbc.png";
    img.onerror = () => setImgSrc("/Asset_108x.png");
  }, []);

  const thinkContent = message.stepsMarkdown;
  const mainContent = message.content.map(c => c.text).join('');
  return (
    <div className={`group w-full my-4 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex items-center gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <Avatar className="h-6 w-6 text-white flex-shrink-0">
            {isUser ? (
              <AvatarFallback className="bg-[#5E62FF]"><User className="h-4 w-4" /></AvatarFallback>
            ) : (
              <Image
                src={imgSrc}
                alt="Tesslate Logo"
                width={32}
                height={32}
                priority
              />
            )}
          </Avatar>
          <div className="prose prose-sm prose-stone dark:prose-invert max-w-2xl">
            {thinkContent && <ThinkingCard stepsMarkdown={thinkContent} />}

            {mainContent && (
              <div
                className={cn(
                  "px-4 py-2 rounded-xl whitespace-pre-wrap break-words mt-2",
                  isUser ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                )}
              >
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <>{children}</>,
                    code: ({ node, ...props }) => {
                      const match = /language-(\w+)/.exec(props.className || '');
                      const lang = match ? match[1] : '';
                      const filename = node?.data?.meta as string | undefined;

                      return !node?.properties?.inline ? (
                        <CollapsibleCodeBlock language={lang} code={String(props.children).replace(/\n$/, '')} filename={filename} />
                      ) : (
                        <code className="bg-muted text-foreground px-1 py-0.5 rounded-sm font-mono text-sm" {...props} />
                      );
                    },
                  }}
                  remarkPlugins={[remarkGfm]}
                >
                  {mainContent}
                </ReactMarkdown>
              </div>
            )}

            {message.object && (
              <GenerationCard
                title={message.object.title || "Code Artifact"}
                onOpenArtifact={() => onOpenArtifact(message.id)}
                isLoading={isStreamingResponse}
              />
            )}
          </div>
        </div>
        <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
          {!isStreamingResponse && (
            <>
              {isUser && isLastUserMessage && (
                <button onClick={() => onEdit(message.id)} className="p-1.5 rounded-full hover:bg-muted" title="Edit & Regenerate">
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
              {!isUser && isLastAssistantMessage && (
                <button onClick={onRetry} className="p-1.5 rounded-full hover:bg-muted" title="Retry Generation">
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});
MemoizedMessage.displayName = 'MemoizedMessage';


export function Chat({
  messages,
  isLoading,
  onOpenArtifact,
  onEdit,
  onRetry,
  lastUserMessageId,
  lastAssistantMessageId,
}: {
  messages: Message[]
  isLoading: boolean
  onOpenArtifact: (messageId: string) => void
  onEdit: (messageId: string) => void
  onRetry: () => void
  lastUserMessageId?: string
  lastAssistantMessageId?: string
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const isNearBottom = useRef(true);
  const lastMessage = messages[messages.length - 1];

  const checkScrollPosition = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, clientHeight, scrollHeight } = scrollRef.current;
    const threshold = 50;
    isNearBottom.current = scrollTop + clientHeight + threshold >= scrollHeight;
  }, []);
  useLayoutEffect(() => {
    if (scrollRef.current && isNearBottom.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex-1 w-full flex flex-col items-center overflow-y-auto" ref={scrollRef} onScroll={checkScrollPosition}>
      <div
        id="chat-container"
        className="w-full max-w-4xl px-4 pt-4 pb-12"
      >
        {messages.map((message) => (
          <MemoizedMessage
            message={message}
            key={message.id}
            onOpenArtifact={onOpenArtifact}
            isStreamingResponse={isLoading && lastMessage?.id === message.id}
            onEdit={onEdit}
            onRetry={onRetry}
            isLastUserMessage={message.id === lastUserMessageId}
            isLastAssistantMessage={message.id === lastAssistantMessageId}
          />
        ))}
      </div>
    </div>
  );
}