/**
 * Diary Analyzer
 * 日记统计和趋势分析
 *
 * P1-C-5: Extracted from emotion-diary.ts (718 lines)
 * Linus原则: 单一职责 - 只负责统计数据计算和趋势分析
 */

import Database from '@tauri-apps/plugin-sql';
import type {
  DiaryEntry,
  DiaryStatistics,
  EmotionTrendReport,
  DiaryCallbacks,
} from '@/types/emotion-diary';

/**
 * 日记分析器类
 */
export class DiaryAnalyzer {
  private statsCache: DiaryStatistics | null = null;
  private cacheExpiry: number = 5 * 60 * 1000; // 5分钟缓存
  private lastCacheUpdate: number = 0;

  constructor(private db: Database, private callbacks: DiaryCallbacks = {}) {}

  /**
   * 获取日记统计
   */
  async getStatistics(): Promise<DiaryStatistics> {
    // 检查缓存
    const now = Date.now();
    if (this.statsCache && now - this.lastCacheUpdate < this.cacheExpiry) {
      return this.statsCache;
    }

    const nowDate = new Date();
    const monthStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
    const weekStart = new Date(nowDate);
    weekStart.setDate(nowDate.getDate() - nowDate.getDay());

    // 总条目数
    const totalResult = await this.db.select<Array<{ count: number }>>(
      'SELECT COUNT(*) as count FROM diary_entries'
    );
    const totalEntries = totalResult[0]?.count ?? 0;

    // 本月条目数
    const monthResult = await this.db.select<Array<{ count: number }>>(
      'SELECT COUNT(*) as count FROM diary_entries WHERE created_at >= $1',
      [monthStart.getTime()]
    );
    const entriesThisMonth = monthResult[0]?.count ?? 0;

    // 本周条目数
    const weekResult = await this.db.select<Array<{ count: number }>>(
      'SELECT COUNT(*) as count FROM diary_entries WHERE created_at >= $1',
      [weekStart.getTime()]
    );
    const entriesThisWeek = weekResult[0]?.count ?? 0;

    // 连续记录天数
    const streakDays = await this.calculateStreakDays();

    // 最常见情绪
    const topEmotionsResult = await this.db.select<Array<{ emotion: string; count: number }>>(
      `SELECT emotion_primary as emotion, COUNT(*) as count
       FROM diary_entries
       GROUP BY emotion_primary
       ORDER BY count DESC
       LIMIT 5`
    );

    const topEmotions = topEmotionsResult.map((item) => ({
      emotion: item.emotion,
      count: item.count,
      percentage: totalEntries > 0 ? (item.count / totalEntries) * 100 : 0,
    }));

    // 最常见活动
    const activitiesResult = await this.db.select<Array<{ activities: string }>>(
      'SELECT activities FROM diary_entries WHERE activities IS NOT NULL'
    );

    const activityCounts = new Map<string, number>();
    activitiesResult.forEach((row) => {
      try {
        const activities = JSON.parse(row.activities) as string[];
        activities.forEach((activity) => {
          activityCounts.set(activity, (activityCounts.get(activity) ?? 0) + 1);
        });
      } catch {
        // 忽略解析错误
      }
    });

    const topActivities = Array.from(activityCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([activity, count]) => ({ activity, count }));

    // 情绪时间线（最近30天）
    const timelineStart = new Date(nowDate);
    timelineStart.setDate(nowDate.getDate() - 30);

    const timelineResult = await this.db.select<
      Array<{ created_at: number; emotion_primary: string; emotion_intensity: number }>
    >(
      `SELECT created_at, emotion_primary, emotion_intensity
       FROM diary_entries
       WHERE created_at >= $1
       ORDER BY created_at ASC`,
      [timelineStart.getTime()]
    );

    const emotionTimeline = timelineResult.map((row) => ({
      date: new Date(row.created_at).toISOString().split('T')[0] ?? '',
      emotion: row.emotion_primary,
      intensity: row.emotion_intensity,
    }));

    const stats: DiaryStatistics = {
      totalEntries,
      entriesThisMonth,
      entriesThisWeek,
      streakDays,
      topEmotions,
      topActivities,
      emotionTimeline,
    };

    // 更新缓存
    this.statsCache = stats;
    this.lastCacheUpdate = now;

    // 触发回调
    this.callbacks.onStatisticsUpdated?.(stats);

    return stats;
  }

  /**
   * 生成情绪趋势报告
   */
  async generateTrendReport(
    entries: DiaryEntry[],
    type: EmotionTrendReport['type'],
    startDate: Date,
    endDate: Date
  ): Promise<EmotionTrendReport> {
    // 计算情绪趋势
    const scores = entries.map((entry) => ({
      date: new Date(entry.createdAt).toISOString().split('T')[0] ?? '',
      score: entry.emotion.intensity * (entry.emotion.primary === 'happy' ? 1 : -1),
    }));

    const overall = this.calculateOverallTrend(scores);

    // 情绪统计
    const emotionCounts = new Map<string, number>();
    let totalIntensity = 0;

    entries.forEach((entry) => {
      emotionCounts.set(
        entry.emotion.primary,
        (emotionCounts.get(entry.emotion.primary) ?? 0) + 1
      );
      totalIntensity += entry.emotion.intensity;
    });

    const dominantEmotion =
      Array.from(emotionCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'neutral';

    const averageIntensity = entries.length > 0 ? totalIntensity / entries.length : 0;

    const emotionDiversity = this.calculateDiversity(emotionCounts);

    // 洞察和建议
    const insights = this.generateInsights(entries, dominantEmotion);

    const report: EmotionTrendReport = {
      id: `report_${Date.now()}`,
      type,
      startDate: startDate.toISOString().split('T')[0] ?? '',
      endDate: endDate.toISOString().split('T')[0] ?? '',
      generatedAt: Date.now(),
      trends: {
        overall,
        dailyScores: scores,
        emotionChanges: [], // 简化实现
      },
      statistics: {
        dominantEmotion,
        averageIntensity,
        emotionDiversity,
      },
      insights,
    };

    return report;
  }

  /**
   * 失效统计缓存
   */
  invalidateStatsCache(): void {
    this.statsCache = null;
    this.lastCacheUpdate = 0;
  }

  /**
   * 计算连续记录天数
   */
  private async calculateStreakDays(): Promise<number> {
    const result = await this.db.select<Array<{ date: string }>>(
      `SELECT DISTINCT DATE(created_at / 1000, 'unixepoch', 'localtime') as date
       FROM diary_entries
       ORDER BY date DESC`
    );

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < result.length; i++) {
      const entryDate = new Date(result[i]?.date || new Date().toISOString());
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);

      if (entryDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * 计算整体趋势
   */
  private calculateOverallTrend(
    scores: Array<{ date: string; score: number }>
  ): 'improving' | 'stable' | 'declining' {
    if (scores.length < 2) return 'stable';

    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));

    const firstAvg = firstHalf.reduce((sum, s) => sum + s.score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, s) => sum + s.score, 0) / secondHalf.length;

    const diff = secondAvg - firstAvg;

    if (diff > 0.1) return 'improving';
    if (diff < -0.1) return 'declining';
    return 'stable';
  }

  /**
   * 计算情绪多样性（使用熵）
   */
  private calculateDiversity(emotionCounts: Map<string, number>): number {
    const total = Array.from(emotionCounts.values()).reduce((sum, count) => sum + count, 0);
    if (total === 0) return 0;

    let entropy = 0;
    emotionCounts.forEach((count) => {
      const p = count / total;
      entropy -= p * Math.log2(p);
    });

    // 归一化到0-1
    const maxEntropy = Math.log2(emotionCounts.size);
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
  }

  /**
   * 生成洞察和建议
   */
  private generateInsights(
    entries: DiaryEntry[],
    dominantEmotion: string
  ): { patterns: string[]; recommendations: string[] } {
    const patterns: string[] = [];
    const recommendations: string[] = [];

    // 分析模式
    if (dominantEmotion === 'happy') {
      patterns.push('你最近心情整体不错，保持积极的状态！');
    } else if (dominantEmotion === 'sad') {
      patterns.push('你最近似乎有些低落，试着找一些让自己开心的事情做吧。');
    } else if (dominantEmotion === 'stressed') {
      patterns.push('你最近压力较大，注意适当放松。');
    }

    // 记录频率
    if (entries.length > 20) {
      patterns.push('你保持了良好的记录习惯。');
      recommendations.push('继续保持每天记录的习惯。');
    } else {
      recommendations.push('尝试更频繁地记录你的情绪。');
    }

    // 活动多样性
    const uniqueActivities = new Set(entries.flatMap((e) => e.activities));
    if (uniqueActivities.size < 3) {
      recommendations.push('可以尝试更多不同类型的活动。');
    }

    return { patterns, recommendations };
  }

  /**
   * 更新回调
   */
  setCallbacks(callbacks: DiaryCallbacks): void {
    this.callbacks = callbacks;
  }
}
