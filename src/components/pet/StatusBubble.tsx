/**
 * Status Bubble Component
 * 状态气泡组件
 *
 * 显示宠物状态提示、主动请求和互动反馈
 * 支持优先级队列、自动消失、操作按钮
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Hand, Utensils, Gamepad2, X } from 'lucide-react';
import type { StatusBubble as StatusBubbleType, BubbleAction } from '@/types';
import type { InteractionType } from '@/types';
import './StatusBubble.css';

interface StatusBubbleProps {
  /** 当前显示的气泡 */
  bubble: StatusBubbleType | null;
  /** 是否为紧急状态 */
  urgent?: boolean;
  /** 按钮点击回调 */
  onAction?: (actionType: InteractionType | 'dismiss') => void;
  /** 气泡消失回调 */
  onDismiss?: () => void;
}

/**
 * 获取动作按钮图标
 */
function getActionIcon(type: InteractionType | 'dismiss') {
  switch (type) {
    case 'pet':
      return <Hand size={14} />;
    case 'feed':
      return <Utensils size={14} />;
    case 'play':
      return <Gamepad2 size={14} />;
    case 'dismiss':
      return <X size={14} />;
    default:
      return null;
  }
}

export function StatusBubble({
  bubble,
  urgent = false,
  onAction,
  onDismiss,
}: StatusBubbleProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // 清理定时器
  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // 处理气泡消失
  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    clearTimers();

    // 等待退出动画完成
    setTimeout(() => {
      setIsExiting(false);
      onDismiss?.();
    }, 250);
  }, [clearTimers, onDismiss]);

  // 处理按钮点击
  const handleActionClick = useCallback(
    (action: BubbleAction) => {
      onAction?.(action.type);
      if (action.type === 'dismiss') {
        handleDismiss();
      }
    },
    [onAction, handleDismiss]
  );

  // 设置自动消失定时器
  useEffect(() => {
    if (!bubble) {
      setProgress(100);
      return;
    }

    clearTimers();
    setIsExiting(false);
    setProgress(100);

    // 如果 duration > 0，设置自动消失
    if (bubble.duration > 0) {
      startTimeRef.current = Date.now();

      // 进度条更新
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = Math.max(0, 100 - (elapsed / bubble.duration) * 100);
        setProgress(remaining);
      }, 50);

      // 自动消失定时器
      timerRef.current = setTimeout(() => {
        handleDismiss();
      }, bubble.duration);
    }

    return clearTimers;
  }, [bubble, clearTimers, handleDismiss]);

  // 无气泡时不渲染
  if (!bubble) {
    return null;
  }

  // 构建类名
  const bubbleClasses = [
    'status-bubble',
    `status-bubble--${bubble.type}`,
    urgent ? 'status-bubble--urgent' : '',
    isExiting ? 'status-bubble--exit' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="status-bubble-container">
      <div className={bubbleClasses}>
        {/* 可关闭按钮 */}
        {bubble.dismissible && (
          <button
            className="status-bubble__dismiss no-drag"
            onClick={handleDismiss}
            aria-label="关闭"
          >
            <X size={12} />
          </button>
        )}

        {/* 消息内容 */}
        <div className="status-bubble__message">{bubble.message}</div>

        {/* 操作按钮 */}
        {bubble.actions && bubble.actions.length > 0 && (
          <div className="status-bubble__actions">
            {bubble.actions.map((action, index) => (
              <button
                key={action.type}
                className={`status-bubble__action-btn no-drag ${
                  index === 0
                    ? 'status-bubble__action-btn--primary'
                    : 'status-bubble__action-btn--secondary'
                }`}
                onClick={() => handleActionClick(action)}
              >
                {getActionIcon(action.type)}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* 进度条 */}
        {bubble.duration > 0 && (
          <div
            className="status-bubble__progress"
            style={{ width: `${progress}%` }}
          />
        )}
      </div>
    </div>
  );
}

export default StatusBubble;
