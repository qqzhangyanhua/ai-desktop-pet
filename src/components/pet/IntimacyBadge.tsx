/**
 * Intimacy Badge Component
 * 亲密度徽章组件
 *
 * 显示宠物与用户的关系阶段（stranger/friend/soulmate）
 * 以及亲密度进度条和升级预告
 */

import { memo } from 'react';
import { usePetStatusStore } from '@/stores';
import { getCurrentStage, calculateStageProgress } from '@/services/pet';
import type { GrowthStage } from '@/types';
import './IntimacyBadge.css';

interface IntimacyBadgeProps {
  visible?: boolean;
}

const STAGE_LABELS: Record<GrowthStage, string> = {
  stranger: '陌生人',
  friend: '好朋友',
  soulmate: '灵魂伴侣',
};

const STAGE_COLORS: Record<GrowthStage, string> = {
  stranger: '#94A3B8',
  friend: '#FBBF24',
  soulmate: '#F472B6',
};

export const IntimacyBadge = memo(function IntimacyBadge({ visible = true }: IntimacyBadgeProps) {
  const { status } = usePetStatusStore();

  if (!visible) return null;

  const currentStage = getCurrentStage(status.intimacy);
  const progress = calculateStageProgress(status.intimacy);

  const nextStageValue = progress.nextStage
    ? progress.nextStage.intimacyRange[0]
    : 100;

  return (
    <div className="intimacy-badge">
      <div className="intimacy-header">
        <span className="intimacy-label">关系</span>
        <span
          className="intimacy-stage"
          style={{ color: STAGE_COLORS[currentStage] }}
        >
          {STAGE_LABELS[currentStage]}
        </span>
      </div>
      <div className="intimacy-progress-bar">
        <div
          className="intimacy-progress-fill"
          style={{
            width: `${progress.progressPercent}%`,
            backgroundColor: STAGE_COLORS[currentStage],
          }}
        />
      </div>
      <div className="intimacy-footer">
        <span className="intimacy-current">{Math.round(status.intimacy)}</span>
        <span className="intimacy-target">/ {nextStageValue}</span>
      </div>
    </div>
  );
});
