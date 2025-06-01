'use client';

import Layout from '../(dashboard)/layout'; // Ensure this is the correct Layout if you intend to use the dashboard layout
import { useState, useRef, useEffect, useMemo } from 'react';
import { Chat } from '../../components/chat/chat';
import { ChatInput } from '../../components/chat/chat-input';
import { ChatPicker } from '../../components/chat/chat-picker';
import { ChatSidebar } from '../../components/chat/chat-sidebar'; // Added import
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

// Dummy chat history data - replace with your actual data fetching or state management
const dummyChatHistory = [
  { id: '1', title: 'First Chat Session', date: '2024-07-29', category: 'today' as const },
  { id: '2', title: 'Website Design Idea', date: '2024-07-29', category: 'today' as const },
  { id: '3', title: 'Python Script Help', date: '2024-07-28', category: 'yesterday' as const },
  { id: '4', title: 'Old Project Discussion', date: '2024-07-20', category: 'older' as const },
];


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
  // const [userPlan] = useState<'free' | 'pro'>('free'); // This was static, now derived from stripeData
  const [selectedModel, setSelectedModel] = useState<string>('');

  const sandboxState = useSandbox();
  const sandboxManagerRef = useRef<SandboxManager | undefined>(undefined);

  useEffect(() => {
    if (sandboxState.sandboxManager) {
      sandboxManagerRef.current = sandboxState.sandboxManager;
    }
  }, [sandboxState.sandboxManager]);

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
  const { data: stripeData, isLoading: isStripeDataLoading } = useSWR(user ? '/api/stripe/user' : null, fetcher); // Only fetch stripeData if user exists
  const userPlanName = stripeData?.planName; // e.g., 'Free', 'Pro'

  const abortControllerRef = useRef<AbortController | null>(null);
  const router = useRouter();

  const isGuest = !user && !isUserLoading; // Consider user loaded if not loading and no user data
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
    setMessages(prev => [...prev, thinkingMsg]); // Add thinking message immediately

    thinkingTimerRef.current = setInterval(() => {
      const seconds = Math.floor((Date.now() - thinkingStartRef.current) / 1000);
      setMessages(prev => prev.map(m => m.type === 'thinking' && m.running ? { ...m, seconds } : m));
    }, 1000);
  }
  
  function updateThinking(text: string) {
    setMessages(prev => prev.map(m => m.type === 'thinking' && m.running ? { ...m, stepsMarkdown: text } : m));
  }
  
  function stopThinking() {
    if (thinkingTimerRef.current) {
      clearInterval(thinkingTimerRef.current);
      thinkingTimerRef.current = null;
    }
    // Mark the existing thinking message as not running and finalize its content
    setMessages(prev => {
        const finalThinkingMsgIndex = prev.findLastIndex(m => m.type === 'thinking' && m.running);
        if (finalThinkingMsgIndex !== -1) {
            const updatedMessages = [...prev];
            updatedMessages[finalThinkingMsgIndex] = {
                ...updatedMessages[finalThinkingMsgIndex],
                running: false,
                seconds: Math.floor((Date.now() - thinkingStartRef.current) / 1000) // Final seconds
            };
            return updatedMessages;
        }
        return prev;
    });
    setThinkingMessage(null); // Clear the separate thinking state
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

    const newUserMessage = {
      role: 'user',
      content: [{ type: 'text', text: userMessage }],
      object: null
    };

    // Update messages state: previous messages + new user message
    // If there was a thinking message, it's already in `messages` from `startThinking`
    setMessages(prev => [...prev.filter(m => !(m.type === 'thinking' && m.running)), newUserMessage]);
    startThinking(); // Start new thinking message for this request

    try {
      const openAIMessages = [...messages, newUserMessage] // Use current messages + new user message for context
        .filter(m => m.role === 'user' || (m.role === 'assistant' && m.content?.[0]?.text)) // Filter out non-text or empty assistant messages for API
        .map(m => ({
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
        stopThinking();
        return;
      }

      if (!response.body) {
        throw new Error('No response body');
      }
      
      // Remove the currently running thinking message before adding assistant's actual response
      setMessages(prev => prev.filter(m => !(m.type === 'thinking' && m.running)));

      const assistantMessageShell = {
        role: 'assistant',
        content: [{ type: 'text', text: '' }],
        object: null,
      };
      setMessages(prev => [...prev, assistantMessageShell]);

      let accumulatedContent = '';
      let isInternalThinking = false; // Renamed to avoid conflict
      let internalThinkingText = '';
      let codeDetected = false;

      const stream = ChatCompletionStream.fromReadableStream(response.body);

      stream
        .on('content', (delta, content) => {
          accumulatedContent = content;

          if (content.includes('<think>') && !isInternalThinking) {
            isInternalThinking = true;
            // Don't call startThinking() here again, use the existing one or a modified updateThinking.
            internalThinkingText = content.split('<think>').pop() || '';
            updateThinking(internalThinkingText); // Update the existing thinking message
          } else if (isInternalThinking && content.includes('</think>')) {
            const thinkBlockContent = content.substring(content.indexOf('<think>') + '<think>'.length, content.indexOf('</think>'));
            internalThinkingText = thinkBlockContent; // Or append if it's chunked
            updateThinking(internalThinkingText);
            // Don't stopThinking() here, let it complete naturally or at the end.
            isInternalThinking = false;
            // Content for the main assistant message should be what's outside <think>...</think>
            accumulatedContent = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
          } else if (isInternalThinking) {
            internalThinkingText += delta;
            updateThinking(internalThinkingText);
            return; 
          }


          if (!codeDetected && sandboxManagerRef.current) {
            const parts = splitByFirstCodeFence(accumulatedContent); // Use accumulatedContent
            const codeBlock = parts.find(part =>
              part.type === 'first-code-fence' ||
              part.type === 'first-code-fence-generating'
            );

            if (codeBlock) {
              codeDetected = true;
              sandboxManagerRef.current.startCodeStreaming(
                codeBlock.language,
                codeBlock.filename.name || null
              );
              if (codeBlock.type === 'first-code-fence-generating') {
                sandboxManagerRef.current.updateStreamingCode(
                  codeBlock.language,
                  codeBlock.filename.name || null,
                  codeBlock.content
                );
              } else {
                sandboxManagerRef.current.completeCodeStreaming(
                  codeBlock.language,
                  codeBlock.filename.name || null,
                  codeBlock.content
                );
              }
            }
          } else if (codeDetected && sandboxManagerRef.current) {
            const codeBlock = extractFirstCodeBlock(accumulatedContent); // Use accumulatedContent
            if (codeBlock) {
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
            stopThinking(); // Stop and finalize the thinking message here
            // Ensure the final assistant message is correctly set
            setMessages(prev => {
                const updated = [...prev];
                const lastMessage = updated.findLast(m => m.role === 'assistant');
                if (lastMessage) {
                    lastMessage.content = [{ type: 'text', text: finalContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim() }];
                }
                return updated;
            });
        });

      await stream.start();

    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Chat error:', error);
        setIsErrored(true);
        setErrorMessage(error?.message || 'An error occurred');
      }
      stopThinking(); // Also stop thinking on error
    } finally {
      setIsLoading(false);
      // stopThinking(); // Already called in finalContent or error
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
    // Optionally, resubmit the last user message or clear input
  }

  function stop() {
    setIsLoading(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (sandboxManagerRef.current) {
      // Decide if clear() is appropriate or just stop streaming
      // sandboxManagerRef.current.clear(); 
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
    stop(); // This will also stop thinking
    if (isGuest) {
      setGuestMessageCount(0);
      localStorage.setItem('guestMessageData', JSON.stringify({ count: 0, timestamp: Date.now() }));
    }
  }

  const handleGuestSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (guestMessageCount >= guestMessageLimit) return;
    handleSubmit(e);
    if (isGuest) {
      const newCount = guestMessageCount + 1;
      setGuestMessageCount(newCount);
      localStorage.setItem('guestMessageData', JSON.stringify({ count: newCount, timestamp: Date.now() }));
    }
  };

  const handleSignUp = () => {
    router.push('/sign-up');
  };
  
  const displayMessages = messages; // Use the main messages state which now includes thinking messages correctly

  const showSandbox = sandboxState.isShowingCodeViewer && Object.keys(sandboxState.files).length > 0;

  return (
    <Layout> {/* This is your (dashboard)/layout.tsx */}
      <div className="h-[calc(100vh-68px)] w-full flex flex-row overflow-x-hidden"> {/* Adjusted height for header */}
        {/* Chat Sidebar */}
        <ChatSidebar
            chatHistory={dummyChatHistory} // Replace with actual chat history
            userPlanName={userPlanName}
            onNewChat={newChat}
            isLoadingPlan={isStripeDataLoading}
        />

        {/* Main Chat and Preview Area */}
        <div className="flex-1 bg-muted flex flex-col overflow-x-hidden">
          {/* Floating New Chat button and Plan badge - MOVED to sidebar or header in dashboard layout */}
          {/* Main content */}
          {showSandbox ? (
            <div className="flex-1 h-full w-full" style={{ minWidth: 0, display: 'flex' }}>
              <Split
                className="flex-1 h-full split-horizontal"
                minSize={[300, 300]}
                gutterSize={8}
                direction="horizontal"
                style={{ display: 'flex', height: '100%' }}
                onDragEnd={setSplitSizes}
              >
                <div className="flex flex-col flex-1 h-full min-w-[300px] max-w-full overflow-hidden">
                  <div className="flex flex-col w-full max-h-full px-4 overflow-auto flex-1">
                    <Chat
                      messages={displayMessages}
                      isLoading={isLoading && !thinkingMessage?.running} // Show main loader if not in thinking phase
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
                        isMultiModal={false} // Assuming no multimodal for now
                        files={files}
                        handleFileChange={handleFileChange}
                        isGuest={isGuest}
                        guestMessageCount={guestMessageCount}
                        guestMessageLimit={guestMessageLimit}
                        onSignUp={handleSignUp}
                        selectedModel={selectedModel}
                      >
                        {models.length === 0 && !modelsData ? (
                          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                        ) : (
                          <ChatPicker models={models} selectedModel={selectedModel} onSelectedModelChange={setSelectedModel} userPlan={isGuest ? 'free' : (userPlanName === 'Pro' ? 'pro' : 'free')} />
                        )}
                      </ChatInput>
                    </div>
                  </div>
                </div>
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
            <div className="flex-1 h-full w-full flex flex-row min-w-0">
              <Split
                className="flex-1 h-full split-horizontal"
                minSize={[300, 200]}
                gutterSize={8}
                direction="horizontal"
                style={{ display: 'flex', height: '100%' }}
              >
                <div className="flex flex-col flex-1 h-full min-w-[300px] max-w-full overflow-hidden">
                  <div className="flex flex-col w-full max-h-full px-4 overflow-auto flex-1">
                    <Chat
                      messages={displayMessages}
                      isLoading={isLoading && !thinkingMessage?.running}
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
                        {models.length === 0 && !modelsData ? (
                          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                        ) : (
                          <ChatPicker models={models} selectedModel={selectedModel} onSelectedModelChange={setSelectedModel} userPlan={isGuest ? 'free' : (userPlanName === 'Pro' ? 'pro' : 'free')} />
                        )}
                      </ChatInput>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col min-w-[200px] h-full overflow-hidden bg-white dark:bg-black/10 border-l border-gray-200">
                  <FragmentWeb result={currentPreview.result} isStreaming={sandboxState.isStreaming} />
                </div>
              </Split>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden relative w-full">
              {showWelcome ? (
                <div className="flex flex-1 flex-col items-center justify-center w-full h-full">
                  <h1 className="text-3xl md:text-3l mb-2 text-center">
                    {isUserLoading ? 'Loading user...' : isGuest ? 'Hello, World' : `Hello, ${user?.name || 'User'}`}
                  </h1>
                  {isGuest && (
                    <div className="text-sm text-gray-500 mb-4">Try our advanced features for free. Get smarter responses, create interactive previews, and more by logging in.</div>
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
                      {models.length === 0 && !modelsData ? (
                        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                      ) : (
                        <ChatPicker models={models} selectedModel={selectedModel} onSelectedModelChange={setSelectedModel} userPlan={isGuest ? 'free' : (userPlanName === 'Pro' ? 'pro' : 'free')} />
                      )}
                    </ChatInput>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col flex-1 h-full w-full">
                  <div className="flex flex-col w-full max-h-full px-4 overflow-auto flex-1">
                    <Chat
                      messages={displayMessages}
                      isLoading={isLoading && !thinkingMessage?.running}
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
                        {models.length === 0 && !modelsData ? (
                          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                        ) : (
                          <ChatPicker models={models} selectedModel={selectedModel} onSelectedModelChange={setSelectedModel} userPlan={isGuest ? 'free' : (userPlanName === 'Pro' ? 'pro' : 'free')} />
                        )}
                      </ChatInput>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}