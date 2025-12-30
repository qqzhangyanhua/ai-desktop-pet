/**
 * Emotional Diary Service
 * 情感日记服务
 *
 * Linus准则：
 * - 数据结构优先：日记条目清晰定义
 * - 消除特殊情况：统一的CRUD接口
 * - 简洁实现：直接使用SQLite存储
 */

import Database from '@tauri-apps/plugin-sql';
import type {
  DiaryEntry,
  DiaryStatistics,
  EmotionTrendReport,
  DiaryQueryOptions,
  DiaryCreateOptions,
  DiaryUpdateOptions,
  // DiaryShareOptions,
  DiaryCallbacks,
  DiaryEntryRow,
} from '@/types/emotion-diary';

/**
 * 情感日记服务类
 */
export class EmotionDiaryService {
  private db: Database | null = null;
  private callbacks: DiaryCallbacks = {};
  private cache: Map<string, DiaryEntry> = new Map();
  private statsCache: DiaryStatistics | null = null;
  private cacheExpiry: number = 5 * 60 * 1000; // 5分钟缓存
  private lastCacheUpdate: number = 0;

  /**
   * 初始化日记服务
   */
  async initialize(db: Database): Promise<void> {
    this.db = db;

    // 创建日记表
    await this.createTables();
  }

  /**
   * 创建数据库表
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // 创建日记表
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS diary_entries (
        id TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        emotion_primary TEXT NOT NULL,
        emotion_secondary TEXT,
        emotion_intensity REAL NOT NULL,
        emotion_confidence REAL NOT NULL,
        activities TEXT,
        weather TEXT,
        location TEXT,
        photos TEXT,
        voice_note TEXT,
        related_conversation_id TEXT,
        is_favorite INTEGER NOT NULL DEFAULT 0,
        tags TEXT,
        visibility TEXT NOT NULL DEFAULT 'private'
      )
    `);

    // 创建索引
    await this.db.execute(`
      CREATE INDEX IF NOT EXISTS idx_diary_created_at ON diary_entries(created_at)
    `);

    await this.db.execute(`
      CREATE INDEX IF NOT EXISTS idx_diary_emotion ON diary_entries(emotion_primary)
    `);

    await this.db.execute(`
      CREATE INDEX IF NOT EXISTS idx_diary_favorite ON diary_entries(is_favorite)
    `);
  }

  /**
   * 创建日记条目
   */
  async createEntry(options: DiaryCreateOptions): Promise<DiaryEntry> {
    if (!this.db) throw new Error('Database not initialized');

    const id = `diary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const entry: DiaryEntry = {
      id,
      createdAt: now,
      updatedAt: now,
      title: options.title,
      content: options.content,
      emotion: options.emotion,
      activities: options.activities ?? [],
      weather: options.weather,
      location: options.location,
      photos: options.photos,
      voiceNote: options.voiceNote,
      relatedConversationId: options.relatedConversationId,
      isFavorite: false,
      tags: options.tags ?? [],
      visibility: options.visibility ?? 'private',
    };

    // 插入数据库
    await this.db.execute(
      `
      INSERT INTO diary_entries (
        id, created_at, updated_at, title, content,
        emotion_primary, emotion_secondary, emotion_intensity, emotion_confidence,
        activities, weather, location, photos, voice_note, related_conversation_id,
        is_favorite, tags, visibility
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    `,
      [
        entry.id,
        entry.createdAt,
        entry.updatedAt,
        entry.title,
        entry.content,
        entry.emotion.primary,
        entry.emotion.secondary ?? null,
        entry.emotion.intensity,
        entry.emotion.confidence,
        JSON.stringify(entry.activities),
        entry.weather ?? null,
        entry.location ?? null,
        JSON.stringify(entry.photos ?? []),
        entry.voiceNote ?? null,
        entry.relatedConversationId ?? null,
        entry.isFavorite ? 1 : 0,
        JSON.stringify(entry.tags),
        entry.visibility,
      ]
    );

    // 更新缓存
    this.cache.set(id, entry);
    this.invalidateStatsCache();

    // 触发回调
    this.callbacks.onEntryCreated?.(entry);

    return entry;
  }

  /**
   * 更新日记条目
   */
  async updateEntry(id: string, options: DiaryUpdateOptions): Promise<DiaryEntry> {
    if (!this.db) throw new Error('Database not initialized');

    const existing = await this.getEntryById(id);
    if (!existing) {
      throw new Error(`Diary entry not found: ${id}`);
    }

    const updated: DiaryEntry = {
      ...existing,
      ...options,
      updatedAt: Date.now(),
    };

    // 更新数据库
    await this.db.execute(
      `
      UPDATE diary_entries SET
        updated_at = $1,
        title = $2,
        content = $3,
        emotion_primary = $4,
        emotion_secondary = $5,
        emotion_intensity = $6,
        emotion_confidence = $7,
        activities = $8,
        weather = $9,
        location = $10,
        photos = $11,
        voice_note = $12,
        is_favorite = $13,
        tags = $14,
        visibility = $15
      WHERE id = $16
    `,
      [
        updated.updatedAt,
        updated.title,
        updated.content,
        updated.emotion.primary,
        updated.emotion.secondary ?? null,
        updated.emotion.intensity,
        updated.emotion.confidence,
        JSON.stringify(updated.activities),
        updated.weather ?? null,
        updated.location ?? null,
        JSON.stringify(updated.photos ?? []),
        updated.voiceNote ?? null,
        updated.isFavorite ? 1 : 0,
        JSON.stringify(updated.tags),
        updated.visibility,
        id,
      ]
    );

    // 更新缓存
    this.cache.set(id, updated);
    this.invalidateStatsCache();

    // 触发回调
    this.callbacks.onEntryUpdated?.(updated);

    return updated;
  }

  /**
   * 删除日记条目
   */
  async deleteEntry(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execute('DELETE FROM diary_entries WHERE id = $1', [id]);

    // 删除缓存
    this.cache.delete(id);
    this.invalidateStatsCache();

    // 触发回调
    this.callbacks.onEntryDeleted?.(id);
  }

  /**
   * 根据ID获取日记条目
   */
  async getEntryById(id: string): Promise<DiaryEntry | null> {
    // 检查缓存
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.select<DiaryEntryRow[]>(
      'SELECT * FROM diary_entries WHERE id = $1',
      [id]
    );

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    if (!row) {
      return null;
    }

    const entry = this.rowToEntry(row);
    this.cache.set(id, entry);

    return entry;
  }

  /**
   * 查询日记条目
   */
  async queryEntries(options: DiaryQueryOptions = {}): Promise<DiaryEntry[]> {
    if (!this.db) throw new Error('Database not initialized');

    let query = 'SELECT * FROM diary_entries WHERE 1=1';
    const params: (string | number)[] = [];

    // 日期范围过滤
    if (options.startDate) {
      query += ' AND created_at >= $' + (params.length + 1);
      params.push(options.startDate.getTime());
    }

    if (options.endDate) {
      query += ' AND created_at <= $' + (params.length + 1);
      params.push(options.endDate.getTime());
    }

    // 情绪过滤
    if (options.emotion) {
      query += ' AND emotion_primary = $' + (params.length + 1);
      params.push(options.emotion);
    }

    // 标签过滤（使用JSON搜索）
    if (options.tags && options.tags.length > 0) {
      const tagConditions = options.tags.map(() => 'tags LIKE ?').join(' OR ');
      query += ` AND (${tagConditions})`;
      options.tags.forEach(tag => params.push(`%"${tag}"%`));
    }

    // 活动过滤
    if (options.activities && options.activities.length > 0) {
      const activityConditions = options.activities.map(() => 'activities LIKE ?').join(' OR ');
      query += ` AND (${activityConditions})`;
      options.activities.forEach(activity => params.push(`%"${activity}"%`));
    }

    // 只看收藏
    if (options.favoritesOnly) {
      query += ' AND is_favorite = 1';
    }

    // 搜索关键词
    if (options.keyword) {
      query += ' AND (title LIKE ? OR content LIKE ?)';
      const keyword = `%${options.keyword}%`;
      params.push(keyword, keyword);
    }

    // 排序
    const sortBy = options.sortBy ?? 'date';
    const sortOrder = options.sortOrder ?? 'desc';

    switch (sortBy) {
      case 'date':
        query += ` ORDER BY created_at ${sortOrder.toUpperCase()}`;
        break;
      case 'emotion':
        query += ` ORDER BY emotion_primary ${sortOrder.toUpperCase()}`;
        break;
      case 'intensity':
        query += ` ORDER BY emotion_intensity ${sortOrder.toUpperCase()}`;
        break;
    }

    // 分页
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;

    query += ` LIMIT ${limit} OFFSET ${offset}`;

    const rows = await this.db.select<DiaryEntryRow[]>(query, params);
    return rows.map(row => this.rowToEntry(row));
  }

  /**
   * 获取日记统计
   */
  async getStatistics(): Promise<DiaryStatistics> {
    // 检查缓存
    const now = Date.now();
    if (this.statsCache && (now - this.lastCacheUpdate) < this.cacheExpiry) {
      return this.statsCache;
    }

    if (!this.db) throw new Error('Database not initialized');

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

    // 连续记录天数（简化实现）
    const streakDays = await this.calculateStreakDays();

    // 最常见情绪
    const topEmotionsResult = await this.db.select<Array<{ emotion: string; count: number }>>(
      `SELECT emotion_primary as emotion, COUNT(*) as count
       FROM diary_entries
       GROUP BY emotion_primary
       ORDER BY count DESC
       LIMIT 5`
    );

    const topEmotions = topEmotionsResult.map(item => ({
      emotion: item.emotion,
      count: item.count,
      percentage: totalEntries > 0 ? (item.count / totalEntries) * 100 : 0,
    }));

    // 最常见活动
    const activitiesResult = await this.db.select<Array<{ activities: string }>>(
      'SELECT activities FROM diary_entries WHERE activities IS NOT NULL'
    );

    const activityCounts = new Map<string, number>();
    activitiesResult.forEach(row => {
      try {
        const activities = JSON.parse(row.activities) as string[];
        activities.forEach(activity => {
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

    const timelineResult = await this.db.select<Array<{ created_at: number; emotion_primary: string; emotion_intensity: number }>>(
      `SELECT created_at, emotion_primary, emotion_intensity
       FROM diary_entries
       WHERE created_at >= $1
       ORDER BY created_at ASC`,
      [timelineStart.getTime()]
    );

    const emotionTimeline = timelineResult.map(row => ({
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
    type: EmotionTrendReport['type'],
    startDate?: Date,
    endDate?: Date
  ): Promise<EmotionTrendReport> {
    if (!this.db) throw new Error('Database not initialized');

    // 确定日期范围
    const now = new Date();
    if (!startDate) {
      if (type === 'weekly') {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
      } else if (type === 'monthly') {
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
      }
    }

    if (!endDate) {
      endDate = now;
    }

    // 获取范围内的日记
    const entries = await this.queryEntries({
      startDate,
      endDate,
      sortBy: 'date',
      sortOrder: 'asc',
    });

    // 计算情绪趋势
    const scores = entries.map(entry => ({
      date: new Date(entry.createdAt).toISOString().split('T')[0] ?? '',
      score: entry.emotion.intensity * (entry.emotion.primary === 'happy' ? 1 : -1),
    }));

    const overall = this.calculateOverallTrend(scores);

    // 情绪统计
    const emotionCounts = new Map<string, number>();
    let totalIntensity = 0;

    entries.forEach(entry => {
      emotionCounts.set(
        entry.emotion.primary,
        (emotionCounts.get(entry.emotion.primary) ?? 0) + 1
      );
      totalIntensity += entry.emotion.intensity;
    });

    const dominantEmotion = Array.from(emotionCounts.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] ?? 'neutral';

    const averageIntensity = entries.length > 0 ? totalIntensity / entries.length : 0;

    const emotionDiversity = this.calculateDiversity(emotionCounts);

    // 洞察和建议
    const insights = this.generateInsights(entries, dominantEmotion);

    const report: EmotionTrendReport = {
      id: `report_${Date.now()}`,
      type,
      startDate: startDate?.toISOString().split('T')[0] ?? new Date().toISOString().split('T')[0] ?? '',
      endDate: endDate?.toISOString().split('T')[0] ?? new Date().toISOString().split('T')[0] ?? '',
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
   * 设置回调
   */
  setCallbacks(callbacks: DiaryCallbacks): void {
    this.callbacks = callbacks;
  }

  // ============ 私有方法 ============

  private rowToEntry(row: DiaryEntryRow): DiaryEntry {
    return {
      id: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      title: row.title,
      content: row.content,
      emotion: {
        primary: row.emotion_primary,
        secondary: row.emotion_secondary ?? undefined,
        intensity: row.emotion_intensity,
        confidence: row.emotion_confidence,
      },
      activities: JSON.parse(row.activities ?? '[]') as string[],
      weather: (row.weather as DiaryEntry['weather']) ?? undefined,
      location: row.location ?? undefined,
      photos: JSON.parse(row.photos ?? '[]') as string[],
      voiceNote: row.voice_note ?? undefined,
      relatedConversationId: row.related_conversation_id ?? undefined,
      isFavorite: row.is_favorite === 1,
      tags: JSON.parse(row.tags ?? '[]') as string[],
      visibility: row.visibility as DiaryEntry['visibility'],
    };
  }

  private async calculateStreakDays(): Promise<number> {
    if (!this.db) return 0;

    const result = await this.db.select<Array<{ date: string }>>(
      `SELECT DISTINCT DATE(created_at / 1000, 'unixepoch', 'localtime') as date
       FROM diary_entries
       ORDER BY date DESC`
    );

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < result.length; i++) {
      const entryDate = new Date((result[i]?.date || new Date().toISOString()));
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

  private calculateDiversity(emotionCounts: Map<string, number>): number {
    const total = Array.from(emotionCounts.values()).reduce((sum, count) => sum + count, 0);
    if (total === 0) return 0;

    let entropy = 0;
    emotionCounts.forEach(count => {
      const p = count / total;
      entropy -= p * Math.log2(p);
    });

    // 归一化到0-1
    const maxEntropy = Math.log2(emotionCounts.size);
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
  }

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

    // 分析活动
    const activityCounts = new Map<string, number>();
    entries.forEach(entry => {
      entry.activities.forEach(activity => {
        activityCounts.set(activity, (activityCounts.get(activity) ?? 0) + 1);
      });
    });

    const topActivity = Array.from(activityCounts.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0];

    if (topActivity) {
      patterns.push(`你经常在"${topActivity[0]}"时记录日记。`);
    }

    // 生成建议
    if (entries.length < 3) {
      recommendations.push('坚持写日记，记录生活中的点滴。');
    }

    if (dominantEmotion === 'stressed' || dominantEmotion === 'anxious') {
      recommendations.push('尝试冥想或深呼吸来缓解压力。');
      recommendations.push('保证充足的睡眠，这对情绪管理很重要。');
    }

    if (dominantEmotion === 'sad') {
      recommendations.push('和朋友聊聊天，分享你的感受。');
      recommendations.push('做一些让自己开心的事情，比如听音乐或运动。');
    }

    return { patterns, recommendations };
  }

  private invalidateStatsCache(): void {
    this.statsCache = null;
    this.lastCacheUpdate = 0;
  }
}

// 单例实例
let diaryServiceInstance: EmotionDiaryService | null = null;

export function getEmotionDiaryService(): EmotionDiaryService {
  if (!diaryServiceInstance) {
    diaryServiceInstance = new EmotionDiaryService();
  }
  return diaryServiceInstance;
}

export function destroyEmotionDiaryService(): void {
  if (diaryServiceInstance) {
    diaryServiceInstance = null;
  }
}
