/**
 * AchievementToastContainer Component
 *
 * 成就Toast容器 - 管理多个成就通知的显示
 * - 支持同时显示多个成就Toast（最多3个）
 * - 自动排队显示新成就
 * - 自动堆叠布局，避免重叠
 * - 提供关闭单个和全部的功能
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AchievementToast, type AchievementToastProps } from './AchievementToast';
import type { Achievement } from '@/types';
import './AchievementToastContainer.css';

interface ToastEntry extends AchievementToastProps {
  id: string;
}

// 全局事件发射器用于成就Toast通信
interface AchievementEventEmitter {
  emit: (event: string, data: unknown) => void;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  off: (event: string, callback: (...args: unknown[]) => void) => void;
}

class EventEmitter implements AchievementEventEmitter {
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  emit(event: string, data: unknown): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  on(event: string, callback: (...args: unknown[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (...args: unknown[]) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }
}

// 全局事件发射器实例
export const achievementEmitter = new EventEmitter();

// 导出便捷函数供外部使用
export function showAchievementToast(achievement: Achievement): void {
  achievementEmitter.emit('show', achievement);
}

export function closeAllAchievementToasts(): void {
  achievementEmitter.emit('closeAll', null);
}

export function AchievementToastContainer() {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const queueRef = useRef<ToastEntry[]>([]);
  const maxVisible = 3; // 最多同时显示3个成就Toast

  // 处理关闭单个Toast
  const handleClose = useCallback((id: string) => {
    setToasts((current) => {
      const filtered = current.filter((toast) => toast.id !== id);
      // 如果有排队的Toast，立即显示下一个
      if (filtered.length < maxVisible && queueRef.current.length > 0) {
        const nextToast = queueRef.current.shift()!;
        setTimeout(() => {
          setToasts((prev) => [...prev, nextToast]);
        }, 300); // 延迟300ms显示下一个，避免视觉效果突兀
      }
      return filtered;
    });
  }, [maxVisible]);

  // 添加新成就Toast到队列
  const addAchievement = useCallback((achievement: Achievement) => {
    const newToast: ToastEntry = {
      id: `${achievement.id}-${Date.now()}`,
      achievement,
      onClose: () => handleClose(newToast.id),
      duration: 6000, // 成就Toast显示6秒
    };

    setToasts((current) => {
      // 如果当前显示的数量少于最大值，直接添加
      if (current.length < maxVisible) {
        return [...current, newToast];
      }

      // 否则加入排队队列
      queueRef.current.push(newToast);
      return current;
    });
  }, [handleClose, maxVisible]);

  // 关闭所有Toast
  const closeAll = useCallback(() => {
    setToasts([]);
    queueRef.current = [];
  }, []);

  // 监听全局成就事件
  useEffect(() => {
    const handleShow = (achievement: unknown) => {
      addAchievement(achievement as Achievement);
    };

    const handleCloseAll = () => {
      closeAll();
    };

    achievementEmitter.on('show', handleShow);
    achievementEmitter.on('closeAll', handleCloseAll);

    return () => {
      achievementEmitter.off('show', handleShow);
      achievementEmitter.off('closeAll', handleCloseAll);
    };
  }, [addAchievement, closeAll]);

  // 如果没有Toast，不渲染任何内容
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="achievement-toast-container">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className="achievement-toast-wrapper"
          style={{
            // 基于索引计算垂直偏移，实现堆叠效果
            transform: `translateY(${index * -10}px)`,
            // 设置z-index确保新Toast在最上层
            zIndex: 100 + index,
          }}
        >
          <AchievementToast
            achievement={toast.achievement}
            onClose={toast.onClose}
            duration={toast.duration}
          />
        </div>
      ))}
    </div>
  );
}
