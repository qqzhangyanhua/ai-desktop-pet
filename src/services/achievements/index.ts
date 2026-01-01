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
 * 条件上下文 - 用于条件评估
 */
interface ConditionContext {
  pet_count: number;
  feed_count: number;
  play_count: number;
  chat_count: number;
  total_interactions: number;
  total_days: number;
  consecutive_days: number;
  intimacy: number;
}

/**
 * 安全的条件评估器
 * 使用声明式匹配替代 new Function，消除代码注入风险
 *
 * 支持的条件格式：
 * - 简单比较: "pet_count >= 1"
 * - AND 条件: "pet_count >= 1 AND feed_count >= 1"
 *
 * @param condition 条件字符串
 * @param context 条件上下文（变量值）
 * @returns 条件是否满足
 */
function evaluateConditionSafely(condition: string, context: ConditionContext): boolean {
  // 解析 AND 连接的多个条件
  const andParts = condition.split(/\s+AND\s+/i);

  for (const part of andParts) {
    // 解析 OR 连接的条件（如果存在）
    const orParts = part.split(/\s+OR\s+/i);
    let orResult = false;

    for (const orPart of orParts) {
      if (evaluateSingleCondition(orPart.trim(), context)) {
        orResult = true;
        break;
      }
    }

    // 所有 AND 部分都必须为 true
    if (!orResult) {
      return false;
    }
  }

  return true;
}

/**
 * 评估单个条件表达式
 * 支持: variable >= value, variable > value, variable == value, etc.
 */
function evaluateSingleCondition(expr: string, context: ConditionContext): boolean {
  // 匹配: variable operator value
  const match = expr.match(/^(\w+)\s*(>=|<=|>|<|==|!=)\s*(\d+(?:\.\d+)?)$/);

  if (!match) {
    console.warn(`[AchievementService] Invalid condition format: ${expr}`);
    return false;
  }

  const variable = match[1];
  const operator = match[2];
  const valueStr = match[3];

  if (!variable || !operator || !valueStr) {
    console.warn(`[AchievementService] Incomplete condition: ${expr}`);
    return false;
  }

  const value = parseFloat(valueStr);

  // 获取变量值（使用类型安全的方式）
  const contextKey = variable as keyof ConditionContext;
  if (!(contextKey in context)) {
    console.warn(`[AchievementService] Unknown variable: ${variable}`);
    return false;
  }

  const actualValue = context[contextKey];

  // 执行比较
  switch (operator) {
    case '>=':
      return actualValue >= value;
    case '<=':
      return actualValue <= value;
    case '>':
      return actualValue > value;
    case '<':
      return actualValue < value;
    case '==':
      return actualValue === value;
    case '!=':
      return actualValue !== value;
    default:
      console.warn(`[AchievementService] Unknown operator: ${operator}`);
      return false;
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

  // 构建条件上下文
  const context: ConditionContext = {
    pet_count: stats.today.pet,
    feed_count: stats.today.feed,
    play_count: stats.today.play,
    chat_count: stats.today.chat,
    total_interactions: stats.totalInteractions,
    total_days: stats.totalDays,
    consecutive_days: stats.consecutiveDays,
    intimacy,
  };

  try {
    return evaluateConditionSafely(condition, context);
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
