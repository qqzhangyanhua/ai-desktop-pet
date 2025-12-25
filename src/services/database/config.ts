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
  await execute(
    `INSERT INTO config (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, Date.now()]
  );
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
    return { ...DEFAULT_CONFIG, ...saved };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveAppConfig(config: AppConfig): Promise<void> {
  // Don't save API keys to database for security
  const configToSave = {
    ...config,
    llm: {
      ...config.llm,
      apiKey: undefined, // Remove API key from saved config
    },
  };
  await setConfigValue('app_config', JSON.stringify(configToSave));
}

export async function getApiKey(provider: string): Promise<string | null> {
  return getConfigValue(`api_key_${provider}`);
}

export async function setApiKey(provider: string, apiKey: string): Promise<void> {
  // In production, this should be encrypted
  await setConfigValue(`api_key_${provider}`, apiKey);
}
