/**
 * AchievementToast Component
 *
 * 成就解锁通知 - 华丽的游戏化成就Toast
 * - 显示成就图标、名称、描述
 * - 带有闪光动画和渐入效果
 * - 自动消失或手动关闭
 */

import { useEffect } from 'react';
import { Trophy, X } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { Achievement } from '@/types';
import './AchievementToast.css';

export interface AchievementToastProps {
  achievement: Achievement;
  onClose: () => void;
  duration?: number; // 默认 5000ms
}

/**
 * 动态获取 Lucide icon 组件
 * @param iconName - Lucide icon 名称
 * @returns Icon component or null
 */
function getDynamicIcon(iconName: string): React.ComponentType<{ className?: string }> | null {
  const Icon = (LucideIcons as Record<string, unknown>)[iconName];
  if (Icon && typeof Icon === 'function') {
    return Icon as React.ComponentType<{ className?: string }>;
  }
  return null;
}

export function AchievementToast({
  achievement,
  onClose,
  duration = 5000,
}: AchievementToastProps) {
  useEffect(() => {
    if (duration <= 0) return;

    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  // 动态获取成就图标
  const AchievementIcon = getDynamicIcon(achievement.icon);

  return (
    <div className="achievement-toast">
      {/* 闪光效果背景 */}
      <div className="achievement-glow" />

      {/* 主要内容区域 */}
      <div className="achievement-content">
        {/* 左侧奖杯图标 */}
        <div className="achievement-trophy-icon">
          <Trophy className="trophy-svg" />
        </div>

        {/* 中间文本区域 */}
        <div className="achievement-info">
          {/* 成就解锁标题 */}
          <div className="achievement-unlock-label">成就解锁</div>

          {/* 成就名称 */}
          <div className="achievement-name">
            {AchievementIcon && (
              <AchievementIcon className="achievement-icon-svg w-5 h-5" />
            )}
            <span className="achievement-title">{achievement.name}</span>
          </div>

          {/* 成就描述 */}
          <div className="achievement-description">{achievement.description}</div>
        </div>

        {/* 关闭按钮 */}
        <button
          className="achievement-close-btn"
          onClick={onClose}
          aria-label="关闭成就通知"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 装饰性彩带 */}
      <div className="achievement-ribbon achievement-ribbon-left" />
      <div className="achievement-ribbon achievement-ribbon-right" />
    </div>
  );
}
