/**
 * Memory Storage
 * 记忆存储和检索
 *
 * P1-B-3: Extracted from emotion-memory.ts (636 lines)
 * Linus原则: 单一职责 - 只负责记忆的CRUD操作
 */

import type { EmotionEvent, EmotionMemory } from '../types';
import type { EmotionMemoryConfig, MemoryQueryOptions } from './types';

/**
 * 记忆存储类
 */
export class MemoryStorage {
  private memories: Map<string, EmotionMemory> = new Map();

  constructor(private config: EmotionMemoryConfig) {}

  /**
   * 存储记忆
   */
  store(memory: EmotionMemory): void {
    this.memories.set(memory.id, memory);
  }

  /**
   * 查找单个记忆
   */
  find(id: string): EmotionMemory | null {
    const memory = this.memories.get(id);
    if (memory) {
      memory.lastAccessed = Date.now();
      memory.accessCount++;
    }
    return memory || null;
  }

  /**
   * 查询记忆
   */
  query(options: MemoryQueryOptions = {}): EmotionMemory[] {
    let results = Array.from(this.memories.values());

    // 过滤
    if (options.emotion) {
      results = results.filter((m) => m.emotion === options.emotion);
    }

    if (options.timeRange) {
      results = results.filter(
        (m) => m.createdAt >= options.timeRange!.start && m.createdAt <= options.timeRange!.end
      );
    }

    if (options.minImportance !== undefined) {
      results = results.filter((m) => m.importance >= (options.minImportance ?? 0));
    }

    if (options.keywords && options.keywords.length > 0) {
      results = results.filter((m) =>
        options.keywords!.some((keyword) => m.content.keywords.some((k) => k.includes(keyword)))
      );
    }

    // 过滤过期记忆
    const now = Date.now();
    results = results.filter((m) => now - m.createdAt < this.config.memoryExpiryMs);

    // 排序
    results.sort((a, b) => {
      let aVal: number, bVal: number;

      switch (options.sortBy) {
        case 'importance':
          aVal = a.importance;
          bVal = b.importance;
          break;
        case 'lastAccessed':
          aVal = a.lastAccessed;
          bVal = b.lastAccessed;
          break;
        case 'timestamp':
        default:
          aVal = a.createdAt;
          bVal = b.createdAt;
          break;
      }

      if (options.sortOrder === 'desc') {
        return bVal - aVal;
      } else {
        return aVal - bVal;
      }
    });

    // 限制数量
    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * 删除记忆
   */
  delete(id: string): boolean {
    return this.memories.delete(id);
  }

  /**
   * 获取所有记忆
   */
  getAll(): EmotionMemory[] {
    return Array.from(this.memories.values());
  }

  /**
   * 获取记忆数量
   */
  size(): number {
    return this.memories.size;
  }

  /**
   * 查找相似记忆
   */
  findSimilar(memory: EmotionMemory, threshold: number): EmotionMemory | null {
    for (const existing of this.memories.values()) {
      const similarity = this.calculateSimilarity(memory, existing);
      if (similarity > threshold) {
        return existing;
      }
    }
    return null;
  }

  /**
   * 合并记忆
   */
  merge(existingId: string, newMemory: EmotionMemory): string {
    const existing = this.memories.get(existingId);
    if (!existing) {
      throw new Error(`Memory ${existingId} not found`);
    }

    // 合并关键词
    const mergedKeywords = Array.from(
      new Set([...existing.content.keywords, ...newMemory.content.keywords])
    );

    // 更新重要性（取最大值）
    existing.importance = Math.max(existing.importance, newMemory.importance);

    // 更新内容
    existing.content.keywords = mergedKeywords;
    existing.lastAccessed = Date.now();
    existing.accessCount++;

    return existingId;
  }

  /**
   * 清理旧记忆
   */
  cleanup(maxCount: number): void {
    const memories = Array.from(this.memories.entries());
    memories.sort((a, b) => {
      // 按重要性和时间排序
      const scoreA =
        a[1].importance * (1 - (Date.now() - a[1].lastAccessed) / (1000 * 60 * 60 * 24));
      const scoreB =
        b[1].importance * (1 - (Date.now() - b[1].lastAccessed) / (1000 * 60 * 60 * 24));
      return scoreA - scoreB;
    });

    // 删除最不重要的记忆
    const toDelete = memories.slice(0, memories.length - maxCount);
    toDelete.forEach(([id]) => {
      this.memories.delete(id);
    });
  }

  /**
   * 生成记忆描述
   */
  generateDescription(event: EmotionEvent): string {
    const emotion = event.emotion;
    const keywords = event.sentiment.keywords.join(', ');
    const source = event.source;

    return `${emotion} (${keywords}) from ${source}`;
  }

  /**
   * 计算相似度
   */
  private calculateSimilarity(m1: EmotionMemory, m2: EmotionMemory): number {
    let score = 0;

    // 情绪相同
    if (m1.emotion === m2.emotion) {
      score += 0.5;
    }

    // 关键词重叠
    const commonKeywords = m1.content.keywords.filter((k) => m2.content.keywords.includes(k));
    score +=
      (commonKeywords.length / Math.max(m1.content.keywords.length, m2.content.keywords.length)) *
      0.5;

    return score;
  }

  /**
   * 计算重要性
   */
  calculateImportance(event: EmotionEvent): number {
    let importance = event.sentiment.confidence;

    // 基于情绪强度调整
    if (event.sentiment.score > 0.5 || event.sentiment.score < -0.5) {
      importance += 0.2;
    }

    // 基于关键词数量调整
    importance += Math.min(event.sentiment.keywords.length * 0.05, 0.2);

    // 基于来源调整
    if (event.type === 'chat') {
      importance += 0.1;
    } else if (event.type === 'behavior') {
      importance += 0.05;
    }

    return Math.min(1, importance);
  }

  /**
   * 计算衰减率
   */
  calculateDecayRate(event: EmotionEvent): number {
    // 负面情绪衰减慢一些（需要更长时间记住）
    if (event.sentiment.sentiment === 'negative') {
      return this.config.defaultDecayRate * 0.7;
    }

    // 重要情绪衰减慢
    if (event.sentiment.confidence > 0.8) {
      return this.config.defaultDecayRate * 0.8;
    }

    return this.config.defaultDecayRate;
  }
}
