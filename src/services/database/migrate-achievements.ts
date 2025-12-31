/**
 * Achievement Icon Migration Script
 * 成就图标迁移脚本 - 从 emoji 迁移到 Lucide icon 名称
 *
 * 使用方式：
 * 1. 删除旧成就数据：pnpm run migrate:achievements:clean
 * 2. 重新初始化：应用会在启动时自动初始化新成就
 */

import { getDatabase } from './index';

/**
 * Emoji 到 Lucide Icon 的映射表
 * 用于迁移已解锁的成就数据
 */
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

/**
 * 迁移成就图标从 emoji 到 Lucide icon 名称
 * 保留已解锁状态和解锁时间
 */
export async function migrateAchievementIcons(): Promise<void> {
  const db = await getDatabase();

  console.log('[MigrateAchievements] Starting achievement icon migration...');

  // 获取所有成就
  const achievements = await db.select<
    Array<{
      id: string;
      icon: string;
      is_unlocked: number;
      unlocked_at: number | null;
    }>
  >('SELECT id, icon, is_unlocked, unlocked_at FROM achievements');

  let migrated = 0;
  let skipped = 0;

  for (const achievement of achievements) {
    const newIcon = EMOJI_TO_ICON_MAP[achievement.icon];

    if (newIcon) {
      // 更新为新的 icon 名称
      await db.execute('UPDATE achievements SET icon = ? WHERE id = ?', [
        newIcon,
        achievement.id,
      ]);
      migrated++;
      console.log(
        `[MigrateAchievements] Migrated ${achievement.id}: ${achievement.icon} → ${newIcon}`
      );
    } else if (achievement.icon in EMOJI_TO_ICON_MAP === false) {
      // 已经是 icon 名称，跳过
      skipped++;
    }
  }

  console.log(
    `[MigrateAchievements] Migration complete: ${migrated} migrated, ${skipped} skipped`
  );
}

/**
 * 清理所有成就数据（用于重置）
 * 警告：会删除所有成就和解锁记录！
 */
export async function cleanAllAchievements(): Promise<void> {
  const db = await getDatabase();

  console.log('[MigrateAchievements] Cleaning all achievements...');

  await db.execute('DELETE FROM achievements');

  console.log('[MigrateAchievements] All achievements cleaned. Restart app to reinitialize.');
}

/**
 * 验证所有成就图标是否为有效的 Lucide icon 名称
 */
export async function validateAchievementIcons(): Promise<{
  valid: number;
  invalid: Array<{ id: string; icon: string }>;
}> {
  const db = await getDatabase();

  const achievements = await db.select<Array<{ id: string; icon: string }>>(
    'SELECT id, icon FROM achievements'
  );

  const invalid: Array<{ id: string; icon: string }> = [];

  for (const achievement of achievements) {
    // 简单检查：icon 名称应该以大写字母开头，不含 emoji
    const isEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(achievement.icon);
    const isValidIconName = /^[A-Z][a-zA-Z0-9]*$/.test(achievement.icon);

    if (isEmoji || !isValidIconName) {
      invalid.push(achievement);
    }
  }

  return {
    valid: achievements.length - invalid.length,
    invalid,
  };
}
