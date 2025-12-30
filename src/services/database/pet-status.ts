/**
 * Pet Status Database Operations
 * 宠物状态数据库操作层
 *
 * P0-3: 支持新的 interaction_timestamps 字段（JSON格式）
 * P2-1-C: 支持完整的5维度Care系统 (satiety/energy/hygiene/mood/boredom)
 * 向后兼容旧的 last_feed, last_play 字段
 */

import { getDatabase } from './index';
import type { PetStatus, InteractionType, PetCareStats, PetActionType } from '@/types';
import { InteractionTimestamps } from '@/types/pet-care';

/**
 * Database column name mapping
 * 数据库列名映射 (snake_case <-> camelCase)
 */
const TS_TO_DB_MAPPING: Record<keyof PetStatus, string> = {
  nickname: 'nickname',
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
  nickname: string;
  mood: number;
  energy: number;
  intimacy: number;
  last_interaction: number;
  last_feed: number | null;
  last_play: number | null;
  interaction_timestamps: string | null; // P0-3: 新字段（JSON格式）
  total_interactions: number;
  coins: number;
  experience: number;
  created_at: number;
  updated_at: number;
}

/**
 * Convert database row to PetStatus type
 * 数据库行转换为 PetStatus 类型
 *
 * P0-3: 优先使用 interaction_timestamps（新格式），兜底使用旧字段
 */
function rowToPetStatus(row: PetStatusRow): PetStatus {
  // 优先使用新格式
  let lastFeed = row.last_feed;
  let lastPlay = row.last_play;

  if (row.interaction_timestamps) {
    try {
      const timestamps = InteractionTimestamps.fromJSON(row.interaction_timestamps);
      lastFeed = timestamps.getLastTime('feed') || lastFeed;
      lastPlay = timestamps.getLastTime('play') || lastPlay;
    } catch (error) {
      console.warn('[Database] Failed to parse interaction_timestamps, using legacy fields:', error);
    }
  }

  return {
    nickname: row.nickname,
    mood: row.mood,
    energy: row.energy,
    intimacy: row.intimacy,
    lastInteraction: row.last_interaction,
    lastFeed,
    lastPlay,
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
 *
 * P0-3: 双写模式 - 同时更新旧字段和新的 interaction_timestamps
 */
export async function incrementInteractionCount(
  type: InteractionType
): Promise<void> {
  try {
    const db = await getDatabase();
    const now = Date.now();

    // Map interaction type to database column (旧字段)
    const typeColumnMap: Record<InteractionType, string> = {
      pet: 'last_interaction',
      feed: 'last_feed',
      play: 'last_play',
    };

    const typeColumn = typeColumnMap[type];

    // P0-3: 读取现有的 interaction_timestamps
    const existing = await db.select<Array<{ interaction_timestamps: string | null }>>(
      'SELECT interaction_timestamps FROM pet_status WHERE id = 1'
    );

    let timestampsJson = '{}';
    if (existing[0]?.interaction_timestamps) {
      try {
        const timestamps = InteractionTimestamps.fromJSON(existing[0].interaction_timestamps);
        timestamps.setLastTime(type, now);
        timestampsJson = timestamps.toJSON();
      } catch {
        // 解析失败，创建新的
        const timestamps = new InteractionTimestamps();
        timestamps.setLastTime(type, now);
        timestampsJson = timestamps.toJSON();
      }
    } else {
      // 首次写入，创建新的
      const timestamps = new InteractionTimestamps();
      timestamps.setLastTime(type, now);
      timestampsJson = timestamps.toJSON();
    }

    // 双写模式：同时更新旧字段和新字段
    await db.execute(
      `UPDATE pet_status
       SET total_interactions = total_interactions + 1,
           last_interaction = ?,
           ${typeColumn} = ?,
           interaction_timestamps = ?,
           updated_at = ?
       WHERE id = 1`,
      [now, now, timestampsJson, now]
    );
  } catch (error) {
    console.error('[Database] Failed to increment interaction count:', error);
    throw error;
  }
}

/**
 * Get care status from database
 * 获取宠物Care系统状态（5维度）
 *
 * P2-1-C: 支持新的5维度Care系统
 */
export async function getCareStatus(): Promise<PetCareStats | null> {
  try {
    const db = await getDatabase();
    const rows = await db.select<Array<{
      satiety: number;
      energy: number;
      hygiene: number;
      mood: number;
      boredom: number;
      is_sick: number;
      last_action: string | null;
    }>>(
      'SELECT satiety, energy, hygiene, mood, boredom, is_sick, last_action FROM pet_status WHERE id = 1'
    );

    if (rows.length === 0 || !rows[0]) {
      return null;
    }

    const row = rows[0];
    return {
      satiety: row.satiety,
      energy: row.energy,
      hygiene: row.hygiene,
      mood: row.mood,
      boredom: row.boredom,
      isSick: row.is_sick === 1,
      lastAction: row.last_action as PetActionType | null,
    };
  } catch (error) {
    console.error('[Database] Failed to get care status:', error);
    throw error;
  }
}

/**
 * Update care status in database
 * 更新宠物Care系统状态
 *
 * P2-1-C: 支持部分更新5维度Care系统状态
 */
export async function updateCareStatus(status: Partial<PetCareStats>): Promise<void> {
  try {
    const db = await getDatabase();

    // Map TypeScript fields to database columns
    const fieldMap: Record<string, string> = {
      satiety: 'satiety',
      energy: 'energy',
      hygiene: 'hygiene',
      mood: 'mood',
      boredom: 'boredom',
      isSick: 'is_sick',
      lastAction: 'last_action',
    };

    const dbFields: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(status)) {
      const dbField = fieldMap[key];
      if (dbField) {
        dbFields.push(`${dbField} = ?`);

        // Convert boolean to integer for is_sick
        if (key === 'isSick') {
          values.push(value ? 1 : 0);
        } else {
          values.push(value);
        }
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
    console.error('[Database] Failed to update care status:', error);
    throw error;
  }
}
