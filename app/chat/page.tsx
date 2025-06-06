'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useState, useRef, useEffect, useMemo, SetStateAction } from 'react';
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
import { Model, ExecutionResult } from '@/lib/types';
import { DeepPartial } from 'ai';
import { FragmentSchema } from '@/lib/schema';
import { User } from '@/lib/db/schema';


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
  const [currentPreview, setCurrentPreview] = useState<{ fragment?: DeepPartial<FragmentSchema>; result?: ExecutionResult }>({});
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
  const { data: modelsData } = useSWR<{models: Model[]}>('/api/models', fetcher);
  const models: Model[] = modelsData?.models || [];
  
  const { data: user, isLoading: isUserLoading } = useSWR<User>('/api/user', fetcher);
  const { data: stripeData } = useSWR(user ? '/api/stripe/user' : null, fetcher);
  const userPlanName = stripeData?.planName;
  const abortControllerRef = useRef<AbortController | null>(null);
  const router = useRouter();

  const isGuest = !user && !isUserLoading;

  const [thinkingMessage, setThinkingMessage] = useState<Message | null>(null);
  const thinkingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const thinkingStartRef = useRef<number>(0);


  // --- Effect Hooks for State Management ---
  // Load chat history and active chat from localStorage ONCE on initial mount
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
  }, []);

  // Initialize or update selectedModel based on models list and active chat
  useEffect(() => {
    if (!isHistoryLoaded || models.length === 0) return;

    const activeSession = chatHistorySessions.find(s => s.id === activeChatId);
    const modelFromActiveChat = activeSession?.selectedModelId;

    if (modelFromActiveChat) {
      if (selectedModel !== modelFromActiveChat) {
        setSelectedModel(modelFromActiveChat);
      }
    } else { 
      if(!selectedModel || !models.some(m => m.id === selectedModel)) { 
        const firstFree = models.find(m => m.access === 'free');
        const defaultModelId = firstFree ? firstFree.id : models[0]?.id;
        if (defaultModelId && selectedModel !== defaultModelId) {
          setSelectedModel(defaultModelId);
        }
      }
    }
  }, [models, activeChatId, chatHistorySessions, isHistoryLoaded, selectedModel]);

  // Save activeChatId to localStorage
  useEffect(() => {
    if (activeChatId && isHistoryLoaded) {
      try {
        localStorage.setItem(LOCAL_STORAGE_ACTIVE_CHAT_ID_KEY, activeChatId);
      } catch (error) {
        console.error("Error saving active chat ID to localStorage:", error);
      }
    }
  }, [activeChatId, isHistoryLoaded]);

  // Save chat history to localStorage
  useEffect(() => {
    if (!isHistoryLoaded || !activeChatId || isGuest) return;

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
          (currentMessagesToSave.length === 0 && existingSession.messages.length > 0)
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
      return prevSessions;
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
    setThinkingMessage(thinkingMsg);
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

    if (isGuest) {
        router.push(`/sign-up?redirect=/chat&prompt=${encodeURIComponent(chatInput)}`);
        return;
    }

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

    setMessages(prev => [...prev.filter(m => !(m.type === 'thinking' && m.running)), newUserMessage]);
    startThinking();

    try {
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

      if (!response.body) throw new Error('No response body');
      
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
          if (content.includes('<think>') && !isInternalThinking) {
            isInternalThinking = true;
            internalThinkingText = content.split('<think>').pop() || '';
            updateThinking(internalThinkingText);
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

  function handleFileChange(change: SetStateAction<File[]>) { setFiles(change); }
  function handleSaveInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) { setChatInput(e.target.value); }
  function retry() { setIsErrored(false); setErrorMessage(''); }
  function stop() {
    setIsLoading(false);
    if (abortControllerRef.current) abortControllerRef.current.abort();
    stopThinking();
  }

  const newChat = () => {
    const hasNonEmptyMessage = messages.some(m => m.role === 'user' && m.content?.some(c => c.text && c.text.trim() !== ''));
    if (!hasNonEmptyMessage && chatHistorySessions.length > 0 && activeChatId) {
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
        const firstFree = models.find(m => m.access === 'free');
        const defaultModel = firstFree ? firstFree.id : models[0]?.id;
        if (defaultModel) newChatModelId = defaultModel;
    }
    setSelectedModel(newChatModelId);

    setChatHistorySessions(prevSessions => {
        if (prevSessions.some(s => s.id === newId)) return prevSessions;
        const newPlaceholderSession: ChatSession = {
            id: newId, title: "New Chat", messages: [], timestamp: Date.now(), selectedModelId: newChatModelId,
        };
        return [newPlaceholderSession, ...prevSessions].sort((a, b) => b.timestamp - a.timestamp);
    });
  };

  const handleSelectChat = (chatId: string) => {
    const sessionToLoad = chatHistorySessions.find(s => s.id === chatId);
    if (sessionToLoad) {
      setActiveChatId(sessionToLoad.id);
      setMessages(sessionToLoad.messages || []);
      setSelectedModel(sessionToLoad.selectedModelId || (models.length > 0 ? (models.find(m => m.access === 'free') || models[0])?.id || '' : ''));
      setChatInput(''); 
      setCurrentPreview({});
      if (sandboxManagerRef.current) sandboxManagerRef.current.clear();
      stop();
    }
  };
  
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
    <DashboardLayout isGuest={isGuest} onNewChat={newChat}>
      <div className="h-[calc(100vh-68px)] w-full flex flex-row overflow-x-hidden">
        {!isGuest && (
          <ChatSidebar
            chatHistory={sidebarChatHistory}
            onNewChat={newChat}
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
                    <Chat messages={messages} isLoading={isLoading && !(thinkingMessage?.running)} setCurrentPreview={setCurrentPreview} />
                  </div>
                  <div className="w-full bg-muted z-10 p-4">
                    <div className="max-w-4xl mx-auto">
                      <ChatInput retry={retry} isErrored={isErrored} errorMessage={errorMessage} isLoading={isLoading} isRateLimited={isRateLimited} stop={stop} input={chatInput} handleInputChange={handleSaveInputChange} handleSubmit={handleSubmit} isMultiModal={false} files={files} handleFileChange={handleFileChange} isGuest={isGuest} selectedModel={selectedModel}>
                        {models.length === 0 && !modelsData ? <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" /> : <ChatPicker models={models} selectedModel={selectedModel} onSelectedModelChange={setSelectedModel}  userPlan={isGuest ? 'free' : (userPlanName === 'Pro' ? 'pro' : userPlanName === 'Plus' ? 'plus' : 'free')}  />}
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
                    <Chat messages={messages} isLoading={isLoading && !(thinkingMessage?.running)} setCurrentPreview={setCurrentPreview} />
                  </div>
                  <div className="w-full bg-muted z-10 p-4">
                    <div className="max-w-4xl mx-auto">
                      <ChatInput retry={retry} isErrored={isErrored} errorMessage={errorMessage} isLoading={isLoading} isRateLimited={isRateLimited} stop={stop} input={chatInput} handleInputChange={handleSaveInputChange} handleSubmit={handleSubmit} isMultiModal={false} files={files} handleFileChange={handleFileChange} isGuest={isGuest} selectedModel={selectedModel}>
                        {models.length === 0 && !modelsData ? <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" /> : <ChatPicker models={models} selectedModel={selectedModel} onSelectedModelChange={setSelectedModel}  userPlan={isGuest ? 'free' : (userPlanName === 'Pro' ? 'pro' : userPlanName === 'Plus' ? 'plus' : 'free')}  />}
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
                    {isUserLoading ? 'Loading user...' : isGuest ? 'Hello, Guest' : `Hello, ${user?.name || 'User'}`}
                  </h1>
                  {isGuest && <div className="text-sm text-gray-500 mb-4">Ask me to build anything. To unlock full features, please sign up.</div>}
                  <div className="w-full max-w-2xl">
                    <ChatInput retry={retry} isErrored={isErrored} errorMessage={errorMessage} isLoading={isLoading} isRateLimited={isRateLimited} stop={stop} input={chatInput} handleInputChange={handleSaveInputChange} handleSubmit={handleSubmit} isMultiModal={false} files={files} handleFileChange={handleFileChange} isGuest={isGuest} onSignUp={() => router.push('/sign-up')} selectedModel={selectedModel}>
                      {models.length === 0 && !modelsData ? <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" /> : <ChatPicker models={models} selectedModel={selectedModel} onSelectedModelChange={setSelectedModel}  userPlan={isGuest ? 'free' : (userPlanName === 'Pro' ? 'pro' : userPlanName === 'Plus' ? 'plus' : 'free')}  />}
                    </ChatInput>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col flex-1 h-full w-full">
                  <div className="flex flex-col w-full max-h-full px-4 overflow-auto flex-1">
                    <Chat messages={messages} isLoading={isLoading && !(thinkingMessage?.running)} setCurrentPreview={setCurrentPreview} />
                  </div>
                  <div className="w-full bg-muted z-10 p-4">
                    <div className="max-w-4xl mx-auto">
                      <ChatInput retry={retry} isErrored={isErrored} errorMessage={errorMessage} isLoading={isLoading} isRateLimited={isRateLimited} stop={stop} input={chatInput} handleInputChange={handleSaveInputChange} handleSubmit={handleSubmit} isMultiModal={false} files={files} handleFileChange={handleFileChange} isGuest={isGuest} onSignUp={() => router.push('/sign-up')} selectedModel={selectedModel}>
                        {models.length === 0 && !modelsData ? <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" /> : <ChatPicker models={models} selectedModel={selectedModel} onSelectedModelChange={setSelectedModel}  userPlan={isGuest ? 'free' : (userPlanName === 'Pro' ? 'pro' : userPlanName === 'Plus' ? 'plus' : 'free')}  />}
                      </ChatInput>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}