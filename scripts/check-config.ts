// Quick script to check what config is loaded from database
import Database from '@tauri-apps/plugin-sql';

async function checkConfig() {
  const db = await Database.load('sqlite:pet.db');

  const rows = await db.select<Array<{ value: string }>>(`
    SELECT value FROM config WHERE key = 'app_config'
  `);

  if (rows.length === 0) {
    console.log('No config found in database');
    return;
  }

  const config = JSON.parse(rows[0].value);

  console.log('=== Config Check ===');
  console.log('useLive2D (top-level):', config.useLive2D, typeof config.useLive2D);
  console.log('live2d.useLive2D:', config.live2d?.useLive2D, typeof config.live2d?.useLive2D);
  console.log('live2d.currentModel:', config.live2d?.currentModel);
  console.log('appearance.skinId:', config.appearance?.skinId);
  console.log('');
  console.log('Boolean check:');
  console.log('config.useLive2D === true:', config.useLive2D === true);
  console.log('config.useLive2D === 1:', config.useLive2D === 1);
  console.log('!!config.useLive2D:', !!config.useLive2D);
  console.log('config.useLive2D ?? false:', config.useLive2D ?? false);
}

checkConfig().catch(console.error);
