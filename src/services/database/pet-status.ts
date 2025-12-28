/**
 * Pet Status Database Operations
 * 宠物状态数据库操作层
 */

import { getDatabase } from './index';
import type { PetStatus, InteractionType } from '@/types';

/**
 * Database column name mapping
 * 数据库列名映射 (snake_case <-> camelCase)
 */
const TS_TO_DB_MAPPING: Record<keyof PetStatus, string> = {
  mood: 'mood',
  energy: 'energy',
  intimacy: 'intimacy',
  lastInteraction: 'last_interaction',
  lastFeed: 'last_feed',
  lastPlay: 'last_play',
  totalInteractions: 'total_interactions',
  coins: 'coins',
  experience: 'experience',
  createdAt: 'created_at',
};

/**
 * Database row type (snake_case)
 */
interface PetStatusRow {
  id: number;
  mood: number;
  energy: number;
  intimacy: number;
  last_interaction: number;
  last_feed: number | null;
  last_play: number | null;
  total_interactions: number;
  coins: number;
  experience: number;
  created_at: number;
  updated_at: number;
}

/**
 * Convert database row to PetStatus type
 * 数据库行转换为 PetStatus 类型
 */
function rowToPetStatus(row: PetStatusRow): PetStatus {
  return {
    mood: row.mood,
    energy: row.energy,
    intimacy: row.intimacy,
    lastInteraction: row.last_interaction,
    lastFeed: row.last_feed,
    lastPlay: row.last_play,
    totalInteractions: row.total_interactions,
    coins: row.coins,
    experience: row.experience,
    createdAt: row.created_at,
  };
}

/**
 * Get pet status from database
 * 从数据库获取宠物状态
 */
export async function getPetStatus(): Promise<PetStatus | null> {
  try {
    const db = await getDatabase();
    const rows = await db.select<PetStatusRow[]>(
      'SELECT * FROM pet_status WHERE id = 1'
    );

    if (rows.length === 0 || !rows[0]) {
      return null;
    }

    return rowToPetStatus(rows[0]);
  } catch (error) {
    console.error('[Database] Failed to get pet status:', error);
    throw error;
  }
}

/**
 * Update pet status in database
 * 更新宠物状态到数据库
 */
export async function updatePetStatus(
  updates: Partial<Omit<PetStatus, 'createdAt'>>
): Promise<void> {
  try {
    const db = await getDatabase();

    // Convert camelCase keys to snake_case
    const dbFields: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(updates)) {
      const dbField = TS_TO_DB_MAPPING[key as keyof PetStatus];
      if (dbField) {
        dbFields.push(`${dbField} = ?`);
        values.push(value);
      }
    }

    if (dbFields.length === 0) {
      return; // No fields to update
    }

    const setClause = dbFields.join(', ');
    const now = Date.now();

    await db.execute(
      `UPDATE pet_status SET ${setClause}, updated_at = ? WHERE id = 1`,
      [...values, now]
    );
  } catch (error) {
    console.error('[Database] Failed to update pet status:', error);
    throw error;
  }
}

/**
 * Increment interaction count and update timestamps
 * 增加互动计数并更新时间戳
 */
export async function incrementInteractionCount(
  type: InteractionType
): Promise<void> {
  try {
    const db = await getDatabase();
    const now = Date.now();

    // Map interaction type to database column
    const typeColumnMap: Record<InteractionType, string> = {
      pet: 'last_interaction',
      feed: 'last_feed',
      play: 'last_play',
    };

    const typeColumn = typeColumnMap[type];

    await db.execute(
      `UPDATE pet_status
       SET total_interactions = total_interactions + 1,
           last_interaction = ?,
           ${typeColumn} = ?,
           updated_at = ?
       WHERE id = 1`,
      [now, now, now]
    );
  } catch (error) {
    console.error('[Database] Failed to increment interaction count:', error);
    throw error;
  }
}
