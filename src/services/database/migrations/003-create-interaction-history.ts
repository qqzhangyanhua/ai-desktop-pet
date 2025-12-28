/**
 * Database Migration: Create interaction_history table
 * 数据库迁移：创建互动历史表
 *
 * Linus 准则: 消除特殊情况
 * 替代方案: 不再使用分散的 lastFeed、last_play 字段
 *
 * Run this migration to:
 * 1. Create interaction_history table
 * 2. Remove redundant last_feed and last_play columns from pet_status
 * 3. Migrate existing data if needed
 */

import { getDatabase } from '../index';

/**
 * 执行迁移
 */
export async function runMigration(): Promise<void> {
  const db = await getDatabase();

  try {
    console.log('[Migration 003] Starting interaction_history table creation...');

    // 1. 创建 interaction_history 表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS interaction_history (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('pet', 'feed', 'play', 'chat')),
        timestamp INTEGER NOT NULL,
        intensity INTEGER DEFAULT 1 CHECK (intensity >= 1 AND intensity <= 10),
        mood_change REAL DEFAULT 0,
        energy_change REAL DEFAULT 0,
        intimacy_change REAL DEFAULT 0,
        context TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      )
    `);

    console.log('[Migration 003] Created interaction_history table');

    // 2. 创建索引以提升查询性能
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_interaction_history_timestamp
      ON interaction_history(timestamp)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_interaction_history_type
      ON interaction_history(type)
    `);

    console.log('[Migration 003] Created indexes');

    // 3. 检查 pet_status 表是否存在 last_feed 和 last_play 字段
    const columns = await db.select<Array<{ name: string }>>(
      "PRAGMA table_info(pet_status)"
    );

    const columnNames = columns.map((col) => col.name);

    // 4. 如果存在冗余字段，移除它们
    if (columnNames.includes('last_feed') || columnNames.includes('last_play')) {
      console.log('[Migration 003] Removing redundant columns from pet_status...');

      // 首先备份数据到 interaction_history（如果需要）
      // 这里我们选择直接删除，因为旧数据价值有限

      // 添加新列（如果不存在）
      if (!columnNames.includes('last_interaction')) {
        await db.execute(`
          ALTER TABLE pet_status ADD COLUMN last_interaction INTEGER
        `);
        console.log('[Migration 003] Added last_interaction column');
      }

      // 删除冗余列
      // 注意: SQLite 不支持 DROP COLUMN，直到 3.35.0
      // 对于旧版本，我们需要重建表
      await db.execute(`
        CREATE TABLE pet_status_new (
          id INTEGER PRIMARY KEY,
          mood REAL DEFAULT 100,
          energy REAL DEFAULT 100,
          intimacy REAL DEFAULT 20,
          last_interaction INTEGER,
          total_interactions INTEGER DEFAULT 0,
          coins INTEGER DEFAULT 0,
          experience INTEGER DEFAULT 0,
          created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
          updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
        )
      `);

      // 复制数据（只复制需要的列）
      await db.execute(`
        INSERT INTO pet_status_new (id, mood, energy, intimacy, last_interaction, total_interactions, coins, experience, created_at, updated_at)
        SELECT id, mood, energy, intimacy, last_interaction, total_interactions, coins, experience, created_at, updated_at
        FROM pet_status
        WHERE id = 1
      `);

      // 删除旧表
      await db.execute('DROP TABLE pet_status');

      // 重命名新表
      await db.execute('ALTER TABLE pet_status_new RENAME TO pet_status');

      console.log('[Migration 003] Removed redundant columns');
    }

    console.log('[Migration 003] Migration completed successfully');
  } catch (error) {
    console.error('[Migration 003] Migration failed:', error);
    throw error;
  }
}

/**
 * 回滚迁移
 * 注意: 这会丢失所有互动历史数据
 */
export async function rollbackMigration(): Promise<void> {
  const db = await getDatabase();

  try {
    console.log('[Migration 003] Rolling back...');

    // 删除 interaction_history 表
    await db.execute('DROP TABLE IF EXISTS interaction_history');

    console.log('[Migration 003] Rollback completed');
  } catch (error) {
    console.error('[Migration 003] Rollback failed:', error);
    throw error;
  }
}

/**
 * 检查迁移是否已应用
 */
export async function isMigrationApplied(): Promise<boolean> {
  const db = await getDatabase();

  try {
    const result = await db.select<Array<{ count: number }>>(
      "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='interaction_history'"
    );

    return result[0].count > 0;
  } catch (error) {
    console.error('[Migration 003] Failed to check migration status:', error);
    return false;
  }
}
