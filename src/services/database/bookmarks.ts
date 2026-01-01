/**
 * Bookmark Database Operations
 * 书签数据库操作
 */

import Database from '@tauri-apps/plugin-sql';
import type { FlatBookmark, BookmarkStats } from '@/types/bookmark';

/** 书签表Schema */
const BOOKMARKS_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    path TEXT NOT NULL,
    date_added INTEGER NOT NULL,
    date_modified INTEGER,
    created_at INTEGER DEFAULT (unixepoch()),
    UNIQUE(url)
  );

  CREATE INDEX IF NOT EXISTS idx_bookmarks_title ON bookmarks(title);
  CREATE INDEX IF NOT EXISTS idx_bookmarks_url ON bookmarks(url);
  CREATE INDEX IF NOT EXISTS idx_bookmarks_date_added ON bookmarks(date_added DESC);
`;

/** 书签元数据表（存储同步状态） */
const BOOKMARK_META_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS bookmark_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER DEFAULT (unixepoch())
  );
`;

/** 初始化书签表 */
export async function initBookmarkTables(db: Database): Promise<void> {
  await db.execute(BOOKMARKS_TABLE_SCHEMA);
  await db.execute(BOOKMARK_META_TABLE_SCHEMA);
}

/** 批量插入书签（替换模式） */
export async function upsertBookmarks(
  db: Database,
  bookmarks: FlatBookmark[]
): Promise<number> {
  let count = 0;

  for (const bookmark of bookmarks) {
    await db.execute(
      `INSERT OR REPLACE INTO bookmarks
       (id, title, url, path, date_added, date_modified)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        bookmark.id,
        bookmark.title,
        bookmark.url,
        JSON.stringify(bookmark.path),
        bookmark.dateAdded,
        bookmark.dateModified ?? null,
      ]
    );
    count++;
  }

  return count;
}

/** 搜索书签 */
export async function searchBookmarks(
  db: Database,
  query: string,
  limit = 50
): Promise<FlatBookmark[]> {
  const pattern = `%${query}%`;
  const rows = await db.select<Array<{
    id: string;
    title: string;
    url: string;
    path: string;
    date_added: number;
    date_modified: number | null;
  }>>(
    `SELECT * FROM bookmarks
     WHERE title LIKE ? OR url LIKE ?
     ORDER BY date_added DESC
     LIMIT ?`,
    [pattern, pattern, limit]
  );

  return rows.map(row => ({
    id: row.id,
    title: row.title,
    url: row.url,
    path: JSON.parse(row.path) as string[],
    dateAdded: row.date_added,
    dateModified: row.date_modified ?? undefined,
  }));
}

/** 获取书签统计 */
export async function getBookmarkStats(db: Database): Promise<BookmarkStats> {
  const [countResult] = await db.select<Array<{ count: number }>>(
    'SELECT COUNT(*) as count FROM bookmarks'
  );

  const meta = await db.select<Array<{ value: string }>>(
    "SELECT value FROM bookmark_meta WHERE key = 'last_sync'",
    []
  );

  return {
    totalBookmarks: countResult?.count ?? 0,
    totalFolders: 0, // 从path中去重计算
    lastUpdated: meta[0] ? parseInt(meta[0].value) : 0,
  };
}

/** 更新同步时间戳 */
export async function updateSyncTimestamp(db: Database): Promise<void> {
  await db.execute(
    "INSERT OR REPLACE INTO bookmark_meta (key, value, updated_at) VALUES ('last_sync', ?, unixepoch())",
    [Date.now().toString()]
  );
}

/** 清空所有书签 */
export async function clearAllBookmarks(db: Database): Promise<void> {
  await db.execute('DELETE FROM bookmarks');
}
