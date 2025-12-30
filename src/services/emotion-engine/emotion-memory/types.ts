/**
 * Emotion Memory Internal Types
 * 情感记忆内部类型定义
 *
 * P1-B-2: Extracted from emotion-memory.ts (636 lines)
 */

/**
 * 情感记忆配置
 */
export interface EmotionMemoryConfig {
  /** 最大记忆数量 */
  maxMemories: number;

  /** 默认衰减率（每天） */
  defaultDecayRate: number;

  /** 记忆过期时间（毫秒） */
  memoryExpiryMs: number;

  /** 重要性阈值 */
  importanceThreshold: number;

  /** 合并相似记忆的阈值 */
  mergeThreshold: number;
}

/**
 * Memory 查询选项
 */
export interface MemoryQueryOptions {
  /** 情绪类型 */
  emotion?: string;

  /** 时间范围 */
  timeRange?: {
    start: number;
    end: number;
  };

  /** 最小重要性 */
  minImportance?: number;

  /** 关键词 */
  keywords?: string[];

  /** 排序方式 */
  sortBy?: 'timestamp' | 'importance' | 'lastAccessed';

  /** 排序顺序 */
  sortOrder?: 'asc' | 'desc';

  /** 限制数量 */
  limit?: number;
}

/**
 * 情感记忆模式
 */
export interface EmotionPattern {
  /** 模式类型 */
  type: 'frequent' | 'recurring' | 'intense' | 'periodic';

  /** 描述 */
  description: string;

  /** 情绪类型 */
  emotion: string;

  /** 出现频率 */
  frequency: number;

  /** 置信度 */
  confidence: number;

  /** 建议 */
  suggestions: string[];
}

/**
 * 默认配置
 */
export const DEFAULT_MEMORY_CONFIG: EmotionMemoryConfig = {
  maxMemories: 1000,
  defaultDecayRate: 0.05, // 每天5%衰减
  memoryExpiryMs: 1000 * 60 * 60 * 24 * 365, // 1年
  importanceThreshold: 0.6,
  mergeThreshold: 0.8,
};
