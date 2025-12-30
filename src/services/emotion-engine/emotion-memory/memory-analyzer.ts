/**
 * Memory Analyzer
 * 记忆模式分析器
 *
 * P1-B-4: Extracted from emotion-memory.ts (636 lines)
 * Linus原则: 单一职责 - 只负责模式识别和洞察生成
 */

import type { EmotionMemory } from '../types';
import type { EmotionPattern } from './types';

/**
 * 记忆分析器类
 */
export class MemoryAnalyzer {
  /**
   * 分析情感模式
   */
  analyzePatterns(memories: EmotionMemory[], timeRangeDays = 30): EmotionPattern[] {
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
      const intenseMemories = emotions.filter((m) => m.intensity > 0.7);
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
  getInsights(memories: EmotionMemory[]): {
    dominantEmotion: string;
    moodTrend: 'improving' | 'declining' | 'stable';
    averageIntensity: number;
    topKeywords: string[];
    recommendations: string[];
  } {
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
    memories.forEach((m) => {
      emotionCounts.set(m.emotion, (emotionCounts.get(m.emotion) || 0) + 1);
    });
    const dominantEmotion =
      Array.from(emotionCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'neutral';

    // 情绪趋势
    const half = Math.floor(memories.length / 2);
    const firstHalfAvg = this.calculateAverageIntensity(memories.slice(0, half));
    const secondHalfAvg = this.calculateAverageIntensity(memories.slice(half));
    const moodTrend =
      secondHalfAvg > firstHalfAvg + 0.1
        ? 'improving'
        : secondHalfAvg < firstHalfAvg - 0.1
          ? 'declining'
          : 'stable';

    // 平均强度
    const averageIntensity = this.calculateAverageIntensity(memories);

    // 热门关键词
    const keywordCounts = new Map<string, number>();
    memories.forEach((m) => {
      m.content.keywords.forEach((keyword) => {
        keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
      });
    });
    const topKeywords = Array.from(keywordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k]) => k);

    // 推荐
    const patterns = this.analyzePatterns(memories);
    const recommendations = this.generateOverallRecommendations({
      dominantEmotion,
      moodTrend,
      averageIntensity,
      patterns,
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
   * 获取统计信息
   */
  getStatistics(memories: EmotionMemory[]): {
    totalMemories: number;
    emotionsByType: Record<string, number>;
    averageImportance: number;
    oldestMemory: number;
    newestMemory: number;
  } {
    const emotionsByType: Record<string, number> = {};
    memories.forEach((m) => {
      emotionsByType[m.emotion] = (emotionsByType[m.emotion] || 0) + 1;
    });

    const totalImportance = memories.reduce((sum, m) => sum + m.importance, 0);

    return {
      totalMemories: memories.length,
      emotionsByType,
      averageImportance: memories.length > 0 ? totalImportance / memories.length : 0,
      oldestMemory: memories.length > 0 ? Math.min(...memories.map((m) => m.createdAt)) : 0,
      newestMemory: memories.length > 0 ? Math.max(...memories.map((m) => m.createdAt)) : 0,
    };
  }

  /**
   * 计算平均强度
   */
  private calculateAverageIntensity(memories: EmotionMemory[]): number {
    if (memories.length === 0) return 0;
    return memories.reduce((sum, m) => sum + m.intensity, 0) / memories.length;
  }

  /**
   * 检测周期性模式
   */
  private detectPeriodicPattern(
    memories: EmotionMemory[]
  ): {
    timeOfDay: string;
    confidence: number;
  } | null {
    // 简化实现：按小时分组
    const hourCounts = new Map<number, number>();
    memories.forEach((m) => {
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

  /**
   * 生成模式建议
   */
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

  /**
   * 生成整体建议
   */
  private generateOverallRecommendations(data: {
    dominantEmotion: string;
    moodTrend: 'improving' | 'declining' | 'stable';
    averageIntensity: number;
    patterns: EmotionPattern[];
  }): string[] {
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
