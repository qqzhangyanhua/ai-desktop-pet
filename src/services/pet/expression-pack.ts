import type { EmotionType, PetActionType, PetCareStats, CareStatusReport } from '@/types';
import { useConfigStore } from '@/stores';
import {
  DEFAULT_EXPRESSION_PACK,
  type ActionExpression,
  type ExpressionContext,
  type PetExpressionPack,
} from './expression-packs/default';
import { QQ_EXPRESSION_PACK } from './expression-packs/qq';

export type { ExpressionContext, PetExpressionPack, ActionExpression };

const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)]!;

const PACKS: PetExpressionPack[] = [DEFAULT_EXPRESSION_PACK, QQ_EXPRESSION_PACK];

export function getAvailableExpressionPacks(): Array<Pick<PetExpressionPack, 'id' | 'name'>> {
  return PACKS.map((p) => ({ id: p.id, name: p.name }));
}

export function getActiveExpressionPack(): PetExpressionPack {
  const id = useConfigStore.getState().config.behavior.expressionPackId ?? 'default';
  // 目前仅内置 default，后续可在这里扩展加载逻辑（本地文件/云端/用户自定义）
  return PACKS.find((p) => p.id === id) ?? DEFAULT_EXPRESSION_PACK;
}

export function resolveExpressionContext(stats: PetCareStats, report: CareStatusReport): ExpressionContext {
  if (stats.isSick) return 'sick';
  if (report.warnings.length > 0) return 'warning';
  if (stats.satiety < 30) return 'hungry';
  if (stats.energy < 30) return 'tired';
  if (stats.boredom > 75) return 'bored';
  if (stats.hygiene < 35) return 'dirty';
  return 'normal';
}

export interface ResolvedExpression {
  message: string;
  emotion: EmotionType;
  bubbleDurationMs: number;
}

function resolveFromActionExpression(
  actionExp: ActionExpression,
  ctx: ExpressionContext
): Omit<ResolvedExpression, 'message'> & { lines: string[] } | null {
  const lines = actionExp.lines[ctx] ?? actionExp.lines.normal ?? [];
  if (lines.length === 0) return null;

  const emotion = actionExp.emotion?.[ctx] ?? actionExp.emotion?.normal ?? 'neutral';
  const bubbleDurationMs =
    actionExp.bubbleDurationMs?.[ctx] ??
    actionExp.bubbleDurationMs?.normal ??
    (ctx === 'tired' || ctx === 'sick' ? 5200 : 4200);

  return { lines, emotion, bubbleDurationMs };
}

export function resolveActionExpression(
  pack: PetExpressionPack,
  action: PetActionType,
  ctx: ExpressionContext
): ResolvedExpression | null {
  const exp = pack.actions[action];
  if (!exp) return null;

  const primary = resolveFromActionExpression(exp, ctx);
  if (primary) {
    return {
      message: pick(primary.lines),
      emotion: primary.emotion,
      bubbleDurationMs: primary.bubbleDurationMs,
    };
  }

  const fallback = resolveFromActionExpression(exp, 'normal');
  if (!fallback) return null;
  return {
    message: pick(fallback.lines),
    emotion: fallback.emotion,
    bubbleDurationMs: fallback.bubbleDurationMs,
  };
}
