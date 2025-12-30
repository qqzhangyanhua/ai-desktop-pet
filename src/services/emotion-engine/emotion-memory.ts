/**
 * Emotion Memory System
 * 情感记忆系统
 *
 * 存储、管理和检索情感事件，支持重要性评分和衰减机制
 */

import type { EmotionEvent, EmotionMemory } from './types';

/**
 * 情感记忆配置
 */
interface EmotionMemoryConfig {
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
 * 默认配置
 */
const DEFAULT_CONFIG: EmotionMemoryConfig = {
  maxMemories: 1000,
  defaultDecayRate: 0.05, // 每天5%衰减
  memoryExpiryMs: 1000 * 60 * 60 * 24 * 365, // 1年
  importanceThreshold: 0.6,
  mergeThreshold: 0.8,
};

/**
 * Memory 查询选项
 */
interface MemoryQueryOptions {
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
interface EmotionPattern {
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
 * EmotionMemorySystem 类
 */
export class EmotionMemorySystem {
  private memories: Map<string, EmotionMemory> = new Map();
  private config: EmotionMemoryConfig;

  constructor(config?: Partial<EmotionMemoryConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
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
        description: this.generateDescription(event),
        keywords: event.sentiment.keywords,
        context: event.context,
      },
      importance: this.calculateImportance(event),
      decayRate: this.calculateDecayRate(event),
    };

    // 检查是否可以合并相似记忆
    const similarMemory = this.findSimilarMemory(memory);
    if (similarMemory) {
      return this.mergeMemory(similarMemory.id, memory);
    }

    // 存储新记忆
    this.memories.set(memory.id, memory);

    // 检查记忆数量限制
    if (this.memories.size > this.config.maxMemories) {
      this.cleanupOldMemories();
    }

    return memory.id;
  }

  /**
   * 查找记忆
   */
  findMemory(id: string): EmotionMemory | null {
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
  queryMemories(options: MemoryQueryOptions = {}): EmotionMemory[] {
    let results = Array.from(this.memories.values());

    // 过滤
    if (options.emotion) {
      results = results.filter(m => m.emotion === options.emotion);
    }

    if (options.timeRange) {
      results = results.filter(m =>
        m.createdAt >= options.timeRange!.start &&
        m.createdAt <= options.timeRange!.end
      );
    }

    if (options.minImportance !== undefined) {
      results = results.filter(m => m.importance >= (options.minImportance ?? 0));
    }

    if (options.keywords && options.keywords.length > 0) {
      results = results.filter(m =>
        options.keywords!.some(keyword =>
          m.content.keywords.some(k => k.includes(keyword))
        )
      );
    }

    // 过滤过期记忆
    const now = Date.now();
    results = results.filter(m => (now - m.createdAt) < this.config.memoryExpiryMs);

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
    const patterns: EmotionPattern[] = [];

    // 按情绪分组
    const emotionGroups = new Map<string, EmotionMemory[]>();
    for (const memory of memories) {
      if (!emotionGroups.has(memory.emotion)) {
        emotionGroups.set(memory.emotion, []);
      }
      emotionGroups.get(memory.emotion)!.push(memory);
    }

    // 分析每种情绪的模式
    emotionGroups.forEach((emotions, emotion) => {
      const frequency = emotions.length / timeRangeDays;

      // 频繁情绪
      if (frequency > 0.5) {
        patterns.push({
          type: 'frequent',
          description: `经常感到${emotion}`,
          emotion,
          frequency,
          confidence: Math.min(frequency, 1),
          suggestions: this.generatePatternSuggestions(emotion, 'frequent'),
        });
      }

      // 强烈情绪
      const intenseMemories = emotions.filter(m => m.intensity > 0.7);
      if (intenseMemories.length > 0) {
        patterns.push({
          type: 'intense',
          description: `偶尔有强烈的${emotion}情绪`,
          emotion,
          frequency: intenseMemories.length / timeRangeDays,
          confidence: 0.8,
          suggestions: this.generatePatternSuggestions(emotion, 'intense'),
        });
      }

      // 周期性情绪
      const periodicPattern = this.detectPeriodicPattern(emotions);
      if (periodicPattern) {
        patterns.push({
          type: 'periodic',
          description: `在${periodicPattern.timeOfDay}经常感到${emotion}`,
          emotion,
          frequency,
          confidence: periodicPattern.confidence,
          suggestions: this.generatePatternSuggestions(emotion, 'periodic'),
        });
      }
    });

    return patterns;
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

    if (memories.length === 0) {
      return {
        dominantEmotion: 'neutral',
        moodTrend: 'stable',
        averageIntensity: 0,
        topKeywords: [],
        recommendations: ['开始记录你的情感，让AI更好地理解你'],
      };
    }

    // 主导情绪
    const emotionCounts = new Map<string, number>();
    memories.forEach(m => {
      emotionCounts.set(m.emotion, (emotionCounts.get(m.emotion) || 0) + 1);
    });
    const dominantEmotion = Array.from(emotionCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'neutral';

    // 情绪趋势
    const half = Math.floor(memories.length / 2);
    const firstHalfAvg = this.calculateAverageIntensity(memories.slice(0, half));
    const secondHalfAvg = this.calculateAverageIntensity(memories.slice(half));
    const moodTrend = secondHalfAvg > firstHalfAvg + 0.1
      ? 'improving'
      : secondHalfAvg < firstHalfAvg - 0.1
      ? 'declining'
      : 'stable';

    // 平均强度
    const averageIntensity = this.calculateAverageIntensity(memories);

    // 热门关键词
    const keywordCounts = new Map<string, number>();
    memories.forEach(m => {
      m.content.keywords.forEach(keyword => {
        keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
      });
    });
    const topKeywords = Array.from(keywordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k]) => k);

    // 推荐
    const recommendations = this.generateOverallRecommendations({
      dominantEmotion,
      moodTrend,
      averageIntensity,
      patterns: this.analyzePatterns(),
    });

    return {
      dominantEmotion,
      moodTrend,
      averageIntensity,
      topKeywords,
      recommendations,
    };
  }

  /**
   * 应用衰减
   */
  applyDecay(): void {
    const now = Date.now();
    const daysPassed = (now - this.lastDecayTime) / (1000 * 60 * 60 * 24);

    if (daysPassed < 1) {
      return; // 每天衰减一次
    }

    this.memories.forEach(memory => {
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
    const memories = Array.from(this.memories.values());

    const emotionsByType: Record<string, number> = {};
    memories.forEach(m => {
      emotionsByType[m.emotion] = (emotionsByType[m.emotion] || 0) + 1;
    });

    const totalImportance = memories.reduce((sum, m) => sum + m.importance, 0);

    return {
      totalMemories: memories.length,
      emotionsByType,
      averageImportance: memories.length > 0 ? totalImportance / memories.length : 0,
      oldestMemory: memories.length > 0 ? Math.min(...memories.map(m => m.createdAt)) : 0,
      newestMemory: memories.length > 0 ? Math.max(...memories.map(m => m.createdAt)) : 0,
    };
  }

  // 私有方法

  private lastDecayTime = Date.now();

  private generateDescription(event: EmotionEvent): string {
    const emotion = event.emotion;
    const keywords = event.sentiment.keywords.join(', ');
    const source = event.source;

    return `${emotion} (${keywords}) from ${source}`;
  }

  private calculateImportance(event: EmotionEvent): number {
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

  private calculateDecayRate(event: EmotionEvent): number {
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

  private findSimilarMemory(memory: EmotionMemory): EmotionMemory | null {
    for (const existing of this.memories.values()) {
      const similarity = this.calculateSimilarity(memory, existing);
      if (similarity > this.config.mergeThreshold) {
        return existing;
      }
    }
    return null;
  }

  private calculateSimilarity(m1: EmotionMemory, m2: EmotionMemory): number {
    let score = 0;

    // 情绪相同
    if (m1.emotion === m2.emotion) {
      score += 0.5;
    }

    // 关键词重叠
    const commonKeywords = m1.content.keywords.filter(k =>
      m2.content.keywords.includes(k)
    );
    score += (commonKeywords.length / Math.max(m1.content.keywords.length, m2.content.keywords.length)) * 0.5;

    return score;
  }

  private mergeMemory(existingId: string, newMemory: EmotionMemory): string {
    const existing = this.memories.get(existingId)!;

    // 合并关键词
    const mergedKeywords = Array.from(new Set([
      ...existing.content.keywords,
      ...newMemory.content.keywords,
    ]));

    // 更新重要性（取最大值）
    existing.importance = Math.max(existing.importance, newMemory.importance);

    // 更新内容
    existing.content.keywords = mergedKeywords;
    existing.lastAccessed = Date.now();
    existing.accessCount++;

    return existingId;
  }

  private cleanupOldMemories(): void {
    const memories = Array.from(this.memories.entries());
    memories.sort((a, b) => {
      // 按重要性和时间排序
      const scoreA = a[1].importance * (1 - (Date.now() - a[1].lastAccessed) / (1000 * 60 * 60 * 24));
      const scoreB = b[1].importance * (1 - (Date.now() - b[1].lastAccessed) / (1000 * 60 * 60 * 24));
      return scoreA - scoreB;
    });

    // 删除最不重要的记忆
    const toDelete = memories.slice(0, memories.length - this.config.maxMemories);
    toDelete.forEach(([id]) => {
      this.memories.delete(id);
    });
  }

  private calculateAverageIntensity(memories: EmotionMemory[]): number {
    if (memories.length === 0) return 0;
    return memories.reduce((sum, m) => sum + m.intensity, 0) / memories.length;
  }

  private detectPeriodicPattern(memories: EmotionMemory[]): {
    timeOfDay: string;
    confidence: number;
  } | null {
    // 简化实现：按小时分组
    const hourCounts = new Map<number, number>();
    memories.forEach(m => {
      const hour = new Date(m.createdAt).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    // 找到出现频率最高的时间段
    let maxCount = 0;
    let maxHour = 0;
    hourCounts.forEach((count, hour) => {
      if (count > maxCount) {
        maxCount = count;
        maxHour = hour;
      }
    });

    if (maxCount < memories.length * 0.3) {
      return null; // 频率不够高
    }

    let timeOfDay = '白天';
    if (maxHour >= 0 && maxHour < 6) timeOfDay = '凌晨';
    else if (maxHour >= 6 && maxHour < 12) timeOfDay = '上午';
    else if (maxHour >= 12 && maxHour < 18) timeOfDay = '下午';
    else timeOfDay = '晚上';

    return {
      timeOfDay,
      confidence: maxCount / memories.length,
    };
  }

  private generatePatternSuggestions(
    emotion: string,
    type: 'frequent' | 'intense' | 'periodic'
  ): string[] {
    switch (type) {
      case 'frequent':
        return [`经常感到${emotion}，建议关注情绪变化`];
      case 'intense':
        return [`强烈的${emotion}情绪，建议寻找情绪出口`];
      case 'periodic':
        return [`在特定时间感到${emotion}，可能与作息相关`];
      default:
        return [];
    }
  }

  private generateOverallRecommendations(
    data: {
      dominantEmotion: string;
      moodTrend: 'improving' | 'declining' | 'stable';
      averageIntensity: number;
      patterns: EmotionPattern[];
    }
  ): string[] {
    const recommendations: string[] = [];

    if (data.moodTrend === 'declining') {
      recommendations.push('最近情绪呈下降趋势，建议寻求支持');
      recommendations.push('可以尝试写日记或与朋友交流');
    } else if (data.moodTrend === 'improving') {
      recommendations.push('情绪在改善，保持良好的习惯');
    }

    if (data.averageIntensity > 0.8) {
      recommendations.push('情绪强度较高，注意控制情绪波动');
    }

    if (data.patterns.length > 0) {
      recommendations.push('发现了一些情绪模式，可以进一步分析');
    }

    return recommendations;
  }
}

/**
 * 创建全局实例
 */
let memoryInstance: EmotionMemorySystem | null = null;

export function getEmotionMemory(): EmotionMemorySystem {
  if (!memoryInstance) {
    memoryInstance = new EmotionMemorySystem();
  }
  return memoryInstance;
}
