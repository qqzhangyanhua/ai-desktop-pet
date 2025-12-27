/**
 * Feedback Animation Component
 * 实时反馈动画组件
 *
 * Displays toast-style feedback when settings change
 * 设置改变时显示吐司风格的反馈
 */

import { useEffect, useState } from 'react';
import './FeedbackAnimation.css';

export type FeedbackType = 'success' | 'info' | 'warning';

export interface FeedbackMessage {
  id: string;
  type: FeedbackType;
  message: string;
  duration?: number;
}

interface FeedbackAnimationProps {
  message: FeedbackMessage | null;
  onDismiss?: (id: string) => void;
}

const ICONS: Record<FeedbackType, string> = {
  success: '🎉',
  info: '💭',
  warning: '⚠️',
};

const DEFAULT_DURATION = 3000;

export function FeedbackAnimation({ message, onDismiss }: FeedbackAnimationProps) {
  const [visibleMessages, setVisibleMessages] = useState<FeedbackMessage[]>([]);

  useEffect(() => {
    if (!message) return;

    setVisibleMessages((prev) => [...prev, message]);

    const duration = message.duration ?? DEFAULT_DURATION;
    const timer = setTimeout(() => {
      setVisibleMessages((prev) => prev.filter((m) => m.id !== message.id));
      onDismiss?.(message.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (visibleMessages.length === 0) return null;

  return (
    <div className="feedback-container">
      {visibleMessages.map((msg) => (
        <div key={msg.id} className={`feedback-bubble feedback-${msg.type}`}>
          <span className="feedback-icon">{ICONS[msg.type]}</span>
          <span className="feedback-message">{msg.message}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Hook for managing feedback messages
 * 管理反馈消息的 Hook
 */
export function useFeedback() {
  const [currentMessage, setCurrentMessage] = useState<FeedbackMessage | null>(null);

  const showFeedback = (
    message: string,
    type: FeedbackType = 'success',
    duration?: number
  ) => {
    const feedbackMessage: FeedbackMessage = {
      id: Date.now().toString(),
      type,
      message,
      duration,
    };
    setCurrentMessage(feedbackMessage);
  };

  const clearFeedback = () => {
    setCurrentMessage(null);
  };

  return {
    currentMessage,
    showFeedback,
    clearFeedback,
  };
}
