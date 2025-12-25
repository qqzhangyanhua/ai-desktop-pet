import { create } from 'zustand';
import type { Message, ChatState } from '../types';

interface ChatStore extends ChatState {
  addMessage: (message: Message) => void;
  updateMessage: (id: string, content: string) => void;
  setMessages: (messages: Message[]) => void;
  clearMessages: () => void;
  setCurrentConversation: (id: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  setStreaming: (isStreaming: boolean) => void;
  appendToLastMessage: (content: string) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  currentConversationId: null,
  isLoading: false,
  isStreaming: false,

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  updateMessage: (id, content) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content } : m
      ),
    })),

  setMessages: (messages) => set({ messages }),

  clearMessages: () => set({ messages: [], currentConversationId: null }),

  setCurrentConversation: (id) => set({ currentConversationId: id }),

  setLoading: (isLoading) => set({ isLoading }),

  setStreaming: (isStreaming) => set({ isStreaming }),

  appendToLastMessage: (content) =>
    set((state) => {
      const messages = [...state.messages];
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        messages[messages.length - 1] = {
          ...lastMessage,
          content: lastMessage.content + content,
        };
      }
      return { messages };
    }),
}));
