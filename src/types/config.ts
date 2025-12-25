// Config types

import type { LLMConfig } from './chat';

export interface VoiceConfig {
  sttEnabled: boolean;
  sttEngine: 'web-speech';
  sttLanguage: string;
  ttsEnabled: boolean;
  ttsEngine: 'web-speech' | 'edge-tts';
  ttsVoice: string;
  ttsRate: number;
  ttsPitch: number;
  ttsVolume: number;
  pushToTalkKey: string;
}

export interface Live2DPetConfig {
  useLive2D: boolean;
  currentModel: string;
  modelScale: number;
}

export interface AppConfig {
  llm: LLMConfig;
  voice: VoiceConfig;
  live2d: Live2DPetConfig;
  petScale: number;
  alwaysOnTop: boolean;
  startMinimized: boolean;
  systemPrompt: string;
  useLive2D: boolean; // Quick access flag
}

export interface ConfigState {
  config: AppConfig;
  isLoaded: boolean;
}

export const DEFAULT_CONFIG: AppConfig = {
  llm: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 2048,
  },
  voice: {
    sttEnabled: false,
    sttEngine: 'web-speech',
    sttLanguage: 'zh-CN',
    ttsEnabled: false,
    ttsEngine: 'edge-tts',
    ttsVoice: 'zh-CN-XiaoxiaoNeural',
    ttsRate: 1.0,
    ttsPitch: 1.0,
    ttsVolume: 1.0,
    pushToTalkKey: 'Space',
  },
  live2d: {
    useLive2D: false,
    currentModel: 'shizuku',
    modelScale: 1.0,
  },
  petScale: 1.0,
  alwaysOnTop: true,
  startMinimized: false,
  systemPrompt:
    '你是智能桌面宠物助手，擅长陪伴、喂食、娱乐、清洁护理，支持天气/时间播报、闹钟提醒、灯光与简单电脑操作提示，并记住用户偏好提供个性化建议。',
  useLive2D: false,
};
