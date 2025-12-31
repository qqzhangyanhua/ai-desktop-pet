/**
 * 记忆检索器
 * Memory Retriever
 *
 * 高效检索相关记忆：
 * - 关键词匹配
 * - 语义相似度
 * - 时间衰减权重
 * - 记忆排序算法
 */

import type { LongTermMemory, MemoryCategory } from '@/types/memory';

/**
 * 检索结果
 */
export interface RetrievalResult {
  /** 记忆 */
  memory: LongTermMemory;
  /** 相关度分数 (0-1) */
  score: number;
  /** 匹配原因 */
  matchReason: string;
}

/**
 * 检索配置
 */
export interface RetrievalConfig {
  /** 最大返回数量 */
  limit: number;
  /** 最小分数阈值 */
  minScore: number;
  /** 时间衰减系数 (每天衰减多少) */
  timeDecayFactor: number;
  /** 访问次数加成系数 */
  accessBoostFactor: number;
  /** 重要度加成系数 */
  importanceBoostFactor: number;
  /** 是否按分类过滤 */
  categories?: MemoryCategory[];
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: RetrievalConfig = {
  limit: 10,
  minScore: 0.1,
  timeDecayFactor: 0.01,
  accessBoostFactor: 0.1,
  importanceBoostFactor: 0.2,
};

/**
 * 同义词映射
 */
const SYNONYMS: Record<string, string[]> = {
  喜欢: ['爱', '喜爱', '钟爱', '偏爱'],
  不喜欢: ['讨厌', '厌恶', '不爱', '反感'],
  开心: ['高兴', '快乐', '愉快', '欢乐'],
  难过: ['伤心', '悲伤', '难受', '郁闷'],
  吃: ['食用', '品尝', '进食'],
  喝: ['饮用', '品饮'],
  工作: ['上班', '办公', '职场'],
  休息: ['放松', '歇息', '休闲'],
};

/**
 * 记忆检索器类
 */
class MemoryRetriever {
  /**
   * 检索相关记忆
   */
  retrieve(
    query: string,
    memories: LongTermMemory[],
    config?: Partial<RetrievalConfig>
  ): RetrievalResult[] {
    const cfg = { ...DEFAULT_CONFIG, ...config };

    // 分类过滤
    let candidates = memories;
    if (cfg.categories && cfg.categories.length > 0) {
      candidates = memories.filter((m) => cfg.categories!.includes(m.category));
    }

    // 计算每个记忆的分数
    const results: RetrievalResult[] = [];

    for (const memory of candidates) {
      const scoreResult = this.calculateScore(query, memory, cfg);

      if (scoreResult.score >= cfg.minScore) {
        results.push({
          memory,
          score: scoreResult.score,
          matchReason: scoreResult.reason,
        });
      }
    }

    // 按分数排序并限制数量
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, cfg.limit);
  }

  /**
   * 按关键词检索
   */
  retrieveByKeyword(
    keyword: string,
    memories: LongTermMemory[],
    limit: number = 5
  ): RetrievalResult[] {
    return this.retrieve(keyword, memories, { limit });
  }

  /**
   * 按分类检索
   */
  retrieveByCategory(
    category: MemoryCategory,
    memories: LongTermMemory[],
    limit: number = 10
  ): RetrievalResult[] {
    const filtered = memories.filter((m) => m.category === category);

    // 按重要度和访问次数排序
    return filtered
      .map((memory) => ({
        memory,
        score: this.calculateImportanceScore(memory),
        matchReason: `分类匹配: ${category}`,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * 检索最近访问的记忆
   */
  retrieveRecent(
    memories: LongTermMemory[],
    limit: number = 5
  ): RetrievalResult[] {
    return memories
      .map((memory) => ({
        memory,
        score: 1 - this.calculateTimeDecay(memory.lastAccessed),
        matchReason: '最近访问',
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * 检索最重要的记忆
   */
  retrieveImportant(
    memories: LongTermMemory[],
    limit: number = 5
  ): RetrievalResult[] {
    return memories
      .map((memory) => ({
        memory,
        score: memory.importance / 10,
        matchReason: '高重要度',
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * 计算记忆分数
   */
  private calculateScore(
    query: string,
    memory: LongTermMemory,
    config: RetrievalConfig
  ): { score: number; reason: string } {
    let score = 0;
    const reasons: string[] = [];

    // 1. 关键词匹配
    const keywordScore = this.calculateKeywordScore(query, memory.content);
    if (keywordScore > 0) {
      score += keywordScore * 0.4;
      reasons.push('关键词匹配');
    }

    // 2. 同义词匹配
    const synonymScore = this.calculateSynonymScore(query, memory.content);
    if (synonymScore > 0) {
      score += synonymScore * 0.2;
      reasons.push('同义词匹配');
    }

    // 3. 重要度加成
    const importanceBoost =
      (memory.importance / 10) * config.importanceBoostFactor;
    score += importanceBoost;

    // 4. 访问频率加成
    const accessBoost =
      Math.min(memory.accessCount * config.accessBoostFactor, 0.2);
    score += accessBoost;

    // 5. 时间衰减
    const timeDecay = this.calculateTimeDecay(
      memory.lastAccessed,
      config.timeDecayFactor
    );
    score *= 1 - timeDecay;

    // 限制在 0-1 之间
    score = Math.min(1, Math.max(0, score));

    return {
      score,
      reason: reasons.join(', ') || '综合匹配',
    };
  }

  /**
   * 计算关键词匹配分数
   */
  private calculateKeywordScore(query: string, content: string): number {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();

    // 完全包含
    if (contentLower.includes(queryLower)) {
      return 1;
    }

    // 分词匹配
    const queryWords = this.tokenize(query);
    const contentWords = this.tokenize(content);

    let matchCount = 0;
    for (const qWord of queryWords) {
      if (contentWords.some((cWord) => cWord.includes(qWord) || qWord.includes(cWord))) {
        matchCount++;
      }
    }

    return queryWords.length > 0 ? matchCount / queryWords.length : 0;
  }

  /**
   * 计算同义词匹配分数
   */
  private calculateSynonymScore(query: string, content: string): number {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();

    for (const [word, synonyms] of Object.entries(SYNONYMS)) {
      // 检查查询中是否包含基础词
      if (queryLower.includes(word)) {
        // 检查内容中是否包含同义词
        for (const synonym of synonyms) {
          if (contentLower.includes(synonym)) {
            return 0.8;
          }
        }
      }

      // 检查查询中是否包含同义词
      for (const synonym of synonyms) {
        if (queryLower.includes(synonym)) {
          if (contentLower.includes(word)) {
            return 0.8;
          }
        }
      }
    }

    return 0;
  }

  /**
   * 计算重要度分数
   */
  private calculateImportanceScore(memory: LongTermMemory): number {
    const importanceScore = memory.importance / 10;
    const accessScore = Math.min(memory.accessCount * 0.05, 0.3);
    const timeScore = 1 - this.calculateTimeDecay(memory.lastAccessed);

    return importanceScore * 0.5 + accessScore * 0.2 + timeScore * 0.3;
  }

  /**
   * 计算时间衰减
   */
  private calculateTimeDecay(
    timestamp: number,
    factor: number = 0.01
  ): number {
    const now = Date.now();
    const daysPassed = (now - timestamp) / (24 * 60 * 60 * 1000);

    // 指数衰减
    return 1 - Math.exp(-factor * daysPassed);
  }

  /**
   * 简单分词
   */
  private tokenize(text: string): string[] {
    // 简单的中文分词（按字符）
    // 实际项目中可以使用更复杂的分词库
    const words: string[] = [];

    // 提取中文词
    const chineseWords = text.match(/[\u4e00-\u9fa5]{2,}/g) || [];
    words.push(...chineseWords);

    // 提取英文词
    const englishWords = text.match(/[a-zA-Z]+/g) || [];
    words.push(...englishWords.map((w) => w.toLowerCase()));

    return words;
  }
}

/**
 * 导出单例
 */
export const memoryRetriever = new MemoryRetriever();
