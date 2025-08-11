import { Message } from '@/lib/messages';
import React, { useLayoutEffect, useRef, memo, useCallback, useState, useEffect } from 'react';
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

// Helper component to render hex color with preview box
const ColorPreview = ({ color }: { color: string }) => (
  <span className="inline-flex items-center gap-1 mx-0.5">
    <span 
      className="inline-block w-4 h-4 rounded border border-gray-400 dark:border-gray-600"
      style={{ backgroundColor: color }}
      title={color}
    />
    <code className="font-bold font-mono text-sm">{color}</code>
  </span>
);

// Helper function to process text and highlight hex colors
const processTextForColors = (text: string): React.ReactNode[] => {
  // Regex to match hex colors (#RGB, #RGBA, #RRGGBB, #RRGGBBAA)
  const hexColorRegex = /(#[0-9A-Fa-f]{3}(?:[0-9A-Fa-f]{1})?(?:[0-9A-Fa-f]{2})?(?:[0-9A-Fa-f]{2})?)\b/g;
  const parts = text.split(hexColorRegex);
  
  return parts.map((part, index) => {
    // Check if this part is a hex color
    if (part.match(/^#[0-9A-Fa-f]{3,8}$/)) {
      return <ColorPreview key={index} color={part} />;
    }
    return part;
  });
};

// Component for streaming code blocks that auto-scrolls
const StreamingCodeBlock = ({ filename, lang, codeContent }: { filename?: string; lang: string; codeContent: string }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [codeContent]);
  
  return (
    <div className="my-3 rounded-xl border bg-muted/30 overflow-hidden shadow-sm">
      <div className="px-4 py-2.5 bg-muted/50 border-b border-border flex items-center justify-between">
        <span className="font-mono text-sm text-muted-foreground font-medium">
          {filename || lang || 'code'}
        </span>
      </div>
      <div 
        ref={scrollRef}
        className="overflow-auto bg-[#1e1e1e]"
        style={{ maxHeight: '400px' }}
      >
        <pre className="p-4 text-gray-300 font-mono text-sm leading-relaxed">
          <code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#d4d4d4' }}>
            {codeContent}
          </code>
        </pre>
      </div>
    </div>
  );
};

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
    <div className={`group w-full py-6 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex items-center gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'} max-w-[80%]`}>
        <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <Avatar className="h-8 w-8 text-white flex-shrink-0">
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
          <div className="flex flex-col gap-2 max-w-2xl">
            {thinkContent && <ThinkingCard stepsMarkdown={thinkContent} isStreaming={isStreamingResponse} />}

            {(mainContent || isUser) && (
              <div
                className={cn(
                  "px-5 py-3 rounded-2xl whitespace-pre-wrap break-words shadow-sm border",
                  isUser ? 'bg-primary text-primary-foreground border-primary/20' : 'bg-card text-card-foreground border-border'
                )}
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <TextareaAutosize
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full p-3 rounded-lg border border-border bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
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
                          // Process all text-containing elements for hex colors
                          p: ({ children }) => {
                            const processedChildren = React.Children.map(children, (child) => {
                              if (typeof child === 'string') {
                                return processTextForColors(child);
                              }
                              return child;
                            });
                            return <p>{processedChildren}</p>;
                          },
                          li: ({ children }) => {
                            const processedChildren = React.Children.map(children, (child) => {
                              if (typeof child === 'string') {
                                return processTextForColors(child);
                              }
                              return child;
                            });
                            return <li>{processedChildren}</li>;
                          },
                          h1: ({ children }) => {
                            const processedChildren = React.Children.map(children, (child) => {
                              if (typeof child === 'string') {
                                return processTextForColors(child);
                              }
                              return child;
                            });
                            return <h1>{processedChildren}</h1>;
                          },
                          h2: ({ children }) => {
                            const processedChildren = React.Children.map(children, (child) => {
                              if (typeof child === 'string') {
                                return processTextForColors(child);
                              }
                              return child;
                            });
                            return <h2>{processedChildren}</h2>;
                          },
                          h3: ({ children }) => {
                            const processedChildren = React.Children.map(children, (child) => {
                              if (typeof child === 'string') {
                                return processTextForColors(child);
                              }
                              return child;
                            });
                            return <h3>{processedChildren}</h3>;
                          },
                          h4: ({ children }) => {
                            const processedChildren = React.Children.map(children, (child) => {
                              if (typeof child === 'string') {
                                return processTextForColors(child);
                              }
                              return child;
                            });
                            return <h4>{processedChildren}</h4>;
                          },
                          h5: ({ children }) => {
                            const processedChildren = React.Children.map(children, (child) => {
                              if (typeof child === 'string') {
                                return processTextForColors(child);
                              }
                              return child;
                            });
                            return <h5>{processedChildren}</h5>;
                          },
                          h6: ({ children }) => {
                            const processedChildren = React.Children.map(children, (child) => {
                              if (typeof child === 'string') {
                                return processTextForColors(child);
                              }
                              return child;
                            });
                            return <h6>{processedChildren}</h6>;
                          },
                          strong: ({ children }) => {
                            const processedChildren = React.Children.map(children, (child) => {
                              if (typeof child === 'string') {
                                return processTextForColors(child);
                              }
                              return child;
                            });
                            return <strong>{processedChildren}</strong>;
                          },
                          em: ({ children }) => {
                            const processedChildren = React.Children.map(children, (child) => {
                              if (typeof child === 'string') {
                                return processTextForColors(child);
                              }
                              return child;
                            });
                            return <em>{processedChildren}</em>;
                          },
                          blockquote: ({ children }) => {
                            const processedChildren = React.Children.map(children, (child) => {
                              if (typeof child === 'string') {
                                return processTextForColors(child);
                              }
                              return child;
                            });
                            return <blockquote>{processedChildren}</blockquote>;
                          },
                          td: ({ children }) => {
                            const processedChildren = React.Children.map(children, (child) => {
                              if (typeof child === 'string') {
                                return processTextForColors(child);
                              }
                              return child;
                            });
                            return <td>{processedChildren}</td>;
                          },
                          th: ({ children }) => {
                            const processedChildren = React.Children.map(children, (child) => {
                              if (typeof child === 'string') {
                                return processTextForColors(child);
                              }
                              return child;
                            });
                            return <th>{processedChildren}</th>;
                          },
                          span: ({ children }) => {
                            const processedChildren = React.Children.map(children, (child) => {
                              if (typeof child === 'string') {
                                return processTextForColors(child);
                              }
                              return child;
                            });
                            return <span>{processedChildren}</span>;
                          },
                          code: ({ node, ...props }) => {
                            const match = /language-(\w+)/.exec(props.className || '');
                            const lang = match ? match[1] : '';
                            const filename = node?.data?.meta as string | undefined;
                            const codeContent = String(props.children).replace(/\n$/, '');
                            const blockId = `${message.id}-${lang}-${filename || 'code'}-${props.key || ''}`;

                            // For inline code, always use simple code element
                            if (node?.properties?.inline) {
                              return (
                                <code className="bg-muted/50 text-foreground px-1.5 py-0.5 rounded-md font-mono text-sm border border-border/50" {...props} />
                              );
                            }

                            // For code blocks: show simple scrollable div during streaming, collapsible after
                            if (isStreamingResponse) {
                              return (
                                <StreamingCodeBlock 
                                  filename={filename} 
                                  lang={lang} 
                                  codeContent={codeContent} 
                                />
                              );
                            } else {
                              return (
                                <CollapsibleCodeBlock 
                                  language={lang} 
                                  code={codeContent} 
                                  filename={filename} 
                                  blockId={blockId}
                                />
                              );
                            }
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
        <div className="flex-shrink-0 self-start mt-3 opacity-0 group-hover:opacity-100 transition-all duration-200">
          <div className="flex flex-col gap-1">
            {!isStreamingResponse && isUser && isLastUserMessage && !isEditing && (
              <button onClick={handleStartEdit} className="p-2 rounded-lg hover:bg-muted/80 border border-transparent hover:border-border hover:shadow-sm transition-all" title="Edit & Regenerate">
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            {!isUser && isLastAssistantMessage && (
              <button 
                onClick={onRetry} 
                className={cn(
                  "p-2 rounded-lg border border-transparent hover:border-border hover:shadow-sm transition-all",
                  isStreamingResponse ? "bg-red-50 hover:bg-red-100 text-red-600 border-red-200" : "hover:bg-muted/80 text-muted-foreground"
                )}
                title={isStreamingResponse ? "Stop & Retry Generation" : "Retry Generation"}
              >
                <RefreshCw className={cn("h-4 w-4", isStreamingResponse && "animate-spin")} />
              </button>
            )}
          </div>
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
    <div className="h-full w-full overflow-y-auto overscroll-contain bg-background" ref={scrollRef} onScroll={checkScrollPosition}>
      <div
        id="chat-container"
        className="w-full max-w-5xl mx-auto px-6 pt-8 pb-20"
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
          <div className="group w-full py-6 flex justify-start">
            <div className="flex items-center gap-2 max-w-[80%]">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8 text-white flex-shrink-0">
                  <Image
                    src="/tesslate-logo.svg"
                    alt="Tesslate Logo"
                    width={100}
                    height={100}
                    priority
                  />
                </Avatar>
                <div className="flex flex-col gap-2 max-w-2xl">
                  <div className="px-5 py-3 rounded-2xl bg-card text-card-foreground border border-border shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex space-x-1.5">
                        <div className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
                        <div className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
                      </div>
                      <span className="text-sm text-muted-foreground font-medium">Generating response...</span>
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