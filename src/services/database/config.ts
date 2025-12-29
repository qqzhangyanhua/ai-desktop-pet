import { query, execute } from './index';
import type { AppConfig } from '../../types';
import { DEFAULT_CONFIG } from '../../types';

interface ConfigRow {
  key: string;
  value: string;
  updated_at: number;
}

export async function getConfigValue(key: string): Promise<string | null> {
  const rows = await query<ConfigRow>(`SELECT value FROM config WHERE key = ?`, [key]);
  return rows[0]?.value ?? null;
}

export async function setConfigValue(key: string, value: string): Promise<void> {
  try {
    console.log(`[DB] Setting config key: ${key}, value length: ${value.length}`);
    await execute(
      `INSERT INTO config (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [key, value, Date.now()]
    );
    console.log(`[DB] Config key ${key} set successfully`);
  } catch (error) {
    console.error(`[DB] Failed to set config key ${key}:`, error);
    throw error;
  }
}

export async function getAllConfig(): Promise<Record<string, string>> {
  const rows = await query<ConfigRow>(`SELECT key, value FROM config`);
  const config: Record<string, string> = {};
  for (const row of rows) {
    config[row.key] = row.value;
  }
  return config;
}

export async function loadAppConfig(): Promise<AppConfig> {
  const configJson = await getConfigValue('app_config');
  if (!configJson) {
    return DEFAULT_CONFIG;
  }

  try {
    const saved = JSON.parse(configJson) as Partial<AppConfig>;
    return {
      ...DEFAULT_CONFIG,
      ...saved,
      llm: { ...DEFAULT_CONFIG.llm, ...saved.llm },
      chat: { ...DEFAULT_CONFIG.chat, ...saved.chat },
      voice: { ...DEFAULT_CONFIG.voice, ...saved.voice },
      live2d: { ...DEFAULT_CONFIG.live2d, ...saved.live2d },
      appearance: {
        ...DEFAULT_CONFIG.appearance,
        ...saved.appearance,
        background: {
          ...DEFAULT_CONFIG.appearance.background,
          ...saved.appearance?.background,
        },
        size: {
          ...DEFAULT_CONFIG.appearance.size,
          ...saved.appearance?.size,
        },
      },
      behavior: {
        ...DEFAULT_CONFIG.behavior,
        ...saved.behavior,
        notifications: {
          ...DEFAULT_CONFIG.behavior.notifications,
          ...saved.behavior?.notifications,
        },
      },
      assistant: {
        ...DEFAULT_CONFIG.assistant,
        ...saved.assistant,
        shortcuts: {
          ...DEFAULT_CONFIG.assistant.shortcuts,
          ...saved.assistant?.shortcuts,
        },
        privacy: {
          ...DEFAULT_CONFIG.assistant.privacy,
          ...saved.assistant?.privacy,
        },
        agent: {
          ...DEFAULT_CONFIG.assistant.agent,
          ...saved.assistant?.agent,
        },
      },
      performance: {
        ...DEFAULT_CONFIG.performance,
        ...saved.performance,
      },
      interaction: {
        ...DEFAULT_CONFIG.interaction,
        ...saved.interaction,
      },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveAppConfig(config: AppConfig): Promise<void> {
  try {
    console.log('[DB] Saving app config, keys:', Object.keys(config));
    // Don't save API keys to database for security
    const configToSave = {
      ...config,
      llm: {
        ...config.llm,
        apiKey: undefined, // Remove API key from saved config
      },
    };
    const configJson = JSON.stringify(configToSave);
    console.log('[DB] Config JSON length:', configJson.length);
    await setConfigValue('app_config', configJson);
    console.log('[DB] Config saved to database successfully');
  } catch (error) {
    console.error('[DB] Failed to save app config:', error);
    throw error;
  }
}

export async function getApiKey(provider: string): Promise<string | null> {
  return getConfigValue(`api_key_${provider}`);
}

export async function setApiKey(provider: string, apiKey: string): Promise<void> {
  // In production, this should be encrypted
  await setConfigValue(`api_key_${provider}`, apiKey);
}
