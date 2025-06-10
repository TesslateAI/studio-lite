'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useState, useRef, useEffect, useMemo, useCallback, Suspense } from 'react';
import { Chat } from '../../components/chat/chat';
import { ChatInput } from '../../components/chat/chat-input';
import { ChatPicker } from '../../components/chat/chat-picker';
import { ChatSidebar } from '../../components/chat/chat-sidebar';
import React from 'react';
import useSWR, { useSWRConfig } from 'swr';
import useSWRMutation from 'swr/mutation';
import { SandpackPreviewer } from '../../components/chat/SandpackPreviewer';
import Split from 'react-split';
import '../../split-gutter.css';
import { useRouter } from 'next/navigation';
import { ChatCompletionStream } from '../../lib/stream-processing';
import { extractAllCodeBlocks, ExtractedCodeBlock } from '../../lib/code-detection';
import { useSandbox } from '../../lib/hooks/use-sandbox';
import { Message } from '@/lib/messages';
import { Model } from '@/lib/types';
import { User, ChatSession as DbChatSession, ChatMessage as DbChatMessage, Stripe } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';
import { debounce } from 'lodash';
import { Bot, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {generateChatCompletion} from "@/lib/litellm/api";

type SessionWithMessages = Omit<DbChatSession, 'messages'> & {
    messages: (Omit<DbChatMessage, 'content'> & { content: Message })[];
};
type Category = "Today" | "Yesterday" | "Last 7 Days" | "Last 30 Days" | "Older";

const GUEST_MESSAGE_LIMIT = 10;
const fetcher = (url: string) => fetch(url).then((res) => res.json());

async function saveChatSession(url: string, { arg }: { arg: { id: string; title: string; selectedModelId: string | null; messages: Message[] } }) {
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(arg),
    });
}

function getCategoryForDate(dateString: string | Date): Category {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    if (date >= today) return "Today";
    if (date >= yesterday) return "Yesterday";
    if (date >= sevenDaysAgo) return "Last 7 Days";
    if (date >= thirtyDaysAgo) return "Last 30 Days";
    return "Older";
}

function parseThinkContent(content: string) {
    // Define start and end tag patterns (case-insensitive)
    const startTag = /<(think|\|?begin_of_thought\|?)>/i;
    const endTag = /<(\/?think|\|?end_of_thought\|?|\|?begin_of_solution\|?|\|?solution\|?)>/i;

    // Find the first start tag
    const startMatch = startTag.exec(content);
    if (!startMatch) {
        // No think/thought tag, return as-is
        return { think: null, main: content.replace(/<\|?(begin|end)_of_solution\|?>/gi, '').trim() };
    }

    const startIdx = startMatch.index + startMatch[0].length;

    // Find the end tag after the start tag
    const rest = content.slice(startIdx);
    const endMatch = endTag.exec(rest);

    let endIdx;
    if (endMatch) {
        endIdx = startIdx + endMatch.index;
    } else {
        endIdx = content.length;
    }

    // Extract think block and main content
    const think = content.slice(startIdx, endIdx).trim();
    // Remove the think block (including start and end tags) from the content
    let main = (content.slice(0, startMatch.index) + content.slice(endIdx + (endMatch ? endMatch[0].length : 0))).trim();
    main = main.replace(/<\|?(begin|end)_of_solution\|?>/gi, '');
    return { think, main };
}


export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isErrored, setIsErrored] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [selectedModel, setSelectedModel] = useState<string>('');
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [isArtifactVisible, setIsArtifactVisible] = useState(false);
    const [guestMessageCount, setGuestMessageCount] = useState(0);
    const initialLoadHandled = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    
    const sandboxState = useSandbox();
    const router = useRouter();

    const { data: user, isLoading: isUserLoading } = useSWR<User>('/api/user', fetcher);
    const { data: modelsData } = useSWR<{ models: Model[] }>('/api/models', fetcher, { revalidateOnFocus: false });
    const { data: stripeData } = useSWR(user && !user.isGuest ? '/api/stripe/user' : null, fetcher);
    const { data: chatHistory, isLoading: isHistoryLoading } = useSWR<SessionWithMessages[]>(user && !user.isGuest ? '/api/chat/history' : null, fetcher);
    const { trigger: triggerSave } = useSWRMutation('/api/chat/history', saveChatSession);
    const { mutate } = useSWRConfig();

    const userPlan = user?.isGuest ? 'free' : (stripeData?.planName?.toLowerCase() || 'free');
    const models: Model[] = modelsData?.models || [];
    const litellmVirtualKey = (user?.litellmVirtualKey)?.trim() || '';
    const openArtifact = useCallback((messageId: string) => {
        const message = messages.find(m => m.id === messageId);
        const codeBlocks = message?.object?.codeBlocks as ExtractedCodeBlock[] | undefined;
        if (codeBlocks) {
            sandboxState.sandboxManager?.clear();
            codeBlocks.forEach((block: ExtractedCodeBlock) => {
                sandboxState.sandboxManager?.addFile(`/${block.filename.replace(/^\//, '')}`, block.code);
            });
            setIsArtifactVisible(true);
            sandboxState.sandboxManager?.setActiveTab('preview');
        }
    }, [messages, sandboxState.sandboxManager]);

    const closeArtifact = useCallback(() => setIsArtifactVisible(false), []);

    const newChat = useCallback(() => {
        const newId = uuidv4();
        const defaultModelId = models.find(m => m.access === 'free')?.id || models[0]?.id || '';
        setActiveChatId(newId);
        setMessages([]);
        setChatInput('');
        setIsErrored(false);
        setErrorMessage('');
        setSelectedModel(defaultModelId);
        closeArtifact();

        if (user && !user.isGuest) {
            localStorage.setItem('activeChatId', newId);
            mutate('/api/chat/history', (currentData: SessionWithMessages[] = []) => {
                const newSessionPlaceholder: any = {
                    id: newId, title: 'New Chat', userId: user.id,
                    createdAt: new Date(), updatedAt: new Date(),
                    selectedModelId: defaultModelId, messages: [],
                };
                return [newSessionPlaceholder, ...currentData].sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            }, { revalidate: false });
        }
    }, [models, user, mutate, closeArtifact]);

    const handleSelectChat = useCallback((chatId: string) => {
        const session = chatHistory?.find(s => s.id === chatId);
        if (session) {
            setActiveChatId(session.id);
            const loadedMessages = session.messages.map(m => m.content);
            setMessages(loadedMessages);
            setSelectedModel(session.selectedModelId || models[0]?.id || '');
            
            const lastMessage = loadedMessages[loadedMessages.length - 1];
            if(lastMessage?.object?.codeBlocks && lastMessage.object.codeBlocks.length > 0) {
                openArtifact(lastMessage.id);
            } else {
                closeArtifact();
            }
            
            localStorage.setItem('activeChatId', chatId);
        }
    }, [chatHistory, models, closeArtifact, openArtifact]);

    const stopGeneration = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (user?.isGuest) {
            const count = parseInt(localStorage.getItem('guestMessageCount') || '0', 10);
            setGuestMessageCount(count);
        }
    }, [user?.isGuest]);
    
    useEffect(() => {
        if (initialLoadHandled.current || isUserLoading || !models.length) return;
        if (user && !user.isGuest && isHistoryLoading) return;
        
        if (user) {
            if (user.isGuest) {
                newChat();
            } else if (chatHistory) {
                 const lastActiveId = localStorage.getItem('activeChatId');
                 const sessionToLoad = chatHistory.find(s => s.id === lastActiveId) || chatHistory[0];

                if (sessionToLoad) {
                    handleSelectChat(sessionToLoad.id);
                } else {
                    newChat();
                }
            }
            initialLoadHandled.current = true;
        }
    }, [user, isUserLoading, models, chatHistory, isHistoryLoading, newChat, handleSelectChat]);

    const debouncedSave = useCallback(debounce((sessionData: any) => {
        if (!user || user.isGuest) return;
        triggerSave(sessionData).then(() => mutate('/api/chat/history'));
    }, 1500), [user, triggerSave, mutate]);

    useEffect(() => {
        if (!activeChatId || !user || user.isGuest || isLoading || !messages.length) return;
        
        const currentMessagesToSave = messages.filter(m => {
            const hasText = m.content?.some(c => c.text?.trim());
            const hasObject = !!m.object;
            return m.role !== 'system' && (hasText || hasObject);
        });
        if (currentMessagesToSave.length === 0) return; // Don't save empty/system chats

        const session = chatHistory?.find(s => s.id === activeChatId);
        let title = session?.title || 'New Chat';
        if (title === 'New Chat') {
             const firstUserMessage = currentMessagesToSave.find(m => m.role === 'user')?.content[0]?.text?.trim();
             if (firstUserMessage) {
                title = firstUserMessage.length > 40 ? `${firstUserMessage.substring(0, 40)}...` : firstUserMessage;
             }
        }
        
        debouncedSave({
            id: activeChatId,
            title,
            selectedModelId: selectedModel,
            messages: currentMessagesToSave
        });
    }, [messages, selectedModel, activeChatId, user, isLoading, debouncedSave, chatHistory]);

    const executeChatStream = useCallback(async (currentMessages: Message[]) => {
        setIsLoading(true);
        setIsErrored(false);
        setErrorMessage('');
        closeArtifact();

        abortControllerRef.current = new AbortController();

        try {
            const messagesForApi = currentMessages
                .filter(m => m.role === 'user' || m.role === 'assistant')
                .map(m => {
                    const textContent = m.content?.map(c => c.text).join('') || '';
                    const codeContent = (m.object?.codeBlocks as ExtractedCodeBlock[])?.map(b => `\`\`\`${b.language}{"filename":"${b.filename}"}\n${b.code}\n\`\`\``).join('\n') || '';
                    return { role: m.role, content: `${m.stepsMarkdown ? `<think>${m.stepsMarkdown}</think>\n` : ''}${textContent}\n${codeContent}`.trim() };
                });

            if (messagesForApi.length === 0) throw new Error("No messages to send.");


            const liteLLMResponse = await generateChatCompletion(litellmVirtualKey, {messages: messagesForApi, model: selectedModel, stream:true});
            if (!liteLLMResponse.ok || !liteLLMResponse.body) throw new Error(response.statusText || 'API error');

            const assistantMessageId = uuidv4();
            setMessages(prev => [...prev, { id: assistantMessageId, role: 'assistant', content: [] } as Message]);

            const stream = ChatCompletionStream.fromReadableStream(liteLLMResponse.body);

            stream.on('content', (delta, content) => {
                const { think, main } = parseThinkContent(content);
                const { text, codeBlocks } = extractAllCodeBlocks(main);

                setMessages(prev => prev.map((msg: Message) => {
                    if (msg.id === assistantMessageId) {
                        const updatedMsg: Message = { ...msg, content: [{ type: 'text', text: main }], stepsMarkdown: think ?? undefined };
                        if (codeBlocks.length > 0) {
                            updatedMsg.object = { title: codeBlocks.length > 1 ? "Multi-file Artifact" : codeBlocks[0].filename, codeBlocks: codeBlocks };
                        }
                        return updatedMsg;
                    }
                    return msg as Message;
                }));
            });

            stream.on('finalContent', (finalContent) => {
                const { main } = parseThinkContent(finalContent);
                const { codeBlocks } = extractAllCodeBlocks(main);

                if (codeBlocks.length > 0) {
                    sandboxState.sandboxManager?.clear();
                    codeBlocks.forEach((block: ExtractedCodeBlock) => {
                        const filePath = `/${block.filename.replace(/^\//, '')}`;
                        sandboxState.sandboxManager?.addFile(filePath, block.code);
                    });
                    setIsArtifactVisible(true);
                    sandboxState.sandboxManager?.setActiveTab('preview');
                }
            });

            await stream.start();
        } catch (error: any) {
            if (error.name !== 'AbortError') {
              setMessages(prev => prev.slice(0, -1));
              setIsErrored(true); // This shows the retry button in ChatInput
              setErrorMessage(error.message || "An unexpected error occurred.");
            }
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    }, [selectedModel, closeArtifact, sandboxState.sandboxManager]);

    const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isLoading || !chatInput.trim()) return;
        
        if (user?.isGuest) {
            const newCount = guestMessageCount + 1;
            if (newCount > GUEST_MESSAGE_LIMIT) { router.push('/sign-up'); return; }
            setGuestMessageCount(newCount);
            localStorage.setItem('guestMessageCount', newCount.toString());
        }
        
        const newUserMessage: Message = { id: uuidv4(), role: 'user', content: [{ type: 'text', text: chatInput }] };
        const updatedMessages = [...messages, newUserMessage];

        setMessages(updatedMessages);
        setChatInput('');
        await executeChatStream(updatedMessages);

    }, [isLoading, chatInput, user, guestMessageCount, router, messages, executeChatStream]);
    
    const handleRetry = useCallback(() => {
        if (isLoading) return;

        const lastUserMessageIndex = messages.map(m => m.role).lastIndexOf('user');
        if (lastUserMessageIndex === -1) return;

        const historyForRetry = messages.slice(0, lastUserMessageIndex + 1);
        setMessages(historyForRetry);
        executeChatStream(historyForRetry);
    }, [isLoading, messages, executeChatStream]);

    const handleEdit = useCallback((messageId: string) => {
        const messageIndex = messages.findIndex(m => m.id === messageId);
        if (messageIndex === -1 || messages[messageIndex].role !== 'user') return;

        const messageToEdit = messages[messageIndex];
        const textContent = messageToEdit.content.map(c => c.text).join('') || '';

        setChatInput(textContent);
        setMessages(prev => prev.slice(0, messageIndex));
        closeArtifact();
    }, [messages, closeArtifact]);

    const formattedChatHistory = useMemo(() => {
        if (!chatHistory) return [];
        return chatHistory.map(s => ({
            id: s.id,
            title: s.title,
            category: getCategoryForDate(s.updatedAt)
        }));
    }, [chatHistory]);

    const { lastUserMessageId, lastAssistantMessageId } = useMemo(() => {
        let lastUser: string | undefined = undefined;
        let lastAssistant: string | undefined = undefined;
        for(let i = messages.length - 1; i >= 0; i--) {
            if (!lastUser && messages[i].role === 'user') lastUser = messages[i].id;
            if (!lastAssistant && messages[i].role === 'assistant') lastAssistant = messages[i].id;
            if (lastUser && lastAssistant) break;
        }
        return { lastUserMessageId: lastUser, lastAssistantMessageId: lastAssistant };
    }, [messages]);

    return (
        <DashboardLayout isGuest={user?.isGuest} onNewChat={newChat}>
            <div className="h-[calc(100vh-68px)] w-full flex flex-row overflow-hidden">
                {!user?.isGuest && (
                    <ChatSidebar
                        chatHistory={formattedChatHistory}
                        onNewChat={newChat}
                        onSelectChat={handleSelectChat}
                        activeChatId={activeChatId}
                    />
                )}
                <div className="flex-1 bg-muted flex flex-col overflow-hidden">
                    <Split 
                      className="flex-1 h-full split-horizontal" 
                      sizes={isArtifactVisible ? [55, 45] : [100, 0]}
                      minSize={isArtifactVisible ? [400, 300] : [0, 0]} 
                      gutterSize={isArtifactVisible ? 8 : 0} 
                      direction="horizontal" 
                      style={{ display: 'flex', height: '90vh' }}
                    >
                        <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden bg-background">
                            {messages.length === 0 && !isLoading ? (
                                <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                                    <div className="p-4 rounded-full bg-primary/10 mb-4"><Bot className="h-8 w-8 text-primary" /></div>
                                    <h1 className="text-2xl font-semibold mb-2">Tesslate Designer</h1>
                                    <p className="text-muted-foreground max-w-md">Start a new conversation.</p>
                                </div>
                            ) : (
                                <Chat 
                                  messages={messages} 
                                  isLoading={isLoading} 
                                  onOpenArtifact={openArtifact}
                                  onEdit={handleEdit}
                                  onRetry={handleRetry}
                                  lastUserMessageId={lastUserMessageId}
                                  lastAssistantMessageId={lastAssistantMessageId}
                                />
                            )}
                            <div className="w-full bg-background z-10 p-4 border-t">
                                <div className="max-w-4xl mx-auto">
                                    <ChatInput
                                        retry={handleRetry} 
                                        isErrored={isErrored} errorMessage={errorMessage}
                                        isLoading={isLoading} isRateLimited={false} stop={stopGeneration}
                                        input={chatInput} handleInputChange={(e) => setChatInput(e.target.value)}
                                        handleSubmit={handleSubmit} isMultiModal={false} files={[]}
                                        handleFileChange={() => {}} isGuest={user?.isGuest} 
                                        guestMessageCount={guestMessageCount} guestMessageLimit={GUEST_MESSAGE_LIMIT}
                                        onSignUp={() => router.push('/sign-up')} selectedModel={selectedModel}
                                    >
                                        <ChatPicker models={models} selectedModel={selectedModel} onSelectedModelChange={setSelectedModel} userPlan={userPlan as any} />
                                    </ChatInput>
                                </div>
                            </div>
                        </div>
                        <div className="relative flex flex-col min-w-0 h-full overflow-hidden bg-background">
                            {isArtifactVisible && (
                                <>
                                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 z-20 h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm hover:bg-muted" onClick={closeArtifact}><X className="h-5 w-5"/></Button>
                                    <SandpackPreviewer 
                                        files={sandboxState.files} 
                                        isStreaming={isLoading}
                                        activeTab={sandboxState.activeTab}
                                        onTabChange={(tab) => sandboxState.sandboxManager?.setActiveTab(tab)}
                                    />
                                </>
                            )}
                        </div>
                    </Split>
                </div>
            </div>
        </DashboardLayout>
    );
}