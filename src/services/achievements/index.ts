/**
 * Achievement Service
 * 成就系统服务 - 管理成就解锁和检查
 *
 * 根据 PRD Phase 2 - 3.4 节实现
 */

import type { Achievement, AchievementType, StatsSummary } from '@/types';
import {
  getAllAchievements,
  getUnlockedAchievements,
  createAchievementsBatch,
  unlockAchievement,
  getAchievementStats,
} from '@/services/database/achievements';
import {
  getTotalInteractions,
  getConsecutiveDays,
  getTotalCompanionDays,
} from '@/services/database/statistics';

/**
 * 预设成就定义
 * 根据 PRD 定义的成就类型
 */
const PRESET_ACHIEVEMENTS: Array<
  Omit<Achievement, 'isUnlocked' | 'unlockedAt' | 'createdAt'>
> = [
  // 互动类成就
  {
    id: 'first_pet',
    type: 'interaction' as AchievementType,
    name: '初次相遇',
    description: '第一次抚摸宠物',
    icon: 'Hand',
    unlockCondition: 'pet_count >= 1',
  },
  {
    id: 'pet_10',
    type: 'interaction' as AchievementType,
    name: '熟悉的手感',
    description: '累计抚摸10次',
    icon: 'HandHeart',
    unlockCondition: 'pet_count >= 10',
  },
  {
    id: 'pet_100',
    type: 'interaction' as AchievementType,
    name: '抚摸大师',
    description: '累计抚摸100次',
    icon: 'Medal',
    unlockCondition: 'pet_count >= 100',
  },
  {
    id: 'feed_10',
    type: 'interaction' as AchievementType,
    name: '营养师',
    description: '累计喂食10次',
    icon: 'Utensils',
    unlockCondition: 'feed_count >= 10',
  },
  {
    id: 'play_10',
    type: 'interaction' as AchievementType,
    name: '玩伴',
    description: '累计玩耍10次',
    icon: 'Gamepad2',
    unlockCondition: 'play_count >= 10',
  },
  {
    id: 'chat_10',
    type: 'interaction' as AchievementType,
    name: '话痨',
    description: '累计对话10次',
    icon: 'MessageSquare',
    unlockCondition: 'chat_count >= 10',
  },
  {
    id: 'interaction_100',
    type: 'interaction' as AchievementType,
    name: '互动达人',
    description: '累计互动100次',
    icon: 'Star',
    unlockCondition: 'total_interactions >= 100',
  },
  {
    id: 'interaction_500',
    type: 'interaction' as AchievementType,
    name: '铁杆玩家',
    description: '累计互动500次',
    icon: 'Trophy',
    unlockCondition: 'total_interactions >= 500',
  },

  // 陪伴类成就
  {
    id: 'companion_1',
    type: 'duration' as AchievementType,
    name: '初识',
    description: '陪伴1天',
    icon: 'Sprout',
    unlockCondition: 'total_days >= 1',
  },
  {
    id: 'companion_7',
    type: 'duration' as AchievementType,
    name: '一周之约',
    description: '陪伴7天',
    icon: 'Leaf',
    unlockCondition: 'total_days >= 7',
  },
  {
    id: 'companion_30',
    type: 'duration' as AchievementType,
    name: '月度伙伴',
    description: '陪伴30天',
    icon: 'TreeDeciduous',
    unlockCondition: 'total_days >= 30',
  },
  {
    id: 'companion_100',
    type: 'duration' as AchievementType,
    name: '百日守护',
    description: '陪伴100天',
    icon: 'TreePine',
    unlockCondition: 'total_days >= 100',
  },
  {
    id: 'consecutive_7',
    type: 'duration' as AchievementType,
    name: '持之以恒',
    description: '连续互动7天',
    icon: 'Calendar',
    unlockCondition: 'consecutive_days >= 7',
  },
  {
    id: 'consecutive_30',
    type: 'duration' as AchievementType,
    name: '日久生情',
    description: '连续互动30天',
    icon: 'Heart',
    unlockCondition: 'consecutive_days >= 30',
  },

  // 亲密度类成就
  {
    id: 'intimacy_30',
    type: 'intimacy' as AchievementType,
    name: '破冰',
    description: '亲密度达到30',
    icon: 'Snowflake',
    unlockCondition: 'intimacy >= 30',
  },
  {
    id: 'intimacy_50',
    type: 'intimacy' as AchievementType,
    name: '好友',
    description: '亲密度达到50',
    icon: 'Users',
    unlockCondition: 'intimacy >= 50',
  },
  {
    id: 'intimacy_70',
    type: 'intimacy' as AchievementType,
    name: '挚友',
    description: '亲密度达到70',
    icon: 'HeartHandshake',
    unlockCondition: 'intimacy >= 70',
  },
  {
    id: 'intimacy_100',
    type: 'intimacy' as AchievementType,
    name: '灵魂伴侣',
    description: '亲密度达到100',
    icon: 'Sparkles',
    unlockCondition: 'intimacy >= 100',
  },

  // 特殊成就
  {
    id: 'first_chat',
    type: 'special' as AchievementType,
    name: '第一次对话',
    description: '与宠物进行第一次对话',
    icon: 'MessagesSquare',
    unlockCondition: 'chat_count >= 1',
  },
  {
    id: 'all_interactions',
    type: 'special' as AchievementType,
    name: '全面发展',
    description: '体验所有互动类型（抚摸、喂食、玩耍、对话）',
    icon: 'Target',
    unlockCondition: 'pet_count >= 1 AND feed_count >= 1 AND play_count >= 1 AND chat_count >= 1',
  },
];

/**
 * 初始化成就系统
 * 在应用启动时调用，确保预设成就已创建
 */
export async function initializeAchievements(): Promise<void> {
  try {
    await createAchievementsBatch(PRESET_ACHIEVEMENTS);
    console.log('[AchievementService] Achievements initialized');
  } catch (error) {
    console.error('[AchievementService] Failed to initialize achievements:', error);
  }
}

/**
 * 检查单个成就是否满足解锁条件
 *
 * @param achievement 成就对象
 * @param stats 当前统计数据
 * @param intimacy 当前亲密度
 * @returns 是否满足解锁条件
 */
function checkAchievementCondition(
  achievement: Achievement,
  stats: StatsSummary,
  intimacy: number
): boolean {
  const condition = achievement.unlockCondition;

  // 解析条件字符串（简单实现，支持常见条件）
  try {
    // 替换变量
    const processedCondition = condition
      .replace(/pet_count/g, stats.today.pet.toString())
      .replace(/feed_count/g, stats.today.feed.toString())
      .replace(/play_count/g, stats.today.play.toString())
      .replace(/chat_count/g, stats.today.chat.toString())
      .replace(/total_interactions/g, stats.totalInteractions.toString())
      .replace(/total_days/g, stats.totalDays.toString())
      .replace(/consecutive_days/g, stats.consecutiveDays.toString())
      .replace(/intimacy/g, intimacy.toString())
      .replace(/AND/g, '&&')
      .replace(/OR/g, '||');

    // 使用 Function 构造器评估条件（仅用于简单条件）
    // eslint-disable-next-line no-new-func
    const result = new Function(`return ${processedCondition}`)();
    return Boolean(result);
  } catch (error) {
    console.warn(`[AchievementService] Failed to evaluate condition: ${condition}`, error);
    return false;
  }
}

/**
 * 检查并解锁成就
 * 在互动、状态更新等事件后调用
 *
 * @param stats 当前统计数据
 * @param intimacy 当前亲密度
 * @returns 新解锁的成就列表
 */
export async function checkAndUnlockAchievements(
  stats: StatsSummary,
  intimacy: number
): Promise<Achievement[]> {
  try {
    // 获取所有成就
    const allAchievements = await getAllAchievements();

    // 过滤未解锁的成就
    const lockedAchievements = allAchievements.filter((a) => !a.isUnlocked);

    // 检查每个成就的解锁条件
    const newlyUnlocked: Achievement[] = [];
    for (const achievement of lockedAchievements) {
      const shouldUnlock = checkAchievementCondition(achievement, stats, intimacy);

      if (shouldUnlock) {
        const unlocked = await unlockAchievement(achievement.id);
        if (unlocked) {
          newlyUnlocked.push(achievement);
          console.log(`[AchievementService] Achievement unlocked: ${achievement.name}`);
        }
      }
    }

    return newlyUnlocked;
  } catch (error) {
    console.error('[AchievementService] Failed to check achievements:', error);
    return [];
  }
}

/**
 * 获取所有成就
 */
export async function getAchievements(): Promise<Achievement[]> {
  return await getAllAchievements();
}

/**
 * 获取已解锁成就
 */
export async function getUnlockedAchievementsList(): Promise<Achievement[]> {
  return await getUnlockedAchievements();
}

/**
 * 获取成就统计
 */
export async function getAchievementStatistics(): Promise<{
  total: number;
  unlocked: number;
  percentage: number;
}> {
  return await getAchievementStats();
}

/**
 * 手动触发成就检查（用于定时检查或手动触发）
 * 从数据库读取最新数据进行检查
 */
export async function triggerAchievementCheck(intimacy: number): Promise<Achievement[]> {
  try {
    // 获取统计数据
    const totalInteractions = await getTotalInteractions();
    const consecutiveDays = await getConsecutiveDays();
    const totalDays = await getTotalCompanionDays();

    // 构建统计摘要（简化版）
    const stats: StatsSummary = {
      totalDays,
      totalInteractions,
      consecutiveDays,
      today: { pet: 0, feed: 0, play: 0, chat: 0 }, // 今日数据不影响大多数成就
      weeklyActiveDays: 0,
      unlockedAchievements: 0,
      totalAchievements: 0,
    };

    return await checkAndUnlockAchievements(stats, intimacy);
  } catch (error) {
    console.error('[AchievementService] Failed to trigger achievement check:', error);
    return [];
  }
}
