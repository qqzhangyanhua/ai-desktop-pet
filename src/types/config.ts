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

export type BackgroundMode = 'none' | 'preset' | 'color' | 'image';

export interface AppearanceConfig {
  /** 当前宠物形象（皮肤）ID */
  skinId: string;
  /** 场景背景 */
  background: {
    mode: BackgroundMode;
    value?: string;
  };
  /** 宠物整体透明度（0.2 - 1） */
  opacity: number;
  /** 显示尺寸（窗口内容区逻辑像素） */
  size: { width: number; height: number };
  /** 状态面板（心情/精力/亲密）是否显示 */
  statusPanelVisible: boolean;
}

export type DecaySpeedPreset = 'casual' | 'standard' | 'hardcore';
export type InteractionFrequency = 'low' | 'standard' | 'high';

export interface BehaviorConfig {
  /** 属性衰减速度预设 */
  decaySpeed: DecaySpeedPreset;
  /** 互动频率（影响提示与衰减轮询频率） */
  interactionFrequency: InteractionFrequency;
  /** 自动打工开关（预留） */
  autoWorkEnabled: boolean;
  /** 动作台词/表情包 ID（预留：后续可扩展多套性格/语气） */
  expressionPackId: string;
  /** 通知提醒设置 */
  notifications: {
    bubbleEnabled: boolean;
    toastEnabled: boolean;
  };
}

export interface AssistantConfig {
  /** 快捷键设置（预留：当前仅保存配置） */
  shortcuts: {
    openChat: string;
    openSettings: string;
  };
  /** 隐私设置 */
  privacy: {
    /** 是否保存对话历史到本地数据库 */
    saveChatHistory: boolean;
  };
}

export type PerformanceMode = 'balanced' | 'battery' | 'performance';

export interface PerformanceConfig {
  /** 开机自启动（预留） */
  launchOnStartup: boolean;
  /** 后台运行模式（预留） */
  backgroundMode: PerformanceMode;
  /** 动画帧率（15-60） */
  animationFps: number;
  /** 资源占用限制（预留） */
  resourceLimit: 'low' | 'medium' | 'high';
}

export interface DesktopInteractionConfig {
  /** 是否启用左右吸附 */
  snapEnabled: boolean;
  /** 吸附阈值（px） */
  snapThreshold: number;
  /** 是否记忆窗口位置 */
  rememberPosition: boolean;
  /** 最近一次窗口位置（物理像素） */
  lastPosition: { x: number; y: number } | null;
  /** 当前吸附边（仅左右） */
  dockedEdge: 'left' | 'right' | null;
  /** 鼠标事件穿透 */
  clickThrough: boolean;
  /** 靠边自动隐藏 */
  autoHideEnabled: boolean;
  /** 靠边判定距离（px） */
  autoHideEdgeThreshold: number;
  /** 隐藏时露出宽度（px） */
  autoHideOffset: number;
  /** 鼠标悬停显示延迟（ms） */
  autoHideHoverRevealDelay: number;
}

export interface AppConfig {
  llm: LLMConfig;
  voice: VoiceConfig;
  live2d: Live2DPetConfig;
  appearance: AppearanceConfig;
  behavior: BehaviorConfig;
  assistant: AssistantConfig;
  performance: PerformanceConfig;
  interaction: DesktopInteractionConfig;
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
  appearance: {
    skinId: 'shizuku',
    background: { mode: 'none' },
    opacity: 1.0,
    size: { width: 300, height: 400 },
    statusPanelVisible: false,
  },
  behavior: {
    decaySpeed: 'standard',
    interactionFrequency: 'standard',
    autoWorkEnabled: false,
    expressionPackId: 'default',
    notifications: {
      bubbleEnabled: true,
      toastEnabled: true,
    },
  },
  assistant: {
    shortcuts: {
      openChat: '',
      openSettings: '',
    },
    privacy: {
      saveChatHistory: true,
    },
  },
  performance: {
    launchOnStartup: false,
    backgroundMode: 'balanced',
    animationFps: 60,
    resourceLimit: 'medium',
  },
  interaction: {
    snapEnabled: true,
    snapThreshold: 20,
    rememberPosition: true,
    lastPosition: null,
    dockedEdge: null,
    clickThrough: false,
    autoHideEnabled: false,
    autoHideEdgeThreshold: 50,
    autoHideOffset: 60,
    autoHideHoverRevealDelay: 120,
  },
  petScale: 1.0,
  alwaysOnTop: true,
  startMinimized: false,
  systemPrompt:
    '你是智能桌面宠物助手，擅长陪伴、喂食、娱乐、清洁护理，支持天气/时间播报、闹钟提醒、灯光与简单电脑操作提示，并记住用户偏好提供个性化建议。',
  useLive2D: false,
};
