/**
 * Diary Storage
 * 日记存储和检索
 *
 * P1-C-4: Extracted from emotion-diary.ts (718 lines)
 * Linus原则: 单一职责 - 只负责日记的CRUD操作和缓存管理
 */

import Database from '@tauri-apps/plugin-sql';
import type {
  DiaryEntry,
  DiaryEntryRow,
  DiaryCreateOptions,
  DiaryUpdateOptions,
  DiaryQueryOptions,
  DiaryCallbacks,
} from '@/types/emotion-diary';
import { rowToEntry } from './diary-formatter';

/**
 * 日记存储类
 */
export class DiaryStorage {
  private cache: Map<string, DiaryEntry> = new Map();

  constructor(private db: Database, private callbacks: DiaryCallbacks = {}) {}

  /**
   * 创建数据库表
   */
  async createTables(): Promise<void> {
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

    // 触发回调
    this.callbacks.onEntryCreated?.(entry);

    return entry;
  }

  /**
   * 更新日记条目
   */
  async updateEntry(id: string, options: DiaryUpdateOptions): Promise<DiaryEntry> {
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

    // 触发回调
    this.callbacks.onEntryUpdated?.(updated);

    return updated;
  }

  /**
   * 删除日记条目
   */
  async deleteEntry(id: string): Promise<void> {
    await this.db.execute('DELETE FROM diary_entries WHERE id = $1', [id]);

    // 删除缓存
    this.cache.delete(id);

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

    const entry = rowToEntry(row);
    this.cache.set(id, entry);

    return entry;
  }

  /**
   * 查询日记条目
   */
  async queryEntries(options: DiaryQueryOptions = {}): Promise<DiaryEntry[]> {
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
      options.tags.forEach((tag) => params.push(`%"${tag}"%`));
    }

    // 活动过滤
    if (options.activities && options.activities.length > 0) {
      const activityConditions = options.activities.map(() => 'activities LIKE ?').join(' OR ');
      query += ` AND (${activityConditions})`;
      options.activities.forEach((activity) => params.push(`%"${activity}"%`));
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
    return rows.map((row) => rowToEntry(row));
  }

  /**
   * 获取所有条目（用于统计）
   */
  async getAllEntries(): Promise<DiaryEntry[]> {
    const rows = await this.db.select<DiaryEntryRow[]>('SELECT * FROM diary_entries');
    return rows.map((row) => rowToEntry(row));
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 更新回调
   */
  setCallbacks(callbacks: DiaryCallbacks): void {
    this.callbacks = callbacks;
  }
}
