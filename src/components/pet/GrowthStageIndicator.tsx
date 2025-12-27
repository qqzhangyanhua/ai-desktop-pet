/**
 * Growth Stage Indicator Component
 * 成长阶段指示器组件
 *
 * 展示宠物当前的成长阶段、进度和解锁功能
 */

import { usePetStatusStore } from '@/stores';
import './GrowthStageIndicator.css';

export function GrowthStageIndicator() {
  const getStageProgress = usePetStatusStore((state) => state.getStageProgress);
  const progress = getStageProgress();

  const { config, progressPercent, intimacyToNext, nextStage } = progress;

  // 阶段图标映射
  const stageIcons: Record<string, string> = {
    stranger: '🤝',
    friend: '👥',
    soulmate: '💝',
  };

  // 阶段颜色映射
  const stageColors: Record<string, string> = {
    stranger: '#94a3b8', // 灰蓝色
    friend: '#60a5fa', // 蓝色
    soulmate: '#f472b6', // 粉色
  };

  const currentColor = stageColors[progress.currentStage] || '#94a3b8';

  return (
    <div className="growth-stage-indicator">
      {/* 阶段标题 */}
      <div className="stage-header">
        <span className="stage-icon" style={{ fontSize: '24px' }}>
          {stageIcons[progress.currentStage]}
        </span>
        <div className="stage-info">
          <div className="stage-name">{config.name}</div>
          <div className="stage-description">{config.description}</div>
        </div>
      </div>

      {/* 进度条 */}
      <div className="stage-progress">
        <div className="progress-label">
          <span>亲密度: {Math.round(progress.intimacy)}</span>
          {intimacyToNext !== null && (
            <span className="progress-hint">距离下一阶段还需 {Math.round(intimacyToNext)}</span>
          )}
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: currentColor,
            }}
          />
        </div>
        <div className="progress-percent">{Math.round(progressPercent)}%</div>
      </div>

      {/* 下一阶段预告 */}
      {nextStage && (
        <div className="next-stage">
          <div className="next-stage-title">
            <span>下一阶段: {nextStage.name}</span>
            <span className="next-stage-icon">{stageIcons[nextStage.stage]}</span>
          </div>
          <div className="next-stage-unlocks">
            {nextStage.unlocks
              .filter((unlock) => !config.unlocks.includes(unlock))
              .map((unlock, idx) => (
                <div key={idx} className="unlock-item locked">
                  <span className="unlock-icon">🔒</span>
                  <span>{unlock}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 当前解锁功能 */}
      <div className="current-unlocks">
        <div className="unlocks-title">已解锁功能</div>
        <div className="unlocks-list">
          {config.unlocks.map((unlock, idx) => (
            <div key={idx} className="unlock-item unlocked">
              <span className="unlock-icon">✓</span>
              <span>{unlock}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
