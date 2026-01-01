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
import { recordInteractionAndCheck } from './useAchievementListener';
import { collectPetContext, enrichSystemPrompt } from '../services/proactive';
import { detectEmotion, getPetEmotion, getEmotionResponse } from '../services/memory';
import { detectIntent, executeIntent } from '../services/intent';
import type { Message } from '../types';
import type { LLMProvider } from '../services/llm';

interface UseChatOptions {
  onError?: (error: Error) => void;
}

/**
 * Validate LLM configuration before sending messages
 * 发送消息前验证 LLM 配置
 */
function validateLLMConfig(config: {
  provider: LLMProvider;
  apiKey?: string;
  baseUrl?: string;
}): { valid: boolean; error?: string } {
  const { provider, apiKey, baseUrl } = config;

  // Ollama doesn't require API key
  if (provider === 'ollama') {
    // Check if baseUrl is reachable (basic validation)
    if (!baseUrl) {
      return { valid: true }; // Will use default localhost:11434
    }
    return { valid: true };
  }

  // OpenAI and Anthropic require API key
  if (!apiKey || apiKey.trim() === '') {
    const providerName = provider === 'openai' ? 'OpenAI' : 'Anthropic';
    return {
      valid: false,
      error: `请先配置 ${providerName} API Key\n\n前往 设置 → AI助手 → LLM配置 进行设置`,
    };
  }

  return { valid: true };
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

  const { setEmotion: setPetEmotion, showBubble: petShowBubble } = usePetStore();
  const { config: appConfig } = useConfigStore();
  const saveChatHistory = appConfig.assistant.privacy.saveChatHistory;

  // Initialize a new conversation if needed
  const ensureConversation = useCallback(async (): Promise<string> => {
    if (currentConversationId) {
      return currentConversationId;
    }

    if (!saveChatHistory) {
      const localId = `local:${uuidv4()}`;
      setCurrentConversation(localId);
      return localId;
    }

    const conversation = await createConversation('New Chat', appConfig.systemPrompt);
    setCurrentConversation(conversation.id);
    return conversation.id;
  }, [currentConversationId, appConfig.systemPrompt, saveChatHistory, setCurrentConversation]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!saveChatHistory) return;
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
  }, [currentConversationId, saveChatHistory, setMessages]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      // Validate LLM configuration before proceeding
      const validation = validateLLMConfig({
        provider: appConfig.llm.provider,
        apiKey: appConfig.llm.apiKey,
        baseUrl: appConfig.llm.baseUrl,
      });

      if (!validation.valid) {
        // Show configuration error to user
        const errorMsg = validation.error || '请先配置 LLM 服务';
        petShowBubble(errorMsg, 6000);
        setPetEmotion('confused');

        const error = new Error(errorMsg);
        if (onError) {
          onError(error);
        }
        return;
      }

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
      setPetEmotion('thinking');

      // Record chat interaction for achievement tracking
      void recordInteractionAndCheck('chat');

      // 触发智能体系统处理用户消息
      try {
        const { triggerUserMessage } = await import('../services/agent/integration');
        void triggerUserMessage(content.trim());
      } catch (error) {
        console.warn('[useChat] Failed to trigger agent system:', error);
      }

      // Detect user emotion
      const emotionResult = detectEmotion(content);
      if (emotionResult.detected) {
        const petEmotion = getPetEmotion(emotionResult.emotion);
        setPetEmotion(petEmotion);

        // Show emotion response bubble
        const responseText = getEmotionResponse(emotionResult.emotion);
        petShowBubble(responseText, 4000);
      }

      // Intent detection: check if user wants to execute a tool
      const intentResult = await detectIntent(content.trim());
      console.log('[useChat] Intent detected:', intentResult);

      if (intentResult && intentResult.intent !== 'chat') {
        // Execute tool intent
        console.log('[useChat] Executing intent:', intentResult.intent);
        setPetEmotion('thinking');
        petShowBubble('让我帮你处理...', 2000);

        try {
          const executionResult = await executeIntent({
            userMessage: content.trim(),
            intent: intentResult,
            onProgress: (message) => {
              console.log('[useChat] Intent progress:', message);
              petShowBubble(message, 2000);
            },
          });

          // Create assistant message with tool execution result
          const assistantMessageId = uuidv4();
          const assistantMessage: Message = {
            id: assistantMessageId,
            conversationId,
            role: 'assistant',
            content: executionResult.message,
            createdAt: Date.now(),
            suggestions: executionResult.suggestions, // 传递可点击建议
          };
          addMessage(assistantMessage);

          // Save assistant message to database
          if (saveChatHistory && !conversationId.startsWith('local:')) {
            try {
              await dbAddMessage(conversationId, {
                role: 'assistant',
                content: executionResult.message,
                suggestions: executionResult.suggestions, // ✅ 保存建议到数据库
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
          }

          // Set emotion based on execution result
          setPetEmotion(executionResult.success ? 'happy' : 'confused');
          if (executionResult.success) {
            petShowBubble('完成啦！', 2000);
          } else {
            petShowBubble('抱歉，执行失败了...', 3000);
          }

          setLoading(false);
          setStreaming(false);
          return; // Don't proceed to LLM chat
        } catch (error) {
          console.error('[useChat] Intent execution failed:', error);
          // Continue to LLM chat as fallback
          petShowBubble('工具执行失败，让我想想...', 2000);
        }
      }

      // Save user message to database
      if (saveChatHistory && !conversationId.startsWith('local:')) {
        try {
          await dbAddMessage(conversationId, {
            role: userMessage.role,
            content: userMessage.content,
          });
        } catch (error) {
          console.error('Failed to save user message:', error);
        }
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

        // Collect context and enrich system prompt
        let enrichedSystemPrompt = appConfig.systemPrompt;
        console.log('[useChat] Base systemPrompt:', appConfig.systemPrompt?.slice(0, 100) + '...');
        try {
          const context = await collectPetContext();
          enrichedSystemPrompt = enrichSystemPrompt(appConfig.systemPrompt, context);
          console.log('[useChat] Enriched systemPrompt:', enrichedSystemPrompt?.slice(0, 200) + '...');
        } catch (error) {
          console.warn('[useChat] Failed to collect context, using base prompt:', error);
          // Fall back to base prompt
        }
        console.log('[useChat] Final systemPrompt length:', enrichedSystemPrompt?.length ?? 0);

        const result = await sessionRef.current.sendMessage({
          messages: historyMessages,
          systemPrompt: enrichedSystemPrompt,
          config: llmConfig,
          onToken: (token) => {
            appendToLastMessage(token);
          },
          onComplete: async (finalContent) => {
            setPetEmotion('happy');

            // Save assistant message to database
            if (saveChatHistory && !conversationId.startsWith('local:')) {
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
            }
          },
          onError: (error) => {
            console.error('LLM error:', error);
            setPetEmotion('confused');
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
        setPetEmotion('confused');

        // Parse error for user-friendly message
        let errorMessage = '生成回复时发生错误';

        if (error instanceof Error) {
          const msg = error.message.toLowerCase();

          if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('invalid api key')) {
            errorMessage = 'API Key 无效或已过期，请检查配置';
          } else if (msg.includes('429') || msg.includes('rate limit')) {
            errorMessage = 'API 请求频率过高，请稍后再试';
          } else if (msg.includes('500') || msg.includes('502') || msg.includes('503')) {
            errorMessage = 'API 服务暂时不可用，请稍后再试';
          } else if (msg.includes('network') || msg.includes('fetch') || msg.includes('econnrefused')) {
            errorMessage = '网络连接失败，请检查网络状态';
          } else if (msg.includes('timeout') || msg.includes('aborted')) {
            errorMessage = '请求超时，请重试';
          } else if (msg.includes('model') && msg.includes('not found')) {
            errorMessage = '模型不存在，请检查 LLM 配置';
          } else {
            errorMessage = `错误: ${error.message}`;
          }
        }

        // Update placeholder message with error
        updateMessage(assistantMessageId, errorMessage);
        petShowBubble('请求失败了...', 3000);

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
      setPetEmotion,
      appendToLastMessage,
      updateMessage,
      onError,
      saveChatHistory,
      petShowBubble,
    ]
  );

  const abort = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.abort();
      setLoading(false);
      setStreaming(false);
      setPetEmotion('neutral');
    }
  }, [setLoading, setStreaming, setPetEmotion]);

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
