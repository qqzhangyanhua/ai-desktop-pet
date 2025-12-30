/**
 * Migration 004: Extend pet_status Schema
 * 扩展pet_status表支持5维度Care系统
 *
 * 新增字段：
 * - satiety (饱食度)
 * - hygiene (清洁度)
 * - boredom (无聊度)
 * - is_sick (是否生病)
 * - last_action (最后动作类型)
 */

import type Database from '@tauri-apps/plugin-sql';

export async function applyMigration_004(db: Database): Promise<void> {
  try {
    console.log('[Migration 004] Starting pet_status schema extension...');

    // 1. 备份现有数据
    await db.execute(`
      CREATE TABLE IF NOT EXISTS pet_status_backup_004 AS
      SELECT * FROM pet_status
    `);
    console.log('[Migration 004] Backup created');

    // 2. 检查并添加新字段
    const columns = await db.select<Array<{ name: string }>>(
      "PRAGMA table_info(pet_status)"
    );
    const existingColumns = new Set(columns.map(c => c.name));

    if (!existingColumns.has('satiety')) {
      await db.execute('ALTER TABLE pet_status ADD COLUMN satiety REAL DEFAULT 80.0');
      console.log('[Migration 004] Added satiety column');
    }

    if (!existingColumns.has('hygiene')) {
      await db.execute('ALTER TABLE pet_status ADD COLUMN hygiene REAL DEFAULT 75.0');
      console.log('[Migration 004] Added hygiene column');
    }

    if (!existingColumns.has('boredom')) {
      await db.execute('ALTER TABLE pet_status ADD COLUMN boredom REAL DEFAULT 30.0');
      console.log('[Migration 004] Added boredom column');
    }

    if (!existingColumns.has('is_sick')) {
      await db.execute('ALTER TABLE pet_status ADD COLUMN is_sick INTEGER DEFAULT 0');
      console.log('[Migration 004] Added is_sick column');
    }

    if (!existingColumns.has('last_action')) {
      await db.execute('ALTER TABLE pet_status ADD COLUMN last_action TEXT DEFAULT NULL');
      console.log('[Migration 004] Added last_action column');
    }

    console.log('[Migration 004] Schema extension completed successfully');
  } catch (error) {
    console.error('[Migration 004] Failed:', error);
    throw error;
  }
}

export async function rollbackMigration_004(db: Database): Promise<void> {
  try {
    console.log('[Migration 004] Rolling back...');

    // 从备份恢复
    const backupExists = await db.select<Array<{ name: string }>>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='pet_status_backup_004'"
    );

    if (backupExists.length > 0) {
      await db.execute('DROP TABLE IF EXISTS pet_status');
      await db.execute('ALTER TABLE pet_status_backup_004 RENAME TO pet_status');
      console.log('[Migration 004] Rollback completed');
    } else {
      console.warn('[Migration 004] Backup not found, cannot rollback');
    }
  } catch (error) {
    console.error('[Migration 004] Rollback failed:', error);
    throw error;
  }
}
