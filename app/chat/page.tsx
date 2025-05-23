'use client';

import Layout from '../(dashboard)/layout';
import { useState, useRef, useEffect } from 'react';
import { Chat } from '../../components/chat/chat';
import { ChatInput } from '../../components/chat/chat-input';
import { ChatPicker } from '../../components/chat/chat-picker';
import { Plus, Search, ChevronLeft, ChevronRight, Bot, History, PenSquare } from 'lucide-react';
import React from 'react';
import { ChatSidebar } from '../../components/chat/chat-sidebar';
import { FragmentWeb } from '../../components/fragment-web'
import useSWR from 'swr';
import { FragmentSchema } from '../../lib/schema';
import { ExecutionResultWeb } from '../../lib/types';
import { DeepPartial } from 'ai';
import { SandpackPreviewer } from '../../components/chat/SandpackPreviewer';
import Split from 'react-split';
import '../../split-gutter.css';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UserCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Placeholder types and data
const templates = { auto: { name: 'Auto' } };

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
  const chatHistory = [
    { id: '1', title: 'Testing LLM via Terminal', date: '2023-05-22', category: 'today' as const },
    { id: '2', title: 'Pricing Plan Setup', date: '2023-05-22', category: 'today' as const },
    { id: '3', title: 'Git Remote Configuration Fix', date: '2023-05-21', category: 'yesterday' as const },
    { id: '4', title: 'Create Conda Env', date: '2023-05-21', category: 'yesterday' as const },
    { id: '5', title: 'Cursor GitHub Learning Query', date: '2023-05-21', category: 'yesterday' as const },
    { id: '6', title: 'AI Project Showcase', date: '2023-05-21', category: 'yesterday' as const },
    { id: '7', title: 'Token size review process', date: '2023-05-21', category: 'yesterday' as const },
  ];
  const [chatHistoryState] = useState(chatHistory);
  const [userPlan] = useState<'free' | 'pro'>('free');
  const [selectedModel, setSelectedModel] = useState<string>('');

  // Fetch models dynamically
  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  const { data: modelsData } = useSWR('/api/models', fetcher);
  const models = modelsData?.models || [];

  useEffect(() => {
    if (models.length === 1) {
      setSelectedModel(models[0].id);
    }
  }, [models]);

  const showWelcome = messages.length === 0;
  const { data: user } = useSWR('/api/user', fetcher);
  const abortControllerRef = useRef<AbortController | null>(null);
  const router = useRouter();

  // Guest mode logic
  const isGuest = !user;
  const guestMessageLimit = 5;
  // Use localStorage to persist guest message count across tabs/windows
  const [guestMessageCount, setGuestMessageCount] = useState(0);
  useEffect(() => {
    if (isGuest) {
      // 1. Show localStorage count immediately
      const localData = JSON.parse(localStorage.getItem('guestMessageData') || '{"count":0,"timestamp":0}');
      setGuestMessageCount(localData.count || 0);
      // 2. Fetch backend count and update if higher
      fetch('/api/chat/guest-count')
        .then(res => res.json())
        .then(data => {
          if (typeof data.count === 'number' && data.count > (localData.count || 0)) {
            setGuestMessageCount(data.count);
            localStorage.setItem('guestMessageData', JSON.stringify({ count: data.count, timestamp: Date.now() }));
          }
        });
      // Listen for storage events to sync across tabs (optional)
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

  // When a guest sends a message, increment the count in localStorage and UI
  const handleGuestMessageSent = () => {
    if (isGuest) {
      const data = JSON.parse(localStorage.getItem('guestMessageData') || '{"count":0,"timestamp":0}');
      const now = Date.now();
      const newCount = (data.count || 0) + 1;
      localStorage.setItem('guestMessageData', JSON.stringify({ count: newCount, timestamp: now }));
      setGuestMessageCount(newCount);
    }
  };

  // Helper: send fragment to sandbox and update preview state
  async function handleFragmentGenerated(fragment: DeepPartial<FragmentSchema>) {
    setCurrentPreview((prev) => ({ ...prev, fragment }));
    const response = await fetch('/api/sandbox', {
      method: 'POST',
      body: JSON.stringify({ fragment }),
    });
    const result = await response.json();
    setCurrentPreview({ fragment, result });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setChatInput('');
    abortControllerRef.current = new AbortController();

    // Add the user's message and a placeholder for the assistant
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: [{ type: 'text', text: chatInput }], object: null },
      { role: 'assistant', content: [{ type: 'text', text: '' }], object: null },
    ]);

    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [
          ...messages,
          { role: 'user', content: [{ type: 'text', text: chatInput }] },
        ],
        model: models.find((m: any) => m.id === selectedModel),
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
      setIsLoading(false);
      return;
    }

    const reader = response.body.getReader();
    let result = '';
    const decoder = new TextDecoder();
    let fragmentDetected = false;
    let fragment: DeepPartial<FragmentSchema> | undefined = undefined;
    let sandpackTriggered = false;
    let partialHtml = '';
    let htmlStarted = false;

    // --- THINKING STATE ---
    let isThinking = false;
    let thinkingStart = 0;
    let thinkingTimer: any = null;
    let thinkingSeconds = 0;
    let thinkingText = '';
    let thinkingMessageIndex = -1;

    function startThinking() {
      isThinking = true;
      thinkingStart = Date.now();
      thinkingSeconds = 0;
      thinkingText = '';
      // Add a thinking message to messages
      setMessages((prev) => {
        thinkingMessageIndex = prev.length;
        return [
          ...prev,
          {
            type: 'thinking',
            stepsMarkdown: '',
            seconds: 0,
            running: true,
            role: 'assistant',
            content: [],
          },
        ];
      });
      // Start timer
      thinkingTimer = setInterval(() => {
        thinkingSeconds = Math.floor((Date.now() - thinkingStart) / 1000);
        setMessages((prev) => {
          const updated = [...prev];
          const idx = thinkingMessageIndex === -1 ? updated.length - 1 : thinkingMessageIndex;
          if (updated[idx] && updated[idx].type === 'thinking') {
            updated[idx] = {
              ...updated[idx],
              seconds: thinkingSeconds,
            };
          }
          return updated;
        });
      }, 1000);
    }
    function stopThinking() {
      isThinking = false;
      if (thinkingTimer) {
        clearInterval(thinkingTimer);
        thinkingTimer = null;
      }
      setMessages((prev) => {
        const updated = [...prev];
        const idx = thinkingMessageIndex === -1 ? updated.length - 1 : thinkingMessageIndex;
        if (updated[idx] && updated[idx].type === 'thinking') {
          updated[idx] = {
            ...updated[idx],
            running: false,
            seconds: thinkingSeconds,
            stepsMarkdown: thinkingText,
          };
        }
        return updated;
      });
    }

    while (true) {
      try {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (line.trim().startsWith('data:')) {
            const dataStr = line.replace('data:', '').trim();
            if (dataStr === '[DONE]') continue;
            try {
              const data = JSON.parse(dataStr);
              const content = data.choices?.[0]?.delta?.content ?? '';
              // --- THINKING BLOCK PARSING ---
              if (content.includes('<think>')) {
                startThinking();
                // Remove <think> and start accumulating
                thinkingText += content.split('<think>').pop() || '';
              } else if (isThinking && content.includes('</think>')) {
                // Accumulate up to </think> and stop
                thinkingText += content.split('</think>')[0];
                stopThinking();
                // Add the rest (after </think>) to result
                result += content.split('</think>').pop() || '';
                setMessages((prev) => {
                  // Remove the last 'thinking' message and add two messages:
                  // 1. The finalized 'thinking' message (with running: false)
                  // 2. The assistant's response as a new message (no background)
                  const updated = [...prev];
                  // Finalize the last 'thinking' message if present
                  if (updated.length > 0 && updated[updated.length - 1].type === 'thinking') {
                    updated[updated.length - 1] = {
                      ...updated[updated.length - 1],
                      running: false,
                      seconds: thinkingSeconds,
                      stepsMarkdown: thinkingText,
                    };
                  }
                  // Add the assistant message with the result
                  updated.push({
                    role: 'assistant',
                    content: [{ type: 'text', text: result }],
                    object: null,
                    noBackground: true,
                  });
                  return updated;
                });
              } else if (isThinking) {
                // Accumulate thinking text
                thinkingText += content;
                setMessages((prev) => {
                  const updated = [...prev];
                  const idx = thinkingMessageIndex === -1 ? updated.length - 1 : thinkingMessageIndex;
                  if (updated[idx] && updated[idx].type === 'thinking') {
                    updated[idx] = {
                      ...updated[idx],
                      stepsMarkdown: thinkingText,
                    };
                  }
                  return updated;
                });
              } else {
                result += content;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: [{ type: 'text', text: result }],
                  };
                  return updated;
                });
              }
              // Detect code fragment (simple heuristic: if <html> or <!DOCTYPE html> in result)
              if (!fragmentDetected && /<html|<!DOCTYPE html/i.test(result)) {
                fragmentDetected = true;
                fragment = {
                  code: result,
                  file_path: 'index.html',
                  template: 'static-web',
                };
                handleFragmentGenerated(fragment);
              }
              // Immediately trigger Sandpack if any HTML code is detected in the current chunk
              if (!htmlStarted && /<!DOCTYPE html|<html/i.test(content)) {
                htmlStarted = true;
              }
              if (htmlStarted) {
                partialHtml += content;
                setMessages((prev) => {
                  const updated = [...prev];
                  // Find the last assistant message
                  for (let i = updated.length - 1; i >= 0; i--) {
                    if (updated[i].role === 'assistant') {
                      updated[i] = {
                        ...updated[i],
                        content: [{ type: 'text', text: partialHtml }],
                      };
                      break;
                    }
                  }
                  return updated;
                });
              }
            } catch (err) {
              // Ignore JSON parse errors for non-data lines
            }
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          // Suppress AbortError when stopping the stream
          break;
        } else {
          // Handle other errors if needed
          setIsErrored(true);
          setErrorMessage(err?.message || 'An error occurred');
          break;
        }
      }
    }
    setIsLoading(false);
    stopThinking();
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

  function stopStreamAndThinking() {
    setIsLoading(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    stopThinking();
  }

  function stop() {
    stopStreamAndThinking();
  }

  // Helper to extract files from the latest assistant message
  function extractFilesFromMessages(messages: any[]): Record<string, { code: string, active?: boolean, hidden?: boolean }> | null {
    // Support code blocks like ```html filename\ncode\n```, ```filename\ncode\n```, or ```lang\ncode\n```
    // Try to extract filename from the first line after the triple backticks, or from the code block info string
    const fileRegex = /```([a-zA-Z0-9]+)?\s*([a-zA-Z0-9._\/-]+)?\n([\s\S]*?)```/g;
    let files: Record<string, { code: string, active?: boolean, hidden?: boolean }> = {};
    let found = false;

    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'assistant' && msg.content && Array.isArray(msg.content)) {
        for (const c of msg.content) {
          if (c.type === 'text' && c.text) {
            let match;
            while ((match = fileRegex.exec(c.text)) !== null) {
              // match[1] = language, match[2] = filename (optional), match[3] = code
              let filename = match[2]?.trim() || '';
              let lang = match[1]?.trim() || '';
              const code = match[3];
              // If filename is missing, infer from language
              if (!filename) {
                if (lang === 'html') filename = 'index.html';
                else if (lang === 'css') filename = 'styles.css';
                else if (lang === 'js' || lang === 'javascript') filename = 'script.js';
              }
              if (filename) {
                files[`/${filename}`] = { code, active: filename === 'index.html' };
                found = true;
              }
            }
          }
        }
      }
      if (found) break;
    }
    return found ? files : null;
  }

  const [splitSizes, setSplitSizes] = useState([70, 30]);

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

  return (
    <Layout>
      <div className="h-[calc(100vh-70px)] w-full bg-muted flex flex-row overflow-x-hidden">
        {/* Floating New Chat button and Plan badge */}
        <div style={{ position: 'absolute', top: isGuest ? 25:20, right: isGuest ? 220 : 80, zIndex: 50 }} className="flex flex-row gap-3 items-center">
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <PenSquare
                  className="w-5 h-5 cursor-pointer hover:text-gray-600 text-black"
                  onClick={() => {
                    setMessages([]);
                    setChatInput('');
                    setErrorMessage('');
                    setIsErrored(false);
                    setCurrentPreview({});
                    stopStreamAndThinking();
                    if (isGuest) {
                      setGuestMessageCount(0);
                      localStorage.setItem('guestMessageData', JSON.stringify({ count: 0, timestamp: Date.now() }));
                    }
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>New Chat</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {!isGuest && (
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 font-medium text-sm">
              <span className="inline-block w-3 h-3 rounded-full bg-gray-400"></span> Free Plan
            </span>
          )}
        </div>
        {/* Main content: either just chat, or split pane with chat and Sandpack */}
        {(() => {
          const sandpackFiles = extractFilesFromMessages(messages);
          if (sandpackFiles) {
            return (
              <div className="flex-1 h-full max-w-[calc(100vw-260px)]" style={{ minWidth: 0, display: 'flex' }}>
                <Split
                  className="flex-1 h-full split-horizontal"
                  sizes={splitSizes}
                  minSize={[150, 150]}
                  gutterSize={8}
                  direction="horizontal"
                  style={{ display: 'flex', height: '100%' }}
                  onDragEnd={setSplitSizes}
                >
                  {/* Chat area (center) */}
                  <div className="flex flex-col flex-1 h-full min-w-[150px] max-w-full overflow-hidden">
                    <div
                      className={`flex flex-col w-full max-h-full px-4 overflow-auto flex-1 ${
                        currentPreview.result ? 'max-w-[800px] mx-auto col-span-1' : 'w-full col-span-2'
                      }`}
                    >
                      <Chat
                        messages={messages}
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
                        >
                          <ChatPicker models={models} selectedModel={selectedModel} onSelectedModelChange={setSelectedModel} />
                        </ChatInput>
                      </div>
                    </div>
                    {currentPreview.result && (
                      <div className="flex-1 flex flex-col min-w-[350px] max-w-full border-l border-gray-200 bg-white dark:bg-black/10">
                        <FragmentWeb result={currentPreview.result} />
                      </div>
                    )}
                  </div>
                  {/* Sandpack on the right */}
                  <div className="min-w-[150px] h-full overflow-hidden">
                    <SandpackPreviewer files={sandpackFiles} />
                  </div>
                </Split>
              </div>
            );
          }
          // No code detected: just show chat area (center)
          return (
            <div className="flex-1 flex flex-col overflow-hidden relative">
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
                    >
                      <ChatPicker models={models} selectedModel={selectedModel} onSelectedModelChange={setSelectedModel} />
                    </ChatInput>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col flex-1 h-full">
                  <div
                    className={`flex flex-col w-full max-h-full px-4 overflow-auto flex-1 ${
                      currentPreview.result ? 'max-w-[800px] mx-auto col-span-1' : 'w-full col-span-2'
                    }`}
                  >
                    <Chat
                      messages={messages}
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
                      >
                        <ChatPicker models={models} selectedModel={selectedModel} onSelectedModelChange={setSelectedModel} />
                      </ChatInput>
                    </div>
                  </div>
                  {currentPreview.result && (
                    <div className="flex-1 flex flex-col min-w-[350px] max-w-full border-l border-gray-200 bg-white dark:bg-black/10">
                      <FragmentWeb result={currentPreview.result} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </Layout>
  );
}
