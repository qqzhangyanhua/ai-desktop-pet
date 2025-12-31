/**
 * StoryPlayerModal Component
 * 故事播放器模态框组件
 *
 * 提供睡前故事选择和播放界面
 */

import { useState, useEffect, useCallback } from 'react';
import { useRelaxationStore } from '../../stores';
import {
  getAllStories,
  getStoryById,
  getStoryPlayer,
  formatStoryTime,
} from '../../services/relaxation';
import type { BedtimeStory } from '../../services/relaxation';
import './StoryPlayerModal.css';

/** 类别标签映射 */
const CATEGORY_LABELS: Record<BedtimeStory['category'], string> = {
  nature: '自然',
  fantasy: '奇幻',
  meditation: '冥想',
  adventure: '冒险',
};

export function StoryPlayerModal() {
  const { storyPlayerVisible, currentStoryId, closeStoryPlayer } = useRelaxationStore();
  const [selectedStory, setSelectedStory] = useState<BedtimeStory | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  const allStories = getAllStories();
  const player = getStoryPlayer();

  // 初始化选中的故事
  useEffect(() => {
    if (currentStoryId) {
      const story = getStoryById(currentStoryId);
      if (story) {
        setSelectedStory(story);
      }
    } else if (allStories.length > 0) {
      setSelectedStory(allStories[0] ?? null);
    }
  }, [currentStoryId, allStories]);

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
      onComplete: () => {
        setIsPlaying(false);
      },
      onError: (error) => {
        console.error('[StoryPlayerModal] Error:', error);
        setIsPlaying(false);
      },
    });

    return () => {
      player.stop();
    };
  }, [player]);

  // 选择故事
  const handleSelectStory = useCallback(
    (story: BedtimeStory) => {
      setSelectedStory(story);
      player.stop();
      setIsPlaying(false);
      setCurrentTime(0);
    },
    [player]
  );

  // 播放/暂停
  const handlePlayPause = useCallback(async () => {
    if (!selectedStory) return;

    if (!isPlaying) {
      // 如果还没加载这个故事，先加载
      if (player.getState().currentStoryId !== selectedStory.id) {
        player.loadStory(selectedStory.id);
        setTotalDuration(selectedStory.duration * 60);
      }
      await player.play();
    } else {
      player.pause();
    }
  }, [selectedStory, isPlaying, player]);

  // 停止播放
  const handleStop = useCallback(() => {
    player.stop();
    setIsPlaying(false);
    setCurrentTime(0);
  }, [player]);

  // 关闭模态框
  const handleClose = useCallback(() => {
    player.stop();
    closeStoryPlayer();
  }, [player, closeStoryPlayer]);

  // 计算进度百分比
  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  if (!storyPlayerVisible) return null;

  return (
    <div className="story-modal-overlay">
      <div className="story-modal-backdrop" onClick={handleClose} />

      <div className="story-modal-content">
        {/* 头部 */}
        <div className="story-modal-header">
          <h2 className="story-modal-title">睡前故事</h2>
          <button className="story-modal-close" onClick={handleClose} title="关闭">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* 故事列表 */}
        <div className="story-list">
          {allStories.map((story) => (
            <button
              key={story.id}
              className={`story-item ${selectedStory?.id === story.id ? 'active' : ''}`}
              onClick={() => handleSelectStory(story)}
            >
              <div className="story-item-icon">
                {story.category === 'nature' && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z" />
                  </svg>
                )}
                {story.category === 'fantasy' && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,2L15.09,8.26L22,9.27L17,14.14L18.18,21.02L12,17.77L5.82,21.02L7,14.14L2,9.27L8.91,8.26L12,2Z" />
                  </svg>
                )}
                {story.category === 'meditation' && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,2C6.48,2 2,6.48 2,12C2,17.52 6.48,22 12,22C17.52,22 22,17.52 22,12C22,6.48 17.52,2 12,2ZM12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20Z" />
                  </svg>
                )}
                {story.category === 'adventure' && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z" />
                  </svg>
                )}
              </div>
              <div className="story-item-info">
                <span className="story-item-title">{story.title}</span>
                <span className="story-item-meta">
                  {CATEGORY_LABELS[story.category]} - {story.duration}分钟
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* 当前故事详情 */}
        {selectedStory && (
          <div className="story-detail">
            <h3 className="story-detail-title">{selectedStory.title}</h3>
            <p className="story-detail-summary">{selectedStory.summary}</p>

            {/* 进度条 */}
            <div className="story-progress">
              <div className="story-progress-bar">
                <div
                  className="story-progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="story-progress-time">
                <span>{formatStoryTime(currentTime)}</span>
                <span>{formatStoryTime(totalDuration)}</span>
              </div>
            </div>

            {/* 控制按钮 */}
            <div className="story-controls">
              <button
                className="story-control-btn secondary"
                onClick={handleStop}
                disabled={!isPlaying && currentTime === 0}
                title="停止"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 6h12v12H6z" />
                </svg>
              </button>

              <button className="story-control-btn primary" onClick={handlePlayPause}>
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

              <div className="story-control-spacer" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StoryPlayerModal;
