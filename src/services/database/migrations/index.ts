/**
 * Database Migration Manager
 * 数据库迁移管理器
 */

import type Database from '@tauri-apps/plugin-sql';
import { up as migration002Up } from './002-add-suggestions-column';

interface Migration {
  version: number;
  name: string;
  up: (db: Database) => Promise<void>;
}

const migrations: Migration[] = [
  {
    version: 2,
    name: '002-add-suggestions-column',
    up: migration002Up,
  },
];

/**
 * Get current database version
 */
async function getCurrentVersion(db: Database): Promise<number> {
  try {
    // Check if migrations table exists
    const tables = await db.select<Array<{ name: string }>>(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'`
    );

    if (tables.length === 0) {
      // Create migrations table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          version INTEGER NOT NULL UNIQUE,
          name TEXT NOT NULL,
          applied_at INTEGER NOT NULL
        )
      `);
      return 0;
    }

    // Get latest version
    const result = await db.select<Array<{ version: number }>>(
      `SELECT version FROM migrations ORDER BY version DESC LIMIT 1`
    );

    return result[0]?.version ?? 0;
  } catch (error) {
    console.error('[Migrations] Failed to get current version:', error);
    return 0;
  }
}

/**
 * Record migration
 */
async function recordMigration(
  db: Database,
  version: number,
  name: string
): Promise<void> {
  await db.execute(
    `INSERT INTO migrations (version, name, applied_at) VALUES (?, ?, ?)`,
    [version, name, Date.now()]
  );
}

/**
 * Run pending migrations
 */
export async function runMigrations(db: Database): Promise<void> {
  const currentVersion = await getCurrentVersion(db);
  console.log(`[Migrations] Current database version: ${currentVersion}`);

  const pendingMigrations = migrations.filter(m => m.version > currentVersion);

  if (pendingMigrations.length === 0) {
    console.log('[Migrations] No pending migrations.');
    return;
  }

  console.log(`[Migrations] Found ${pendingMigrations.length} pending migration(s)`);

  for (const migration of pendingMigrations) {
    try {
      console.log(`[Migrations] Running migration ${migration.version}: ${migration.name}`);
      await migration.up(db);
      await recordMigration(db, migration.version, migration.name);
      console.log(`[Migrations] Migration ${migration.version} completed successfully`);
    } catch (error) {
      console.error(`[Migrations] Migration ${migration.version} failed:`, error);
      throw new Error(
        `Migration ${migration.version} (${migration.name}) failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  console.log('[Migrations] All migrations completed successfully');
}
