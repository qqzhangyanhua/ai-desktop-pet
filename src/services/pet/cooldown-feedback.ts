/**
 * Cooldown Feedback Service
 * 冷却反馈服务
 *
 * 提供互动冷却中的反馈文案和表情
 */

import type { InteractionType, EmotionType } from '@/types';

/**
 * 冷却反馈配置
 */
interface CooldownFeedback {
  /** 反馈文案列表 (随机选择) */
  lines: string[];
  /** 情绪表现 */
  emotion: EmotionType;
  /** 气泡持续时间 (毫秒) */
  duration: number;
}

/**
 * 冷却反馈配置表
 */
const COOLDOWN_FEEDBACK: Record<InteractionType, CooldownFeedback> = {
  pet: {
    lines: [
      '头顶还热乎着呢~',
      '刚摸过啦，让我缓缓~',
      '摸太多会害羞的…',
      '等一下再摸嘛~',
      '让我享受一下刚才的温暖~',
    ],
    emotion: 'happy',
    duration: 3000,
  },
  feed: {
    lines: [
      '刚吃完，肚子还鼓鼓的~',
      '好饱，吃不下了…',
      '让我消化一下嘛~',
      '我还没饿呢~',
      '撑到了…等会儿再吃吧',
    ],
    emotion: 'happy',
    duration: 3000,
  },
  play: {
    lines: [
      '让我歇会儿…',
      '太累了，下次吧~',
      '我需要喘口气…',
      '刚玩过，有点累了~',
      '等我恢复一下体力~',
    ],
    emotion: 'neutral',
    duration: 3000,
  },
};

/**
 * 获取冷却反馈信息
 *
 * @param type - 互动类型
 * @param remainingSeconds - 剩余冷却时间（秒）
 * @returns 反馈信息
 */
export function getCooldownFeedback(
  type: InteractionType,
  remainingSeconds: number
): {
  message: string;
  emotion: EmotionType;
  duration: number;
  remainingText: string;
} {
  const config = COOLDOWN_FEEDBACK[type];
  const randomIndex = Math.floor(Math.random() * config.lines.length);
  const baseLine = config.lines[randomIndex] ?? config.lines[0] ?? '';

  // 格式化剩余时间
  const remainingText = formatRemainingTime(remainingSeconds);

  return {
    message: baseLine,
    emotion: config.emotion,
    duration: config.duration,
    remainingText,
  };
}

/**
 * 格式化剩余时间
 */
function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) {
    return '可以啦';
  }

  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);

  if (minutes > 0) {
    return `还要等 ${minutes}分${secs > 0 ? `${secs}秒` : ''}`;
  }

  return `还要等 ${secs}秒`;
}

/**
 * 获取冷却中的简短提示（用于反馈动画）
 */
export function getCooldownShortMessage(type: InteractionType): string {
  switch (type) {
    case 'pet':
      return '冷却中~';
    case 'feed':
      return '还饱着呢~';
    case 'play':
      return '休息中~';
  }
}

/**
 * 检查是否应该显示冷却提示
 * 只有在用户尝试互动时才显示
 */
export function shouldShowCooldownFeedback(
  _type: InteractionType,
  onCooldown: boolean
): boolean {
  return onCooldown;
}
