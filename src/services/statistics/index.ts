/**
 * Statistics Service
 * 统计服务 - 收集和管理每日互动数据
 *
 * 根据 PRD Phase 2 - 3.3 节实现
 */

import type { DailyStats, StatsSummary, TrendDataPoint, InteractionType } from '@/types';
import {
  getDailyStats,
  upsertDailyStats,
  incrementDailyInteraction,
  updateDailyAverages,
  getRecentDailyStats,
  getTotalInteractions,
  getConsecutiveDays,
  getTotalCompanionDays,
} from '@/services/database/statistics';

/**
 * 获取今天的日期字符串 (YYYY-MM-DD)
 */
function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 记录互动事件
 * 在用户与宠物互动时调用
 *
 * @param type 互动类型
 */
export async function recordInteraction(type: InteractionType | 'chat'): Promise<void> {
  const today = getTodayDateString();

  try {
    await incrementDailyInteraction(today, type);
    console.log(`[StatsService] Interaction recorded: ${type} on ${today}`);
  } catch (error) {
    console.error('[StatsService] Failed to record interaction:', error);
  }
}

/**
 * 更新每日平均属性值
 * 定期调用以更新当天的平均心情和精力值
 *
 * @param mood 当前心情值
 * @param energy 当前精力值
 */
export async function updateDailyStatusAverage(mood: number, energy: number): Promise<void> {
  const today = getTodayDateString();

  try {
    await updateDailyAverages(today, mood, energy);
  } catch (error) {
    console.error('[StatsService] Failed to update daily averages:', error);
  }
}

/**
 * 获取今日统计数据
 */
export async function getTodayStats(): Promise<DailyStats | null> {
  const today = getTodayDateString();
  return await getDailyStats(today);
}

/**
 * 获取统计汇总
 * 用于 UI 展示
 */
export async function getStatsSummary(): Promise<StatsSummary> {
  try {
    // 获取今日统计
    const todayStats = await getTodayStats();

    // 获取累计数据
    const totalInteractions = await getTotalInteractions();
    const consecutiveDays = await getConsecutiveDays();
    const totalDays = await getTotalCompanionDays();

    // 获取本周活跃天数（最近7天有互动的天数）
    const recentStats = await getRecentDailyStats(7);
    const weeklyActiveDays = recentStats.filter(
      (stat) => stat.petCount + stat.feedCount + stat.playCount + stat.chatCount > 0
    ).length;

    // 成就统计（后续集成）
    const unlockedAchievements = 0;
    const totalAchievements = 0;

    return {
      totalDays,
      totalInteractions,
      consecutiveDays,
      today: {
        pet: todayStats?.petCount ?? 0,
        feed: todayStats?.feedCount ?? 0,
        play: todayStats?.playCount ?? 0,
        chat: todayStats?.chatCount ?? 0,
      },
      weeklyActiveDays,
      unlockedAchievements,
      totalAchievements,
    };
  } catch (error) {
    console.error('[StatsService] Failed to get stats summary:', error);
    return {
      totalDays: 0,
      totalInteractions: 0,
      consecutiveDays: 0,
      today: { pet: 0, feed: 0, play: 0, chat: 0 },
      weeklyActiveDays: 0,
      unlockedAchievements: 0,
      totalAchievements: 0,
    };
  }
}

/**
 * 获取互动趋势数据（最近7天）
 * 用于绘制图表
 */
export async function getInteractionTrend(): Promise<TrendDataPoint[]> {
  try {
    const recentStats = await getRecentDailyStats(7);

    return recentStats.map((stat) => ({
      date: stat.date,
      value: stat.petCount + stat.feedCount + stat.playCount + stat.chatCount,
    }));
  } catch (error) {
    console.error('[StatsService] Failed to get interaction trend:', error);
    return [];
  }
}

/**
 * 获取心情趋势数据（最近7天）
 */
export async function getMoodTrend(): Promise<TrendDataPoint[]> {
  try {
    const recentStats = await getRecentDailyStats(7);

    return recentStats.map((stat) => ({
      date: stat.date,
      value: stat.moodAvg ?? 0,
    }));
  } catch (error) {
    console.error('[StatsService] Failed to get mood trend:', error);
    return [];
  }
}

/**
 * 获取精力趋势数据（最近7天）
 */
export async function getEnergyTrend(): Promise<TrendDataPoint[]> {
  try {
    const recentStats = await getRecentDailyStats(7);

    return recentStats.map((stat) => ({
      date: stat.date,
      value: stat.energyAvg ?? 0,
    }));
  } catch (error) {
    console.error('[StatsService] Failed to get energy trend:', error);
    return [];
  }
}

/**
 * 初始化统计服务
 * 确保今日的统计记录存在
 */
export async function initializeStatsService(): Promise<void> {
  const today = getTodayDateString();

  try {
    const todayStats = await getDailyStats(today);

    if (!todayStats) {
      // 创建今日统计记录
      await upsertDailyStats(today, {
        petCount: 0,
        feedCount: 0,
        playCount: 0,
        chatCount: 0,
        totalDuration: 0,
        moodAvg: null,
        energyAvg: null,
      });

      console.log(`[StatsService] Initialized stats for ${today}`);
    }
  } catch (error) {
    console.error('[StatsService] Failed to initialize:', error);
  }
}
