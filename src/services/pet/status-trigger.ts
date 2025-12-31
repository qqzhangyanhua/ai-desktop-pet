/**
 * Status Trigger Service
 * 状态阈值触发服务
 *
 * 检测宠物状态是否达到阈值，触发状态气泡提示
 * 支持配置驱动、独立冷却
 */

import type { PetCareStats, EmotionType } from '@/types';
import type { StatusBubble, BubbleAction, BubbleType } from '@/types/bubble';
import { createStatusBubble, BUBBLE_PRIORITY } from '@/types/bubble';

/**
 * 阈值操作符
 */
type ThresholdOperator = '<' | '>' | '<=' | '>=';

/**
 * 状态阈值配置
 */
interface StatusThreshold {
  /** 唯一标识 */
  id: string;
  /** 状态属性 */
  stat: keyof PetCareStats;
  /** 比较操作符 */
  operator: ThresholdOperator;
  /** 阈值 */
  value: number;
  /** 冷却时间 (毫秒) */
  cooldown: number;
  /** 气泡配置 */
  bubble: {
    type: BubbleType;
    priority: number;
    message: string;
    emotion: EmotionType;
    actions?: BubbleAction[];
    duration: number;
    dismissible: boolean;
  };
}

/**
 * 预设状态阈值配置
 */
const STATUS_THRESHOLDS: StatusThreshold[] = [
  // 饱腹度警告
  {
    id: 'satiety_low',
    stat: 'satiety',
    operator: '<',
    value: 30,
    cooldown: 30 * 60 * 1000, // 30分钟
    bubble: {
      type: 'need',
      priority: BUBBLE_PRIORITY.HIGH,
      message: '肚子咕咕叫...',
      emotion: 'sad',
      actions: [
        { label: '喂食', type: 'feed' },
        { label: '等会儿', type: 'dismiss' },
      ],
      duration: 8000,
      dismissible: true,
    },
  },
  // 严重饥饿
  {
    id: 'satiety_critical',
    stat: 'satiety',
    operator: '<',
    value: 15,
    cooldown: 15 * 60 * 1000, // 15分钟
    bubble: {
      type: 'need',
      priority: BUBBLE_PRIORITY.URGENT,
      message: '好饿好饿...快要饿晕了...',
      emotion: 'sad',
      actions: [
        { label: '马上喂食', type: 'feed' },
      ],
      duration: 0, // 不自动消失
      dismissible: false,
    },
  },
  // 精力不足
  {
    id: 'energy_low',
    stat: 'energy',
    operator: '<',
    value: 20,
    cooldown: 20 * 60 * 1000, // 20分钟
    bubble: {
      type: 'need',
      priority: BUBBLE_PRIORITY.HIGH - 1,
      message: '好困...想休息一下...',
      emotion: 'neutral',
      actions: [
        { label: '陪陪我', type: 'pet' },
        { label: '稍后', type: 'dismiss' },
      ],
      duration: 6000,
      dismissible: true,
    },
  },
  // 心情低落
  {
    id: 'mood_low',
    stat: 'mood',
    operator: '<',
    value: 30,
    cooldown: 25 * 60 * 1000, // 25分钟
    bubble: {
      type: 'need',
      priority: BUBBLE_PRIORITY.HIGH - 1,
      message: '有点不开心...',
      emotion: 'sad',
      actions: [
        { label: '摸摸头', type: 'pet' },
        { label: '一起玩', type: 'play' },
      ],
      duration: 6000,
      dismissible: true,
    },
  },
  // 严重心情低落
  {
    id: 'mood_critical',
    stat: 'mood',
    operator: '<',
    value: 15,
    cooldown: 15 * 60 * 1000, // 15分钟
    bubble: {
      type: 'need',
      priority: BUBBLE_PRIORITY.URGENT,
      message: '心情很差...需要安慰...',
      emotion: 'sad',
      actions: [
        { label: '安慰', type: 'pet' },
      ],
      duration: 0,
      dismissible: false,
    },
  },
  // 无聊
  {
    id: 'boredom_high',
    stat: 'boredom',
    operator: '>',
    value: 70,
    cooldown: 15 * 60 * 1000, // 15分钟
    bubble: {
      type: 'need',
      priority: BUBBLE_PRIORITY.MEDIUM,
      message: '好无聊啊...陪我玩嘛~',
      emotion: 'neutral',
      actions: [
        { label: '玩耍', type: 'play' },
        { label: '等会儿', type: 'dismiss' },
      ],
      duration: 6000,
      dismissible: true,
    },
  },
  // 生病状态
  {
    id: 'sick',
    stat: 'isSick',
    operator: '>',
    value: 0, // boolean转换为number，true > 0
    cooldown: 10 * 60 * 1000, // 10分钟
    bubble: {
      type: 'need',
      priority: BUBBLE_PRIORITY.URGENT,
      message: '不太舒服...头有点晕...',
      emotion: 'sad',
      actions: [
        { label: '照顾', type: 'pet' },
      ],
      duration: 0,
      dismissible: false,
    },
  },
];

/**
 * 冷却时间记录
 */
const cooldownMap = new Map<string, number>();

/**
 * 检查阈值条件是否满足
 */
function checkCondition(
  stats: PetCareStats,
  threshold: StatusThreshold
): boolean {
  const rawValue = stats[threshold.stat];
  // 将 boolean 转换为 number
  let value: number;
  if (typeof rawValue === 'boolean') {
    value = rawValue ? 1 : 0;
  } else if (typeof rawValue === 'number') {
    value = rawValue;
  } else {
    return false;
  }

  switch (threshold.operator) {
    case '<':
      return value < threshold.value;
    case '>':
      return value > threshold.value;
    case '<=':
      return value <= threshold.value;
    case '>=':
      return value >= threshold.value;
    default:
      return false;
  }
}

/**
 * 检查是否在冷却中
 */
function isOnCooldown(thresholdId: string, cooldownMs: number): boolean {
  const lastTrigger = cooldownMap.get(thresholdId);
  if (!lastTrigger) {
    return false;
  }
  return Date.now() - lastTrigger < cooldownMs;
}

/**
 * 记录触发时间
 */
function recordTrigger(thresholdId: string): void {
  cooldownMap.set(thresholdId, Date.now());
}

/**
 * 检查状态阈值并返回需要显示的气泡
 * 返回优先级最高的满足条件的气泡
 *
 * @param stats - 当前宠物状态
 * @returns 状态气泡或null
 */
export function checkStatusThresholds(
  stats: PetCareStats
): StatusBubble | null {
  // 找出所有满足条件且不在冷却中的阈值
  const triggeredThresholds = STATUS_THRESHOLDS.filter((threshold) => {
    if (isOnCooldown(threshold.id, threshold.cooldown)) {
      return false;
    }
    return checkCondition(stats, threshold);
  });

  // 无满足条件的阈值
  if (triggeredThresholds.length === 0) {
    return null;
  }

  // 按优先级排序，取最高优先级
  triggeredThresholds.sort((a, b) => b.bubble.priority - a.bubble.priority);
  const highestPriority = triggeredThresholds[0];

  if (!highestPriority) {
    return null;
  }

  // 记录触发时间
  recordTrigger(highestPriority.id);

  // 创建气泡
  return createStatusBubble(highestPriority.bubble);
}

/**
 * 获取状态阈值触发的紧急程度
 *
 * @param stats - 当前宠物状态
 * @returns 是否为紧急状态
 */
export function isUrgentStatus(stats: PetCareStats): boolean {
  const urgentThresholds = STATUS_THRESHOLDS.filter(
    (t) => t.bubble.priority >= BUBBLE_PRIORITY.URGENT
  );

  return urgentThresholds.some((threshold) =>
    checkCondition(stats, threshold)
  );
}

/**
 * 获取当前状态的所有警告
 *
 * @param stats - 当前宠物状态
 * @returns 警告消息列表
 */
export function getStatusWarnings(stats: PetCareStats): string[] {
  const warnings: string[] = [];

  STATUS_THRESHOLDS.forEach((threshold) => {
    if (checkCondition(stats, threshold)) {
      warnings.push(threshold.bubble.message);
    }
  });

  return warnings;
}

/**
 * 重置指定阈值的冷却时间
 *
 * @param thresholdId - 阈值ID
 */
export function resetThresholdCooldown(thresholdId: string): void {
  cooldownMap.delete(thresholdId);
}

/**
 * 重置所有阈值冷却时间
 */
export function resetAllThresholdCooldowns(): void {
  cooldownMap.clear();
}

/**
 * 获取阈值配置列表（用于调试）
 */
export function getThresholdConfigs(): StatusThreshold[] {
  return [...STATUS_THRESHOLDS];
}
