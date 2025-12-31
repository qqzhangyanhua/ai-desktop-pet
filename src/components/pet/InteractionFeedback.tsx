/**
 * Interaction Feedback Component (Enhanced)
 * 互动反馈组件 (增强版)
 *
 * 显示互动时的飘字效果（属性增益）
 * 支持多种动画类型和多属性显示
 */

import { useEffect, useState, memo } from 'react';
import { Hand, Utensils, Gamepad2, Heart, Zap, Clock } from 'lucide-react';
import type { InteractionType } from '@/types';
import type { FeedbackAnimationType, StatEffect } from '@/types/feedback';
import { DEFAULT_FEEDBACK_ANIMATIONS, FEEDBACK_COLORS } from '@/types/feedback';
import './InteractionFeedback.css';

interface FeedbackItem {
  id: string;
  type: InteractionType;
  success: boolean;
  value: number;
  effects?: StatEffect[];
  message?: string;
  animation: FeedbackAnimationType;
  x: number;
  y: number;
}

interface InteractionFeedbackProps {
  /** 触发的互动类型 */
  trigger: InteractionType | null;
  /** 主要属性变化值 */
  value: number;
  /** 位置 */
  position: { x: number; y: number };
  /** 是否成功 (默认true) */
  success?: boolean;
  /** 额外的属性变化 */
  effects?: StatEffect[];
  /** 自定义消息 */
  message?: string;
  /** 动画类型 (默认根据互动类型) */
  animation?: FeedbackAnimationType;
}

/**
 * 获取互动类型图标
 */
function getTypeIcon(type: InteractionType, size = 16) {
  switch (type) {
    case 'pet':
      return <Hand size={size} />;
    case 'feed':
      return <Utensils size={size} />;
    case 'play':
      return <Gamepad2 size={size} />;
  }
}

/**
 * 获取属性图标
 */
function getStatIcon(icon: StatEffect['icon'], size = 14) {
  switch (icon) {
    case 'mood':
      return <Heart size={size} />;
    case 'energy':
    case 'satiety':
      return <Zap size={size} />;
    case 'intimacy':
      return <Heart size={size} />;
    case 'boredom':
      return <Clock size={size} />;
    default:
      return null;
  }
}

/**
 * 获取互动类型标签
 */
function getTypeLabel(type: InteractionType): string {
  switch (type) {
    case 'pet':
      return '抚摸';
    case 'feed':
      return '喂食';
    case 'play':
      return '玩耍';
  }
}

/**
 * 动画时长映射
 */
const ANIMATION_DURATIONS: Record<FeedbackAnimationType | 'failed', number> = {
  float: 1200,
  bounce: 1000,
  shake: 800,
  sparkle: 1200,
  heart: 1300,
  failed: 600,
};

/**
 * 单个反馈项组件
 */
const FeedbackItemComponent = memo(function FeedbackItemComponent({
  item,
}: {
  item: FeedbackItem;
}) {
  const color = FEEDBACK_COLORS[item.type];
  const animationClass = item.success
    ? `feedback-item--${item.animation}`
    : 'feedback-item--failed';

  const containerClass = item.success
    ? 'feedback-label-container'
    : 'feedback-label-container feedback-label-container--failed';

  return (
    <div
      className={`feedback-item ${animationClass}`}
      style={{
        left: item.x,
        top: item.y,
        color,
      }}
    >
      {/* 标签 */}
      <div className={containerClass} style={{ borderColor: `${color}40` }}>
        <span className="feedback-icon">{getTypeIcon(item.type)}</span>
        <span className="feedback-label">
          {item.message || getTypeLabel(item.type)}
        </span>
      </div>

      {/* 数值变化 */}
      {item.success && (
        <div className="feedback-values">
          {/* 主数值 */}
          <span
            className={`feedback-value ${
              item.value >= 0
                ? 'feedback-value--positive'
                : 'feedback-value--negative'
            }`}
            style={{ color }}
          >
            {item.value >= 0 ? '+' : ''}
            {Math.round(item.value)}
          </span>

          {/* 额外属性变化 */}
          {item.effects?.map((effect, index) => (
            <span
              key={index}
              className={`feedback-value ${
                effect.delta >= 0
                  ? 'feedback-value--positive'
                  : 'feedback-value--negative'
              }`}
            >
              <span className="feedback-value-icon">
                {getStatIcon(effect.icon)}
              </span>
              {effect.delta >= 0 ? '+' : ''}
              {Math.round(effect.delta)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

/**
 * 互动反馈容器组件
 */
export function InteractionFeedback({
  trigger,
  value,
  position,
  success = true,
  effects,
  message,
  animation,
}: InteractionFeedbackProps) {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);

  useEffect(() => {
    if (!trigger) return;

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const finalAnimation = animation || DEFAULT_FEEDBACK_ANIMATIONS[trigger];

    const newFeedback: FeedbackItem = {
      id,
      type: trigger,
      success,
      value,
      effects,
      message,
      animation: finalAnimation,
      x: position.x,
      y: position.y,
    };

    setFeedbacks((prev) => [...prev, newFeedback]);

    // 动画结束后移除
    const duration = success
      ? ANIMATION_DURATIONS[finalAnimation]
      : ANIMATION_DURATIONS.failed;

    const timer = setTimeout(() => {
      setFeedbacks((prev) => prev.filter((f) => f.id !== id));
    }, duration + 100); // 额外100ms缓冲

    return () => clearTimeout(timer);
  }, [trigger, value, position, success, effects, message, animation]);

  return (
    <div className="interaction-feedback-container">
      {feedbacks.map((feedback) => (
        <FeedbackItemComponent key={feedback.id} item={feedback} />
      ))}
    </div>
  );
}

export default InteractionFeedback;
