'use client';

import Layout from '../(dashboard)/layout';
import { useState, useRef, useEffect, useMemo } from 'react';
import { Chat } from '../../components/chat/chat';
import { ChatInput } from '../../components/chat/chat-input';
import { ChatPicker } from '../../components/chat/chat-picker';
import { PenSquare } from 'lucide-react';
import React from 'react';
import { FragmentWeb } from '../../components/fragment-web'
import useSWR from 'swr';
import { SandpackPreviewer } from '../../components/chat/SandpackPreviewer';
import Split from 'react-split';
import '../../split-gutter.css';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useRouter } from 'next/navigation';
import { ChatCompletionStream } from '../../lib/stream-processing';
import { splitByFirstCodeFence, extractFirstCodeBlock } from '../../lib/code-detection';
import { SandboxManager } from '../../lib/sandbox-manager';
import { useSandbox } from '../../lib/hooks/use-sandbox';

export default function ChatPage() {
  const [selectedTemplate, setSelectedTemplate] = useState('auto');
  const [messages, setMessages] = useState<any[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isErrored, setIsErrored] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [currentPreview, setCurrentPreview] = useState<{ fragment?: any; result?: any }>({});
  const [splitSizes, setSplitSizes] = useState([55, 45]);
  const [userPlan] = useState<'free' | 'pro'>('free');
  const [selectedModel, setSelectedModel] = useState<string>('');

  // Use our new sandbox hook
  const sandboxState = useSandbox();
  const sandboxManagerRef = useRef<SandboxManager | undefined>(undefined);

  // Initialize sandbox manager
  useEffect(() => {
    if (sandboxState.sandboxManager) {
      sandboxManagerRef.current = sandboxState.sandboxManager;
    }
  }, [sandboxState.sandboxManager]);

  // Fetch models dynamically
  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  const { data: modelsData } = useSWR('/api/models', fetcher);
  const models = modelsData?.models || [];

  useEffect(() => {
    if (
      models.length > 0 &&
      (!selectedModel || !models.some((m: { id: string }) => m.id === selectedModel))
    ) {
      const firstFree = models.find((m: { access?: string }) => m.access === 'free');
      setSelectedModel(firstFree ? firstFree.id : models[0].id);
    }
  }, [models, selectedModel]);

  const showWelcome = messages.length === 0;
  const { data: user, isLoading: isUserLoading } = useSWR('/api/user', fetcher);
  const { data: stripeData } = useSWR('/api/stripe/user', fetcher);
  const abortControllerRef = useRef<AbortController | null>(null);
  const router = useRouter();

  // Guest mode logic
  const isGuest = !user;
  const guestMessageLimit = 5;
  const [guestMessageCount, setGuestMessageCount] = useState(0);

  useEffect(() => {
    if (isGuest) {
      const localData = JSON.parse(localStorage.getItem('guestMessageData') || '{"count":0,"timestamp":0}');
      setGuestMessageCount(localData.count || 0);

      fetch('/api/chat/guest-count')
        .then(res => res.json())
        .then(data => {
          if (typeof data.count === 'number' && data.count > (localData.count || 0)) {
            setGuestMessageCount(data.count);
            localStorage.setItem('guestMessageData', JSON.stringify({ count: data.count, timestamp: Date.now() }));
          }
        });

      const handleStorage = (event: StorageEvent) => {
        if (event.key === 'guestMessageData') {
          const newData = JSON.parse(event.newValue || '{"count":0,"timestamp":0}');
          setGuestMessageCount(newData.count || 0);
        }
      };
      window.addEventListener('storage', handleStorage);
      return () => {
        window.removeEventListener('storage', handleStorage);
      };
    }
  }, [isGuest]);

  // Thinking state management
  const [thinkingMessage, setThinkingMessage] = useState<any>(null);
  const thinkingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const thinkingStartRef = useRef<number>(0);

  function startThinking() {
    thinkingStartRef.current = Date.now();
    const thinkingMsg = {
      type: 'thinking',
      stepsMarkdown: '',
      seconds: 0,
      running: true,
      role: 'assistant',
      content: [],
    };
    setThinkingMessage(thinkingMsg);

    // Start timer
    thinkingTimerRef.current = setInterval(() => {
      const seconds = Math.floor((Date.now() - thinkingStartRef.current) / 1000);
      setThinkingMessage((prev: any) => prev ? { ...prev, seconds } : null);
    }, 1000);
  }

  function updateThinking(text: string) {
    setThinkingMessage((prev: any) => prev ? { ...prev, stepsMarkdown: text } : null);
  }

  function stopThinking() {
    if (thinkingTimerRef.current) {
      clearInterval(thinkingTimerRef.current);
      thinkingTimerRef.current = null;
    }
    setThinkingMessage((prev: any) => prev ? { ...prev, running: false } : null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isLoading || !chatInput.trim()) return;

    setIsLoading(true);
    setIsErrored(false);
    setErrorMessage('');

    const userMessage = chatInput;
    setChatInput('');

    abortControllerRef.current = new AbortController();

    // Add the user's message
    const newUserMessage = {
      role: 'user',
      content: [{ type: 'text', text: userMessage }],
      object: null
    };

    setMessages(prev => [...prev, newUserMessage]);

    try {
      // Transform messages to OpenAI format
      const openAIMessages = [...messages, newUserMessage].map(m => ({
        role: m.role,
        content: m.content?.[0]?.text || ''
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: openAIMessages,
          selectedModelId: selectedModel,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (response.status === 429) {
        setIsRateLimited(true);
        setGuestMessageCount(guestMessageLimit);
        localStorage.setItem('guestMessageData', JSON.stringify({ count: guestMessageLimit, timestamp: Date.now() }));
        setIsLoading(false);
        setErrorMessage('You have reached the guest message limit. Please sign up for more access.');
        setIsErrored(true);
        return;
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Initialize assistant message
      const assistantMessage = {
        role: 'assistant',
        content: [{ type: 'text', text: '' }],
        object: null,
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Process the stream
      let accumulatedContent = '';
      let isThinking = false;
      let thinkingText = '';
      let codeDetected = false;

      const stream = ChatCompletionStream.fromReadableStream(response.body);

      stream
        .on('content', (delta, content) => {
          accumulatedContent = content;

          // Handle thinking blocks
          if (content.includes('<think>') && !isThinking) {
            isThinking = true;
            startThinking();
            thinkingText = content.split('<think>').pop() || '';
            updateThinking(thinkingText);
          } else if (isThinking && content.includes('</think>')) {
            thinkingText += content.split('</think>')[0];
            updateThinking(thinkingText);
            stopThinking();
            isThinking = false;

            // Add thinking message to history
            if (thinkingMessage) {
              setMessages(prev => [...prev.slice(0, -1), thinkingMessage, assistantMessage]);
            }

            // Update content without thinking block
            const cleanContent = content.replace(/<think>[\s\S]*?<\/think>/g, '');
            accumulatedContent = cleanContent;
          } else if (isThinking) {
            thinkingText += delta;
            updateThinking(thinkingText);
            return; // Don't update main message while thinking
          }

          // Detect code blocks using our utility
          if (!codeDetected && sandboxManagerRef.current) {
            const parts = splitByFirstCodeFence(content);
            const codeBlock = parts.find(part =>
              part.type === 'first-code-fence' ||
              part.type === 'first-code-fence-generating'
            );

            if (codeBlock) {
              codeDetected = true;

              console.log('Code block detected:', {
                type: codeBlock.type,
                language: codeBlock.language,
                filename: codeBlock.filename,
                contentLength: codeBlock.content.length
              });

              // Start streaming code to sandbox
              sandboxManagerRef.current.startCodeStreaming(
                codeBlock.language,
                codeBlock.filename.name || null
              );

              // Update with streaming content
              if (codeBlock.type === 'first-code-fence-generating') {
                sandboxManagerRef.current.updateStreamingCode(
                  codeBlock.language,
                  codeBlock.filename.name || null,
                  codeBlock.content
                );
              } else {
                // Complete code block
                sandboxManagerRef.current.completeCodeStreaming(
                  codeBlock.language,
                  codeBlock.filename.name || null,
                  codeBlock.content
                );
              }
            }
          } else if (codeDetected && sandboxManagerRef.current) {
            // Continue updating streaming code
            const codeBlock = extractFirstCodeBlock(content);
            if (codeBlock) {
              console.log('Code block update:', {
                isComplete: codeBlock.isComplete,
                codeLength: codeBlock.code.length
              });

              if (codeBlock.isComplete) {
                sandboxManagerRef.current.completeCodeStreaming(
                  codeBlock.language,
                  codeBlock.filename,
                  codeBlock.code
                );
              } else {
                sandboxManagerRef.current.updateStreamingCode(
                  codeBlock.language,
                  codeBlock.filename,
                  codeBlock.code
                );
              }
            }
          }

          // Update message content
          setMessages(prev => {
            const updated = [...prev];
            const lastMessage = updated[updated.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.content = [{ type: 'text', text: accumulatedContent }];
            }
            return updated;
          });
        })
        .on('finalContent', (finalContent) => {
          // Handle any final cleanup
          if (isThinking) {
            stopThinking();
          }
        });

      await stream.start();

    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Chat error:', error);
        setIsErrored(true);
        setErrorMessage(error?.message || 'An error occurred');
      }
    } finally {
      setIsLoading(false);
      if (thinkingTimerRef.current) {
        stopThinking();
      }
    }
  }

  function handleFileChange(change: any) {
    setFiles(change);
  }

  function handleSaveInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setChatInput(e.target.value);
  }

  function retry() {
    setIsErrored(false);
    setErrorMessage('');
  }

  function stop() {
    setIsLoading(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (sandboxManagerRef.current) {
      sandboxManagerRef.current.clear();
    }
    stopThinking();
  }

  function newChat() {
    setMessages([]);
    setChatInput('');
    setErrorMessage('');
    setIsErrored(false);
    setCurrentPreview({});
    if (sandboxManagerRef.current) {
      sandboxManagerRef.current.clear();
    }
    stop();
    if (isGuest) {
      setGuestMessageCount(0);
      localStorage.setItem('guestMessageData', JSON.stringify({ count: 0, timestamp: Date.now() }));
    }
  }

  // Wrap handleSubmit to increment guest message count
  const handleGuestSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (guestMessageCount >= guestMessageLimit) return;
    handleSubmit(e);
    if (isGuest) {
      const newCount = guestMessageCount + 1;
      setGuestMessageCount(newCount);
      localStorage.setItem('guestMessageData', JSON.stringify({ count: newCount, timestamp: Date.now() }));
    }
  };

  // Handler for sign up button
  const handleSignUp = () => {
    router.push('/sign-up');
  };

  // Combine messages with thinking message if active
  const displayMessages = useMemo(() => {
    if (thinkingMessage && thinkingMessage.running) {
      // Insert thinking message before the last assistant message
      const msgs = [...messages];
      const lastAssistantIndex = msgs.findLastIndex(m => m.role === 'assistant');
      if (lastAssistantIndex !== -1) {
        msgs.splice(lastAssistantIndex, 0, thinkingMessage);
      }
      return msgs;
    }
    return messages;
  }, [messages, thinkingMessage]);

  // Determine if we should show the sandbox
  const showSandbox = sandboxState.isShowingCodeViewer && Object.keys(sandboxState.files).length > 0;

  return (
    <Layout>
      <div className="h-[calc(100vh-70px)] w-full bg-muted flex flex-col overflow-x-hidden">
        {/* Floating New Chat button and Plan badge */}
        <div style={{ position: 'absolute', top: isGuest ? 15 : 15, right: isGuest ? 180 : 100, zIndex: 50 }} className="flex flex-row gap-3 items-center">
          {!isGuest && (
            <span className="inline-flex items-center gap-2 px-3 font-medium text-sm">
              {stripeData === undefined ? (
                <>
                  <span className="inline-block w-3 h-3 rounded-full bg-gray-200 animate-pulse"></span>
                  <span className="bg-gray-200 rounded w-10 h-3 animate-pulse"></span>
                </>
              ) : (
                <>
                  <span className={`inline-block w-3 h-3 rounded-full ${stripeData?.planName === 'Pro' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                  {stripeData?.planName === 'Pro' ? 'Pro' : 'Free Plan'}
                </>
              )}
            </span>
          )}
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={newChat}
                  className="flex items-center gap-2 px-3 py-2 h-auto text-sm font-normal
                   border border-gray-200 hover:bg-gray-50 transition-colors
                   rounded-lg shadow-sm text-black bg-white"
                >
                  <PenSquare className="w-4 h-4" />
                  <span>New Chat</span>
                </button>
              </TooltipTrigger>
            </Tooltip>
          </TooltipProvider>

        </div>

        {/* Main content */}
        {showSandbox ? (
          // Split view with chat and sandbox
          <div className="flex-1 h-full w-full" style={{ minWidth: 0, display: 'flex' }}>
            <Split
              className="flex-1 h-full split-horizontal"
              minSize={[300, 300]}
              gutterSize={8}
              direction="horizontal"
              style={{ display: 'flex', height: '100%' }}
              onDragEnd={setSplitSizes}
            >
              {/* Chat area (left side) */}
              <div className="flex flex-col flex-1 h-full min-w-[300px] max-w-full overflow-hidden">
                <div className="flex flex-col w-full max-h-full px-4 overflow-auto flex-1">
                  <Chat
                    messages={displayMessages}
                    isLoading={isLoading}
                    setCurrentPreview={setCurrentPreview}
                  />
                </div>
                <div className="w-full bg-muted z-10 p-4">
                  <div className="max-w-4xl mx-auto">
                    <ChatInput
                      retry={retry}
                      isErrored={isErrored}
                      errorMessage={errorMessage}
                      isLoading={isLoading}
                      isRateLimited={isRateLimited}
                      stop={stop}
                      input={chatInput}
                      handleInputChange={handleSaveInputChange}
                      handleSubmit={isGuest ? handleGuestSubmit : handleSubmit}
                      isMultiModal={false}
                      files={files}
                      handleFileChange={handleFileChange}
                      isGuest={isGuest}
                      guestMessageCount={guestMessageCount}
                      guestMessageLimit={guestMessageLimit}
                      onSignUp={handleSignUp}
                      selectedModel={selectedModel}
                    >
                      {models.length === 0 ? (
                        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                      ) : (
                        <ChatPicker models={models} selectedModel={selectedModel} onSelectedModelChange={setSelectedModel} userPlan={isGuest ? 'free' : (stripeData?.planName === 'Pro' ? 'pro' : 'free')} />
                      )}
                    </ChatInput>
                  </div>
                </div>
              </div>

              {/* Sandbox (right side) */}
              <div className="flex flex-col min-w-[300px] h-full overflow-hidden">
                <SandpackPreviewer
                  files={sandboxState.files}
                  isStreaming={sandboxState.isStreaming}
                  activeTab={sandboxState.activeTab}
                  onTabChange={(tab) => sandboxManagerRef.current?.setActiveTab(tab)}
                />
              </div>
            </Split>
          </div>
        ) : currentPreview.result ? (
          // Legacy FragmentWeb preview
          <div className="flex-1 h-full w-full flex flex-row min-w-0">
            <Split
              className="flex-1 h-full split-horizontal"
              minSize={[300, 200]}
              gutterSize={8}
              direction="horizontal"
              style={{ display: 'flex', height: '100%' }}
            >
              {/* Chat area (left side) */}
              <div className="flex flex-col flex-1 h-full min-w-[300px] max-w-full overflow-hidden">
                <div className="flex flex-col w-full max-h-full px-4 overflow-auto flex-1">
                  <Chat
                    messages={displayMessages}
                    isLoading={isLoading}
                    setCurrentPreview={setCurrentPreview}
                  />
                </div>
                <div className="w-full bg-muted z-10 p-4">
                  <div className="max-w-4xl mx-auto">
                    <ChatInput
                      retry={retry}
                      isErrored={isErrored}
                      errorMessage={errorMessage}
                      isLoading={isLoading}
                      isRateLimited={isRateLimited}
                      stop={stop}
                      input={chatInput}
                      handleInputChange={handleSaveInputChange}
                      handleSubmit={isGuest ? handleGuestSubmit : handleSubmit}
                      isMultiModal={false}
                      files={files}
                      handleFileChange={handleFileChange}
                      isGuest={isGuest}
                      guestMessageCount={guestMessageCount}
                      guestMessageLimit={guestMessageLimit}
                      onSignUp={handleSignUp}
                      selectedModel={selectedModel}
                    >
                      {models.length === 0 ? (
                        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                      ) : (
                        <ChatPicker models={models} selectedModel={selectedModel} onSelectedModelChange={setSelectedModel} userPlan={isGuest ? 'free' : (stripeData?.planName === 'Pro' ? 'pro' : 'free')} />
                      )}
                    </ChatInput>
                  </div>
                </div>
              </div>

              {/* FragmentWeb preview (right side) */}
              <div className="flex flex-col min-w-[200px] h-full overflow-hidden bg-white dark:bg-black/10 border-l border-gray-200">
                <FragmentWeb result={currentPreview.result} isStreaming={sandboxState.isStreaming} />
              </div>
            </Split>
          </div>
        ) : (
          // Just chat, no preview
          <div className="flex-1 flex flex-col overflow-hidden relative w-full">
            {showWelcome ? (
              <div className="flex flex-1 flex-col items-center justify-center w-full h-full">
                <h1 className="text-3xl md:text-3l mb-2 text-center">
                  {isGuest ? 'Hello, World' : `Hello, ${user?.name || 'User'}`}
                </h1>
                {isGuest && (
                  <div className="text-sm text-gray-500 mb-4">Try our advanced features for free. Get smarter responses, upload files, create images, and more by logging in.</div>
                )}
                <div className="w-full max-w-2xl">
                  <ChatInput
                    retry={retry}
                    isErrored={isErrored}
                    errorMessage={errorMessage}
                    isLoading={isLoading}
                    isRateLimited={isRateLimited}
                    stop={stop}
                    input={chatInput}
                    handleInputChange={handleSaveInputChange}
                    handleSubmit={isGuest ? handleGuestSubmit : handleSubmit}
                    isMultiModal={false}
                    files={files}
                    handleFileChange={handleFileChange}
                    isGuest={isGuest}
                    guestMessageCount={guestMessageCount}
                    guestMessageLimit={guestMessageLimit}
                    onSignUp={handleSignUp}
                    selectedModel={selectedModel}
                  >
                    {models.length === 0 ? (
                      <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                    ) : (
                      <ChatPicker models={models} selectedModel={selectedModel} onSelectedModelChange={setSelectedModel} userPlan={isGuest ? 'free' : (stripeData?.planName === 'Pro' ? 'pro' : 'free')} />
                    )}
                  </ChatInput>
                </div>
              </div>
            ) : (
              <div className="flex flex-col flex-1 h-full w-full">
                <div className="flex flex-col w-full max-h-full px-4 overflow-auto flex-1">
                  <Chat
                    messages={displayMessages}
                    isLoading={isLoading}
                    setCurrentPreview={setCurrentPreview}
                  />
                </div>
                <div className="w-full bg-muted z-10 p-4">
                  <div className="max-w-4xl mx-auto">
                    <ChatInput
                      retry={retry}
                      isErrored={isErrored}
                      errorMessage={errorMessage}
                      isLoading={isLoading}
                      isRateLimited={isRateLimited}
                      stop={stop}
                      input={chatInput}
                      handleInputChange={handleSaveInputChange}
                      handleSubmit={isGuest ? handleGuestSubmit : handleSubmit}
                      isMultiModal={false}
                      files={files}
                      handleFileChange={handleFileChange}
                      isGuest={isGuest}
                      guestMessageCount={guestMessageCount}
                      guestMessageLimit={guestMessageLimit}
                      onSignUp={handleSignUp}
                      selectedModel={selectedModel}
                    >
                      {models.length === 0 ? (
                        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                      ) : (
                        <ChatPicker models={models} selectedModel={selectedModel} onSelectedModelChange={setSelectedModel} userPlan={isGuest ? 'free' : (stripeData?.planName === 'Pro' ? 'pro' : 'free')} />
                      )}
                    </ChatInput>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
