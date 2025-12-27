/**
 * 动作台词与表情库
 *
 * 目标：让同一个动作在不同状态下表现更“像宠物”
 * - 同一动作多条台词随机
 * - 根据养成数值做条件分支（饿/困/无聊/脏）
 * - 输出给 UI：emotion + bubble 文本 + 建议展示时长
 */

import type { EmotionType, PetActionType, PetCareStats, CareStatusReport } from '@/types';
import { getActiveExpressionPack, resolveActionExpression } from '@/services/pet/expression-pack';

export interface PetActionFeedback {
  message: string;
  emotion: EmotionType;
  bubbleDurationMs: number;
}

interface FeedbackItem {
  message: string;
  emotion: EmotionType;
  weight?: number;
}

function clampMs(ms: number): number {
  return Math.max(1500, Math.min(ms, 9000));
}

function withWarningSuffix(message: string, report: CareStatusReport): string {
  const warning = report.warnings[0];
  if (!warning) return message;
  // 让提示更像“撒娇提醒”，避免太像系统通知
  return `${message}\n（${warning}）`;
}

export function getPetActionFeedback(params: {
  action: PetActionType;
  before: PetCareStats;
  after: PetCareStats;
  report: CareStatusReport;
}): PetActionFeedback {
  const { action, before, after, report } = params;

  const durationByAction: Record<PetActionType, number> = {
    feed: 4200,
    play: 4200,
    sleep: 5200,
    work: 4200,
    transform: 4200,
    music: 4200,
    dance: 4200,
    magic: 4200,
    art: 4600,
    clean: 4200,
    brush: 4200,
    rest: 4200,
  };

  const wrap = (item: FeedbackItem): PetActionFeedback => ({
    message: withWarningSuffix(item.message, report),
    emotion: item.emotion,
    bubbleDurationMs: clampMs(durationByAction[action]),
  });

  const pack = getActiveExpressionPack();

  const ctx =
    after.isSick
      ? 'sick'
      : report.warnings.length >= 2
        ? 'warning'
        : before.satiety < 28
          ? 'hungry'
          : before.energy < 28
            ? 'tired'
            : before.boredom > 75
              ? 'bored'
              : before.hygiene < 30
                ? 'dirty'
                : report.warnings.length > 0
                  ? 'warning'
                  : 'normal';

  const resolved = resolveActionExpression(pack, action, ctx);

  // 少量“动作后状态”特判，避免丢失拟人化细节
  if (action === 'feed' && after.satiety > 90) {
    return wrap({ message: '我吃得饱饱的，幸福感拉满~', emotion: 'happy' });
  }

  if (resolved) {
    return {
      message: withWarningSuffix(resolved.message, report),
      emotion: resolved.emotion,
      bubbleDurationMs: clampMs(resolved.bubbleDurationMs),
    };
  }

  return wrap({ message: '我在呢~', emotion: 'neutral' });
}
