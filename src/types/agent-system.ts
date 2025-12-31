/**
 * 智能体系统类型定义
 * Agent System Type Definitions
 *
 * 本文件定义了智能体系统的核心类型，包括：
 * - 智能体接口与状态
 * - 触发器系统
 * - 执行上下文与结果
 */

import type { PetStatus } from './pet-status';
import type { UserProfile } from './memory';

// ============================================================================
// 枚举定义
// ============================================================================

/**
 * 智能体运行状态
 */
export type AgentSystemStatus = 'idle' | 'running' | 'paused' | 'error';

/**
 * 触发器类型
 */
export type TriggerType = 'user_message' | 'schedule' | 'event' | 'condition';

/**
 * 智能体优先级
 */
export type AgentPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * 情绪类型（扩展）
 */
export type EmotionType =
  | 'happy'
  | 'sad'
  | 'anxious'
  | 'excited'
  | 'calm'
  | 'angry'
  | 'confused'
  | 'neutral';

// ============================================================================
// 触发器相关类型
// ============================================================================

/**
 * 定时触发器配置
 */
export interface ScheduleTriggerConfig {
  /** Cron 表达式 或 间隔秒数 */
  cron?: string;
  intervalSeconds?: number;
  /** 时区 */
  timezone?: string;
}

/**
 * 事件触发器配置
 */
export interface EventTriggerConfig {
  /** 监听的事件名称 */
  eventName: string;
  /** 事件过滤条件 */
  filter?: Record<string, unknown>;
}

/**
 * 条件触发器配置
 */
export interface ConditionTriggerConfig {
  /** 条件表达式 */
  expression: string;
  /** 检查间隔（毫秒） */
  checkIntervalMs: number;
  /** 触发后冷却时间（毫秒） */
  cooldownMs?: number;
}

/**
 * 用户消息触发器配置
 */
export interface UserMessageTriggerConfig {
  /** 关键词匹配 */
  keywords?: string[];
  /** 意图匹配 */
  intents?: string[];
  /** 是否作为默认处理器 */
  isDefault?: boolean;
}

/**
 * 触发器配置联合类型
 */
export type TriggerConfig =
  | ScheduleTriggerConfig
  | EventTriggerConfig
  | ConditionTriggerConfig
  | UserMessageTriggerConfig;

/**
 * 智能体触发器
 */
export interface AgentTrigger {
  /** 触发器 ID */
  id: string;
  /** 触发器类型 */
  type: TriggerType;
  /** 触发器配置 */
  config: TriggerConfig;
  /** 是否启用 */
  enabled: boolean;
  /** 描述 */
  description?: string;
}

// ============================================================================
// 情绪记录相关类型
// ============================================================================

/**
 * 情绪记录
 */
export interface EmotionRecord {
  /** 记录 ID */
  id: string;
  /** 情绪类型 */
  emotion: EmotionType;
  /** 情绪强度 (0-10) */
  intensity: number;
  /** 触发原因 */
  trigger?: string;
  /** 记录时间戳 */
  timestamp: number;
  /** 关联的对话 ID */
  conversationId?: string;
}

/**
 * 情绪趋势数据
 */
export interface EmotionTrend {
  /** 时间段开始 */
  periodStart: number;
  /** 时间段结束 */
  periodEnd: number;
  /** 主导情绪 */
  dominantEmotion: EmotionType;
  /** 情绪分布 */
  distribution: Record<EmotionType, number>;
  /** 平均强度 */
  averageIntensity: number;
  /** 情绪波动度 */
  volatility: number;
}

// ============================================================================
// 智能体上下文与结果
// ============================================================================

/**
 * 智能体执行上下文
 * 包含智能体执行时所需的所有环境信息
 */
export interface AgentContext {
  /** 用户唯一标识 */
  userId: string;
  /** 用户消息（对话触发时） */
  userMessage?: string;
  /** 用户画像 */
  userProfile: UserProfile;
  /** 近期情绪记录 */
  recentEmotions: EmotionRecord[];
  /** 当前宠物状态 */
  currentPetStatus: PetStatus;
  /** 执行时间戳 */
  timestamp: number;
  /** 触发来源 */
  triggerSource: TriggerType;
  /** 触发器 ID */
  triggerId?: string;
  /** 额外数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 智能体执行结果
 */
export interface AgentResult {
  /** 是否成功 */
  success: boolean;
  /** 响应消息（用于展示给用户） */
  message?: string;
  /** 是否需要语音播放 */
  shouldSpeak?: boolean;
  /** 触发的表情 */
  emotion?: EmotionType;
  /** 触发的动画 */
  animation?: string;
  /** 额外动作 */
  actions?: AgentAction[];
  /** 错误信息 */
  error?: string;
  /** 执行耗时（毫秒） */
  duration?: number;
  /** 额外数据 */
  data?: Record<string, unknown>;
}

/**
 * 智能体动作
 * 智能体执行后可触发的后续动作
 */
export interface AgentAction {
  /** 动作类型 */
  type:
    | 'notification'
    | 'schedule_task'
    | 'update_memory'
    | 'update_emotion'
    | 'trigger_agent'
    | 'open_url'
    | 'play_audio';
  /** 动作配置 */
  payload: Record<string, unknown>;
}

// ============================================================================
// 智能体定义
// ============================================================================

/**
 * 智能体元数据
 */
export interface AgentMetadata {
  /** 智能体唯一标识 */
  id: string;
  /** 智能体名称 */
  name: string;
  /** 智能体描述 */
  description: string;
  /** 版本号 */
  version: string;
  /** 图标（emoji 或图标名） */
  icon?: string;
  /** 分类 */
  category: 'care' | 'productivity' | 'wellness' | 'entertainment' | 'utility';
  /** 优先级 */
  priority: AgentPriority;
  /** 是否为系统智能体（不可禁用） */
  isSystem?: boolean;
}

/**
 * 智能体配置
 */
export interface AgentConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 可使用的工具列表 */
  tools: string[];
  /** 最大执行步数 */
  maxSteps: number;
  /** 执行超时（毫秒） */
  timeoutMs: number;
  /** 自定义配置 */
  settings?: Record<string, unknown>;
}

/**
 * 智能体接口
 * 所有智能体必须实现此接口
 */
export interface IAgent {
  /** 元数据 */
  readonly metadata: AgentMetadata;
  /** 配置 */
  config: AgentConfig;
  /** 触发器列表 */
  triggers: AgentTrigger[];

  /**
   * 初始化智能体
   */
  initialize(): Promise<void>;

  /**
   * 检查是否应该触发（用于条件触发）
   */
  shouldTrigger(context: AgentContext): Promise<boolean>;

  /**
   * 执行智能体
   */
  execute(context: AgentContext): Promise<AgentResult>;

  /**
   * 清理资源
   */
  cleanup(): Promise<void>;
}

// ============================================================================
// 智能体注册表
// ============================================================================

/**
 * 已注册智能体信息
 */
export interface RegisteredAgent {
  /** 智能体元数据 */
  metadata: AgentMetadata;
  /** 智能体配置 */
  config: AgentConfig;
  /** 触发器列表 */
  triggers: AgentTrigger[];
  /** 智能体状态 */
  status: AgentSystemStatus;
  /** 上次执行时间 */
  lastExecutedAt?: number;
  /** 执行次数 */
  executionCount: number;
  /** 错误次数 */
  errorCount: number;
  /** 是否启用 */
  enabled?: boolean;
  /** 优先级 */
  priority?: 'high' | 'normal' | 'low';
  /** 标签 */
  tags?: string[];
}

// ============================================================================
// 调度器相关类型
// ============================================================================

/**
 * 智能体执行任务
 */
export interface AgentTask {
  /** 任务 ID */
  id: string;
  /** 智能体 ID */
  agentId: string;
  /** 执行上下文 */
  context: AgentContext;
  /** 创建时间 */
  createdAt: number;
  /** 开始执行时间 */
  startedAt?: number;
  /** 完成时间 */
  completedAt?: number;
  /** 任务状态 */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  /** 执行结果 */
  result?: AgentResult;
  /** 重试次数 */
  retryCount: number;
}

/**
 * 调度器配置
 */
export interface DispatcherConfig {
  /** 最大并发执行数 */
  maxConcurrency: number;
  /** 任务队列大小 */
  queueSize: number;
  /** 默认超时（毫秒） */
  defaultTimeoutMs: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试延迟（毫秒） */
  retryDelayMs: number;
}

/**
 * 默认调度器配置
 */
export const DEFAULT_DISPATCHER_CONFIG: DispatcherConfig = {
  maxConcurrency: 3,
  queueSize: 100,
  defaultTimeoutMs: 30000,
  maxRetries: 2,
  retryDelayMs: 1000,
};

// ============================================================================
// 执行历史记录
// ============================================================================

/**
 * 智能体执行历史记录
 */
export interface AgentExecutionRecord {
  /** 记录 ID */
  id: string;
  /** 智能体 ID */
  agentId: string;
  /** 智能体名称 */
  agentName: string;
  /** 触发类型 */
  triggerType: TriggerType;
  /** 开始时间 */
  startedAt: number;
  /** 结束时间 */
  completedAt: number;
  /** 是否成功 */
  success: boolean;
  /** 执行耗时（毫秒） */
  duration: number;
  /** 响应消息 */
  message?: string;
  /** 错误信息 */
  error?: string;
  /** 使用的工具 */
  toolsUsed?: string[];
}

// ============================================================================
// Store 状态类型
// ============================================================================

/**
 * 智能体系统 Store 状态
 */
export interface AgentSystemState {
  /** 系统状态 */
  systemStatus: AgentSystemStatus;
  /** 已注册智能体 */
  registeredAgents: Map<string, RegisteredAgent>;
  /** 活跃任务 */
  activeTasks: AgentTask[];
  /** 执行历史 */
  executionHistory: AgentExecutionRecord[];
  /** 调度器配置 */
  dispatcherConfig: DispatcherConfig;
  /** 全局开关 */
  globalEnabled: boolean;
  /** 上次检查时间 */
  lastCheckAt: number;
}

/**
 * 默认智能体系统状态
 */
export const DEFAULT_AGENT_SYSTEM_STATE: AgentSystemState = {
  systemStatus: 'idle',
  registeredAgents: new Map(),
  activeTasks: [],
  executionHistory: [],
  dispatcherConfig: DEFAULT_DISPATCHER_CONFIG,
  globalEnabled: true,
  lastCheckAt: Date.now(),
};

// ============================================================================
// 工具类型
// ============================================================================

/**
 * 智能体工具结果
 */
export interface AgentToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 通知工具配置
 */
export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  sound?: boolean;
  duration?: number;
}

/**
 * 日程工具配置
 */
export interface SchedulePayload {
  title: string;
  description?: string;
  datetime: number;
  remindBefore?: number; // 提前提醒分钟数
  recurring?: 'daily' | 'weekly' | 'monthly';
  category?: 'work' | 'life' | 'health';
}

/**
 * 记忆工具配置
 */
export interface MemoryPayload {
  type: 'preference' | 'event' | 'habit' | 'relationship';
  content: string;
  importance: number;
  expiresAt?: number;
}
