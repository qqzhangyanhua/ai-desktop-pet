/**
 * Migration 002: Add suggestions column to messages table
 * 为 messages 表添加 suggestions 列
 */

import type Database from '@tauri-apps/plugin-sql';

export const MIGRATION_002_NAME = '002-add-suggestions-column';
export const MIGRATION_002_VERSION = 2;

export async function up(db: Database): Promise<void> {
  console.log(`[Migration ${MIGRATION_002_VERSION}] Adding suggestions column to messages table...`);

  try {
    // Check if column already exists
    const tableInfo = await db.select<Array<{ name: string }>>(
      `PRAGMA table_info(messages)`
    );

    const hasSuggestionsColumn = tableInfo.some(col => col.name === 'suggestions');

    if (hasSuggestionsColumn) {
      console.log(`[Migration ${MIGRATION_002_VERSION}] Column 'suggestions' already exists, skipping.`);
      return;
    }

    // Add suggestions column
    await db.execute(`
      ALTER TABLE messages
      ADD COLUMN suggestions TEXT
    `);

    console.log(`[Migration ${MIGRATION_002_VERSION}] Successfully added suggestions column.`);
  } catch (error) {
    console.error(`[Migration ${MIGRATION_002_VERSION}] Failed:`, error);
    throw error;
  }
}

export async function down(_db: Database): Promise<void> {
  console.log(`[Migration ${MIGRATION_002_VERSION}] Rolling back suggestions column...`);

  // SQLite doesn't support DROP COLUMN easily, so we'd need to recreate the table
  // For simplicity, we'll log a warning
  console.warn(
    `[Migration ${MIGRATION_002_VERSION}] Rollback not fully implemented. ` +
    `SQLite doesn't support DROP COLUMN. Manual intervention required.`
  );
}
