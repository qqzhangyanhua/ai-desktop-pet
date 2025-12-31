#!/usr/bin/env tsx
/**
 * Achievement Icons Migration Script
 * 成就图标自动迁移脚本
 *
 * 运行方式：pnpm exec tsx scripts/migrate-achievements.ts
 */

import Database from '@tauri-apps/plugin-sql';
import { homedir } from 'os';
import { join } from 'path';

const EMOJI_TO_ICON_MAP: Record<string, string> = {
  '👋': 'Hand',
  '🤗': 'HandHeart',
  '🎖️': 'Medal',
  '🍱': 'Utensils',
  '🎮': 'Gamepad2',
  '💬': 'MessageSquare',
  '⭐': 'Star',
  '🏆': 'Trophy',
  '🌱': 'Sprout',
  '🌿': 'Leaf',
  '🌳': 'TreeDeciduous',
  '🌲': 'TreePine',
  '📅': 'Calendar',
  '❤️': 'Heart',
  '🧊': 'Snowflake',
  '👥': 'Users',
  '💙': 'HeartHandshake',
  '💖': 'Sparkles',
  '🗨️': 'MessagesSquare',
  '🎯': 'Target',
};

async function main() {
  console.log('🚀 Starting achievement icons migration...\n');

  // 尝试连接数据库
  // Tauri 数据库通常在 ~/Library/Application Support/<app-name>/
  const dbPath = join(
    homedir(),
    'Library',
    'Application Support',
    'com.ai-desktop-pet.app',
    'pet.db'
  );

  console.log(`📁 Database path: ${dbPath}\n`);
  console.log(`💡 Note: If database not found, the app will create it on next startup.\n`);

  try {
    const db = await Database.load(`sqlite:${dbPath}`);

    // 检查成就表是否存在
    const tables = await db.select<Array<{ name: string }>>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='achievements'"
    );

    if (tables.length === 0) {
      console.log('⚠️  Achievements table not found. Nothing to migrate.');
      console.log('💡 App will create achievements on next startup.');
      process.exit(0);
    }

    // 获取所有成就
    const achievements = await db.select<
      Array<{
        id: string;
        icon: string;
        is_unlocked: number;
        unlocked_at: number | null;
      }>
    >('SELECT id, icon, is_unlocked, unlocked_at FROM achievements');

    console.log(`📊 Found ${achievements.length} achievements\n`);

    if (achievements.length === 0) {
      console.log('✅ No achievements to migrate.');
      process.exit(0);
    }

    let migrated = 0;
    let alreadyConverted = 0;
    let unknown = 0;

    for (const achievement of achievements) {
      const newIcon = EMOJI_TO_ICON_MAP[achievement.icon];

      if (newIcon) {
        // 迁移 emoji 到 icon 名称
        await db.execute('UPDATE achievements SET icon = ? WHERE id = ?', [
          newIcon,
          achievement.id,
        ]);
        migrated++;
        console.log(
          `  ✓ ${achievement.id.padEnd(20)} ${achievement.icon} → ${newIcon}`
        );
      } else if (/^[A-Z][a-zA-Z0-9]*$/.test(achievement.icon)) {
        // 已经是有效的 icon 名称
        alreadyConverted++;
        console.log(`  ○ ${achievement.id.padEnd(20)} ${achievement.icon} (already icon)`);
      } else {
        // 未知格式
        unknown++;
        console.log(`  ✗ ${achievement.id.padEnd(20)} ${achievement.icon} (unknown format)`);
      }
    }

    console.log('\n' + '─'.repeat(60));
    console.log('📈 Migration Summary:');
    console.log(`   Migrated:         ${migrated}`);
    console.log(`   Already converted: ${alreadyConverted}`);
    console.log(`   Unknown format:    ${unknown}`);
    console.log(`   Total:            ${achievements.length}`);
    console.log('─'.repeat(60) + '\n');

    if (migrated > 0) {
      console.log('✨ Migration completed successfully!');
      console.log('💡 Restart the app to see the new icons.\n');
    } else if (alreadyConverted === achievements.length) {
      console.log('✅ All achievements already use icon names. No migration needed.\n');
    } else {
      console.log('⚠️  Migration completed with warnings. Check unknown formats above.\n');
    }

    await db.close();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('\n💡 Suggestions:');
    console.error('   1. Make sure the app is NOT running');
    console.error('   2. Check the database path is correct');
    console.error('   3. Try running the app once to initialize the database');
    process.exit(1);
  }
}

main();
