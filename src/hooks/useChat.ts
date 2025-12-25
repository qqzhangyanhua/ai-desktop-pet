// useChat hook for LLM integration with persistence

import { useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useChatStore, usePetStore, useConfigStore } from '../stores';
import { ChatSession, type LLMProviderConfig } from '../services/llm';
import {
  createConversation,
  addMessage as dbAddMessage,
  getMessages,
  updateConversation,
} from '../services/database/conversations';
import type { Message } from '../types';

interface UseChatOptions {
  onError?: (error: Error) => void;
}

export function useChat(options: UseChatOptions = {}) {
  const { onError } = options;
  const sessionRef = useRef<ChatSession | null>(null);
  const isInitializedRef = useRef(false);

  const {
    messages,
    addMessage,
    setMessages,
    setLoading,
    setStreaming,
    appendToLastMessage,
    updateMessage,
    currentConversationId,
    setCurrentConversation,
  } = useChatStore();

  const { setEmotion } = usePetStore();
  const { config: appConfig } = useConfigStore();

  // Initialize a new conversation if needed
  const ensureConversation = useCallback(async (): Promise<string> => {
    if (currentConversationId) {
      return currentConversationId;
    }

    const conversation = await createConversation('New Chat', appConfig.systemPrompt);
    setCurrentConversation(conversation.id);
    return conversation.id;
  }, [currentConversationId, appConfig.systemPrompt, setCurrentConversation]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!currentConversationId || isInitializedRef.current) return;

    const loadMessages = async () => {
      try {
        const loadedMessages = await getMessages(currentConversationId);
        setMessages(loadedMessages);
        isInitializedRef.current = true;
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    };

    loadMessages();
  }, [currentConversationId, setMessages]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      const conversationId = await ensureConversation();

      // Create user message
      const userMessage: Message = {
        id: uuidv4(),
        conversationId,
        role: 'user',
        content: content.trim(),
        createdAt: Date.now(),
      };

      addMessage(userMessage);
      setLoading(true);
      setStreaming(true);
      setEmotion('thinking');

      // Save user message to database
      try {
        await dbAddMessage(conversationId, {
          role: userMessage.role,
          content: userMessage.content,
        });
      } catch (error) {
        console.error('Failed to save user message:', error);
      }

      // Create placeholder assistant message
      const assistantMessageId = uuidv4();
      const assistantMessage: Message = {
        id: assistantMessageId,
        conversationId,
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
      };
      addMessage(assistantMessage);

      // Prepare LLM config
      const llmConfig: LLMProviderConfig = {
        provider: appConfig.llm.provider,
        model: appConfig.llm.model,
        apiKey: appConfig.llm.apiKey,
        baseUrl: appConfig.llm.baseUrl,
        temperature: appConfig.llm.temperature,
        maxTokens: appConfig.llm.maxTokens,
      };

      // Create chat session
      sessionRef.current = new ChatSession();

      try {
        // Get all messages except the empty assistant placeholder
        const historyMessages = [...messages, userMessage];

        const result = await sessionRef.current.sendMessage({
          messages: historyMessages,
          systemPrompt: appConfig.systemPrompt,
          config: llmConfig,
          onToken: (token) => {
            appendToLastMessage(token);
          },
          onComplete: async (finalContent) => {
            setEmotion('happy');

            // Save assistant message to database
            try {
              await dbAddMessage(conversationId, {
                role: 'assistant',
                content: finalContent,
              });

              // Update conversation title if this is the first message
              if (messages.length === 0) {
                const title =
                  content.length > 30 ? content.substring(0, 30) + '...' : content;
                await updateConversation(conversationId, { title });
              }
            } catch (error) {
              console.error('Failed to save assistant message:', error);
            }
          },
          onError: (error) => {
            console.error('LLM error:', error);
            setEmotion('confused');
            if (onError) {
              onError(error);
            }
          },
        });

        // If streaming completed successfully but onComplete wasn't called
        if (result.content) {
          updateMessage(assistantMessageId, result.content);
        }
      } catch (error) {
        console.error('Failed to get response:', error);
        setEmotion('confused');

        const errorMessage =
          error instanceof Error
            ? `Error: ${error.message}`
            : 'An error occurred while generating a response.';

        // Update placeholder message with error
        updateMessage(assistantMessageId, errorMessage);

        if (onError && error instanceof Error) {
          onError(error);
        }
      } finally {
        setLoading(false);
        setStreaming(false);
        sessionRef.current = null;
      }
    },
    [
      messages,
      appConfig,
      ensureConversation,
      addMessage,
      setLoading,
      setStreaming,
      setEmotion,
      appendToLastMessage,
      updateMessage,
      onError,
    ]
  );

  const abort = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.abort();
      setLoading(false);
      setStreaming(false);
      setEmotion('neutral');
    }
  }, [setLoading, setStreaming, setEmotion]);

  const isGenerating = useCallback(() => {
    return sessionRef.current?.isActive() ?? false;
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setCurrentConversation(null);
    isInitializedRef.current = false;
  }, [setMessages, setCurrentConversation]);

  return {
    sendMessage,
    abort,
    isGenerating,
    clearChat,
  };
}
