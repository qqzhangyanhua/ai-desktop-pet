/**
 * BreathingOverlay Component
 * 呼吸练习全屏遮罩组件
 *
 * 提供沉浸式呼吸引导体验，包含：
 * - 动态呼吸圆圈动画
 * - 阶段文字提示
 * - 进度指示
 * - 控制按钮
 */

import { useMemo } from 'react';
import { useBreathingExercise } from '../../hooks/useBreathingExercise';
import type { BreathingAction } from '../../services/relaxation';
import './BreathingOverlay.css';

interface BreathingOverlayProps {
  /** 是否显示 */
  visible: boolean;
  /** 初始模式ID */
  patternId?: string;
  /** 循环次数 */
  cycles?: number;
  /** 关闭回调 */
  onClose: () => void;
  /** 完成回调 */
  onComplete?: () => void;
}

/** 动作对应的颜色 */
const ACTION_COLORS: Record<BreathingAction, string> = {
  inhale: '#a78bfa', // 紫色 - 吸气
  hold: '#fbbf24', // 黄色 - 屏气
  exhale: '#34d399', // 绿色 - 呼气
};

/** 动作对应的显示文字 */
const ACTION_LABELS: Record<BreathingAction, string> = {
  inhale: '吸气',
  hold: '屏气',
  exhale: '呼气',
};

export function BreathingOverlay({
  visible,
  patternId = '478',
  cycles,
  onClose,
  onComplete,
}: BreathingOverlayProps) {
  const {
    state,
    currentPhase,
    currentPattern,
    allPatterns,
    formattedTimeRemaining,
    phaseProgress,
    totalProgress,
    start,
    pause,
    resume,
    stop,
    changePattern,
    toggleVoice,
    voiceEnabled,
  } = useBreathingExercise({
    patternId,
    cycles,
    onComplete,
  });

  // 计算圆圈大小（基于阶段进度）
  const circleScale = useMemo(() => {
    if (!currentPhase) return 1;

    const progress = phaseProgress / 100;

    switch (currentPhase.action) {
      case 'inhale':
        // 吸气：从小到大
        return 0.5 + progress * 0.5;
      case 'exhale':
        // 呼气：从大到小
        return 1 - progress * 0.5;
      case 'hold':
        // 屏气：保持大小
        return 1;
      default:
        return 1;
    }
  }, [currentPhase, phaseProgress]);

  // 当前动作颜色
  const currentColor = currentPhase ? ACTION_COLORS[currentPhase.action] : '#a78bfa';

  // 处理开始/暂停/恢复
  const handlePlayPause = () => {
    if (!state.isActive) {
      start();
    } else if (state.isPaused) {
      resume();
    } else {
      pause();
    }
  };

  // 处理停止并关闭
  const handleClose = () => {
    stop();
    onClose();
  };

  if (!visible) return null;

  return (
    <div className="breathing-overlay">
      {/* 背景遮罩 */}
      <div className="breathing-backdrop" onClick={handleClose} />

      {/* 主内容区 */}
      <div className="breathing-content">
        {/* 顶部：模式选择和设置 */}
        <div className="breathing-header">
          <select
            className="breathing-pattern-select"
            value={state.patternId || patternId}
            onChange={(e) => changePattern(e.target.value)}
            disabled={state.isActive}
          >
            {allPatterns.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            className={`breathing-voice-toggle ${voiceEnabled ? 'active' : ''}`}
            onClick={toggleVoice}
            title={voiceEnabled ? '关闭语音' : '开启语音'}
          >
            {voiceEnabled ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              </svg>
            )}
          </button>

          <button className="breathing-close-btn" onClick={handleClose} title="关闭">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* 中间：呼吸圆圈 */}
        <div className="breathing-circle-container">
          <div
            className="breathing-circle"
            style={{
              transform: `scale(${circleScale})`,
              backgroundColor: currentColor,
              boxShadow: `0 0 60px ${currentColor}40`,
            }}
          >
            <div className="breathing-circle-inner">
              {currentPhase && (
                <>
                  <span className="breathing-action-label">
                    {ACTION_LABELS[currentPhase.action]}
                  </span>
                  <span className="breathing-timer">{state.phaseTimeRemaining}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 指导文字 */}
        <div className="breathing-instruction">
          {currentPhase?.instruction || currentPattern?.description || '准备开始'}
        </div>

        {/* 进度信息 */}
        <div className="breathing-progress-info">
          <span>
            第 {state.currentCycle} / {state.targetCycles} 轮
          </span>
          <span className="breathing-time-remaining">{formattedTimeRemaining}</span>
        </div>

        {/* 总进度条 */}
        <div className="breathing-progress-bar">
          <div className="breathing-progress-fill" style={{ width: `${totalProgress}%` }} />
        </div>

        {/* 控制按钮 */}
        <div className="breathing-controls">
          <button className="breathing-control-btn primary" onClick={handlePlayPause}>
            {!state.isActive ? (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                开始
              </>
            ) : state.isPaused ? (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                继续
              </>
            ) : (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
                暂停
              </>
            )}
          </button>

          {state.isActive && (
            <button className="breathing-control-btn secondary" onClick={handleClose}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h12v12H6z" />
              </svg>
              结束
            </button>
          )}
        </div>

        {/* 模式描述 */}
        {currentPattern && !state.isActive && (
          <div className="breathing-pattern-description">{currentPattern.description}</div>
        )}
      </div>
    </div>
  );
}

export default BreathingOverlay;
