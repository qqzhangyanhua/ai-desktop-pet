/**
 * Greeting engine for proactive behavior
 * 生成主动问候语
 */

import { collectPetContext } from './context-collector';
import type { GreetingResult, TimeGreetingConfig } from '../../types';

/**
 * Time-based greeting configurations
 */
const TIME_GREETINGS: TimeGreetingConfig[] = [
  {
    startHour: 5,
    endHour: 9,
    templates: [
      '早安{nickname}！新的一天加油！',
      '早上好{nickname}！今天也要元气满满~',
      '早安呀{nickname}，美好的一天开始了！',
    ],
    emotion: 'happy',
  },
  {
    startHour: 9,
    endHour: 12,
    templates: [
      '上午好{nickname}！工作顺利吗？',
      '{nickname}，要不要休息一下？',
    ],
    emotion: 'happy',
  },
  {
    startHour: 12,
    endHour: 14,
    templates: [
      '中午了{nickname}，记得吃饭哦',
      '下午好{nickname}！',
    ],
    emotion: 'happy',
  },
  {
    startHour: 14,
    endHour: 18,
    templates: [
      '下午好{nickname}，继续加油！',
      '{nickname}，辛苦啦！',
    ],
    emotion: 'happy',
  },
  {
    startHour: 18,
    endHour: 22,
    templates: [
      '晚上好{nickname}，今天辛苦了',
      '{nickname}，晚上想做什么呢？',
    ],
    emotion: 'happy',
  },
  {
    startHour: 22,
    endHour: 24,
    templates: [
      '这么晚了{nickname}，早点休息吧',
      '夜深了{nickname}，该睡觉了哦',
    ],
    emotion: 'thinking',
  },
  {
    startHour: 0,
    endHour: 5,
    templates: [
      '{nickname}，这么晚还没睡？',
    ],
    emotion: 'thinking',
  },
];

/**
 * Overtime greeting (when user is working late)
 */
const OVERTIME_GREETINGS = [
  '{nickname}还在加班吗？要注意身体哦',
  '已经很晚了{nickname}，早点休息吧',
  '工作重要，身体更重要哦{nickname}',
];

/**
 * Long time no see greeting
 */
const LONG_TIME_NO_SEE_GREETINGS = [
  '{nickname}好久不见啦！',
  '终于又见到{nickname}了！',
  '{nickname}，你去哪里了？',
];

/**
 * Default greeting
 */
const DEFAULT_GREETINGS = [
  '嗨{nickname}！',
  '你好呀{nickname}！',
  '{nickname}，在吗？',
];

/**
 * Get random item from array
 */
function pickRandom<T>(arr: readonly T[]): T {
  const index = Math.floor(Math.random() * arr.length);
  return arr[index] as T;
}

/**
 * Generate time-based greeting
 */
export function generateTimeGreeting(nickname: string): GreetingResult {
  const hour = new Date().getHours();

  for (const greeting of TIME_GREETINGS) {
    if (hour >= greeting.startHour && hour < greeting.endHour) {
      const text = pickRandom(greeting.templates).replace(/{nickname}/g, nickname);
      return { text, emotion: greeting.emotion };
    }
  }

  // Fallback
  const text = pickRandom(DEFAULT_GREETINGS).replace(/{nickname}/g, nickname);
  return { text, emotion: 'neutral' };
}

/**
 * Generate context-aware greeting
 */
export async function generateContextGreeting(): Promise<GreetingResult> {
  try {
    const context = await collectPetContext();
    const { nickname } = context.profile;
    const { timeContext, status } = context;

    // Check overtime first
    if (timeContext.isOvertime && status.mood < 50) {
      const text = pickRandom(OVERTIME_GREETINGS).replace(/{nickname}/g, nickname);
      return { text, emotion: 'sad' };
    }

    // Check long time no see
    if (timeContext.hoursSinceLastInteraction > 24) {
      const text = pickRandom(LONG_TIME_NO_SEE_GREETINGS).replace(/{nickname}/g, nickname);
      return { text, emotion: 'excited' };
    }

    // Use time-based greeting
    return generateTimeGreeting(nickname);
  } catch (error) {
    console.error('[GreetingEngine] Failed to generate context greeting:', error);
    // Fallback to simple greeting
    const text = pickRandom(DEFAULT_GREETINGS).replace(/{nickname}/g, '主人');
    return { text, emotion: 'neutral' };
  }
}

/**
 * Get greeting for scheduler (async wrapper)
 */
export async function getSchedulerGreeting(): Promise<string> {
  const result = await generateContextGreeting();
  return result.text;
}

/**
 * Get greeting emotion for scheduler
 */
export async function getSchedulerGreetingEmotion(): Promise<string> {
  const result = await generateContextGreeting();
  return result.emotion;
}
