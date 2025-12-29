import { useState, useCallback, useEffect, useRef } from 'react';
import { useConfigStore } from '../stores';
import type { AppConfig, LLMConfig, VoiceConfig } from '../types';

const DEFAULT_MODELS: Record<string, string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229'],
  ollama: ['llama2', 'mistral', 'codellama', 'neural-chat'],
};

export function useSettingsConfig() {
  const { config, setConfig, saveConfig, loadConfig } = useConfigStore();
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);
  const [isSaving, setIsSaving] = useState(false);
  const didSaveRef = useRef(false);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleProviderChange = useCallback((provider: LLMConfig['provider']) => {
    const defaultModel = DEFAULT_MODELS[provider]?.[0] ?? '';
    setLocalConfig((prev) => ({
      ...prev,
      llm: {
        ...prev.llm,
        provider,
        model: defaultModel,
        apiKey: provider === 'ollama' ? undefined : prev.llm.apiKey,
        baseUrl: provider === 'ollama' ? 'http://localhost:11434/api' : undefined,
      },
    }));
  }, []);

  const handleModelChange = useCallback((model: string) => {
    setLocalConfig((prev) => ({ ...prev, llm: { ...prev.llm, model } }));
  }, []);

  const handleApiKeyChange = useCallback((apiKey: string) => {
    setLocalConfig((prev) => ({ ...prev, llm: { ...prev.llm, apiKey } }));
  }, []);

  const handleBaseUrlChange = useCallback((baseUrl: string) => {
    setLocalConfig((prev) => ({ ...prev, llm: { ...prev.llm, baseUrl: baseUrl || undefined } }));
  }, []);

  const handleTemperatureChange = useCallback((temperature: number) => {
    setLocalConfig((prev) => ({ ...prev, llm: { ...prev.llm, temperature } }));
  }, []);

  const handleSystemPromptChange = useCallback((systemPrompt: string) => {
    setLocalConfig((prev) => ({ ...prev, systemPrompt }));
  }, []);

  const handleVoiceConfigChange = useCallback((voice: VoiceConfig) => {
    setLocalConfig((prev) => ({ ...prev, voice }));
  }, []);

  const handleSave = useCallback(async (onSuccess?: () => void) => {
    setIsSaving(true);
    try {
      setConfig(localConfig);
      await saveConfig();
      didSaveRef.current = true;
      onSuccess?.();
    } catch (error) {
      console.error('Failed to save config:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [localConfig, setConfig, saveConfig]);

  const availableModels = DEFAULT_MODELS[localConfig.llm.provider] ?? [];

  return {
    localConfig,
    setLocalConfig,
    isSaving,
    didSaveRef,
    availableModels,
    handlers: {
      handleProviderChange,
      handleModelChange,
      handleApiKeyChange,
      handleBaseUrlChange,
      handleTemperatureChange,
      handleSystemPromptChange,
      handleVoiceConfigChange,
      handleSave,
    },
    loadConfig,
  };
}
