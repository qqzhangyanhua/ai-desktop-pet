import { getDatabase } from '../src/services/database/index';

/**
 * Reset model configuration to use white-cat
 * Run this with: pnpm exec tsx scripts/reset-model.ts
 */
async function resetModelConfig() {
  console.log('🔄 Resetting model configuration to white-cat...\n');

  try {
    const db = await getDatabase();

    // Check if config exists
    const result = await db.select<Array<{ value: string }>>(
      'SELECT value FROM config WHERE key = ?',
      ['app_config']
    );

    if (result.length === 0) {
      console.log('✅ No config found in database.');
      console.log('   The app will use default config (white-cat) on next launch.\n');
      return;
    }

    const configStr = result[0]?.value;
    if (!configStr) {
      console.log('✅ Config is empty, will use defaults.\n');
      return;
    }

    const config = JSON.parse(configStr);
    console.log('📋 Current config:');
    console.log('   - live2d.currentModel:', config.live2d?.currentModel || 'not set');
    console.log('   - appearance.skinId:', config.appearance?.skinId || 'not set');
    console.log('');

    // Update to white-cat
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

    await db.execute(
      'UPDATE config SET value = ?, updated_at = ? WHERE key = ?',
      [JSON.stringify(updated), Date.now(), 'app_config']
    );

    console.log('✅ Model configuration updated successfully!');
    console.log('   - live2d.currentModel: white-cat');
    console.log('   - appearance.skinId: white-cat');
    console.log('\n🚀 Please restart the app to see the changes.\n');
  } catch (error) {
    console.error('❌ Failed to reset config:', error);
    console.error('\nAlternative: Delete the database file and restart the app.');
    console.error('Database location: ~/Library/Application Support/<your-app-id>/app.db\n');
    throw error;
  }
}

resetModelConfig().catch(() => process.exit(1));
