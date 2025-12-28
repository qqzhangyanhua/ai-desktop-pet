#!/usr/bin/env tsx
/**
 * Migration script to update Live2D model configuration
 * Updates database config to use the new white-cat model
 */

import Database from '@tauri-apps/plugin-sql';

async function migrateModelConfig() {
  console.log('🔄 Migrating model configuration...');

  try {
    const db = await Database.load('sqlite:app.db');

    // Get current config
    const result = await db.select<Array<{ key: string; value: string }>>(
      'SELECT key, value FROM config WHERE key = ?',
      ['app_config']
    );

    if (result.length === 0) {
      console.log('✅ No existing config found, will use defaults on next launch');
      return;
    }

    const configRow = result[0];
    if (!configRow) {
      console.log('✅ No config to migrate');
      return;
    }

    const config = JSON.parse(configRow.value);

    // Update model configuration
    const updated = {
      ...config,
      live2d: {
        ...config.live2d,
        currentModel: 'white-cat',
      },
      appearance: {
        ...config.appearance,
        skinId: 'white-cat',
      },
    };

    // Save updated config
    await db.execute(
      'UPDATE config SET value = ?, updated_at = ? WHERE key = ?',
      [JSON.stringify(updated), Date.now(), 'app_config']
    );

    console.log('✅ Model configuration migrated successfully!');
    console.log('   - currentModel: white-cat');
    console.log('   - skinId: white-cat');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

migrateModelConfig().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
