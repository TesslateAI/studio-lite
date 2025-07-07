import { Message } from '@/lib/messages';
import { useLayoutEffect, useRef, memo, useCallback, useState, useEffect } from 'react';
import { ThinkingCard } from './ThinkingCard';
import { GenerationCard } from './GenerationCard';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Bot, User, Pencil, RefreshCw, Check, X } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { CollapsibleCodeBlock } from '../ui/CodeBlock';
import TextareaAutosize from 'react-textarea-autosize';

const MemoizedMessage = memo(({
  message,
  onOpenArtifact,
  isStreamingResponse,
  onEdit,
  onRetry,
  isLastUserMessage,
  isLastAssistantMessage,
  editingMessageId,
  onStartEditing,
  onCancelEditing,
  onSaveEdit,
}: {
  message: Message,
  onOpenArtifact: (messageId: string) => void,
  isStreamingResponse: boolean,
  onEdit: (messageId: string, newText: string) => void,
  onRetry: () => void,
  isLastUserMessage: boolean,
  isLastAssistantMessage: boolean,
  editingMessageId?: string,
  onStartEditing: (messageId: string) => void,
  onCancelEditing: () => void,
  onSaveEdit: (messageId: string, newText: string) => void,
}) => {
  const isUser = message.role === 'user';
  const [editText, setEditText] = useState('');
  const isEditing = editingMessageId === message.id;


  useEffect(() => {
    if (isEditing) {
      const currentText = message.content.map(c => c.text).join('');
      setEditText(currentText);
    }
  }, [isEditing, message.content]);

  const handleStartEdit = () => {
    onStartEditing(message.id);
  };

  const handleSaveEdit = () => {
    onSaveEdit(message.id, editText);
  };

  const handleCancelEdit = () => {
    onCancelEditing();
  };

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
                src="/tesslate-logo.svg"
                alt="Tesslate Logo"
                width={100}
                height={100}
                priority
              />
            )}
          </Avatar>
          <div className="prose prose-sm prose-stone dark:prose-invert max-w-2xl">
            {thinkContent && <ThinkingCard stepsMarkdown={thinkContent} isStreaming={isStreamingResponse} />}

            {(mainContent || isUser) && (
              <div
                className={cn(
                  "px-4 py-2 rounded-xl whitespace-pre-wrap break-words mt-2",
                  isUser ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                )}
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <TextareaAutosize
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full p-2 rounded border border-border bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Edit your message..."
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={handleCancelEdit}
                        className="p-1 rounded hover:bg-muted"
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="p-1 rounded hover:bg-muted"
                        title="Save & Regenerate"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {mainContent ? (
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
                    ) : (
                      <span className="text-muted-foreground italic">Empty message</span>
                    )}
                  </>
                )}
              </div>
            )}

            {message.object && (
              <GenerationCard
                title={message.object.title || "Code Artifact"}
                onOpenArtifact={() => onOpenArtifact(message.id)}
                isLoading={isStreamingResponse}
                projectData={message.object}
              />
            )}
          </div>
        </div>
        <div className="flex-shrink-0 self-center opacity-70 group-hover:opacity-100 transition-opacity">
          <>
            {!isStreamingResponse && isUser && isLastUserMessage && !isEditing && (
              <button onClick={handleStartEdit} className="p-2 rounded-full hover:bg-muted border border-border/50 hover:border-border hover:shadow-sm" title="Edit & Regenerate">
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            {!isUser && isLastAssistantMessage && (
              <button 
                onClick={onRetry} 
                className={cn(
                  "p-2 rounded-full border border-border/50 hover:border-border hover:shadow-sm transition-colors",
                  isStreamingResponse ? "bg-red-50 hover:bg-red-100 text-red-600" : "hover:bg-muted text-muted-foreground"
                )}
                title={isStreamingResponse ? "Stop & Retry Generation" : "Retry Generation"}
              >
                <RefreshCw className={cn("h-4 w-4", isStreamingResponse && "animate-spin")} />
              </button>
            )}
          </>
        </div>
      </div>
    </div>
  );
});
MemoizedMessage.displayName = 'MemoizedMessage';


const Chat = memo(function Chat({
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
  onEdit: (messageId: string, newText: string) => void
  onRetry: () => void
  lastUserMessageId?: string
  lastAssistantMessageId?: string
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const isNearBottom = useRef(true);
  const lastMessage = messages[messages.length - 1];
  const [editingMessageId, setEditingMessageId] = useState<string | undefined>();

  const handleStartEditing = (messageId: string) => {
    setEditingMessageId(messageId);
  };

  const handleCancelEditing = () => {
    setEditingMessageId(undefined);
  };

  const handleSaveEdit = (messageId: string, newText: string) => {
    setEditingMessageId(undefined);
    onEdit(messageId, newText);
  };


  const checkScrollPosition = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, clientHeight, scrollHeight } = scrollRef.current;
    const threshold = 50;
    isNearBottom.current = scrollTop + clientHeight + threshold >= scrollHeight;
    
    // Store scroll position for smart streaming (optional enhancement)
    // This could be used by a parent smart streaming manager
    if (scrollRef.current.dataset.chatId) {
      window.dispatchEvent(new CustomEvent('scroll-position-update', {
        detail: { 
          chatId: scrollRef.current.dataset.chatId,
          scrollTop,
          isNearBottom: isNearBottom.current
        }
      }));
    }
  }, []);
  useLayoutEffect(() => {
    if (scrollRef.current && isNearBottom.current) {
      // Smart scroll behavior to reduce jumping
      const scrollToBottom = () => {
        if (scrollRef.current) {
          const container = scrollRef.current;
          const currentScroll = container.scrollTop;
          const maxScroll = container.scrollHeight - container.clientHeight;
          
          // If we're already at the bottom, scroll immediately
          if (Math.abs(currentScroll - maxScroll) < 10) {
            container.scrollTop = container.scrollHeight;
          } else {
            // Smooth scroll to bottom during streaming to reduce jarring
            container.scrollTo({
              top: container.scrollHeight,
              behavior: isLoading ? 'auto' : 'smooth'
            });
          }
        }
      };
      
      if (isLoading) {
        // During streaming, batch scroll updates to reduce frequency
        const timeoutId = setTimeout(scrollToBottom, 100);
        return () => clearTimeout(timeoutId);
      } else {
        requestAnimationFrame(scrollToBottom);
      }
    }
  }, [messages, isLoading]);

  return (
    <div className="h-full w-full overflow-y-auto overscroll-contain" ref={scrollRef} onScroll={checkScrollPosition}>
      <div
        id="chat-container"
        className="w-full max-w-4xl mx-auto px-4 pt-4 pb-16"
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
            editingMessageId={editingMessageId}
            onStartEditing={handleStartEditing}
            onCancelEditing={handleCancelEditing}
            onSaveEdit={handleSaveEdit}
          />
        ))}
        {isLoading && (
          <div className="group w-full my-4 flex justify-start">
            <div className="flex items-center gap-2">
              <div className="flex items-start gap-3">
                <Avatar className="h-6 w-6 text-white flex-shrink-0">
                  <Image
                    src="/tesslate-logo.svg"
                    alt="Tesslate Logo"
                    width={100}
                    height={100}
                    priority
                  />
                </Avatar>
                <div className="prose prose-sm prose-stone dark:prose-invert max-w-2xl">
                  <div className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground">
                    <div className="flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <span className="text-sm text-muted-foreground">Generating response...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export { Chat };