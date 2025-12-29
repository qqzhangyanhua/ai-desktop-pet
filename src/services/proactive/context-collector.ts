/**
 * Context collector for proactive behavior
 * 收集宠物上下文（用户画像、状态、记忆、时间）
 */

import { getUserProfile } from '../memory';
import { getPetStatus } from '../database/pet-status';
import { getRecentMemories } from '../memory';
import { getCurrentStage } from '../pet';
import type { PetContext, TimeContext, TimeOfDay } from '../../types';

/**
 * Get time of day
 */
function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

/**
 * Check if current time is within work hours
 */
function isWithinWorkHours(hour: number, workSchedule: PetContext['profile']['workSchedule']): boolean {
  if (!workSchedule) return false;

  const startHour = parseInt(workSchedule.start?.split(':')[0] ?? '9', 10);
  const endHour = parseInt(workSchedule.end?.split(':')[0] ?? '18', 10);

  return hour >= startHour && hour < endHour;
}

/**
 * Check if currently in overtime (work hours extended)
 */
function isOvertime(hour: number, workSchedule: PetContext['profile']['workSchedule']): boolean {
  if (!workSchedule) return false;

  const endHour = parseInt(workSchedule.end?.split(':')[0] ?? '18', 10);
  return hour >= endHour && hour < endHour + 4; // 4 hours after work ends
}

/**
 * Build time context
 */
function buildTimeContext(profile: PetContext['profile'], status: PetContext['status']): TimeContext {
  const now = new Date();
  const hour = now.getHours();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

  const workSchedule = profile.workSchedule;
  const isWorkday = workSchedule?.workdays.includes(currentDay) ?? false;

  return {
    timeOfDay: getTimeOfDay(hour),
    isWorkTime: isWorkday && isWithinWorkHours(hour, workSchedule),
    isOvertime: isWorkday && isOvertime(hour, workSchedule),
    hoursSinceLastInteraction: (Date.now() - status.lastInteraction) / (1000 * 60 * 60),
  };
}

/**
 * Collect all pet context in parallel
 */
export async function collectPetContext(): Promise<PetContext> {
  // Parallel query for performance
  const [profile, status, memories] = await Promise.all([
    getUserProfile(),
    getPetStatus(),
    getRecentMemories(5),
  ]);

  // Handle null status with default values
  const safeStatus = status ?? {
    mood: 80,
    energy: 100,
    intimacy: 0,
    lastInteraction: Date.now(),
  };

  const stage = getCurrentStage(safeStatus.intimacy);
  const timeContext = buildTimeContext(profile, safeStatus);

  return {
    profile,
    status: safeStatus,
    stage,
    recentMemories: memories,
    timeContext,
  };
}

/**
 * Enrich system prompt with context
 */
export function enrichSystemPrompt(basePrompt: string, context: PetContext): string {
  const memorySummary = context.recentMemories
    .map((m) => `- ${m.category === 'preference' ? '偏好' : m.category === 'event' ? '事件' : '习惯'}: ${m.content}`)
    .join('\n');

  const workScheduleText = context.profile.workSchedule
    ? `工作日：${context.profile.workSchedule.workdays.map((d) => ['日', '一', '二', '三', '四', '五', '六'][d]).join('、')}，${context.profile.workSchedule.start}-${context.profile.workSchedule.end}`
    : '未设置';

  return `${basePrompt}

## 用户信息
- 昵称：${context.profile.nickname}
- 作息：${context.profile.wakeUpHour}点起床，${context.profile.sleepHour}点睡觉
- 工作安排：${workScheduleText}
- 兴趣话题：${context.profile.preferredTopics.join('、') || '暂无'}

## 重要记忆
${memorySummary || '暂无'}

## 当前状态
- 关系阶段：${context.stage}
- 心情：${Math.round(context.status.mood)}/100
- 精力：${Math.round(context.status.energy)}/100
- 距离上次互动：${Math.round(context.timeContext.hoursSinceLastInteraction)}小时
`;
}

/**
 * Get time-based greeting hint
 */
export function getTimeGreetingHint(context: PetContext): string | null {
  const { timeOfDay, isWorkTime, isOvertime } = context.timeContext;
  const hour = new Date().getHours();

  // Morning greeting
  if (timeOfDay === 'morning') {
    if (isWorkTime) {
      return '早上好，新的一天开始加油！';
    }
    return '早安，今天想做什么呢？';
  }

  // Afternoon greeting
  if (timeOfDay === 'afternoon') {
    if (isOvertime) {
      return '还在加班吗？要注意休息哦';
    }
    return '下午好~';
  }

  // Evening greeting
  if (timeOfDay === 'evening') {
    return '晚上好，今天辛苦了';
  }

  // Night greeting
  if (timeOfDay === 'night') {
    if (hour >= 23) {
      return '这么晚了，早点休息吧';
    }
    return '夜深了，还没睡吗？';
  }

  return null;
}
