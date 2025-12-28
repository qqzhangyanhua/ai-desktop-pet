/**
 * RecordingIndicator Component
 *
 * 录音指示器 - 显示按键说话的录音状态
 * - 录音中：显示麦克风图标 + 时长 + 波形动画
 * - 处理中：显示加载动画
 * - 空闲：隐藏
 */

import { useEffect, useState } from 'react';
import { getPushToTalkManager } from '@/services/voice';
import type { PushToTalkStatus } from '@/types';
import './RecordingIndicator.css';

export function RecordingIndicator() {
  const [status, setStatus] = useState<PushToTalkStatus>('idle');
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const manager = getPushToTalkManager();

    // 监听状态变化
    manager.onStateChange((newStatus) => {
      setStatus(newStatus);
      if (newStatus === 'idle') {
        setDuration(0);
      }
    });

    // 录音时更新时长
    let timer: ReturnType<typeof setInterval> | null = null;
    if (status === 'recording') {
      timer = setInterval(() => {
        const currentDuration = manager.getRecordingDuration();
        setDuration(currentDuration);
      }, 100); // 每100ms更新一次
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [status]);

  // 空闲时不显示
  if (status === 'idle') {
    return null;
  }

  return (
    <div className="recording-indicator">
      <div className="recording-content">
        {/* 状态图标 */}
        <div className="recording-icon">
          {status === 'recording' ? (
            <MicrophoneIcon />
          ) : (
            <LoadingIcon />
          )}
        </div>

        {/* 状态文本 */}
        <div className="recording-info">
          <div className="recording-status">
            {status === 'recording' ? '正在录音...' : '正在识别...'}
          </div>
          {status === 'recording' && (
            <div className="recording-duration">
              {formatDuration(duration)}
            </div>
          )}
        </div>

        {/* 波形可视化 */}
        {status === 'recording' && <WaveformVisualizer />}
      </div>
    </div>
  );
}

/**
 * 麦克风图标
 */
function MicrophoneIcon() {
  return (
    <svg
      className="icon-microphone"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

/**
 * 加载图标
 */
function LoadingIcon() {
  return (
    <svg
      className="icon-loading"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" opacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

/**
 * 波形可视化组件
 */
function WaveformVisualizer() {
  const bars = 5; // 5个波形条

  return (
    <div className="waveform">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className="waveform-bar"
          style={{
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * 格式化时长
 * @param ms 毫秒
 * @returns "0.0s" 格式
 */
function formatDuration(ms: number): string {
  const seconds = ms / 1000;
  return `${seconds.toFixed(1)}s`;
}
