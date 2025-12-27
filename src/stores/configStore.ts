import { create } from 'zustand';
import { produce } from 'immer';
import type { AppConfig, ConfigState } from '../types';
import { DEFAULT_CONFIG } from '../types';
import { loadAppConfig, saveAppConfig, getApiKey, setApiKey } from '../services/database/config';

interface ConfigStore extends ConfigState {
  setConfig: (config: Partial<AppConfig>) => void;
  loadConfig: () => Promise<void>;
  saveConfig: () => Promise<void>;
  resetConfig: () => void;
}

/**
 * Deep merge utility using immer
 * Recursively merges partial config into state config
 */
function deepMerge(base: AppConfig, partial: Partial<AppConfig>): AppConfig {
  const isPlainObject = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v);

  const mergeInto = (target: Record<string, unknown>, source: Record<string, unknown>) => {
    Object.keys(source).forEach((key) => {
      const next = source[key];
      if (next === undefined) return;

      const current = target[key];
      if (isPlainObject(current) && isPlainObject(next)) {
        mergeInto(current, next);
        return;
      }

      target[key] = next;
    });
  };

  return produce(base, (draft) => {
    mergeInto(draft as unknown as Record<string, unknown>, partial as unknown as Record<string, unknown>);
  });
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  config: DEFAULT_CONFIG,
  isLoaded: false,

  setConfig: (partialConfig) =>
    set((state) => ({
      config: deepMerge(state.config, partialConfig),
    })),

  loadConfig: async () => {
    try {
      const savedConfig = await loadAppConfig();

      // Load API keys for each provider
      const openaiKey = await getApiKey('openai');
      const anthropicKey = await getApiKey('anthropic');

      const merged = deepMerge(DEFAULT_CONFIG, savedConfig as Partial<AppConfig>);
      const config = {
        ...merged,
        llm: {
          ...merged.llm,
          apiKey:
            merged.llm.provider === 'openai'
              ? openaiKey ?? undefined
              : merged.llm.provider === 'anthropic'
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
