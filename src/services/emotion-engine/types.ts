/**
 * Emotion Engine Types
 * 情感引擎类型定义
 */

import type { EmotionType } from '@/types';

/**
 * 情绪分析结果
 */
export interface SentimentResult {
  /** 情绪类型 */
  sentiment: 'positive' | 'negative' | 'neutral';

  /** 情绪强度 (0-1) */
  confidence: number;

  /** 具体的情绪 */
  emotion: EmotionType;

  /** 情绪分数 (-1 到 1，负数=负面，正数=正面) */
  score: number;

  /** 关键词 */
  keywords: string[];

  /** 分析细节 */
  details?: {
    /** 词汇层面得分 */
    lexicalScore: number;
    /** 句法层面得分 */
    syntacticScore: number;
    /** 上下文得分 */
    contextualScore: number;
  };
}

/**
 * 行为数据
 */
export interface BehaviorData {
  /** 键盘输入频率 (每分钟字符数) */
  typingSpeed: number;

  /** 活跃时间段 */
  activeHours: number[];

  /** 使用的应用 */
  appUsage: Array<{
    name: string;
    duration: number; // 分钟
    frequency: number;
  }>;

  /** 休息间隔 (分钟) */
  breakInterval: number;

  /** 工作时长 */
  workDuration: number;

  /** 鼠标移动次数 */
  mouseMovements: number;

  /** 窗口切换次数 */
  windowSwitches: number;
}

/**
 * 行为模式分析结果
 */
export interface BehaviorPatternResult {
  /** 模式类型 */
  pattern: 'focused' | 'stressed' | 'relaxed' | 'overworked' | 'bored' | 'productive';

  /** 置信度 (0-1) */
  confidence: number;

  /** 建议 */
  suggestions: string[];

  /** 行为特征 */
  characteristics: {
    stressLevel: number; // 0-1
    focusLevel: number; // 0-1
    energyLevel: number; // 0-1
    productivityLevel: number; // 0-1
  };

  /** 警告 */
  warnings: string[];
}

/**
 * 情感事件
 */
export interface EmotionEvent {
  id: string;
  timestamp: number;
  type: 'chat' | 'behavior' | 'system' | 'interaction';
  source: string; // 触发来源
  emotion: EmotionType;
  sentiment: SentimentResult;
  context: {
    text?: string;
    behavior?: BehaviorData;
    intensity?: number;
    metadata?: Record<string, any>;
  };
}

/**
 * 情感记忆记录
 */
export interface EmotionMemory {
  /** 记忆ID */
  id: string;

  /** 创建时间 */
  createdAt: number;

  /** 最后访问时间 */
  lastAccessed: number;

  /** 访问次数 */
  accessCount: number;

  /** 情感标签 */
  emotion: EmotionType;

  /** 情绪强度 */
  intensity: number;

  /** 记忆内容 */
  content: {
    description: string;
    keywords: string[];
    context: Record<string, any>;
  };

  /** 重要性评分 (0-1) */
  importance: number;

  /** 衰减因子 */
  decayRate: number;
}

/**
 * 关怀机会
 */
export interface CareOpportunity {
  /** 机会ID */
  id: string;

  /** 检测时间 */
  timestamp: number;

  /** 机会类型 */
  type:
    | 'low_mood'
    | 'high_stress'
    | 'long_work'
    | 'low_energy'
    | 'break_reminder'
    | 'health_warning'
    | 'emotional_support'
    | 'achievement_celebration';

  /** 优先级 (1-10, 10最高) */
  priority: number;

  /** 触发条件 */
  trigger: {
    condition: string;
    value: number;
    threshold: number;
  };

  /** 建议的关怀内容 */
  suggestion: {
    title: string;
    message: string;
    action?: string;
    tone: 'gentle' | 'urgent' | 'celebratory' | 'supportive';
  };

  /** 相关数据 */
  relatedData?: Record<string, any>;
}

/**
 * 关怀配置
 */
export interface CareConfig {
  enabled: boolean;

  /** 关怀频率限制 (分钟) */
  minIntervalMinutes: number;

  /** 打扰度控制 */
  disturbanceControl: {
    enabled: boolean;
    maxNotificationsPerHour: number;
    quietHours: { start: number; end: number }; // 0-23
  };

  /** 关怀类型配置 */
  careTypes: {
    [key in CareOpportunity['type']]: {
      enabled: boolean;
      threshold: number;
      priority: number;
    };
  };

  /** 个性化设置 */
  personalization: {
    learningEnabled: boolean;
    adaptToUserHabits: boolean;
    customResponses: boolean;
  };
}

/**
 * 上下文信息
 */
export interface InteractionContext {
  /** 用户输入 */
  userInput?: string;

  /** 对话历史 */
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;

  /** 当前时间 */
  currentTime: number;

  /** 用户行为数据 */
  behaviorData?: BehaviorData;

  /** 宠物状态 */
  petState?: {
    mood: number;
    energy: number;
    intimacy: number;
  };

  /** 环境信息 */
  environment?: {
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    dayOfWeek: number; // 0-6
    isWeekend: boolean;
    isWorkingHours: boolean;
  };
}

/**
 * 回应生成选项
 */
export interface ResponseGenerationOptions {
  /** 情绪目标 */
  targetEmotion?: EmotionType;

  /** 回应长度 */
  length: 'short' | 'medium' | 'long';

  /** 语调 */
  tone: 'friendly' | 'professional' | 'caring' | 'playful';

  /** 是否包含建议 */
  includeSuggestions: boolean;

  /** 是否包含关怀 */
  includeCare: boolean;

  /** 是否个性化 */
  personalized: boolean;
}

/**
 * 生成的回应
 */
export interface GeneratedResponse {
  /** 回应文本 */
  text: string;

  /** 情绪色彩 */
  emotion: EmotionType;

  /** 语调 */
  tone: string;

  /** 建议列表 */
  suggestions?: string[];

  /** 关怀机会 */
  careOpportunities?: CareOpportunity[];

  /** 元数据 */
  metadata: {
    generationTime: number;
    model: string;
    tokensUsed: number;
    confidence: number;
  };
}
