/**
 * Interaction Toast Component
 * 互动 Toast 组件
 *
 * 显示互动结果的小型通知，包括亲密度变化
 */

import { memo } from 'react';
import { Hand, Utensils, Gamepad2, Heart, Zap, TrendingUp } from 'lucide-react';
import type { Toast, StatChange } from '@/types/toast';
import type { InteractionType } from '@/types';
import './InteractionToast.css';

interface InteractionToastProps {
  toast: Toast;
  onDismiss?: () => void;
}

/**
 * 获取互动类型图标
 */
function getInteractionIcon(type: InteractionType) {
  switch (type) {
    case 'pet':
      return <Hand size={14} />;
    case 'feed':
      return <Utensils size={14} />;
    case 'play':
      return <Gamepad2 size={14} />;
  }
}

/**
 * 获取属性图标
 */
function getStatIcon(stat: StatChange['stat']) {
  switch (stat) {
    case 'mood':
      return <Heart size={12} />;
    case 'energy':
    case 'satiety':
      return <Zap size={12} />;
    case 'intimacy':
      return <TrendingUp size={12} />;
    case 'boredom':
      return <Zap size={12} />;
  }
}

/**
 * 获取属性名称
 */
function getStatLabel(stat: StatChange['stat']): string {
  switch (stat) {
    case 'mood':
      return '心情';
    case 'energy':
      return '精力';
    case 'satiety':
      return '饱腹';
    case 'intimacy':
      return '亲密度';
    case 'boredom':
      return '无聊';
  }
}

/**
 * 互动 Toast 组件
 */
export const InteractionToast = memo(function InteractionToast({
  toast,
  onDismiss,
}: InteractionToastProps) {
  const interactionType = toast.interactionType;
  const statChanges = toast.statChanges;

  return (
    <div
      className="interaction-toast"
      onClick={onDismiss}
      role="alert"
      aria-live="polite"
    >
      {/* 图标 */}
      {interactionType && (
        <span className="interaction-toast__icon">
          {getInteractionIcon(interactionType)}
        </span>
      )}

      {/* 消息 */}
      <span className="interaction-toast__message">{toast.message}</span>

      {/* 属性变化 */}
      {statChanges && statChanges.length > 0 && (
        <div className="interaction-toast__stats">
          {statChanges.map((change, index) => (
            <span
              key={index}
              className={`interaction-toast__stat ${
                change.delta >= 0
                  ? 'interaction-toast__stat--positive'
                  : 'interaction-toast__stat--negative'
              }`}
              title={getStatLabel(change.stat)}
            >
              {getStatIcon(change.stat)}
              <span>
                {change.delta >= 0 ? '+' : ''}
                {change.delta}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

export default InteractionToast;
