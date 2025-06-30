'use client';

import { Message } from '@/lib/messages';

export interface ChatState {
  id: string;
  messages: Message[];
  isLoading: boolean;
  abortController: AbortController | null;
  selectedModel: string;
}

class ChatManager {
  private chats: Map<string, ChatState> = new Map();
  private subscribers: Set<() => void> = new Set();

  subscribe(callback: () => void) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notify() {
    this.subscribers.forEach(callback => callback());
  }

  getChatState(chatId: string): ChatState | undefined {
    return this.chats.get(chatId);
  }

  updateChatState(chatId: string, updates: Partial<ChatState>) {
    const existing = this.chats.get(chatId);
    if (existing) {
      this.chats.set(chatId, { ...existing, ...updates });
    } else {
      this.chats.set(chatId, {
        id: chatId,
        messages: [],
        isLoading: false,
        abortController: null,
        selectedModel: '',
        ...updates
      });
    }
    this.notify();
  }

  isGenerating(chatId: string): boolean {
    const state = this.chats.get(chatId);
    return state?.isLoading || false;
  }

  abortGeneration(chatId: string) {
    const state = this.chats.get(chatId);
    if (state?.abortController) {
      state.abortController.abort();
      this.updateChatState(chatId, { isLoading: false, abortController: null });
    }
  }

  removeChatState(chatId: string) {
    this.abortGeneration(chatId);
    this.chats.delete(chatId);
    this.notify();
  }

  getAllLoadingChats(): string[] {
    return Array.from(this.chats.entries())
      .filter(([_, state]) => state.isLoading)
      .map(([id, _]) => id);
  }
}

export const chatManager = new ChatManager();