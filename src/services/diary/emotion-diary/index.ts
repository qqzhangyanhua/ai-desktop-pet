/**
 * Emotion Diary Service Main Module
 * 情感日记服务主模块
 *
 * P1-C-6: Refactored from monolithic emotion-diary.ts (718 lines)
 * Linus原则: Facade模式 - 主类作为协调器，组合优于继承
 *
 * 架构：
 * - DiaryStorage: 日记存储和检索
 * - DiaryAnalyzer: 统计分析和趋势报告
 * - EmotionDiaryService: 协调器（Facade模式）
 */

import Database from '@tauri-apps/plugin-sql';
import type {
  DiaryEntry,
  DiaryStatistics,
  EmotionTrendReport,
  DiaryQueryOptions,
  DiaryCreateOptions,
  DiaryUpdateOptions,
  DiaryCallbacks,
} from '@/types/emotion-diary';
import { DiaryStorage } from './diary-storage';
import { DiaryAnalyzer } from './diary-analyzer';

/**
 * EmotionDiaryService 主类
 *
 * 采用Facade模式，协调DiaryStorage和DiaryAnalyzer
 */
export class EmotionDiaryService {
  private storage: DiaryStorage | null = null;
  private analyzer: DiaryAnalyzer | null = null;
  private callbacks: DiaryCallbacks = {};

  /**
   * 初始化日记服务
   */
  async initialize(db: Database): Promise<void> {
    this.storage = new DiaryStorage(db, this.callbacks);
    this.analyzer = new DiaryAnalyzer(db, this.callbacks);

    // 创建日记表
    await this.storage.createTables();
  }

  /**
   * 创建日记条目
   */
  async createEntry(options: DiaryCreateOptions): Promise<DiaryEntry> {
    if (!this.storage || !this.analyzer) {
      throw new Error('Diary service not initialized');
    }

    const entry = await this.storage.createEntry(options);

    // 失效统计缓存
    this.analyzer.invalidateStatsCache();

    return entry;
  }

  /**
   * 更新日记条目
   */
  async updateEntry(id: string, options: DiaryUpdateOptions): Promise<DiaryEntry> {
    if (!this.storage || !this.analyzer) {
      throw new Error('Diary service not initialized');
    }

    const entry = await this.storage.updateEntry(id, options);

    // 失效统计缓存
    this.analyzer.invalidateStatsCache();

    return entry;
  }

  /**
   * 删除日记条目
   */
  async deleteEntry(id: string): Promise<void> {
    if (!this.storage || !this.analyzer) {
      throw new Error('Diary service not initialized');
    }

    await this.storage.deleteEntry(id);

    // 失效统计缓存
    this.analyzer.invalidateStatsCache();
  }

  /**
   * 根据ID获取日记条目
   */
  async getEntryById(id: string): Promise<DiaryEntry | null> {
    if (!this.storage) {
      throw new Error('Diary service not initialized');
    }

    return this.storage.getEntryById(id);
  }

  /**
   * 查询日记条目
   */
  async queryEntries(options: DiaryQueryOptions = {}): Promise<DiaryEntry[]> {
    if (!this.storage) {
      throw new Error('Diary service not initialized');
    }

    return this.storage.queryEntries(options);
  }

  /**
   * 获取日记统计
   */
  async getStatistics(): Promise<DiaryStatistics> {
    if (!this.analyzer) {
      throw new Error('Diary service not initialized');
    }

    return this.analyzer.getStatistics();
  }

  /**
   * 生成情绪趋势报告
   */
  async generateTrendReport(
    type: EmotionTrendReport['type'],
    startDate?: Date,
    endDate?: Date
  ): Promise<EmotionTrendReport> {
    if (!this.storage || !this.analyzer) {
      throw new Error('Diary service not initialized');
    }

    // 确定日期范围
    const now = new Date();
    if (!startDate) {
      if (type === 'weekly') {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
      } else if (type === 'monthly') {
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
      } else {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30); // custom默认30天
      }
    }

    if (!endDate) {
      endDate = now;
    }

    // 获取范围内的日记
    const entries = await this.storage.queryEntries({
      startDate,
      endDate,
      sortBy: 'date',
      sortOrder: 'asc',
    });

    return this.analyzer.generateTrendReport(entries, type, startDate, endDate);
  }

  /**
   * 设置回调
   */
  setCallbacks(callbacks: DiaryCallbacks): void {
    this.callbacks = callbacks;

    if (this.storage) {
      this.storage.setCallbacks(callbacks);
    }

    if (this.analyzer) {
      this.analyzer.setCallbacks(callbacks);
    }
  }
}

/**
 * 全局单例
 */
let diaryInstance: EmotionDiaryService | null = null;

/**
 * 获取全局EmotionDiaryService实例
 */
export function getEmotionDiaryService(): EmotionDiaryService {
  if (!diaryInstance) {
    diaryInstance = new EmotionDiaryService();
  }
  return diaryInstance;
}

/**
 * 销毁全局实例（用于测试）
 */
export function destroyEmotionDiaryService(): void {
  diaryInstance = null;
}

// Re-export types for external use
export type {
  DiaryEntry,
  DiaryStatistics,
  EmotionTrendReport,
  DiaryQueryOptions,
  DiaryCreateOptions,
  DiaryUpdateOptions,
  DiaryCallbacks,
} from '@/types/emotion-diary';
