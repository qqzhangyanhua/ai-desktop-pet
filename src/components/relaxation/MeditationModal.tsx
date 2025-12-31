/**
 * MeditationModal Component
 * 冥想引导模态框组件
 *
 * 提供正念冥想选择和引导界面
 */

import { useState, useEffect, useCallback } from 'react';
import { useRelaxationStore } from '../../stores';
import {
  getAllMeditations,
  getMeditationById,
  getMeditationPlayer,
  formatMeditationTime,
} from '../../services/relaxation';
import type { MeditationSession, MeditationSegment } from '../../services/relaxation';
import './MeditationModal.css';

/** 类型标签映射 */
const TYPE_LABELS: Record<MeditationSession['type'], string> = {
  body_scan: '身体扫描',
  focused: '专注冥想',
  loving_kindness: '慈心冥想',
};

/** 段落类型图标映射 */
const SEGMENT_ICONS: Record<MeditationSegment['type'], string> = {
  intro: '',
  breathing: '',
  focus: '',
  guidance: '',
  affirmation: '',
  integration: '',
  closing: '',
};

export function MeditationModal() {
  const { meditationVisible, currentMeditationId, closeMeditation } = useRelaxationStore();
  const [selectedSession, setSelectedSession] = useState<MeditationSession | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [currentSegment, setCurrentSegment] = useState<MeditationSegment | null>(null);
  const [segmentIndex, setSegmentIndex] = useState(0);

  const allSessions = getAllMeditations();
  const player = getMeditationPlayer();

  // 初始化选中的会话
  useEffect(() => {
    if (currentMeditationId) {
      const session = getMeditationById(currentMeditationId);
      if (session) {
        setSelectedSession(session);
      }
    } else if (allSessions.length > 0) {
      setSelectedSession(allSessions[0] ?? null);
    }
  }, [currentMeditationId, allSessions]);

  // 设置播放器回调
  useEffect(() => {
    player.setCallbacks({
      onPlayStateChange: (playing) => {
        setIsPlaying(playing);
      },
      onProgress: (current, total) => {
        setCurrentTime(current);
        setTotalDuration(total);
      },
      onSegmentChange: (segment, index) => {
        setCurrentSegment(segment);
        setSegmentIndex(index);
      },
      onComplete: () => {
        setIsPlaying(false);
      },
      onError: (error) => {
        console.error('[MeditationModal] Error:', error);
        setIsPlaying(false);
      },
    });

    return () => {
      player.stop();
    };
  }, [player]);

  // 选择会话
  const handleSelectSession = useCallback(
    (session: MeditationSession) => {
      setSelectedSession(session);
      player.stop();
      setIsPlaying(false);
      setCurrentTime(0);
      setCurrentSegment(null);
      setSegmentIndex(0);
    },
    [player]
  );

  // 播放/暂停
  const handlePlayPause = useCallback(async () => {
    if (!selectedSession) return;

    if (!isPlaying) {
      // 如果还没加载这个会话，先加载
      if (player.getState().currentSessionId !== selectedSession.id) {
        player.loadSession(selectedSession.id);
        // 计算总时长
        const total = selectedSession.segments.reduce((sum, seg) => sum + seg.duration, 0);
        setTotalDuration(total);
      }
      await player.play();
    } else {
      player.pause();
    }
  }, [selectedSession, isPlaying, player]);

  // 停止播放
  const handleStop = useCallback(() => {
    player.stop();
    setIsPlaying(false);
    setCurrentTime(0);
    setCurrentSegment(null);
    setSegmentIndex(0);
  }, [player]);

  // 关闭模态框
  const handleClose = useCallback(() => {
    player.stop();
    closeMeditation();
  }, [player, closeMeditation]);

  // 计算进度百分比
  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  if (!meditationVisible) return null;

  return (
    <div className="meditation-modal-overlay">
      <div className="meditation-modal-backdrop" onClick={handleClose} />

      <div className="meditation-modal-content">
        {/* 头部 */}
        <div className="meditation-modal-header">
          <h2 className="meditation-modal-title">正念冥想</h2>
          <button className="meditation-modal-close" onClick={handleClose} title="关闭">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* 会话列表 */}
        <div className="meditation-list">
          {allSessions.map((session) => (
            <button
              key={session.id}
              className={`meditation-item ${selectedSession?.id === session.id ? 'active' : ''}`}
              onClick={() => handleSelectSession(session)}
            >
              <div className="meditation-item-icon">
                {session.type === 'body_scan' && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,2A2,2 0 0,1 14,4A2,2 0 0,1 12,6A2,2 0 0,1 10,4A2,2 0 0,1 12,2M10.5,7H13.5A2,2 0 0,1 15.5,9V14.5H14V22H10V14.5H8.5V9A2,2 0 0,1 10.5,7Z" />
                  </svg>
                )}
                {session.type === 'focused' && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z" />
                  </svg>
                )}
                {session.type === 'loving_kindness' && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5C2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z" />
                  </svg>
                )}
              </div>
              <div className="meditation-item-info">
                <span className="meditation-item-title">{session.title}</span>
                <span className="meditation-item-meta">
                  {TYPE_LABELS[session.type]} - {session.duration}分钟
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* 当前会话详情 */}
        {selectedSession && (
          <div className="meditation-detail">
            <h3 className="meditation-detail-title">{selectedSession.title}</h3>
            <p className="meditation-detail-desc">{selectedSession.description}</p>

            {/* 当前段落提示 */}
            {currentSegment && isPlaying && (
              <div className="meditation-segment">
                <span className="meditation-segment-icon">
                  {SEGMENT_ICONS[currentSegment.type]}
                </span>
                <span className="meditation-segment-instruction">
                  {currentSegment.instruction || `第 ${segmentIndex + 1} 段`}
                </span>
              </div>
            )}

            {/* 进度条 */}
            <div className="meditation-progress">
              <div className="meditation-progress-bar">
                <div
                  className="meditation-progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="meditation-progress-time">
                <span>{formatMeditationTime(currentTime)}</span>
                <span>{formatMeditationTime(totalDuration)}</span>
              </div>
            </div>

            {/* 控制按钮 */}
            <div className="meditation-controls">
              <button
                className="meditation-control-btn secondary"
                onClick={handleStop}
                disabled={!isPlaying && currentTime === 0}
                title="停止"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 6h12v12H6z" />
                </svg>
              </button>

              <button className="meditation-control-btn primary" onClick={handlePlayPause}>
                {isPlaying ? (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              <div className="meditation-control-spacer" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MeditationModal;
