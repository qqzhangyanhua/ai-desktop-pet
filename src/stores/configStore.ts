import { create } from 'zustand';
import type { AppConfig, ConfigState } from '../types';
import { DEFAULT_CONFIG } from '../types';
import { loadAppConfig, saveAppConfig, getApiKey, setApiKey } from '../services/database/config';

interface ConfigStore extends ConfigState {
  setConfig: (config: Partial<AppConfig>) => void;
  loadConfig: () => Promise<void>;
  saveConfig: () => Promise<void>;
  resetConfig: () => void;
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  config: DEFAULT_CONFIG,
  isLoaded: false,

  setConfig: (partialConfig) =>
    set((state) => ({
      config: { ...state.config, ...partialConfig },
    })),

  loadConfig: async () => {
    try {
      const savedConfig = await loadAppConfig();

      // Load API keys for each provider
      const openaiKey = await getApiKey('openai');
      const anthropicKey = await getApiKey('anthropic');

      const config = {
        ...savedConfig,
        llm: {
          ...savedConfig.llm,
          apiKey:
            savedConfig.llm.provider === 'openai'
              ? openaiKey ?? undefined
              : savedConfig.llm.provider === 'anthropic'
                ? anthropicKey ?? undefined
                : undefined,
        },
      };

      set({ config, isLoaded: true });
    } catch (error) {
      console.error('Failed to load config:', error);
      set({ config: DEFAULT_CONFIG, isLoaded: true });
    }
  },

  saveConfig: async () => {
    const config = get().config;

    try {
      // Save config without API key
      await saveAppConfig(config);

      // Save API key separately for the current provider
      if (config.llm.apiKey && config.llm.provider !== 'ollama') {
        await setApiKey(config.llm.provider, config.llm.apiKey);
      }

      console.log('Config saved successfully');
    } catch (error) {
      console.error('Failed to save config:', error);
      throw error;
    }
  },

  resetConfig: () => set({ config: DEFAULT_CONFIG }),
}));
