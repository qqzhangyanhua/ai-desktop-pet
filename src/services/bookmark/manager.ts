/**
 * Bookmark Manager Service
 * 书签管理服务
 */

import Database from '@tauri-apps/plugin-sql';
import { parseChromeBookmarks, validateChromeBookmarkFile } from './parser';
import {
  initBookmarkTables,
  upsertBookmarks,
  searchBookmarks,
  getBookmarkStats,
  updateSyncTimestamp,
  clearAllBookmarks,
} from '@/services/database/bookmarks';
import type { FlatBookmark, BookmarkSearchParams, BookmarkStats } from '@/types/bookmark';

class BookmarkManager {
  private db: Database | null = null;
  private isInitialized = false;

  /** 初始化（必须在使用前调用） */
  async initialize(db: Database): Promise<void> {
    if (this.isInitialized && this.db) {
      console.log('[BookmarkManager] Already initialized, skipping');
      return;
    }

    this.db = db;
    await initBookmarkTables(db);
    this.isInitialized = true;
    console.log('[BookmarkManager] Initialized');
  }

  private ensureInitialized(): Database {
    if (!this.isInitialized || !this.db) {
      throw new Error('BookmarkManager not initialized');
    }
    return this.db;
  }

  /** 从Chrome书签文件同步 */
  async syncFromChromeFile(filePath: string): Promise<number> {
    const db = this.ensureInitialized();

    // 验证文件格式
    const isValid = await validateChromeBookmarkFile(filePath);
    if (!isValid) {
      throw new Error('Invalid Chrome bookmark file format');
    }

    // 解析书签
    const bookmarks = await parseChromeBookmarks(filePath);

    // 清空现有书签
    await clearAllBookmarks(db);

    // 批量插入
    const count = await upsertBookmarks(db, bookmarks);

    // 更新同步时间
    await updateSyncTimestamp(db);

    console.log(`[BookmarkManager] Synced ${count} bookmarks from ${filePath}`);
    return count;
  }

  /** 搜索书签 */
  async search(params: BookmarkSearchParams): Promise<FlatBookmark[]> {
    const db = this.ensureInitialized();
    const query = params.query ?? '';
    const limit = params.limit ?? 50;

    return searchBookmarks(db, query, limit);
  }

  /** 获取统计信息 */
  async getStats(): Promise<BookmarkStats> {
    const db = this.ensureInitialized();
    return getBookmarkStats(db);
  }

  /** 清空所有书签 */
  async clear(): Promise<void> {
    const db = this.ensureInitialized();
    await clearAllBookmarks(db);
    console.log('[BookmarkManager] Cleared all bookmarks');
  }
}

// 单例导出
export const bookmarkManager = new BookmarkManager();
