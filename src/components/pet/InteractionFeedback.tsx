/**
 * Interaction Feedback Component
 * 互动反馈组件
 *
 * 显示互动时的飘字效果（属性增益）
 */

import { useEffect, useState } from 'react';
import type { InteractionType } from '@/types';
import './InteractionFeedback.css';

interface FeedbackItem {
  id: string;
  type: InteractionType;
  value: number;
  x: number;
  y: number;
}

interface InteractionFeedbackProps {
  trigger: InteractionType | null;
  value: number;
  position: { x: number; y: number };
}

export function InteractionFeedback({
  trigger,
  value,
  position,
}: InteractionFeedbackProps) {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);

  useEffect(() => {
    if (!trigger) return;

    const id = Date.now().toString();
    const newFeedback: FeedbackItem = {
      id,
      type: trigger,
      value,
      x: position.x,
      y: position.y,
    };

    setFeedbacks((prev) => [...prev, newFeedback]);

    // 1秒后移除
    const timer = setTimeout(() => {
      setFeedbacks((prev) => prev.filter((f) => f.id !== id));
    }, 1000);

    return () => clearTimeout(timer);
  }, [trigger, value, position]);

  const getLabel = (type: InteractionType): string => {
    switch (type) {
      case 'pet':
        return '抚摸';
      case 'feed':
        return '喂食';
      case 'play':
        return '玩耍';
    }
  };

  const getColor = (type: InteractionType): string => {
    switch (type) {
      case 'pet':
        return '#FF6B9D'; // 粉色 - 亲密
      case 'feed':
        return '#6BCB77'; // 绿色 - 精力
      case 'play':
        return '#FFD93D'; // 黄色 - 心情
    }
  };

  return (
    <div className="interaction-feedback-container">
      {feedbacks.map((feedback) => (
        <div
          key={feedback.id}
          className="feedback-item"
          style={{
            left: feedback.x,
            top: feedback.y,
            color: getColor(feedback.type),
          }}
        >
          <span className="feedback-label">{getLabel(feedback.type)}</span>
          <span className="feedback-value">+{Math.round(feedback.value)}</span>
        </div>
      ))}
    </div>
  );
}
