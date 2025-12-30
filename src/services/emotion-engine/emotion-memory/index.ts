/**
 * Emotion Memory System Main Module
 * 情感记忆系统主模块
 *
 * P1-B-5: Refactored from monolithic emotion-memory.ts (636 lines)
 * Linus原则: Facade模式 - 主类作为协调器，组合优于继承
 *
 * 架构：
 * - MemoryStorage: 记忆存储和检索
 * - MemoryAnalyzer: 模式分析和洞察
 * - EmotionMemorySystem: 协调器（Facade模式）
 */

import type { EmotionEvent, EmotionMemory } from '../types';
import type { EmotionMemoryConfig, MemoryQueryOptions, EmotionPattern } from './types';
import { DEFAULT_MEMORY_CONFIG } from './types';
import { MemoryStorage } from './memory-storage';
import { MemoryAnalyzer } from './memory-analyzer';

/**
 * EmotionMemorySystem 主类
 *
 * 采用Facade模式，协调MemoryStorage和MemoryAnalyzer
 */
export class EmotionMemorySystem {
  private storage: MemoryStorage;
  private analyzer: MemoryAnalyzer;
  private config: EmotionMemoryConfig;
  private lastDecayTime = Date.now();

  constructor(config?: Partial<EmotionMemoryConfig>) {
    this.config = { ...DEFAULT_MEMORY_CONFIG, ...config };
    this.storage = new MemoryStorage(this.config);
    this.analyzer = new MemoryAnalyzer();
  }

  /**
   * 记录情感事件
   */
  recordEvent(event: EmotionEvent): string {
    const memory: EmotionMemory = {
      id: event.id,
      createdAt: event.timestamp,
      lastAccessed: event.timestamp,
      accessCount: 1,
      emotion: event.emotion,
      intensity: event.sentiment.confidence,
      content: {
        description: this.storage.generateDescription(event),
        keywords: event.sentiment.keywords,
        context: event.context,
      },
      importance: this.storage.calculateImportance(event),
      decayRate: this.storage.calculateDecayRate(event),
    };

    // 检查是否可以合并相似记忆
    const similarMemory = this.storage.findSimilar(memory, this.config.mergeThreshold);
    if (similarMemory) {
      return this.storage.merge(similarMemory.id, memory);
    }

    // 存储新记忆
    this.storage.store(memory);

    // 检查记忆数量限制
    if (this.storage.size() > this.config.maxMemories) {
      this.storage.cleanup(this.config.maxMemories);
    }

    return memory.id;
  }

  /**
   * 查找记忆
   */
  findMemory(id: string): EmotionMemory | null {
    return this.storage.find(id);
  }

  /**
   * 查询记忆
   */
  queryMemories(options: MemoryQueryOptions = {}): EmotionMemory[] {
    return this.storage.query(options);
  }

  /**
   * 获取重要记忆
   */
  getImportantMemories(threshold = this.config.importanceThreshold): EmotionMemory[] {
    return this.queryMemories({
      minImportance: threshold,
      sortBy: 'importance',
      sortOrder: 'desc',
      limit: 50,
    });
  }

  /**
   * 获取最近记忆
   */
  getRecentMemories(days = 7): EmotionMemory[] {
    const now = Date.now();
    const daysAgo = days * 24 * 60 * 60 * 1000;

    return this.queryMemories({
      timeRange: { start: now - daysAgo, end: now },
      sortBy: 'timestamp',
      sortOrder: 'desc',
    });
  }

  /**
   * 分析情感模式
   */
  analyzePatterns(timeRangeDays = 30): EmotionPattern[] {
    const memories = this.getRecentMemories(timeRangeDays);
    return this.analyzer.analyzePatterns(memories, timeRangeDays);
  }

  /**
   * 获取情感洞察
   */
  getInsights(): {
    dominantEmotion: string;
    moodTrend: 'improving' | 'declining' | 'stable';
    averageIntensity: number;
    topKeywords: string[];
    recommendations: string[];
  } {
    const memories = this.queryMemories({ sortBy: 'timestamp', sortOrder: 'desc', limit: 100 });
    return this.analyzer.getInsights(memories);
  }

  /**
   * 应用记忆衰减
   */
  applyDecay(): void {
    const now = Date.now();
    const daysPassed = (now - this.lastDecayTime) / (1000 * 60 * 60 * 24);

    if (daysPassed < 1) {
      return; // 每天衰减一次
    }

    const allMemories = this.storage.getAll();
    allMemories.forEach((memory) => {
      const decayAmount = memory.decayRate * daysPassed;
      memory.importance = Math.max(0, memory.importance - decayAmount);
    });

    this.lastDecayTime = now;
  }

  /**
   * 获取记忆统计
   */
  getStatistics(): {
    totalMemories: number;
    emotionsByType: Record<string, number>;
    averageImportance: number;
    oldestMemory: number;
    newestMemory: number;
  } {
    const memories = this.storage.getAll();
    return this.analyzer.getStatistics(memories);
  }
}

/**
 * 全局单例
 */
let memoryInstance: EmotionMemorySystem | null = null;

/**
 * 获取全局EmotionMemorySystem实例
 */
export function getEmotionMemory(): EmotionMemorySystem {
  if (!memoryInstance) {
    memoryInstance = new EmotionMemorySystem();
  }
  return memoryInstance;
}

// Re-export types for external use
export type { EmotionMemoryConfig, MemoryQueryOptions, EmotionPattern } from './types';
export { DEFAULT_MEMORY_CONFIG } from './types';
