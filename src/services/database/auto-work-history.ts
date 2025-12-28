/**
 * 自动打工历史数据库操作
 * Auto Work History Database Operations
 */

import type { AutoWorkHistory } from '@/types/auto-work';
import { execute, query } from './index';

/**
 * 获取今日工作时长统计
 * @param date YYYY-MM-DD 格式
 * @returns 今日工作时长（小时）
 */
export async function getTodayWorkHours(date: string): Promise<number> {
  try {
    const result = await query<{ total: number }>(
      'SELECT COALESCE(SUM(duration_hours), 0) as total FROM auto_work_history WHERE DATE(start_time / 1000, "unixepoch", "localtime") = ?',
      [date]
    );
    const row = result[0];
    const total = (row && typeof row.total === 'number') ? row.total : 0;
    return total as number;
  } catch (error) {
    console.error('[AutoWorkHistory] Failed to get today work hours:', error);
    return 0;
  }
}

/**
 * 获取指定日期的工作时长
 * @param date YYYY-MM-DD 格式
 * @returns 工作记录列表
 */
export async function getWorkHistoryByDate(date: string): Promise<AutoWorkHistory[]> {
  const rows = await query<any>(
    'SELECT * FROM auto_work_history WHERE DATE(start_time / 1000, "unixepoch", "localtime") = ? ORDER BY start_time DESC',
    [date]
  );

  return rows.map((row) => ({
    id: row.id,
    workType: row.work_type,
    startTime: row.start_time,
    endTime: row.end_time,
    durationHours: row.duration_hours,
    rewardCoins: row.reward_coins,
    rewardExperience: row.reward_experience,
    moodConsumed: row.mood_consumed,
    energyConsumed: row.energy_consumed,
    intimacyLevel: row.intimacy_level,
    createdAt: row.created_at,
  }));
}

/**
 * 获取最近N天的工作记录
 * @param days 天数
 * @returns 工作记录列表
 */
export async function getRecentWorkHistory(days: number): Promise<AutoWorkHistory[]> {
  const rows = await query<any>(
    `SELECT * FROM auto_work_history
     WHERE start_time >= ?
     ORDER BY start_time DESC`,
    [Date.now() - days * 24 * 60 * 60 * 1000]
  );

  return rows.map((row) => ({
    id: row.id,
    workType: row.work_type,
    startTime: row.start_time,
    endTime: row.end_time,
    durationHours: row.duration_hours,
    rewardCoins: row.reward_coins,
    rewardExperience: row.reward_experience,
    moodConsumed: row.mood_consumed,
    energyConsumed: row.energy_consumed,
    intimacyLevel: row.intimacy_level,
    createdAt: row.created_at,
  }));
}

/**
 * 保存工作记录
 * @param history 工作记录
 */
export async function saveWorkHistory(history: Omit<AutoWorkHistory, 'createdAt'>): Promise<void> {
  await execute(
    `INSERT INTO auto_work_history (
      id, work_type, start_time, end_time, duration_hours,
      reward_coins, reward_experience, mood_consumed, energy_consumed,
      intimacy_level, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      history.id,
      history.workType,
      history.startTime,
      history.endTime,
      history.durationHours,
      history.rewardCoins,
      history.rewardExperience,
      history.moodConsumed,
      history.energyConsumed,
      history.intimacyLevel,
      Date.now(),
    ]
  );
}

/**
 * 获取累计工作统计
 * @returns 统计数据
 */
export async function getWorkStats(): Promise<{
  totalSessions: number;
  totalHours: number;
  totalCoins: number;
  totalExperience: number;
  averageSessionHours: number;
}> {
  const result = await query<{
    totalSessions: number;
    totalHours: number;
    totalCoins: number;
    totalExperience: number;
  }>(
    `SELECT
      COUNT(*) as totalSessions,
      COALESCE(SUM(duration_hours), 0) as totalHours,
      COALESCE(SUM(reward_coins), 0) as totalCoins,
      COALESCE(SUM(reward_experience), 0) as totalExperience
    FROM auto_work_history`
  );

  const stats = result[0];
  if (!stats) {
    return {
      totalSessions: 0,
      totalHours: 0,
      totalCoins: 0,
      totalExperience: 0,
      averageSessionHours: 0,
    };
  }

  const averageSessionHours = stats.totalSessions > 0 ? stats.totalHours / stats.totalSessions : 0;

  return {
    totalSessions: stats.totalSessions,
    totalHours: stats.totalHours,
    totalCoins: stats.totalCoins,
    totalExperience: stats.totalExperience,
    averageSessionHours,
  };
}
