/**
 * Statistics Database Operations
 * 统计数据数据库操作层
 */

import { getDatabase } from './index';
import type { DailyStats } from '@/types';

/**
 * 获取指定日期的统计数据
 * @param date 日期字符串 (YYYY-MM-DD)
 */
export async function getDailyStats(date: string): Promise<DailyStats | null> {
  const db = await getDatabase();
  const rows = await db.select<DailyStats[]>('SELECT * FROM daily_stats WHERE date = ?', [date]);

  if (rows.length === 0) return null;

  const row = rows[0];
  if (!row) return null;

  return {
    date: row.date,
    petCount: row.petCount,
    feedCount: row.feedCount,
    playCount: row.playCount,
    chatCount: row.chatCount,
    totalDuration: row.totalDuration,
    moodAvg: row.moodAvg ?? null,
    energyAvg: row.energyAvg ?? null,
    createdAt: row.createdAt,
  };
}

/**
 * 获取指定日期范围的统计数据
 * @param startDate 开始日期 (YYYY-MM-DD)
 * @param endDate 结束日期 (YYYY-MM-DD)
 */
export async function getDailyStatsRange(
  startDate: string,
  endDate: string
): Promise<DailyStats[]> {
  const db = await getDatabase();
  const rows = await db.select<DailyStats[]>(
    `SELECT * FROM daily_stats
     WHERE date >= ? AND date <= ?
     ORDER BY date ASC`,
    [startDate, endDate]
  );

  return rows.map((row) => ({
    ...row,
    moodAvg: row.moodAvg ?? null,
    energyAvg: row.energyAvg ?? null,
  }));
}

/**
 * 获取最近 N 天的统计数据
 * @param days 天数
 */
export async function getRecentDailyStats(days: number): Promise<DailyStats[]> {
  const db = await getDatabase();
  const rows = await db.select<DailyStats[]>(
    `SELECT * FROM daily_stats
     ORDER BY date DESC
     LIMIT ?`,
    [days]
  );

  return rows
    .map((row) => ({
      ...row,
      moodAvg: row.moodAvg ?? null,
      energyAvg: row.energyAvg ?? null,
    }))
    .reverse(); // 反转为升序
}

/**
 * 创建或更新今日统计数据
 * @param date 日期字符串 (YYYY-MM-DD)
 * @param updates 更新的字段
 */
export async function upsertDailyStats(
  date: string,
  updates: Partial<Omit<DailyStats, 'date' | 'createdAt'>>
): Promise<void> {
  const db = await getDatabase();

  // 检查记录是否存在
  const existing = await getDailyStats(date);

  if (existing) {
    // 更新现有记录
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((f) => `${f} = ?`).join(', ');

    await db.execute(`UPDATE daily_stats SET ${setClause} WHERE date = ?`, [
      ...values,
      date,
    ]);
  } else {
    // 插入新记录
    const now = Date.now();
    await db.execute(
      `INSERT INTO daily_stats (
        date, pet_count, feed_count, play_count, chat_count,
        total_duration, mood_avg, energy_avg, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        date,
        updates.petCount ?? 0,
        updates.feedCount ?? 0,
        updates.playCount ?? 0,
        updates.chatCount ?? 0,
        updates.totalDuration ?? 0,
        updates.moodAvg ?? null,
        updates.energyAvg ?? null,
        now,
      ]
    );
  }

  console.log(`[Database] Daily stats upserted for ${date}`);
}

/**
 * 增加今日互动计数
 * @param date 日期字符串 (YYYY-MM-DD)
 * @param type 互动类型
 */
export async function incrementDailyInteraction(
  date: string,
  type: 'pet' | 'feed' | 'play' | 'chat'
): Promise<void> {
  const db = await getDatabase();

  // 确保记录存在
  const existing = await getDailyStats(date);
  if (!existing) {
    await upsertDailyStats(date, {});
  }

  // 增加对应计数
  const columnMap = {
    pet: 'pet_count',
    feed: 'feed_count',
    play: 'play_count',
    chat: 'chat_count',
  };

  const column = columnMap[type];
  await db.execute(
    `UPDATE daily_stats SET ${column} = ${column} + 1 WHERE date = ?`,
    [date]
  );
}

/**
 * 更新今日平均属性值
 * @param date 日期字符串 (YYYY-MM-DD)
 * @param mood 心情值
 * @param energy 精力值
 */
export async function updateDailyAverages(
  date: string,
  mood: number,
  energy: number
): Promise<void> {
  const db = await getDatabase();

  // 确保记录存在
  const existing = await getDailyStats(date);
  if (!existing) {
    await upsertDailyStats(date, { moodAvg: mood, energyAvg: energy });
    return;
  }

  // 计算新的平均值（简单平均）
  const newMoodAvg = existing.moodAvg
    ? (existing.moodAvg + mood) / 2
    : mood;
  const newEnergyAvg = existing.energyAvg
    ? (existing.energyAvg + energy) / 2
    : energy;

  await db.execute(
    `UPDATE daily_stats SET mood_avg = ?, energy_avg = ? WHERE date = ?`,
    [newMoodAvg, newEnergyAvg, date]
  );
}

/**
 * 获取总互动次数
 */
export async function getTotalInteractions(): Promise<number> {
  const db = await getDatabase();
  const rows = await db.select<Array<{ total: number }>>(
    `SELECT SUM(pet_count + feed_count + play_count + chat_count) as total
     FROM daily_stats`
  );

  return rows[0]?.total ?? 0;
}

/**
 * 获取连续互动天数
 * 从今天往前查找连续有互动的天数
 */
export async function getConsecutiveDays(): Promise<number> {
  const db = await getDatabase();

  // 获取所有有互动的日期，降序排列
  const rows = await db.select<Array<{ date: string }>>(
    `SELECT date FROM daily_stats
     WHERE (pet_count + feed_count + play_count + chat_count) > 0
     ORDER BY date DESC`
  );

  if (rows.length === 0) return 0;

  let consecutive = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const row of rows) {
    const rowDate = new Date(row.date);
    rowDate.setHours(0, 0, 0, 0);

    // 计算与今天的天数差
    const daysDiff = Math.floor(
      (today.getTime() - rowDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff === consecutive) {
      consecutive++;
    } else {
      break;
    }
  }

  return consecutive;
}

/**
 * 获取总陪伴天数
 * 从 pet_status 的 created_at 计算到今天
 */
export async function getTotalCompanionDays(): Promise<number> {
  const db = await getDatabase();
  const rows = await db.select<Array<{ created_at: number }>>(
    'SELECT created_at FROM pet_status WHERE id = 1'
  );

  if (rows.length === 0) return 0;

  const row = rows[0];
  if (!row || !row.created_at) return 0;

  const createdAt = row.created_at;
  const now = Date.now();
  const days = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));

  return Math.max(0, days);
}
