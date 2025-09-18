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
import { GripVertical } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChatCompletionStream, createThrottledFunction } from '../../lib/stream-processing';
import { extractAllCodeBlocks, extractStreamingCodeBlocks, shouldShowArtifact, ExtractedCodeBlock } from '../../lib/code-detection';
import { SmartStreamingManager, createSmartDebouncedFunction } from '../../lib/smart-streaming';
import { useSandbox } from '../../lib/hooks/use-sandbox';
import { Message } from '@/lib/messages';
import { Model } from '@/lib/types';
import { User, ChatSession as DbChatSession, ChatMessage as DbChatMessage } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';
import { debounce } from 'lodash';
import { Bot, X, Menu } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getClientAuth } from '@/lib/firebase/client';
import { onAuthStateChanged, signInAnonymously, User as FirebaseUser } from 'firebase/auth';
import { chatManager } from '@/lib/chat-manager';
import { clearAuthStorage, resetGuestState, validateGuestMessageCount } from '@/lib/auth/auth-utils';

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
    // Find the LAST </think> tag
    const thinkEndTag = /<\/(think|\|?end_of_thought\|?)>/gi;
    const matches = Array.from(content.matchAll(thinkEndTag));
    
    if (matches.length === 0) {
        // No end tag found - check if we have a start tag (still streaming)
        const thinkStartMatch = content.match(/<(think|\|?begin_of_thought\|?)>/i);
        
        if (thinkStartMatch) {
            // Has start tag - EVERYTHING after it is thinking (preserve ALL whitespace)
            const startIdx = thinkStartMatch.index! + thinkStartMatch[0].length;
            const thinkContent = content.slice(startIdx); // Keep everything as-is
            const beforeThink = content.slice(0, thinkStartMatch.index);
            return { think: thinkContent, main: cleanXMLTags(beforeThink) };
        }
        
        // No think tags at all
        return { think: null, main: cleanXMLTags(content.replace(/<\|?(begin|end)_of_solution\|?>/gi, '')) };
    }
    
    // Found </think> tag - EVERYTHING before it is thinking (preserve ALL content)
    const lastEndMatch = matches[matches.length - 1];
    const lastEndIdx = lastEndMatch.index! + lastEndMatch[0].length;
    
    // Get EVERYTHING before the last </think>
    let thinkContent = content.slice(0, lastEndMatch.index);
    
    // Only remove the opening <think> tag, preserve everything else
    const thinkStartMatch = thinkContent.match(/<(think|\|?begin_of_thought\|?)>/i);
    if (thinkStartMatch) {
        const beforeTag = thinkContent.slice(0, thinkStartMatch.index);
        const afterTag = thinkContent.slice(thinkStartMatch.index! + thinkStartMatch[0].length);
        thinkContent = beforeTag + afterTag; // Don't trim anything
    }
    
    // Everything after last </think> is main content
    const afterThink = content.slice(lastEndIdx);
    let main = afterThink.replace(/<\|?(begin|end)_of_solution\|?>/gi, '');
    
    return { think: thinkContent || null, main: cleanXMLTags(main) };
}

function cleanXMLTags(content: string): string {
    // Remove <files> and </files> tags
    content = content.replace(/<\/?files>/gi, '');
    
    // Replace <file path="..."> with just a filename header, and </file> with nothing
    content = content.replace(/<file\s+path="([^"]+)"\s*>/gi, (match, path) => {
        const filename = path.split('/').pop() || path;
        return `**${filename}**\n`;
    });
    content = content.replace(/<\/file>/gi, '');
    
    return content.trim();
}


function ChatPageContent() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [loadingChats, setLoadingChats] = useState<Set<string>>(new Set());
    const [chatStates, setChatStates] = useState<Map<string, { messages: Message[], selectedModel: string }>>(new Map());
    const isLoading = activeChatId ? loadingChats.has(activeChatId) : false;
    const [isErrored, setIsErrored] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [selectedModel, setSelectedModel] = useState<string>('');
    const [isArtifactVisible, setIsArtifactVisible] = useState(false);
    const [artifactVersions, setArtifactVersions] = useState<Array<{ messageId: string; codeBlocks: any[]; timestamp: number }>>([]);
    const [currentArtifactIndex, setCurrentArtifactIndex] = useState<number>(-1);
    const [userClosedArtifact, setUserClosedArtifact] = useState(false);
    const [chatWidth, setChatWidth] = useState(55); // Percentage
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [guestMessageCount, setGuestMessageCount] = useState(() => {
        // Initialize from localStorage with validation
        if (typeof window !== 'undefined') {
            return validateGuestMessageCount();
        }
        return 0;
    });
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const initialLoadHandled = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const smartStreamingManager = useRef<SmartStreamingManager>(new SmartStreamingManager());
    
    const sandboxState = useSandbox();
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialPrompt = searchParams.get('prompt');

    const { data: user, isLoading: isUserLoading, mutate: mutateUser } = useSWR<User>('/api/user', fetcher);
    const { data: modelsData } = useSWR<{ models: Model[] }>('/api/models', fetcher, { revalidateOnFocus: false });
    const { data: stripeData } = useSWR(user && !user.isGuest ? '/api/stripe/user' : null, fetcher);
    const { data: chatHistory, isLoading: isHistoryLoading } = useSWR<SessionWithMessages[]>(user && !user.isGuest ? '/api/chat/history' : null, fetcher);
    const { trigger: triggerSave } = useSWRMutation('/api/chat/history', saveChatSession);
    const { mutate } = useSWRConfig();

    const userPlan = user?.isGuest ? 'free' : (stripeData?.planName?.toLowerCase() || 'free');
    const models: Model[] = modelsData?.models || [];
    
    
    // Handle initial prompt from URL
    useEffect(() => {
        if (initialPrompt && !initialLoadHandled.current && !activeChatId) {
            setChatInput(decodeURIComponent(initialPrompt));
            // Clear the prompt from URL after setting it
            const url = new URL(window.location.href);
            url.searchParams.delete('prompt');
            window.history.replaceState({}, '', url.toString());
        }
    }, [initialPrompt, activeChatId]);
    
    // Set default model when models are loaded and no model is selected
    useEffect(() => {
        if (models.length > 0 && !selectedModel) {
            const defaultModel = models.find(m => m.access === 'free')?.id || models[0]?.id;
            if (defaultModel) {
                setSelectedModel(defaultModel);
            }
        }
    }, [models, selectedModel]);

    useEffect(() => {
        const auth = getClientAuth();
        let isMounted = true; // Track if component is mounted
        let guestAttempted = false; // Track if we already attempted guest auth
        let retryCount = 0; // Track retry attempts
        const MAX_RETRIES = 3;
        
        // IMMEDIATE CHECK: If we have a Firebase user but no DB user on mount, clear it
        const immediateCheck = async () => {
            const currentFbUser = auth.currentUser;
            if (currentFbUser && !user && !isUserLoading) {
                console.log('IMMEDIATE CHECK: Found stale Firebase user on mount, clearing...');
                try {
                    await auth.signOut();
                    clearAuthStorage();
                    await fetch('/api/auth/clear-state', { method: 'POST' });
                    window.location.reload();
                } catch (error) {
                    console.error('Error in immediate check:', error);
                    window.location.reload();
                }
            }
        };
        
        // Run immediate check after a short delay to ensure user data has attempted to load
        if (!isUserLoading) {
            immediateCheck();
        }
        
        // Clear any stale auth state from localStorage on mount
        const clearStaleAuthState = () => {
            // Remove stale chat ID if user changed
            const storedUserId = localStorage.getItem('lastUserId');
            if (user && storedUserId && storedUserId !== user.id) {
                localStorage.removeItem('activeChatId');
                localStorage.removeItem('guestMessageCount');
            }
            if (user) {
                localStorage.setItem('lastUserId', user.id);
            }
        };
        
        clearStaleAuthState();
        
        const attemptGuestAuth = async () => {
            if (!isMounted || guestAttempted) return;
            
            guestAttempted = true;
            retryCount++;
            
            console.log(`Creating anonymous guest session... (attempt ${retryCount}/${MAX_RETRIES})`);
            try {
                // First, clear any existing Firebase auth state
                await auth.signOut().catch(() => {}); // Ignore errors
                
                // Add a small delay to ensure clean state
                await new Promise(resolve => setTimeout(resolve, 100));
                
                const guestCredential = await signInAnonymously(auth);
                if (!isMounted) return; // Check again after async operation
                
                console.log('Anonymous sign-in successful:', guestCredential.user.uid);
                setFirebaseUser(guestCredential.user);
                
                const idToken = await guestCredential.user.getIdToken();
                console.log('Creating guest session...');
                
                const sessionResponse = await fetch('/api/auth/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken, isGuest: true }),
                });
                
                if (!sessionResponse.ok) {
                    const errorData = await sessionResponse.json().catch(() => ({}));
                    console.error('Session creation failed:', errorData);
                    throw new Error(`Session creation failed: ${sessionResponse.status}`);
                }
                
                console.log('Guest session created successfully');
                
                // Reset guest state properly
                resetGuestState();
                setGuestMessageCount(0);
                
                if (isMounted) {
                    // Force refresh user data
                    await mutateUser();
                }
                
                // Success - reset retry count
                retryCount = 0;
                
            } catch (error) {
                console.error(`Guest authentication failed (attempt ${retryCount}/${MAX_RETRIES}):`, error);
                
                // Reset attempt flag for retry
                guestAttempted = false;
                
                // Retry with exponential backoff
                if (isMounted && retryCount < MAX_RETRIES) {
                    const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
                    console.log(`Retrying guest auth in ${delay}ms...`);
                    
                    setTimeout(() => {
                        if (isMounted) {
                            attemptGuestAuth();
                        }
                    }, delay);
                } else if (isMounted) {
                    // All retries failed - show error
                    setIsErrored(true);
                    setErrorMessage('Failed to create guest session. Please refresh the page or sign up for full access.');
                }
            }
        };
        
        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
            if (!isMounted) return; // Prevent state updates if unmounted
            
            console.log('Auth state changed:', { 
                hasFirebaseUser: !!fbUser, 
                hasUser: !!user, 
                userIsGuest: user?.isGuest,
                isUserLoading,
                guestAttempted
            });
            
            if (fbUser) {
                // CRITICAL: Check for mismatched state (Firebase user but no DB user)
                // This is the problematic state we need to fix
                if (!isUserLoading && !user) {
                    console.log('CRITICAL: Detected stale Firebase auth (has Firebase user but no DB user), clearing immediately...');
                    
                    // Clear everything immediately - don't wait
                    try {
                        await auth.signOut();
                        clearAuthStorage();
                        await fetch('/api/auth/clear-state', { method: 'POST' });
                        
                        // Force page reload to get clean state
                        console.log('Reloading page to clear stale auth state...');
                        window.location.reload();
                    } catch (error) {
                        console.error('Error clearing stale auth:', error);
                        // Force reload anyway
                        window.location.reload();
                    }
                    return; // Stop processing
                }
                
                // If we have a user or still loading, proceed normally
                setFirebaseUser(fbUser);
                // Clear any error state
                if (isErrored && errorMessage.includes('guest session')) {
                    setIsErrored(false);
                    setErrorMessage('');
                }
            } else {
                // No Firebase user
                // Skip if we're still loading user data
                if (isUserLoading) return;
                
                // Skip if we already attempted guest auth
                if (guestAttempted) return;
                
                // Only redirect existing non-guest users to sign-in
                if (user && !user.isGuest) {
                    console.log('Redirecting non-guest user to sign-in');
                    router.push('/sign-in');
                    return;
                }
                
                // Attempt guest authentication with retry logic
                attemptGuestAuth();
            }
        });
        
        // If we don't have a Firebase user after a reasonable time, trigger guest auth
        const timeoutId = setTimeout(() => {
            if (isMounted && !firebaseUser && !user && !isUserLoading && !guestAttempted) {
                console.log('Auth state timeout - forcing guest auth attempt');
                attemptGuestAuth();
            }
        }, 2000);
        
        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
            unsubscribe();
        };
    }, [user, mutateUser, router, isUserLoading, firebaseUser]);

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

    const closeArtifact = useCallback(() => {
        setIsArtifactVisible(false);
        setUserClosedArtifact(true);
    }, []);

    const newChat = useCallback(() => {
        const newId = uuidv4();
        const defaultModelId = models.find(m => m.access === 'free')?.id || models[0]?.id || '';
        
        // Reset smart streaming manager
        smartStreamingManager.current.reset();
        
        setActiveChatId(newId);
        setMessages([]);
        setChatInput('');
        setIsErrored(false);
        setErrorMessage('');
        setSelectedModel(defaultModelId);
        setUserClosedArtifact(false);
        closeArtifact();

        if (user && !user.isGuest) {
            localStorage.setItem('activeChatId', newId);
            // Add optimistic placeholder to chat history
            mutate('/api/chat/history', (currentData: SessionWithMessages[] = []) => {
                const newSessionPlaceholder: SessionWithMessages = {
                    id: newId, 
                    title: 'New Chat', 
                    userId: user.id,
                    createdAt: new Date(), 
                    updatedAt: new Date(),
                    selectedModelId: defaultModelId, 
                    messages: [],
                };
                return [newSessionPlaceholder, ...currentData]; // Don't sort - keep original order
            }, { revalidate: false });
        }
    }, [models, user, mutate, closeArtifact]);

    const handleSelectChat = useCallback((chatId: string) => {
        // Save current chat state before switching
        if (activeChatId) {
            setChatStates(prev => new Map(prev).set(activeChatId, {
                messages: messages,
                selectedModel: selectedModel
            }));
        }

        const session = chatHistory?.find(s => s.id === chatId);
        if (session) {
            setActiveChatId(session.id);
            
            // Restore from memory first, then from database
            const savedState = chatStates.get(session.id);
            const loadedMessages = savedState?.messages || session.messages.map(m => m.content);
            const loadedModel = savedState?.selectedModel || session.selectedModelId || models[0]?.id || '';
            
            setMessages(loadedMessages);
            setSelectedModel(loadedModel);
            
            // Check if this chat was interrupted (last user message has no assistant response)
            if (loadedMessages.length > 0) {
                const lastMessage = loadedMessages[loadedMessages.length - 1];
                const lastUserIndex = loadedMessages.map(m => m.role).lastIndexOf('user');
                const lastAssistantIndex = loadedMessages.map(m => m.role).lastIndexOf('assistant');
                
                // Show error state for interrupted chats (user message without assistant response)
                if (lastUserIndex > lastAssistantIndex && lastUserIndex !== -1) {
                    setIsErrored(true);
                    setErrorMessage('Generation was interrupted. Click retry to continue.');
                } else {
                    setIsErrored(false);
                    setErrorMessage('');
                }
                
                if(lastMessage?.object?.codeBlocks && lastMessage.object.codeBlocks.length > 0) {
                    openArtifact(lastMessage.id);
                } else {
                    closeArtifact();
                }
            }
            
            localStorage.setItem('activeChatId', chatId);
        }
    }, [activeChatId, messages, selectedModel, chatStates, chatHistory, models, closeArtifact, openArtifact]);

    const handleDeleteChat = useCallback(async (chatId: string) => {
        try {
            const response = await fetch(`/api/chat/history?sessionId=${chatId}`, {
                method: 'DELETE',
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete chat');
            }
            
            // Refresh chat history to update the sidebar
            mutate('/api/chat/history');
            
            // If we deleted the currently active chat, switch to a new chat
            if (chatId === activeChatId) {
                newChat();
            }
        } catch (error) {
            console.error('Failed to delete chat:', error);
            // You could show a toast notification here
        }
    }, [activeChatId, mutate, newChat]);
    
    useEffect(() => {
        if (!firebaseUser || initialLoadHandled.current || isUserLoading || !models.length) return;
        if (user && !user.isGuest && isHistoryLoading) return;
        
        if (user) {
            // Validate guest message count for guest users
            if (user.isGuest) {
                const storedCount = localStorage.getItem('guestMessageCount');
                if (!storedCount || isNaN(parseInt(storedCount, 10))) {
                    localStorage.setItem('guestMessageCount', '0');
                    setGuestMessageCount(0);
                }
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
    }, [user, isUserLoading, models, chatHistory, isHistoryLoading, newChat, handleSelectChat, firebaseUser]);
    
    // Initialize selectedModel for guest users when models are loaded
    useEffect(() => {
        if (user?.isGuest && models.length > 0 && !selectedModel) {
            const defaultModelId = models.find(m => m.id === 'WEBGEN-SMALL')?.id || models.find(m => m.access === 'free')?.id || models[0]?.id || '';
            if (defaultModelId) {
                setSelectedModel(defaultModelId);
                console.log('Initialized selectedModel for guest user:', defaultModelId);
            }
        }
    }, [user, models, selectedModel]);
    
    const debouncedSave = useMemo(() => {
        const debouncedFn = debounce((sessionData: any) => {
            if (!user || user.isGuest) return;
            triggerSave(sessionData).then(() => mutate('/api/chat/history'));
        }, 1500);
        
        return debouncedFn;
    }, [user, triggerSave, mutate]);
    
    // Cleanup debounced function on unmount
    useEffect(() => {
        return () => {
            if (debouncedSave && typeof debouncedSave.cancel === 'function') {
                debouncedSave.cancel();
            }
        };
    }, [debouncedSave]);

    useEffect(() => {
        if (!activeChatId || !user || user.isGuest || isLoading || !messages.length) return;
        
        const currentMessagesToSave = messages.filter(m => {
            const hasText = m.content?.some(c => c.text?.trim());
            const hasObject = !!m.object;
            const isValidMessage = m.role !== 'system' && (hasText || hasObject);
            return isValidMessage;
        });
        if (currentMessagesToSave.length === 0) return;

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

    const executeChatStream = useCallback(async (currentMessages: Message[], targetChatId?: string) => {
        const chatId = targetChatId || activeChatId;
        if (!chatId) return;
        
        // Priority 1: Use the currently selected model (from the picker)
        let modelToUse = selectedModel;
        console.log('Model selection - selectedModel:', selectedModel);
        
        // Priority 2: If no model selected, use the model from the last assistant message
        if (!modelToUse && messages.length > 0) {
            const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
            if (lastAssistantMsg?.model) {
                modelToUse = lastAssistantMsg.model;
                console.log('Model selection - using last assistant model:', modelToUse);
                // Update selectedModel to persist this choice
                setSelectedModel(modelToUse);
            }
        }
        
        // Priority 3: Fallback to first available model
        if (!modelToUse) {
            modelToUse = models.find(m => m.access === 'free')?.id || models[0]?.id || '';
            console.log('Model selection - fallback to:', modelToUse);
            if (modelToUse) {
                // Update selectedModel to persist this choice
                setSelectedModel(modelToUse);
            }
        }
        
        if (!modelToUse) {
            console.error('Cannot make chat request: no model available');
            if (chatId === activeChatId) {
                setIsErrored(true);
                setErrorMessage('No model available. Please select a model from the dropdown below.');
            }
            return;
        }
        
        // Create sliding window: only send the last assistant message + current user message
        let messagesToSend = currentMessages;
        if (currentMessages.length > 1) {
            // Find the last assistant message before the current user message
            const lastUserIndex = currentMessages.length - 1;
            let lastAssistantIndex = -1;
            
            // Look backwards from the last user message to find the most recent assistant message
            for (let i = lastUserIndex - 1; i >= 0; i--) {
                if (currentMessages[i].role === 'assistant') {
                    lastAssistantIndex = i;
                    break;
                }
            }
            
            // If this is a follow-up (we have a previous assistant response)
            if (lastAssistantIndex >= 0) {
                // Only send: last assistant message + current user message
                messagesToSend = [
                    currentMessages[lastAssistantIndex],
                    currentMessages[lastUserIndex]
                ];
                console.log('Using sliding window - sending only last exchange');
            }
        }
        
        // Capture the active chat ID at execution time to prevent race conditions
        const currentActiveChatId = activeChatId;
        
        setLoadingChats(prev => new Set(prev).add(chatId));
        if (chatId === currentActiveChatId) {
            setIsErrored(false);
            setErrorMessage('');
            setUserClosedArtifact(false);
        }

        const abortController = new AbortController();
        if (chatId === currentActiveChatId) {
            abortControllerRef.current = abortController;
        }

        try {
            console.log('Making chat request with:', {
                originalMessagesCount: currentMessages.length,
                sentMessagesCount: messagesToSend.length,
                selectedModelId: modelToUse,  // Fix: use modelToUse, not selectedModel
                modelType: typeof modelToUse,
                firstMessage: messagesToSend[0]?.content[0]?.text?.substring(0, 50) + '...',
                lastMessage: messagesToSend[messagesToSend.length - 1]?.content[0]?.text?.substring(0, 50) + '...'
            });
            
            const response = await fetch('/api/proxy/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: messagesToSend,  // Use the sliding window messages
                    selectedModelId: modelToUse,
                }),
                signal: abortController.signal,
            });
            
            if (!response.ok || !response.body) {
                const errorData = await response.json().catch(() => ({ error: 'API error' }));
                console.error('Chat request failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorData.error,
                    details: errorData.details,
                    selectedModelId: modelToUse,  // Fix: use modelToUse, not selectedModel
                    actualSelectedModel: selectedModel
                });
                throw new Error(errorData.error || response.statusText);
            }

            const assistantMessageId = uuidv4();
            const assistantMessage: Message = { 
                id: assistantMessageId, 
                role: 'assistant', 
                content: [],
                model: modelToUse // Store the model used for this response
            };
            
            // Update selectedModel to persist for follow-up messages
            if (chatId === currentActiveChatId && modelToUse) {
                setSelectedModel(modelToUse);
            }
            
            if (chatId === currentActiveChatId) {
                setMessages(prev => [...prev, assistantMessage]);
            } else {
                // Initialize chat state for background generation
                setChatStates(prev => {
                    const newMap = new Map(prev);
                    const currentState = newMap.get(chatId);
                    if (currentState) {
                        newMap.set(chatId, {
                            ...currentState,
                            messages: [...currentState.messages, assistantMessage]
                        });
                    } else {
                        newMap.set(chatId, {
                            messages: [...currentMessages, assistantMessage],
                            selectedModel: selectedModel
                        });
                    }
                    return newMap;
                });
            }

            const stream = ChatCompletionStream.fromReadableStream(response.body);

            // Immediate word-by-word streaming
            const smoothStreamingUpdate = (content: string) => {
                // Update immediately for word-by-word effect
                requestAnimationFrame(() => {
                    const { think, main } = parseThinkContent(content);
                    
                    // Show artifact and populate sandbox for HTML immediately
                    if (shouldShowArtifact(content) && chatId === currentActiveChatId) {
                        setIsArtifactVisible(true);
                        setUserClosedArtifact(false);
                        
                        // Extract what we have so far for immediate preview
                        const { codeBlocks } = extractStreamingCodeBlocks(content);
                        console.log('[ARTIFACT DEBUG] Code blocks detected:', codeBlocks.length, codeBlocks);
                        
                        // ALWAYS show artifact button when code is detected
                        // Update message to show artifact button right away
                        setMessages(prev => prev.map((msg: Message) => {
                            if (msg.id === assistantMessageId) {
                                return {
                                    ...msg,
                                    content: [{ type: 'text' as const, text: main }],
                                    stepsMarkdown: think ?? undefined,
                                    object: {
                                        title: "Code Artifact",
                                        codeBlocks: codeBlocks.length > 0 ? codeBlocks : [{
                                            language: 'html',
                                            filename: 'loading',
                                            code: '// Loading...',
                                            isComplete: false
                                        }]
                                    }
                                };
                            }
                            return msg;
                        }));
                            
                        // Use microtask to prevent blocking
                        if (codeBlocks.length > 0) {
                            queueMicrotask(() => {
                                sandboxState.sandboxManager?.clear();
                                codeBlocks.forEach(block => {
                                    sandboxState.sandboxManager?.addFile(
                                        `/${block.filename.replace(/^\//, '')}`, 
                                        block.code
                                    );
                                });
                                sandboxState.sandboxManager?.setActiveTab('preview');
                            });
                        }
                    }
                    
                    // Use smart streaming manager for ultra-smooth updates
                    smartStreamingManager.current.processStreamingContent(
                        content,
                        extractStreamingCodeBlocks,
                        (streamingState) => {
                            // Only update UI if this is the active chat
                            if (chatId === currentActiveChatId) {
                                setMessages(prev => prev.map((msg: Message) => {
                                    if (msg.id === assistantMessageId) {
                                        const updatedMsg: Message = { 
                                            ...msg, 
                                            content: [{ type: 'text' as const, text: main }], 
                                            stepsMarkdown: think ?? undefined 
                                        };
                                        
                                        // Add streaming artifact if we have code blocks
                                        if (streamingState.codeBlocks.length > 0) {
                                            updatedMsg.object = { 
                                                title: "Code Artifact", 
                                                codeBlocks: streamingState.codeBlocks 
                                            };
                                        }
                                        
                                        return updatedMsg;
                                    }
                                    return msg;
                                }));
                                
                                // Smart artifact panel management with non-blocking updates
                                if (streamingState.codeBlocks.length > 0) {
                                    // Use microtask for non-blocking sandbox updates
                                    queueMicrotask(() => {
                                        if (streamingState.shouldRefreshPreview) {
                                            sandboxState.sandboxManager?.clear();
                                            streamingState.codeBlocks.forEach(block => {
                                                sandboxState.sandboxManager?.addFile(
                                                    `/${block.filename.replace(/^\//, '')}`, 
                                                    block.code
                                                );
                                            });
                                        }
                                        
                                        // Show artifact panel during streaming
                                        if (!isArtifactVisible) {
                                            setIsArtifactVisible(true);
                                            sandboxState.sandboxManager?.setActiveTab('preview');
                                        }
                                    });
                                }
                            }

                            // Update background chat state
                            setChatStates(prev => {
                                const newMap = new Map(prev);
                                const currentState = newMap.get(chatId);
                                if (currentState) {
                                    const updatedMessages = currentState.messages.map((msg: Message) => {
                                        if (msg.id === assistantMessageId) {
                                            const updatedMsg: Message = { 
                                                ...msg, 
                                                content: [{ type: 'text' as const, text: main }], 
                                                stepsMarkdown: think ?? undefined 
                                            };
                                            
                                            if (streamingState.codeBlocks.length > 0) {
                                                updatedMsg.object = { 
                                                    title: "Code Artifact", 
                                                    codeBlocks: streamingState.codeBlocks 
                                                };
                                            }
                                            
                                            return updatedMsg;
                                        }
                                        return msg;
                                    });
                                    newMap.set(chatId, { ...currentState, messages: updatedMessages });
                                }
                                return newMap;
                            });
                        },
                        `chat-${chatId}`
                    );
                });
            };

            stream.on('content', (_, content) => {
                smoothStreamingUpdate(content);
            });

            stream.on('finalContent', (finalContent) => {
                // Flush any pending smart streaming updates first
                smartStreamingManager.current.flush(
                    extractStreamingCodeBlocks,
                    (streamingState) => {
                        // Final update logic handled here if needed
                    },
                    `chat-${chatId}`
                );
                
                const { main } = parseThinkContent(finalContent);
                // Extract code blocks from original content before XML cleaning
                const { codeBlocks } = extractAllCodeBlocks(finalContent);

                // Only update UI if this is the active chat
                if (chatId === currentActiveChatId) {
                    setMessages(prev => prev.map(msg => {
                        if (msg.id === assistantMessageId) {
                            const updatedMsg = { ...msg };
                            // Only update object if we have code blocks, otherwise preserve existing object
                            if (codeBlocks.length > 0) {
                                updatedMsg.object = { title: "Code Artifact", codeBlocks };
                            }
                            return updatedMsg;
                        }
                        return msg;
                    }));

                    if (codeBlocks.length > 0) {
                        // Add to artifact versions for history
                        setArtifactVersions(prev => {
                            const newVersion = {
                                messageId: assistantMessageId,
                                codeBlocks: codeBlocks,
                                timestamp: Date.now()
                            };
                            const updated = [...prev, newVersion];
                            setCurrentArtifactIndex(updated.length - 1);
                            return updated;
                        });
                        
                        // Reset userClosedArtifact for new code generation
                        setUserClosedArtifact(false);
                        
                        sandboxState.sandboxManager?.clear();
                        codeBlocks.forEach(block => {
                            sandboxState.sandboxManager?.addFile(`/${block.filename.replace(/^\//, '')}`, block.code);
                        });
                        
                        // Auto-show artifact panel for new code
                        setIsArtifactVisible(true);
                        sandboxState.sandboxManager?.setActiveTab('preview');
                    }
                }

                // Always update the chat state for final content
                setChatStates(prev => {
                    const newMap = new Map(prev);
                    const currentState = newMap.get(chatId);
                    if (currentState) {
                        const updatedMessages = currentState.messages.map(msg => {
                            if (msg.id === assistantMessageId) {
                                const updatedMsg = { ...msg };
                                if (codeBlocks.length > 0) {
                                    updatedMsg.object = { title: "Code Artifact", codeBlocks };
                                }
                                return updatedMsg;
                            }
                            return msg;
                        });
                        newMap.set(chatId, { ...currentState, messages: updatedMessages });
                    }
                    return newMap;
                });
            });

            await stream.start();
        } catch (error: unknown) {
            if (error instanceof Error && error.name !== 'AbortError') {
                if (chatId === currentActiveChatId) {
                    setMessages(prev => prev.slice(0, -1));
                    setIsErrored(true);
                    setErrorMessage(error.message || "An unexpected error occurred.");
                }
            } else if (error && typeof error === 'object' && 'name' in error && error.name !== 'AbortError') {
                if (chatId === currentActiveChatId) {
                    setMessages(prev => prev.slice(0, -1));
                    setIsErrored(true);
                    setErrorMessage("An unexpected error occurred.");
                }
            }
        } finally {
            setLoadingChats(prev => {
                const newSet = new Set(prev);
                newSet.delete(chatId);
                return newSet;
            });
            
            // Proper cleanup of abort controller
            if (chatId === currentActiveChatId && abortControllerRef.current === abortController) {
                abortControllerRef.current = null;
            }
            
            // Ensure controller is properly disposed
            if (!abortController.signal.aborted) {
                try {
                    abortController.abort();
                } catch (e) {
                    // Ignore errors during cleanup
                }
            }
        }
    }, [selectedModel, models, closeArtifact, sandboxState.sandboxManager, activeChatId]);

    // Cleanup abort controller and smart streaming on unmount
    useEffect(() => {
        return () => {
            // Cleanup abort controller
            if (abortControllerRef.current) {
                try {
                    abortControllerRef.current.abort();
                } catch (e) {
                    // Ignore errors during cleanup
                }
                abortControllerRef.current = null;
            }
            
            // Cleanup smart streaming manager
            try {
                smartStreamingManager.current.cleanup();
            } catch (e) {
                // Ignore errors during cleanup
            }
        };
    }, []);

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

        // IMMEDIATELY save to history BEFORE starting generation
        if (!user?.isGuest && activeChatId) {
            const session = chatHistory?.find(s => s.id === activeChatId);
            const isNewChat = !session || session.messages.length === 0;
            
            let title = session?.title || 'New Chat';
            if (isNewChat || title === 'New Chat') {
                title = chatInput.length > 40 ? `${chatInput.substring(0, 40)}...` : chatInput;
            }
            
            // Optimistically update the chat history IMMEDIATELY
            mutate('/api/chat/history', (currentData: SessionWithMessages[] = []) => {
                const existingIndex = currentData.findIndex(s => s.id === activeChatId);
                const updatedSession: SessionWithMessages = {
                    id: activeChatId,
                    title,
                    userId: user?.id || '',
                    createdAt: session?.createdAt || new Date(),
                    updatedAt: new Date(),
                    selectedModelId: selectedModel,
                    messages: updatedMessages.map(m => ({ id: uuidv4(), sessionId: activeChatId, role: m.role, content: m, createdAt: new Date() })),
                };
                
                if (existingIndex >= 0) {
                    const newData = [...currentData];
                    newData[existingIndex] = updatedSession;
                    return newData; // Don't sort - keep original order
                } else {
                    return [updatedSession, ...currentData]; // Don't sort - keep original order
                }
            }, { revalidate: false });

            // Save to database in background (don't await)
            triggerSave({
                id: activeChatId,
                title,
                selectedModelId: selectedModel,
                messages: updatedMessages
            }).catch(error => {
                console.error('Failed to save chat:', error);
            });
        }

        // Start generation (this won't block the UI update above)
        if (activeChatId) {
            executeChatStream(updatedMessages, activeChatId);
        }

    }, [isLoading, chatInput, user, guestMessageCount, router, messages, executeChatStream, activeChatId, selectedModel, triggerSave, mutate, chatHistory]);
    
    const handleRetry = useCallback(() => {
        // Stop current generation if running
        if (isLoading && abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setLoadingChats(prev => {
                const newSet = new Set(prev);
                if (activeChatId) newSet.delete(activeChatId);
                return newSet;
            });
        }

        const lastUserMessageIndex = messages.map(m => m.role).lastIndexOf('user');
        if (lastUserMessageIndex === -1) return;

        // Find the model from the last assistant message (if any)
        let modelForRetry = selectedModel;
        if (!modelForRetry) {
            const lastAssistantMsg = messages.slice(0, lastUserMessageIndex).reverse().find(m => m.role === 'assistant');
            if (lastAssistantMsg?.model) {
                modelForRetry = lastAssistantMsg.model;
                setSelectedModel(modelForRetry);
            }
        }
        
        // If still no model, use default
        if (!modelForRetry) {
            modelForRetry = models.find(m => m.access === 'free')?.id || models[0]?.id || '';
            if (modelForRetry) {
                setSelectedModel(modelForRetry);
            }
        }

        const historyForRetry = messages.slice(0, lastUserMessageIndex + 1);
        setMessages(historyForRetry);
        
        // Small delay to ensure loading state is cleared before restarting
        setTimeout(() => {
            if (activeChatId && modelForRetry) {
                executeChatStream(historyForRetry, activeChatId);
            }
        }, 100);
    }, [isLoading, messages, executeChatStream, activeChatId, setLoadingChats, selectedModel, models]);

    const handleEdit = useCallback((messageId: string, newText: string) => {
        const messageIndex = messages.findIndex(m => m.id === messageId);
        if (messageIndex === -1 || messages[messageIndex].role !== 'user') return;

        // Stop current generation if running
        if (isLoading && abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        // Update the message with new text and trim all messages after it
        const updatedMessage = {
            ...messages[messageIndex],
            content: [{ type: 'text' as const, text: newText }]
        };
        const updatedMessages = [...messages.slice(0, messageIndex), updatedMessage];
        
        setMessages(updatedMessages);
        closeArtifact();
        setIsErrored(false);
        setErrorMessage('');

        // Start new generation with the edited message
        if (activeChatId) {
            executeChatStream(updatedMessages, activeChatId);
        }
    }, [messages, isLoading, closeArtifact, executeChatStream, activeChatId]);

    const stopGeneration = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        if (activeChatId) {
            setLoadingChats(prev => {
                const newSet = new Set(prev);
                newSet.delete(activeChatId);
                return newSet;
            });
        }
    }, [activeChatId]);

    // Bulletproof drag handler that actually works
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragActiveRef = useRef(false);
    const cleanupRef = useRef<(() => void) | null>(null);
    
    // Force cleanup function
    const forceCleanup = useCallback(() => {
        if (cleanupRef.current) {
            cleanupRef.current();
            cleanupRef.current = null;
        }
        dragActiveRef.current = false;
        setIsDragging(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, []);
    
    // Cleanup on component unmount or artifact close
    useEffect(() => {
        if (!isArtifactVisible) {
            forceCleanup();
        }
        return forceCleanup;
    }, [isArtifactVisible, forceCleanup]);
    
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Force cleanup any existing drag
        forceCleanup();
        
        const container = containerRef.current;
        if (!container) return;
        
        // Capture the pointer
        (e.target as Element).setPointerCapture(e.pointerId);
        
        dragActiveRef.current = true;
        setIsDragging(true);
        
        const containerRect = container.getBoundingClientRect();
        
        const handlePointerMove = (e: PointerEvent) => {
            if (!dragActiveRef.current) return;
            
            e.preventDefault();
            const relativeX = e.clientX - containerRect.left;
            // Ensure the chat panel stays within reasonable bounds
            const percentage = Math.max(30, Math.min(70, (relativeX / containerRect.width) * 100));
            setChatWidth(percentage);
        };
        
        const handlePointerUp = (e: PointerEvent) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Release pointer capture
            try {
                (e.target as Element).releasePointerCapture(e.pointerId);
            } catch {}
            
            // Immediate cleanup
            dragActiveRef.current = false;
            setIsDragging(false);
            
            // Remove all event listeners
            document.removeEventListener('pointermove', handlePointerMove);
            document.removeEventListener('pointerup', handlePointerUp);
            document.removeEventListener('pointercancel', handlePointerUp);
            window.removeEventListener('blur', handlePointerUp as any);
            
            // Reset styles
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            
            cleanupRef.current = null;
        };
        
        // Set up cleanup function
        cleanupRef.current = () => {
            dragActiveRef.current = false;
            setIsDragging(false);
            document.removeEventListener('pointermove', handlePointerMove);
            document.removeEventListener('pointerup', handlePointerUp);
            document.removeEventListener('pointercancel', handlePointerUp);
            window.removeEventListener('blur', handlePointerUp as any);
        };
        
        // Set cursor and prevent selection
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        
        // Add event listeners with multiple fallbacks
        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', handlePointerUp);
        document.addEventListener('pointercancel', handlePointerUp); // Handle interruptions
        window.addEventListener('blur', handlePointerUp as any); // Handle window losing focus
    }, [forceCleanup]);

    const formattedChatHistory = useMemo(() => {
        if (!chatHistory || !Array.isArray(chatHistory)) return [];
        return chatHistory
            .filter(s => (s.messages?.length ?? 0) > 0) // Show chats with at least 1 message
            .map(s => ({
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
            <div className="h-[calc(100vh-80px)] w-full flex flex-row overflow-hidden">
                {!user?.isGuest && (
                    <ChatSidebar
                        chatHistory={formattedChatHistory}
                        onNewChat={newChat}
                        onSelectChat={(chatId) => {
                            handleSelectChat(chatId);
                            setIsMobileSidebarOpen(false); // Close mobile sidebar on selection
                        }}
                        onDeleteChat={handleDeleteChat}
                        activeChatId={activeChatId}
                        loadingChats={loadingChats}
                        isMobileOpen={isMobileSidebarOpen}
                        onMobileClose={() => setIsMobileSidebarOpen(false)}
                    />
                )}
                <div className="flex-1 bg-muted flex overflow-hidden" ref={containerRef}>
                    {/* Chat Panel - Resizes when preview is visible */}
                    <div 
                        className="flex flex-col h-full bg-white overflow-hidden transition-all duration-300"
                        style={{ 
                            width: isArtifactVisible ? `${chatWidth}%` : '100%',
                            maxWidth: isArtifactVisible ? 'calc(100% - 400px)' : '100%'
                        }}
                    >
                            {/* Mobile Header */}
                            {!user?.isGuest && (
                                <div className="md:hidden flex items-center justify-between p-3 border-b bg-background">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsMobileSidebarOpen(true)}
                                        className="gap-2"
                                    >
                                        <Menu className="h-4 w-4" />
                                        Chats
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={newChat}
                                        className="gap-2"
                                    >
                                        <Bot className="h-4 w-4" />
                                        New
                                    </Button>
                                </div>
                            )}
                            
                            <div className="flex-1 overflow-hidden">
                                {isUserLoading || (!firebaseUser && !isErrored) ? (
                                    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center h-full min-h-[calc(100vh-200px)]">
                                        <div className="p-4 rounded-full bg-primary/10 mb-4 animate-pulse">
                                            <Image src="/tesslate-logo.svg" alt="Tesslate" width={32} height={32} className="opacity-80" />
                                        </div>
                                        <h1 className="text-2xl font-medium mb-3">Setting up your session...</h1>
                                        <p className="text-muted-foreground max-w-md">Please wait while we prepare the designer for you.</p>
                                    </div>
                                ) : isErrored && errorMessage.includes('guest session') ? (
                                    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center h-full min-h-[calc(100vh-200px)]">
                                        <div className="p-4 rounded-full bg-red-100 text-red-600 mb-4"><X className="h-8 w-8" /></div>
                                        <h1 className="text-2xl font-medium mb-3">Connection Issue</h1>
                                        <p className="text-muted-foreground max-w-md mb-6">{errorMessage}</p>
                                        <div className="flex gap-3">
                                            <Button 
                                                onClick={async () => {
                                                    // Clear all auth state and reload
                                                    clearAuthStorage();
                                                    await fetch('/api/auth/clear-state', { method: 'POST' });
                                                    window.location.reload();
                                                }} 
                                                variant="outline"
                                            >
                                                Refresh Page
                                            </Button>
                                            <Button onClick={() => router.push('/sign-up')}>
                                                Sign Up Instead
                                            </Button>
                                        </div>
                                    </div>
                                ) : messages.length === 0 && !isLoading ? (
                                    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center h-full min-h-[calc(100vh-200px)]">
                                        <div className="p-4 rounded-full bg-primary/10 mb-4">
                                            <Image src="/tesslate-logo.svg" alt="Tesslate" width={32} height={32} className="opacity-80" />
                                        </div>
                                        <h1 className="text-3xl font-medium mb-3">What can I help you build?</h1>
                                        <p className="text-muted-foreground max-w-md mb-8">Start a new conversation.</p>
                                        {user?.isGuest && (
                                            <div className="text-center">
                                                <p className="text-xs text-muted-foreground max-w-md mb-2">
                                                    You have {GUEST_MESSAGE_LIMIT - guestMessageCount} free messages remaining. 
                                                    <button 
                                                        onClick={() => router.push('/sign-up')} 
                                                        className="text-primary hover:underline ml-1"
                                                    >
                                                        Sign up for unlimited access.
                                                    </button>
                                                </p>
                                                {process.env.NODE_ENV === 'development' && (
                                                    <button 
                                                        onClick={async () => {
                                                            try {
                                                                const res = await fetch('/api/debug/guest-flow');
                                                                const data = await res.json();
                                                                console.log('Guest debug:', data);
                                                                alert(JSON.stringify(data, null, 2));
                                                            } catch (e) {
                                                                console.error('Debug failed:', e);
                                                            }
                                                        }}
                                                        className="text-xs text-blue-500 hover:underline"
                                                    >
                                                        [Debug Guest Status]
                                                    </button>
                                                )}
                                            </div>
                                        )}
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
                            </div>
                            <div className="flex-shrink-0 w-full bg-background border-t border-t-border/60 shadow-sm px-4 py-2">
                                <div className="max-w-4xl mx-auto">
                                    <ChatInput
                                        retry={handleRetry} 
                                        isErrored={isErrored} errorMessage={errorMessage}
                                        isLoading={isLoading} isRateLimited={false} stop={stopGeneration}
                                        input={chatInput} handleInputChange={(e) => setChatInput(e.target.value)}
                                        handleSubmit={handleSubmit}
                                        isGuest={user?.isGuest} 
                                        guestMessageCount={guestMessageCount} guestMessageLimit={GUEST_MESSAGE_LIMIT}
                                        onSignUp={() => router.push('/sign-up')} selectedModel={selectedModel}
                                    >
                                        <ChatPicker models={models} selectedModel={selectedModel} onSelectedModelChange={setSelectedModel} userPlan={userPlan as any} />
                                    </ChatInput>
                                </div>
                            </div>
                    </div>
                    
                    {/* Drag Handle for resizing */}
                    {isArtifactVisible && (
                        <div 
                            className={cn(
                                "relative flex items-center justify-center cursor-col-resize group transition-all duration-200 touch-none",
                                isDragging ? "w-2 bg-blue-500/10" : "w-1 bg-transparent hover:bg-gray-100/50"
                            )}
                            onPointerDown={handlePointerDown}
                            style={{ touchAction: 'none' }}
                        >
                            {/* Visual handle that stays centered */}
                            <div className={cn(
                                "w-0.5 h-16 bg-border/60 rounded-full transition-all duration-200 group-hover:bg-blue-500/80 group-hover:w-1 group-hover:h-20",
                                isDragging && "bg-blue-500 w-1 h-24"
                            )}></div>
                            
                            {/* Wider invisible grab area for easier interaction */}
                            <div className="absolute inset-y-0 -inset-x-2 cursor-col-resize"></div>
                        </div>
                    )}
                    
                    {/* Artifact Panel - Integrated with rounded corners */}
                    {isArtifactVisible && (
                        <div 
                            className="hidden md:flex flex-col h-full bg-background p-2"
                            style={{ 
                                width: `${100 - chatWidth}%`,
                                minWidth: '400px',
                                transition: isDragging ? 'none' : 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                        >
                            <div className="relative h-full">
                                <SandpackPreviewer 
                                        files={sandboxState.files} 
                                        isStreaming={isLoading}
                                        activeTab={sandboxState.activeTab}
                                        onTabChange={(tab) => sandboxState.sandboxManager?.setActiveTab(tab)}
                                        onFileChange={(filename, code) => {
                                            // Update sandbox with editor changes
                                            sandboxState.sandboxManager?.addFile(filename, code);
                                        }}
                                        enableSmartRefresh={true}
                                        artifactVersion={currentArtifactIndex}
                                        totalVersions={artifactVersions.length}
                                        onVersionChange={(index) => {
                                            setCurrentArtifactIndex(index);
                                            const version = artifactVersions[index];
                                            if (version) {
                                                sandboxState.sandboxManager?.clear();
                                                version.codeBlocks.forEach(block => {
                                                    sandboxState.sandboxManager?.addFile(
                                                        `/${block.filename.replace(/^\//, '')}`, 
                                                        block.code
                                                    );
                                                });
                                                sandboxState.sandboxManager?.setActiveTab('preview');
                                            }
                                        }}
                                        onClose={closeArtifact}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}

export default function ChatPage() {
    return (
        <Suspense fallback={
            <DashboardLayout>
                <div className="flex h-screen items-center justify-center">
                    <div className="text-muted-foreground">Loading chat...</div>
                </div>
            </DashboardLayout>
        }>
            <ChatPageContent />
        </Suspense>
    );
}