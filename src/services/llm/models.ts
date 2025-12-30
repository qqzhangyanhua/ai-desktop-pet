/**
 * LLM Model Configuration
 * LLM模型配置
 *
 * 集中管理所有LLM提供商的模型列表
 */

export interface ModelInfo {
  id: string;
  name: string;
  contextWindow?: number;
  isDeprecated?: boolean;
}

export interface ProviderInfo {
  value: string;
  label: string;
}

export const LLM_PROVIDERS: ProviderInfo[] = [
  { value: 'openai', label: 'GPT（OpenAI）' },
  { value: 'anthropic', label: 'Claude（Anthropic）' },
  { value: 'ollama', label: '本地模型（Ollama）' },
];

export const LLM_MODELS: Record<string, ModelInfo[]> = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000 },
    { id: 'gpt-4o-mini', name: 'GPT-4o mini', contextWindow: 128000 },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextWindow: 128000 },
    { id: 'o1', name: 'o1', contextWindow: 200000 },
    { id: 'o1-mini', name: 'o1 mini', contextWindow: 128000 },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', contextWindow: 200000 },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', contextWindow: 200000 },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', contextWindow: 200000 },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', contextWindow: 200000 },
  ],
  ollama: [
    { id: 'llama3.3', name: 'Llama 3.3' },
    { id: 'qwen2.5', name: 'Qwen 2.5' },
    { id: 'deepseek-r1', name: 'DeepSeek R1' },
    { id: 'mistral', name: 'Mistral' },
    { id: 'codellama', name: 'Code Llama' },
  ],
};

/**
 * 获取指定提供商的模型列表
 */
export function getModelsForProvider(provider: string): ModelInfo[] {
  return LLM_MODELS[provider] ?? [];
}

/**
 * 获取指定提供商的模型ID列表（用于向后兼容）
 */
export function getModelIdsForProvider(provider: string): string[] {
  return getModelsForProvider(provider).map((m) => m.id);
}

/**
 * 获取指定提供商的默认模型
 */
export function getDefaultModelForProvider(provider: string): string {
  const models = getModelsForProvider(provider);
  return models[0]?.id ?? '';
}
