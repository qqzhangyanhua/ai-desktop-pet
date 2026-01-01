/**
 * Care Notification Panel Component
 * 关怀通知面板组件
 * 
 * 遵循项目规范：React函数组件，TypeScript严格模式
 */

import React, { useState, useEffect } from 'react';
import type { CareMessage } from '@/services/proactive-care/types';
import { useProactiveCareStore } from '@/stores/proactive-care-store';
import { usePetStore } from '@/stores/petStore';

interface CareNotificationPanelProps {
  message: CareMessage;
  onResponse: (response: 'accepted' | 'dismissed' | 'snoozed') => void;
  onRate: (rating: number) => void;
  className?: string;
}

/**
 * 关怀通知面板组件
 */
export const CareNotificationPanel: React.FC<CareNotificationPanelProps> = ({
  message,
  onResponse,
  onRate,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const recordFeedback = useProactiveCareStore((state) => state.recordFeedback);
  const setEmotion = usePetStore((state) => state.setEmotion);
  
  // 自动隐藏定时器
  useEffect(() => {
    if (message.displayDuration > 0) {
      const timer = setTimeout(() => {
        handleTimeout();
      }, message.displayDuration);
      
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [message.displayDuration]);
  
  // 入场动画
  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 300);
    return () => clearTimeout(timer);
  }, []);
  
  /**
   * 处理接受响应
   */
  const handleAccept = () => {
    onResponse('accepted');
    setShowRating(true);
    
    // 更新宠物情绪
    setEmotion('happy');
    
    // 记录反馈
    recordFeedback({
      careId: message.id,
      careType: 'break_reminder', // TODO: 从message中获取类型
      response: 'accepted',
      timestamp: Date.now(),
      context: {
        userState: useProactiveCareStore.getState().currentUserState!,
        timeOfDay: new Date().getHours().toString(),
        dayOfWeek: new Date().getDay(),
      },
    });
  };
  
  /**
   * 处理忽略响应
   */
  const handleDismiss = () => {
    onResponse('dismissed');
    setIsVisible(false);
    
    // 记录反馈
    recordFeedback({
      careId: message.id,
      careType: 'break_reminder', // TODO: 从message中获取类型
      response: 'dismissed',
      timestamp: Date.now(),
      context: {
        userState: useProactiveCareStore.getState().currentUserState!,
        timeOfDay: new Date().getHours().toString(),
        dayOfWeek: new Date().getDay(),
      },
    });
  };
  
  /**
   * 处理延迟响应
   */
  const handleSnooze = () => {
    onResponse('snoozed');
    setIsVisible(false);
  };
  
  /**
   * 处理超时
   */
  const handleTimeout = () => {
    onResponse('dismissed');
    setIsVisible(false);
    
    // 记录超时反馈
    recordFeedback({
      careId: message.id,
      careType: 'break_reminder', // TODO: 从message中获取类型
      response: 'ignored',
      timestamp: Date.now(),
      context: {
        userState: useProactiveCareStore.getState().currentUserState!,
        timeOfDay: new Date().getHours().toString(),
        dayOfWeek: new Date().getDay(),
      },
    });
  };
  
  /**
   * 处理评分
   */
  const handleRate = (newRating: number) => {
    setRating(newRating);
    onRate(newRating);
    
    // 更新反馈记录
    recordFeedback({
      careId: message.id,
      careType: 'break_reminder', // TODO: 从message中获取类型
      response: 'accepted',
      rating: newRating,
      timestamp: Date.now(),
      context: {
        userState: useProactiveCareStore.getState().currentUserState!,
        timeOfDay: new Date().getHours().toString(),
        dayOfWeek: new Date().getDay(),
      },
    });
    
    // 延迟隐藏
    setTimeout(() => {
      setIsVisible(false);
    }, 2000);
  };
  
  /**
   * 获取样式类名
   */
  const getStyleClasses = () => {
    const baseClasses = 'care-notification-panel';
    const toneClasses = {
      gentle: 'care-gentle',
      urgent: 'care-urgent',
      supportive: 'care-supportive',
      celebratory: 'care-celebratory',
    };
    
    return [
      baseClasses,
      toneClasses[message.tone],
      isAnimating ? 'care-animating' : '',
      className,
    ].filter(Boolean).join(' ');
  };
  
  if (!isVisible) {
    return null;
  }
  
  return (
    <div className={getStyleClasses()}>
      {/* 关怀头部 */}
      <div className="care-header">
        <div className="care-icon">
          {message.tone === 'celebratory' ? '🎉' : 
           message.tone === 'urgent' ? '⚠️' : 
           message.tone === 'supportive' ? '💝' : '💡'}
        </div>
        <h3 className="care-title">{message.title}</h3>
        <button 
          className="care-close"
          onClick={handleDismiss}
          aria-label="关闭"
        >
          ×
        </button>
      </div>
      
      {/* 关怀内容 */}
      <div className="care-content">
        <p className="care-message">{message.content}</p>
      </div>
      
      {/* 操作按钮或评分 */}
      {!showRating ? (
        <div className="care-actions">
          {message.actionButtons?.map((button, index) => (
            <button
              key={index}
              className={`care-btn care-btn-${button.style}`}
              onClick={() => {
                if (button.action === 'accept') handleAccept();
                else if (button.action === 'dismiss') handleDismiss();
                else if (button.action === 'snooze') handleSnooze();
              }}
            >
              {button.label}
            </button>
          )) || (
            <>
              <button 
                className="care-btn care-btn-primary"
                onClick={handleAccept}
              >
                好的
              </button>
              <button 
                className="care-btn care-btn-secondary"
                onClick={handleSnooze}
              >
                稍后提醒
              </button>
              <button 
                className="care-btn care-btn-secondary"
                onClick={handleDismiss}
              >
                忽略
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="care-rating">
          <p className="rating-prompt">这个建议对你有帮助吗？</p>
          <div className="rating-stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                className={`rating-star ${rating >= star ? 'active' : ''}`}
                onClick={() => handleRate(star)}
                aria-label={`${star}星评价`}
              >
                ⭐
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="rating-thanks">
              谢谢你的反馈！我会继续努力的～
            </p>
          )}
        </div>
      )}
      
      {/* 进度条（显示剩余时间） */}
      {message.displayDuration > 0 && (
        <div className="care-progress">
          <div 
            className="care-progress-bar"
            style={{
              animationDuration: `${message.displayDuration}ms`,
            }}
          />
        </div>
      )}
    </div>
  );
};

/**
 * 关怀通知容器组件
 */
export const CareNotificationContainer: React.FC = () => {
  const { pendingMessages, dismissCare, snoozeCare } = useProactiveCareStore();
  
  const handleResponse = (messageId: string, response: 'accepted' | 'dismissed' | 'snoozed') => {
    const message = pendingMessages.find(m => m.id === messageId);
    if (!message) return;
    
    if (response === 'snoozed') {
      snoozeCare(message.opportunityId, 15); // 延迟15分钟
    } else {
      dismissCare(message.opportunityId);
    }
    
    // 从待处理消息中移除
    useProactiveCareStore.setState((state) => ({
      pendingMessages: state.pendingMessages.filter(m => m.id !== messageId),
    }));
  };
  
  const handleRate = (messageId: string, rating: number) => {
    console.log(`Message ${messageId} rated: ${rating} stars`);
  };
  
  return (
    <div className="care-notification-container">
      {pendingMessages.map((message) => (
        <CareNotificationPanel
          key={message.id}
          message={message}
          onResponse={(response) => handleResponse(message.id, response)}
          onRate={(rating) => handleRate(message.id, rating)}
        />
      ))}
    </div>
  );
};