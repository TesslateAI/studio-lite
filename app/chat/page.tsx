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
import { useRouter, useSearchParams } from 'next/navigation';
import { ChatCompletionStream } from '../../lib/stream-processing';
import { splitByFirstCodeFence, extractFirstCodeBlock } from '../../lib/code-detection';
import { SandboxManager } from '../../lib/sandbox-manager';
import { useSandbox } from '../../lib/hooks/use-sandbox';
import { Message as ChatMessage } from '@/lib/messages';
import { ChatSidebar } from '../../components/chat/chat-sidebar';

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  timestamp: number;
  selectedModelId?: string;
}

const LOCAL_STORAGE_CHAT_HISTORY_KEY = 'tesslateStudioLiteChatHistory';
const LOCAL_STORAGE_ACTIVE_CHAT_ID_KEY = 'tesslateStudioLiteActiveChatId';

const GUEST_MESSAGE_LIMIT = 5;
const GUEST_MESSAGE_DATA_KEY = 'guestMessageData';

const generateUniqueId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

export default function ChatPage() {
  const [selectedTemplate, setSelectedTemplate] = useState('auto');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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

  const sandboxState = useSandbox();
  const sandboxManagerRef = useRef<SandboxManager | undefined>(undefined);

  const [chatHistorySessions, setChatHistorySessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);

  // Add these state/refs back for thinking message logic
  const [thinkingMessage, setThinkingMessage] = useState<any>(null);
  const thinkingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const thinkingStartRef = useRef<number>(0);

  const [guestMessageCount, setGuestMessageCount] = useState(0);

  const searchParams = useSearchParams();
  const didResetRef = useRef(false);

  useEffect(() => {
    if (sandboxState.sandboxManager) {
      sandboxManagerRef.current = sandboxState.sandboxManager;
    }
  }, [sandboxState.sandboxManager]);

  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  const { data: modelsData } = useSWR('/api/models', fetcher);
  const models = modelsData?.models || [];

  const userSWR = useSWR('/api/user', fetcher);
  const user = userSWR.data;
  const isUserLoading = !!userSWR.isLoading;
  const { data: stripeData, isLoading: isStripeDataLoading } = useSWR(user ? '/api/stripe/user' : null, fetcher);
  const userPlanName = stripeData?.planName;

  const router = useRouter();

  // Add isGuest logic
  const isGuest = !user && !isUserLoading;

  // Reset chat state if ?new=1 is present BEFORE loading history
  if (typeof window !== 'undefined' && searchParams && searchParams.get('new') === '1' && !didResetRef.current) {
    localStorage.removeItem(LOCAL_STORAGE_CHAT_HISTORY_KEY);
    localStorage.removeItem(LOCAL_STORAGE_ACTIVE_CHAT_ID_KEY);
    didResetRef.current = true;
    // Remove the param from the URL (optional, for cleanliness)
    window.history.replaceState({}, document.title, '/chat');
  }

  // --- Effect Hooks for State Management ---

  // 1. Load chat history and active chat from localStorage ONCE on initial mount
  useEffect(() => {
    let didUnmount = false;
    try {
      const storedHistory = localStorage.getItem(LOCAL_STORAGE_CHAT_HISTORY_KEY);
      const storedActiveChatId = localStorage.getItem(LOCAL_STORAGE_ACTIVE_CHAT_ID_KEY);
      let initialMessages: ChatMessage[] = [];
      let initialActiveChatId: string | null = null;
      let initialSelectedModel: string | null = null;
      let loadedSessions: ChatSession[] = [];

      if (storedHistory) {
        const parsed = JSON.parse(storedHistory);
        if (Array.isArray(parsed)) {
          loadedSessions = parsed;
        } else {
          localStorage.removeItem(LOCAL_STORAGE_CHAT_HISTORY_KEY);
        }
      }
      if (didUnmount) return;
      setChatHistorySessions(loadedSessions);

      if (storedActiveChatId && loadedSessions.some(s => s.id === storedActiveChatId)) {
        initialActiveChatId = storedActiveChatId;
        const activeSession = loadedSessions.find(s => s.id === storedActiveChatId);
        if (activeSession) {
          initialMessages = activeSession.messages || [];
          initialSelectedModel = activeSession.selectedModelId || null;
        }
      } else if (loadedSessions.length > 0) {
        const mostRecentChat = [...loadedSessions].sort((a, b) => b.timestamp - a.timestamp)[0];
        if (mostRecentChat) {
            initialActiveChatId = mostRecentChat.id;
            initialMessages = mostRecentChat.messages || [];
            initialSelectedModel = mostRecentChat.selectedModelId || null;
        }
      }
      
      if (didUnmount) return;
      if (initialActiveChatId) {
        setActiveChatId(initialActiveChatId);
        setMessages(initialMessages);
        if (initialSelectedModel) setSelectedModel(initialSelectedModel);
      } else {
        const newId = generateUniqueId();
        setActiveChatId(newId);
        setMessages([]);
        // Initial model for a brand new session will be set by effect #3
      }
    } catch (error) {
      console.error("Error loading chat history from localStorage:", error);
      if (didUnmount) return;
      const newId = generateUniqueId();
      setActiveChatId(newId);
      setMessages([]);
    } finally {
      if (didUnmount) return;
      setIsHistoryLoaded(true);
    }
    return () => { didUnmount = true; };
  }, []); // Runs once on mount

  // 3. Initialize or update selectedModel based on models list and active chat
  useEffect(() => {
    if (!isHistoryLoaded || models.length === 0 || isUserLoading) return;

    // Only set the default model if none is selected
    if (!selectedModel) {
      const firstFree = models.find((m: { access?: string }) => m.access === 'free');
      const defaultModelId = firstFree ? firstFree.id : models[0]?.id;
      if (defaultModelId) {
        setSelectedModel(defaultModelId);
      }
    }
    // Do not override if user has selected a model
  }, [models, isHistoryLoaded, isUserLoading, selectedModel]);

  // 4. Save activeChatId to localStorage
  useEffect(() => {
    if (activeChatId && isHistoryLoaded) {
      try {
        localStorage.setItem(LOCAL_STORAGE_ACTIVE_CHAT_ID_KEY, activeChatId);
      } catch (error) {
        console.error("Error saving active chat ID to localStorage:", error);
      }
    }
  }, [activeChatId, isHistoryLoaded]);

  // 5. Save chat history to localStorage
  useEffect(() => {
    if (!isHistoryLoaded || !activeChatId) return;

    const currentMessagesToSave = messages.filter(m => m.type !== 'thinking');

    setChatHistorySessions(prevSessions => {
      const existingSessionIndex = prevSessions.findIndex(s => s.id === activeChatId);
      let newSessions = [...prevSessions];
      let sessionNeedsUpdate = false;

      const newTitle = currentMessagesToSave.length > 0
          ? (currentMessagesToSave.find(m => m.role === 'user')?.content[0]?.text?.substring(0, 35).trim() ||
             currentMessagesToSave[0]?.content[0]?.text?.substring(0, 35).trim() ||
             'Chat Session')
          : (existingSessionIndex !== -1 ? newSessions[existingSessionIndex].title : "New Chat");

      if (existingSessionIndex !== -1) {
        const existingSession = newSessions[existingSessionIndex];
        if (
          JSON.stringify(existingSession.messages) !== JSON.stringify(currentMessagesToSave) ||
          existingSession.title !== newTitle ||
          existingSession.selectedModelId !== selectedModel ||
          (currentMessagesToSave.length === 0 && existingSession.messages.length > 0) // Case: clearing messages
        ) {
          newSessions[existingSessionIndex] = {
            ...existingSession,
            messages: currentMessagesToSave,
            title: newTitle,
            timestamp: Date.now(),
            selectedModelId: selectedModel,
          };
          sessionNeedsUpdate = true;
        }
      } else if (currentMessagesToSave.length > 0) {
        // Only add a new session if there are messages
        const newSession: ChatSession = {
          id: activeChatId,
          title: newTitle,
          messages: currentMessagesToSave,
          timestamp: Date.now(),
          selectedModelId: selectedModel,
        };
        newSessions.unshift(newSession);
        sessionNeedsUpdate = true;
      }

      if (sessionNeedsUpdate) {
        const sortedSessions = newSessions.sort((a, b) => b.timestamp - a.timestamp);
        try {
          localStorage.setItem(LOCAL_STORAGE_CHAT_HISTORY_KEY, JSON.stringify(sortedSessions));
        } catch (e) {
          console.error("Error saving history to localStorage: ", e);
        }
        return sortedSessions;
      }
      return prevSessions; // No change, return previous state reference
    });
  }, [messages, activeChatId, isHistoryLoaded, selectedModel]);

  // Effect: Sync guest message count from localStorage and backend
  useEffect(() => {
    if (!isGuest) return;
    // Load from localStorage
    const localData = JSON.parse(localStorage.getItem(GUEST_MESSAGE_DATA_KEY) || '{"count":0,"timestamp":0}');
      setGuestMessageCount(localData.count || 0);
    // Sync with backend
      fetch('/api/chat/guest-count')
        .then(res => res.json())
        .then(data => {
          if (typeof data.count === 'number' && data.count > (localData.count || 0)) {
            setGuestMessageCount(data.count);
          localStorage.setItem(GUEST_MESSAGE_DATA_KEY, JSON.stringify({ count: data.count, timestamp: Date.now() }));
          }
        });
    // Listen for storage events (multi-tab)
      const handleStorage = (event: StorageEvent) => {
      if (event.key === GUEST_MESSAGE_DATA_KEY) {
          const newData = JSON.parse(event.newValue || '{"count":0,"timestamp":0}');
          setGuestMessageCount(newData.count || 0);
        }
      };
      window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [isGuest]);

  const showWelcome = messages.length === 0;

  function startThinking() {
    const thinkingMsg: ChatMessage = {
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

    // Add the user's message
    const newUserMessage: ChatMessage = {
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
      });

      if (response.status === 429) {
        setIsRateLimited(true);
        setIsLoading(false);
        setErrorMessage('You have reached the guest message limit. Please sign up for more access.');
        setIsErrored(true);
        return;
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Initialize assistant message
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: [{ type: 'text', text: '' }],
        object: null,
      };
      let assistantMessageAdded = false;
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

            // Add thinking message to history only once
            if (!assistantMessageAdded && thinkingMessage) {
              setMessages(prev => {
                // Remove the last assistant message (placeholder)
                const withoutLast = prev.slice(0, -1);
                return [...withoutLast, thinkingMessage, assistantMessage];
              });
              assistantMessageAdded = true;
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
            // Always update the last assistant message
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

  // Guest mode: handle submit with message count
  const handleGuestSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (guestMessageCount >= GUEST_MESSAGE_LIMIT) return;
    handleSubmit(e);
    if (isGuest) {
      const newCount = guestMessageCount + 1;
      setGuestMessageCount(newCount);
      localStorage.setItem(GUEST_MESSAGE_DATA_KEY, JSON.stringify({ count: newCount, timestamp: Date.now() }));
    }
  };

  // Handler for sign up button
  const handleSignUp = () => {
    router.push('/sign-up');
  };

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
    if (sandboxManagerRef.current) {
      sandboxManagerRef.current.clear();
    }
    stopThinking();
  }

  function newChat() {
    const newId = generateUniqueId();
    setActiveChatId(newId);
    setMessages([]);
    setChatInput('');
    setErrorMessage('');
    setIsErrored(false);
    setCurrentPreview({});
    if (sandboxManagerRef.current) {
      sandboxManagerRef.current.clear();
    }
    stop();
    // For guests, always set the default model
    if (isGuest && models.length > 0) {
      const firstFree = models.find((m: { access?: string }) => m.access === 'free');
      const defaultModelId = firstFree ? firstFree.id : models[0].id;
      setSelectedModel(defaultModelId);
    }
    // Do NOT add a placeholder session here. Let the main effect add to history only when there are messages.
  }

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

  // Fix implicit any in map
  const sidebarChatHistory = useMemo(() => {
    return chatHistorySessions
        .map((session: ChatSession) => {
            const date = new Date(session.timestamp);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            let category: "today" | "yesterday" | "older" = "older";
            if (date.toDateString() === today.toDateString()) category = "today";
            else if (date.toDateString() === yesterday.toDateString()) category = "yesterday";
            return { id: session.id, title: session.title || "Chat Session", date: date.toISOString(), category };
        });
  }, [chatHistorySessions]);

  function handleSelectChat(chatId: string) {
    const sessionToLoad = chatHistorySessions.find(s => s.id === chatId);
    if (sessionToLoad) {
      setActiveChatId(sessionToLoad.id);
      setMessages(sessionToLoad.messages || []);
      setSelectedModel(sessionToLoad.selectedModelId || (models.length > 0 ? (models.find((m: { access?: string }) => m.access === 'free') || models[0])?.id || '' : ''));
      setChatInput('');
      setCurrentPreview({});
      if (sandboxManagerRef.current) sandboxManagerRef.current.clear();
      stop();
    }
  }

  return (
    <Layout onNewChat={isGuest ? newChat : undefined}>
      <div className="h-[calc(100vh-70px)] w-full flex flex-row overflow-x-hidden">
          {!isGuest && (
          <ChatSidebar
            chatHistory={sidebarChatHistory}
            userPlan={user ? (stripeData?.planName === 'Pro' ? 'pro' : 'free') : 'free'}
            onNewChat={newChat}
            onSelectChat={handleSelectChat}
          />
        )}
        <div className="flex-1 bg-muted flex flex-col overflow-x-hidden">

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
                        selectedModel={selectedModel}
                      isGuest={isGuest}
                      guestMessageCount={guestMessageCount}
                        guestMessageLimit={GUEST_MESSAGE_LIMIT}
                      onSignUp={handleSignUp}
                    >
                        {(!isGuest && models.length === 0) ? (
                        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                      ) : (
                          <ChatPicker models={models} selectedModel={selectedModel} onSelectedModelChange={setSelectedModel} userPlan={user ? (stripeData?.planName === 'Pro' ? 'pro' : 'free') : 'free'} />
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
                        selectedModel={selectedModel}
                      isGuest={isGuest}
                      guestMessageCount={guestMessageCount}
                        guestMessageLimit={GUEST_MESSAGE_LIMIT}
                      onSignUp={handleSignUp}
                    >
                        {(!isGuest && models.length === 0) ? (
                        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                      ) : (
                          <ChatPicker models={models} selectedModel={selectedModel} onSelectedModelChange={setSelectedModel} userPlan={user ? (stripeData?.planName === 'Pro' ? 'pro' : 'free') : 'free'} />
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
                    {user ? `Hello, ${user.name || 'User'}` : 'Hello, World'}
                </h1>
                  {user && (
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
                      selectedModel={selectedModel}
                    isGuest={isGuest}
                    guestMessageCount={guestMessageCount}
                      guestMessageLimit={GUEST_MESSAGE_LIMIT}
                    onSignUp={handleSignUp}
                  >
                      {(!isGuest && models.length === 0) ? (
                      <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                    ) : (
                        <ChatPicker models={models} selectedModel={selectedModel} onSelectedModelChange={setSelectedModel} userPlan={user ? (stripeData?.planName === 'Pro' ? 'pro' : 'free') : 'free'} />
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
                        selectedModel={selectedModel}
                      isGuest={isGuest}
                      guestMessageCount={guestMessageCount}
                        guestMessageLimit={GUEST_MESSAGE_LIMIT}
                      onSignUp={handleSignUp}
                    >
                        {(!isGuest && models.length === 0) ? (
                        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                      ) : (
                          <ChatPicker models={models} selectedModel={selectedModel} onSelectedModelChange={setSelectedModel} userPlan={user ? (stripeData?.planName === 'Pro' ? 'pro' : 'free') : 'free'} />
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
