// LLM Service Exports

export type {
  LLMProvider,
  LLMProviderConfig,
  ChatCompletionOptions,
  ChatCompletionResult,
  StreamingChatOptions,
  EmotionDialogueContext,
  EmotionDialogueOptions,
  EmotionDialogueResult,
  SystemPromptTemplate,
} from './types';

export {
  createProvider,
  createModel,
  clearProviderCache,
} from './providers';

export {
  chatCompletion,
  streamChatCompletion,
  ChatSession,
} from './chat';

export {
  generateEmotionDialogue,
  clearDialogueHistory,
  getDialogueHistory,
  setDialogueHistory,
} from './emotion-dialogue';

export {
  getSystemPrompt,
  selectSystemPromptTemplate,
} from './system-prompts';
