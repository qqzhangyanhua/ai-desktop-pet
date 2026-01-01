/**
 * Relaxation Panel Component
 * 放松活动面板组件
 *
 * 显示3个放松活动：呼吸放松、睡前故事、正念冥想
 */

import React from 'react';
import type { RelaxationActivityId } from '@/types/relaxation';
import { RELAXATION_ACTIVITIES } from '@/config/relaxation';
import { useRelaxationStore } from '@/stores';
import './RelaxationPanel.css';

interface RelaxationPanelProps {
  onClose: () => void;
}

/**
 * Format duration to readable string
 * 格式化时长为可读字符串
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}秒`;
  } else {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}分钟`;
  }
}

export const RelaxationPanel: React.FC<RelaxationPanelProps> = ({ onClose }) => {
  const { currentSession, isActive, startActivity } = useRelaxationStore();

  const handleActivityClick = (activityId: RelaxationActivityId) => {
    if (isActive) {
      return; // Already in session, do nothing
    }

    startActivity(activityId);
    onClose();
  };

  const isCurrentActivity = (activityId: RelaxationActivityId): boolean => {
    return currentSession?.activity.id === activityId && isActive;
  };

  return (
    <div className="relaxation-panel">
      <div className="relaxation-panel-header">
        <h2>放松时光</h2>
        <button type="button" className="relaxation-panel-close" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="relaxation-panel-content">
        <div className="relaxation-grid">
          {RELAXATION_ACTIVITIES.map((activity) => {
            const isCurrent = isCurrentActivity(activity.id);
            const isDisabled = isActive && !isCurrent;

            return (
              <button
                key={activity.id}
                type="button"
                className={`relaxation-card ${isCurrent ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
                disabled={isDisabled}
                onClick={() => handleActivityClick(activity.id)}
                title={activity.description}
              >
                <div className="relaxation-icon">{activity.icon || '🌟'}</div>
                <div className="relaxation-name">{activity.name}</div>
                <div className="relaxation-duration">{formatDuration(activity.duration)}</div>
                {activity.description && (
                  <div className="relaxation-description">{activity.description}</div>
                )}
                {isCurrent && (
                  <div className="relaxation-status">进行中...</div>
                )}
                {!isCurrent && !isDisabled && (
                  <div className="relaxation-effects">
                    {activity.effects.mood > 0 && <span>😊 +{activity.effects.mood}</span>}
                    {activity.effects.energy && activity.effects.energy > 0 && (
                      <span>⚡ +{activity.effects.energy}</span>
                    )}
                    {activity.effects.boredom && activity.effects.boredom < 0 && (
                      <span>🎯 {activity.effects.boredom}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {isActive && currentSession && (
          <div className="relaxation-progress-info">
            <p>
              正在进行：{currentSession.activity.name}
            </p>
            <div className="relaxation-progress-bar">
              <div
                className="relaxation-progress-fill"
                style={{ width: `${currentSession.progress}%` }}
              />
            </div>
            <p className="relaxation-progress-text">
              {Math.round(currentSession.progress)}% 完成
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RelaxationPanel;
