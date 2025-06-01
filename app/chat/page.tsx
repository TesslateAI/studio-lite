// app/chat/page.tsx
'use client';

import Layout from '../(dashboard)/layout';
import { useState, useRef, useEffect, useMemo } from 'react';
import { Chat } from '../../components/chat/chat';
import { ChatInput } from '../../components/chat/chat-input';
import { ChatPicker } from '../../components/chat/chat-picker';
import { ChatSidebar } from '../../components/chat/chat-sidebar';
import React from 'react';
import { FragmentWeb } from '../../components/fragment-web'
import useSWR from 'swr';
import { SandpackPreviewer } from '../../components/chat/SandpackPreviewer';
import Split from 'react-split';
import '../../split-gutter.css';
import { useRouter } from 'next/navigation';
import { ChatCompletionStream } from '../../lib/stream-processing';
import { splitByFirstCodeFence, extractFirstCodeBlock } from '../../lib/code-detection';
import { SandboxManager } from '../../lib/sandbox-manager';
import { useSandbox } from '../../lib/hooks/use-sandbox';
import { Message } from '@/lib/messages';


interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
  selectedModelId?: string;
}

const LOCAL_STORAGE_CHAT_HISTORY_KEY = 'tesslateStudioLiteChatHistory';
const LOCAL_STORAGE_ACTIVE_CHAT_ID_KEY = 'tesslateStudioLiteActiveChatId';

const generateUniqueId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isErrored, setIsErrored] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [currentPreview, setCurrentPreview] = useState<{ fragment?: any; result?: any }>({});
  const [splitSizes, setSplitSizes] = useState([55, 45]);
  const [selectedModel, setSelectedModel] = useState<string>('');

  const sandboxState = useSandbox();
  const sandboxManagerRef = useRef<SandboxManager | undefined>(undefined);

  const [chatHistorySessions, setChatHistorySessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);

  useEffect(() => {
    if (sandboxState.sandboxManager) {
      sandboxManagerRef.current = sandboxState.sandboxManager;
    }
  }, [sandboxState.sandboxManager]);

  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  const { data: modelsData } = useSWR('/api/models', fetcher);
  const models = modelsData?.models || [];
  
  const { data: user, isLoading: isUserLoading } = useSWR('/api/user', fetcher);
  const { data: stripeData, isLoading: isStripeDataLoading } = useSWR(user ? '/api/stripe/user' : null, fetcher);
  const userPlanName = stripeData?.planName;

  const abortControllerRef = useRef<AbortController | null>(null);
  const router = useRouter();

  const isGuest = !user && !isUserLoading;
  const guestMessageLimit = 100;
  const [guestMessageCount, setGuestMessageCount] = useState(0);

  const [thinkingMessage, setThinkingMessage] = useState<any>(null);
  const thinkingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const thinkingStartRef = useRef<number>(0);


  // --- Effect Hooks for State Management ---

  // 1. Load guest message count
  useEffect(() => {
    if (isGuest) {
      const localData = JSON.parse(localStorage.getItem('guestMessageData') || '{"count":0,"timestamp":0}');
      setGuestMessageCount(localData.count || 0);
      fetch('/api/chat/guest-count').then(res => res.json()).then(data => {
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
      return () => window.removeEventListener('storage', handleStorage);
    }
  }, [isGuest]);

  // 2. Load chat history and active chat from localStorage ONCE on initial mount
  useEffect(() => {
    let didUnmount = false;
    try {
      const storedHistory = localStorage.getItem(LOCAL_STORAGE_CHAT_HISTORY_KEY);
      const storedActiveChatId = localStorage.getItem(LOCAL_STORAGE_ACTIVE_CHAT_ID_KEY);
      let initialMessages: Message[] = [];
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
    if (!isHistoryLoaded || models.length === 0) return;

    const activeSession = chatHistorySessions.find(s => s.id === activeChatId);
    const modelFromActiveChat = activeSession?.selectedModelId;

    if (modelFromActiveChat) {
      if (selectedModel !== modelFromActiveChat) {
        setSelectedModel(modelFromActiveChat);
      }
    } else { // No model in active session, or no active session defined a model
      if(!selectedModel || !models.some((m: { id: string }) => m.id === selectedModel)) { // If current selectedModel is invalid or not set
        const firstFree = models.find((m: { access?: string }) => m.access === 'free');
        const defaultModelId = firstFree ? firstFree.id : models[0]?.id;
        if (defaultModelId && selectedModel !== defaultModelId) {
          setSelectedModel(defaultModelId);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models, activeChatId, chatHistorySessions, isHistoryLoaded]);

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
    if (isGuest) return; // Prevent saving chat history for guest users

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
      } else {
        // If activeChatId is new and not in history, create a new session
        // (This typically happens for the very first chat, or if newChat didn't add a placeholder)
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
  }, [messages, activeChatId, isHistoryLoaded, selectedModel, isGuest]);


  // --- Chat Interaction Functions ---

  function startThinking() {
    thinkingStartRef.current = Date.now();
    const thinkingMsg: Message = {
      type: 'thinking',
      stepsMarkdown: '',
      seconds: 0,
      running: true,
      role: 'assistant',
      content: [],
    };
    setThinkingMessage(thinkingMsg); // Keep separate track of the current thinking message
    setMessages(prev => [...prev, thinkingMsg]);

    thinkingTimerRef.current = setInterval(() => {
      setMessages(prev => prev.map(m => 
        (m.type === 'thinking' && m.running) ? { ...m, seconds: Math.floor((Date.now() - thinkingStartRef.current) / 1000) } : m
      ));
    }, 1000);
  }
  
  function updateThinking(text: string) {
    setMessages(prev => prev.map(m => 
        (m.type === 'thinking' && m.running) ? { ...m, stepsMarkdown: text } : m
    ));
  }
  
  function stopThinking() {
    if (thinkingTimerRef.current) {
      clearInterval(thinkingTimerRef.current);
      thinkingTimerRef.current = null;
    }
    setMessages(prev => prev.map(m => 
        (m.type === 'thinking' && m.running) ? { 
            ...m, 
            running: false, 
            seconds: Math.floor((Date.now() - thinkingStartRef.current) / 1000) 
        } : m
    ));
    setThinkingMessage(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isLoading || !chatInput.trim()) return;

    setIsLoading(true);
    setIsErrored(false);
    setErrorMessage('');

    const userMessageText = chatInput;
    setChatInput('');

    abortControllerRef.current = new AbortController();

    const newUserMessage: Message = {
      role: 'user',
      content: [{ type: 'text', text: userMessageText }],
    };

    // Add new user message and start thinking. Filter out previous incomplete thinking messages.
    setMessages(prev => [...prev.filter(m => !(m.type === 'thinking' && m.running)), newUserMessage]);
    startThinking();

    try {
      // Prepare messages for API: use the version of `messages` state *before* adding the current thinking message
      // but *after* adding the newUserMessage.
      const messagesForApi = [...messages.filter(m => !(m.type === 'thinking' && m.running)), newUserMessage] 
        .filter(m => m.role === 'user' || (m.role === 'assistant' && m.content?.[0]?.text))
        .map(m => ({
          role: m.role,
          content: m.content?.[0]?.text || ''
        }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messagesForApi, selectedModelId: selectedModel }),
        signal: abortControllerRef.current.signal,
      });

      if (response.status === 429) {
        // Handle rate limit
        setIsRateLimited(true);
        setGuestMessageCount(guestMessageLimit);
        localStorage.setItem('guestMessageData', JSON.stringify({ count: guestMessageLimit, timestamp: Date.now() }));
        setErrorMessage('You have reached the guest message limit. Please sign up for more access.');
        setIsErrored(true);
        stopThinking(); // Stop the current thinking process
        setIsLoading(false);
        return;
      }

      if (!response.body) throw new Error('No response body');
      
      // Remove the currently running thinking message before adding assistant's actual response stream
      setMessages(prev => prev.filter(m => !(m.type === 'thinking' && m.running)));

      const assistantMessageShell: Message = { role: 'assistant', content: [{ type: 'text', text: '' }] };
      setMessages(prev => [...prev, assistantMessageShell]);

      let accumulatedContent = '';
      let isInternalThinking = false;
      let internalThinkingText = '';
      let codeDetected = false;
      const stream = ChatCompletionStream.fromReadableStream(response.body);

      stream
        .on('content', (delta, content) => {
          accumulatedContent = content;
          // ... (rest of stream handling logic for <think>, code blocks remains same)
          if (content.includes('<think>') && !isInternalThinking) {
            isInternalThinking = true;
            internalThinkingText = content.split('<think>').pop() || '';
            updateThinking(internalThinkingText); // Update the existing thinking message
          } else if (isInternalThinking && content.includes('</think>')) {
            const thinkBlockContent = content.substring(content.indexOf('<think>') + '<think>'.length, content.indexOf('</think>'));
            internalThinkingText = thinkBlockContent;
            updateThinking(internalThinkingText);
            isInternalThinking = false;
            accumulatedContent = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
          } else if (isInternalThinking) {
            internalThinkingText += delta;
            updateThinking(internalThinkingText);
            return; 
          }

          if (!codeDetected && sandboxManagerRef.current) {
            const parts = splitByFirstCodeFence(accumulatedContent);
            const codeBlock = parts.find(part => part.type === 'first-code-fence' || part.type === 'first-code-fence-generating');
            if (codeBlock) {
              codeDetected = true;
              sandboxManagerRef.current.startCodeStreaming(codeBlock.language, codeBlock.filename.name || null);
              if (codeBlock.type === 'first-code-fence-generating') sandboxManagerRef.current.updateStreamingCode(codeBlock.language, codeBlock.filename.name || null, codeBlock.content);
              else sandboxManagerRef.current.completeCodeStreaming(codeBlock.language, codeBlock.filename.name || null, codeBlock.content);
            }
          } else if (codeDetected && sandboxManagerRef.current) {
            const codeBlock = extractFirstCodeBlock(accumulatedContent);
            if (codeBlock) {
              if (codeBlock.isComplete) sandboxManagerRef.current.completeCodeStreaming(codeBlock.language, codeBlock.filename, codeBlock.code);
              else sandboxManagerRef.current.updateStreamingCode(codeBlock.language, codeBlock.filename, codeBlock.code);
            }
          }
          // Update the last assistant message (the shell)
          setMessages(prev => {
            const updated = [...prev];
            const lastMessageIndex = updated.findLastIndex(m => m.role === 'assistant');
            if (lastMessageIndex !== -1) {
              updated[lastMessageIndex] = { ...updated[lastMessageIndex], content: [{ type: 'text', text: accumulatedContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim()  }] };
            }
            return updated;
          });
        })
        .on('finalContent', (finalContent) => {
            stopThinking();
            setMessages(prev => {
                const updated = [...prev];
                const lastMessageIndex = updated.findLastIndex(m => m.role === 'assistant');
                if (lastMessageIndex !== -1) {
                     updated[lastMessageIndex] = { ...updated[lastMessageIndex], content: [{ type: 'text', text: finalContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim() }] };
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
      stopThinking();
    } finally {
      setIsLoading(false);
    }
  }

  function handleFileChange(change: any) { setFiles(change); }
  function handleSaveInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) { setChatInput(e.target.value); }
  function retry() { setIsErrored(false); setErrorMessage(''); }
  function stop() {
    setIsLoading(false);
    if (abortControllerRef.current) abortControllerRef.current.abort();
    if (sandboxManagerRef.current) { /* sandboxManagerRef.current.clear(); */ }
    stopThinking();
  }

  const newChat = () => {
    // Only store the previous chat if it has at least one non-empty message
    const hasNonEmptyMessage = messages.some((m: Message) => m.role === 'user' && m.content && m.content.some((c) => c.text && c.text.trim() !== ''));
    if (!hasNonEmptyMessage && chatHistorySessions.length > 0) {
      // Remove the previous chat session from history if it was empty
      setChatHistorySessions(prevSessions => prevSessions.filter(s => s.id !== activeChatId));
    }
    const newId = generateUniqueId();
    setActiveChatId(newId);
    setMessages([]);
    setChatInput('');
    setErrorMessage('');
    setIsErrored(false);
    setCurrentPreview({});
    if (sandboxManagerRef.current) sandboxManagerRef.current.clear();
    stop();

    let newChatModelId = selectedModel;
    if (models.length > 0) {
        const firstFree = models.find((m: { access?: string }) => m.access === 'free');
        const defaultModel = firstFree ? firstFree.id : models[0]?.id;
        if (defaultModel) newChatModelId = defaultModel;
    }
    setSelectedModel(newChatModelId);

    setChatHistorySessions(prevSessions => {
        if (prevSessions.some(s => s.id === newId)) return prevSessions;
        const newPlaceholderSession: ChatSession = {
            id: newId, title: "New Chat", messages: [], timestamp: Date.now(), selectedModelId: newChatModelId,
        };
        // Don't write to localStorage here, let the main save effect handle it.
        return [newPlaceholderSession, ...prevSessions].sort((a, b) => b.timestamp - a.timestamp);
    });
  };

  const handleSelectChat = (chatId: string) => {
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
  };

  const handleGuestSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (guestMessageCount >= guestMessageLimit && isGuest) {
        setErrorMessage('You have reached the free message limit. Please sign up for more access.');
        setIsErrored(true);
        setIsRateLimited(true);
        return;
    }
    handleSubmit(e);
    if (isGuest) {
      const newCount = guestMessageCount + 1;
      setGuestMessageCount(newCount);
      localStorage.setItem('guestMessageData', JSON.stringify({ count: newCount, timestamp: Date.now() }));
    }
  };
  const handleSignUp = () => { router.push('/sign-up'); };
  
  const showWelcome = messages.length === 0 && !isLoading && isHistoryLoaded && !thinkingMessage;
  const showSandbox = sandboxState.isShowingCodeViewer && Object.keys(sandboxState.files).length > 0;

  const sidebarChatHistory = useMemo(() => {
    return chatHistorySessions
        .map(session => {
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

  return (
    <Layout isGuest={isGuest} onNewChat={newChat}>
      <div className="h-[calc(100vh-68px)] w-full flex flex-row overflow-x-hidden">
        {/* Only render sidebar if not guest */}
        {!isGuest && (
          <ChatSidebar
            chatHistory={sidebarChatHistory}
            userPlanName={userPlanName}
            onNewChat={newChat}
            isLoadingPlan={isStripeDataLoading}
            onSelectChat={handleSelectChat}
            activeChatId={activeChatId}
          />
        )}
        <div className="flex-1 bg-muted flex flex-col overflow-x-hidden">
          {showSandbox ? (
            <div className="flex-1 h-full w-full" style={{ minWidth: 0, display: 'flex' }}>
              <Split className="flex-1 h-full split-horizontal" minSize={[300, 300]} gutterSize={8} direction="horizontal" style={{ display: 'flex', height: '100%' }} onDragEnd={setSplitSizes}>
                <div className="flex flex-col flex-1 h-full min-w-[300px] max-w-full overflow-hidden">
                  <div className="flex flex-col w-full max-h-full px-4 overflow-auto flex-1">
                    <Chat messages={messages} isLoading={isLoading && !thinkingMessage?.running} setCurrentPreview={setCurrentPreview} />
                  </div>
                  <div className="w-full bg-muted z-10 p-4">
                    <div className="max-w-4xl mx-auto">
                      <ChatInput retry={retry} isErrored={isErrored} errorMessage={errorMessage} isLoading={isLoading} isRateLimited={isRateLimited} stop={stop} input={chatInput} handleInputChange={handleSaveInputChange} handleSubmit={handleGuestSubmit} isMultiModal={false} files={files} handleFileChange={handleFileChange} isGuest={isGuest} guestMessageCount={guestMessageCount} guestMessageLimit={guestMessageLimit} onSignUp={handleSignUp} selectedModel={selectedModel}>
                        {models.length === 0 && !modelsData ? <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" /> : <ChatPicker models={models} selectedModel={selectedModel} onSelectedModelChange={setSelectedModel} userPlan={isGuest ? 'free' : (userPlanName === 'Pro' ? 'pro' : 'free')} />}
                      </ChatInput>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col min-w-[300px] h-full overflow-hidden">
                  <SandpackPreviewer files={sandboxState.files} isStreaming={sandboxState.isStreaming} activeTab={sandboxState.activeTab} onTabChange={(tab) => sandboxManagerRef.current?.setActiveTab(tab)} />
                </div>
              </Split>
            </div>
          ) : currentPreview.result ? (
            <div className="flex-1 h-full w-full flex flex-row min-w-0">
              <Split className="flex-1 h-full split-horizontal" minSize={[300, 200]} gutterSize={8} direction="horizontal" style={{ display: 'flex', height: '100%' }}>
                <div className="flex flex-col flex-1 h-full min-w-[300px] max-w-full overflow-hidden">
                  <div className="flex flex-col w-full max-h-full px-4 overflow-auto flex-1">
                    <Chat messages={messages} isLoading={isLoading && !thinkingMessage?.running} setCurrentPreview={setCurrentPreview} />
                  </div>
                  <div className="w-full bg-muted z-10 p-4">
                    <div className="max-w-4xl mx-auto">
                      <ChatInput retry={retry} isErrored={isErrored} errorMessage={errorMessage} isLoading={isLoading} isRateLimited={isRateLimited} stop={stop} input={chatInput} handleInputChange={handleSaveInputChange} handleSubmit={handleGuestSubmit} isMultiModal={false} files={files} handleFileChange={handleFileChange} isGuest={isGuest} guestMessageCount={guestMessageCount} guestMessageLimit={guestMessageLimit} onSignUp={handleSignUp} selectedModel={selectedModel}>
                        {models.length === 0 && !modelsData ? <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" /> : <ChatPicker models={models} selectedModel={selectedModel} onSelectedModelChange={setSelectedModel} userPlan={isGuest ? 'free' : (userPlanName === 'Pro' ? 'pro' : 'free')} />}
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
                  {isGuest && <div className="text-sm text-gray-500 mb-4">Try our advanced features for free. Get smarter responses, create interactive previews, and more by logging in.</div>}
                  <div className="w-full max-w-2xl">
                    <ChatInput retry={retry} isErrored={isErrored} errorMessage={errorMessage} isLoading={isLoading} isRateLimited={isRateLimited} stop={stop} input={chatInput} handleInputChange={handleSaveInputChange} handleSubmit={handleGuestSubmit} isMultiModal={false} files={files} handleFileChange={handleFileChange} isGuest={isGuest} guestMessageCount={guestMessageCount} guestMessageLimit={guestMessageLimit} onSignUp={handleSignUp} selectedModel={selectedModel}>
                      {models.length === 0 && !modelsData ? <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" /> : <ChatPicker models={models} selectedModel={selectedModel} onSelectedModelChange={setSelectedModel} userPlan={isGuest ? 'free' : (userPlanName === 'Pro' ? 'pro' : 'free')} />}
                    </ChatInput>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col flex-1 h-full w-full">
                  <div className="flex flex-col w-full max-h-full px-4 overflow-auto flex-1">
                    <Chat messages={messages} isLoading={isLoading && !thinkingMessage?.running} setCurrentPreview={setCurrentPreview} />
                  </div>
                  <div className="w-full bg-muted z-10 p-4">
                    <div className="max-w-4xl mx-auto">
                      <ChatInput retry={retry} isErrored={isErrored} errorMessage={errorMessage} isLoading={isLoading} isRateLimited={isRateLimited} stop={stop} input={chatInput} handleInputChange={handleSaveInputChange} handleSubmit={handleGuestSubmit} isMultiModal={false} files={files} handleFileChange={handleFileChange} isGuest={isGuest} guestMessageCount={guestMessageCount} guestMessageLimit={guestMessageLimit} onSignUp={handleSignUp} selectedModel={selectedModel}>
                        {models.length === 0 && !modelsData ? <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" /> : <ChatPicker models={models} selectedModel={selectedModel} onSelectedModelChange={setSelectedModel} userPlan={isGuest ? 'free' : (userPlanName === 'Pro' ? 'pro' : 'free')} />}
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