/**
 * Achievements Database Operations
 * 成就数据数据库操作层
 */

import { getDatabase } from './index';
import type { Achievement, AchievementType } from '@/types';

/**
 * 获取所有成就
 */
export async function getAllAchievements(): Promise<Achievement[]> {
  const db = await getDatabase();
  const rows = await db.select<Array<{
    id: string;
    type: string;
    name: string;
    description: string;
    icon: string;
    unlock_condition: string;
    is_unlocked: number;
    unlocked_at: number | null;
    created_at: number;
  }>>(
    'SELECT * FROM achievements ORDER BY created_at ASC'
  );

  return rows.map((row) => ({
    id: row.id,
    type: row.type as AchievementType,
    name: row.name,
    description: row.description,
    icon: row.icon,
    unlockCondition: row.unlock_condition,
    isUnlocked: row.is_unlocked === 1,
    unlockedAt: row.unlocked_at,
    createdAt: row.created_at,
  }));
}

/**
 * 获取已解锁的成就
 */
export async function getUnlockedAchievements(): Promise<Achievement[]> {
  const db = await getDatabase();
  const rows = await db.select<Array<{
    id: string;
    type: string;
    name: string;
    description: string;
    icon: string;
    unlock_condition: string;
    is_unlocked: number;
    unlocked_at: number | null;
    created_at: number;
  }>>(
    'SELECT * FROM achievements WHERE is_unlocked = 1 ORDER BY unlocked_at DESC'
  );

  return rows.map((row) => ({
    id: row.id,
    type: row.type as AchievementType,
    name: row.name,
    description: row.description,
    icon: row.icon,
    unlockCondition: row.unlock_condition,
    isUnlocked: true,
    unlockedAt: row.unlocked_at,
    createdAt: row.created_at,
  }));
}

/**
 * 获取指定类型的成就
 */
export async function getAchievementsByType(
  type: AchievementType
): Promise<Achievement[]> {
  const db = await getDatabase();
  const rows = await db.select<Array<{
    id: string;
    type: string;
    name: string;
    description: string;
    icon: string;
    unlock_condition: string;
    is_unlocked: number;
    unlocked_at: number | null;
    created_at: number;
  }>>(
    'SELECT * FROM achievements WHERE type = ? ORDER BY created_at ASC',
    [type]
  );

  return rows.map((row) => ({
    id: row.id,
    type: row.type as AchievementType,
    name: row.name,
    description: row.description,
    icon: row.icon,
    unlockCondition: row.unlock_condition,
    isUnlocked: row.is_unlocked === 1,
    unlockedAt: row.unlocked_at,
    createdAt: row.created_at,
  }));
}

/**
 * 获取单个成就
 */
export async function getAchievementById(id: string): Promise<Achievement | null> {
  const db = await getDatabase();
  const rows = await db.select<Array<{
    id: string;
    type: string;
    name: string;
    description: string;
    icon: string;
    unlock_condition: string;
    is_unlocked: number;
    unlocked_at: number | null;
    created_at: number;
  }>>(
    'SELECT * FROM achievements WHERE id = ?',
    [id]
  );

  if (rows.length === 0) return null;

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    type: row.type as AchievementType,
    name: row.name,
    description: row.description,
    icon: row.icon,
    unlockCondition: row.unlock_condition,
    isUnlocked: row.is_unlocked === 1,
    unlockedAt: row.unlocked_at,
    createdAt: row.created_at,
  };
}

/**
 * 创建新成就
 */
export async function createAchievement(
  achievement: Omit<Achievement, 'isUnlocked' | 'unlockedAt' | 'createdAt'>
): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();

  await db.execute(
    `INSERT INTO achievements (
      id, type, name, description, icon, unlock_condition,
      is_unlocked, unlocked_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 0, NULL, ?)`,
    [
      achievement.id,
      achievement.type,
      achievement.name,
      achievement.description,
      achievement.icon,
      achievement.unlockCondition,
      now,
    ]
  );

  console.log(`[Database] Achievement created: ${achievement.id}`);
}

/**
 * 批量创建成就（用于初始化预设成就）
 */
export async function createAchievementsBatch(
  achievements: Array<Omit<Achievement, 'isUnlocked' | 'unlockedAt' | 'createdAt'>>
): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();

  for (const achievement of achievements) {
    // 检查是否已存在
    const existing = await getAchievementById(achievement.id);
    if (existing) {
      console.log(`[Database] Achievement ${achievement.id} already exists, skipping`);
      continue;
    }

    await db.execute(
      `INSERT INTO achievements (
        id, type, name, description, icon, unlock_condition,
        is_unlocked, unlocked_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, NULL, ?)`,
      [
        achievement.id,
        achievement.type,
        achievement.name,
        achievement.description,
        achievement.icon,
        achievement.unlockCondition,
        now,
      ]
    );
  }

  console.log(`[Database] ${achievements.length} achievements created`);
}

/**
 * 解锁成就
 */
export async function unlockAchievement(id: string): Promise<boolean> {
  const db = await getDatabase();

  // 检查成就是否存在且未解锁
  const achievement = await getAchievementById(id);
  if (!achievement) {
    console.warn(`[Database] Achievement ${id} not found`);
    return false;
  }

  if (achievement.isUnlocked) {
    console.log(`[Database] Achievement ${id} already unlocked`);
    return false;
  }

  // 解锁成就
  const now = Date.now();
  await db.execute(
    'UPDATE achievements SET is_unlocked = 1, unlocked_at = ? WHERE id = ?',
    [now, id]
  );

  console.log(`[Database] Achievement unlocked: ${id}`);
  return true;
}

/**
 * 获取成就统计
 */
export async function getAchievementStats(): Promise<{
  total: number;
  unlocked: number;
  percentage: number;
}> {
  const db = await getDatabase();

  const totalRows = await db.select<Array<{ count: number }>>(
    'SELECT COUNT(*) as count FROM achievements'
  );
  const unlockedRows = await db.select<Array<{ count: number }>>(
    'SELECT COUNT(*) as count FROM achievements WHERE is_unlocked = 1'
  );

  const total = totalRows[0]?.count ?? 0;
  const unlocked = unlockedRows[0]?.count ?? 0;
  const percentage = total > 0 ? (unlocked / total) * 100 : 0;

  return { total, unlocked, percentage };
}

/**
 * 删除成就（仅用于开发/测试）
 */
export async function deleteAchievement(id: string): Promise<void> {
  const db = await getDatabase();
  await db.execute('DELETE FROM achievements WHERE id = ?', [id]);
  console.log(`[Database] Achievement deleted: ${id}`);
}
