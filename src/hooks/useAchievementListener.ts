/**
 * useAchievementListener Hook
 *
 * 监听成就解锁事件并显示 Toast 通知
 * - 监听宠物状态变化（亲密度、心情等）
 * - 监听互动事件
 * - 自动检查成就是否满足条件
 * - 触发成就 Toast 显示
 */

import { useEffect, useRef } from 'react';
import { usePetStatusStore } from '@/stores';
import { checkAndUnlockAchievements } from '@/services/achievements';
import { getStatsSummary, recordInteraction } from '@/services/statistics';
import { showAchievementToast } from '@/components/toast/AchievementToastContainer';

// 事件发射器类型
interface AchievementEventEmitter {
  emit: (event: string, data: unknown) => void;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  off: (event: string, callback: (...args: unknown[]) => void) => void;
}

// 简单的事件发射器实现
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
const achievementEmitter = new EventEmitter();

/**
 * 触发成就检查
 * 在外部事件（如互动）后调用
 */
export async function triggerAchievementCheck(): Promise<void> {
  achievementEmitter.emit('check', null);
}

/**
 * 记录互动并触发成就检查
 * @param type 互动类型
 */
export async function recordInteractionAndCheck(
  type: 'pet' | 'feed' | 'play' | 'chat'
): Promise<void> {
  // 记录互动统计
  await recordInteraction(type);

  // 触发成就检查
  await triggerAchievementCheck();
}

/**
 * 成就监听 Hook
 */
export function useAchievementListener() {
  const { status } = usePetStatusStore();
  const isCheckingRef = useRef(false);
  const lastCheckTimeRef = useRef(0);
  const CHECK_COOLDOWN = 1000; // 1秒冷却时间，避免频繁检查

  useEffect(() => {
    // 成就检查处理函数
    const handleCheck = async () => {
      // 防抖：避免频繁检查
      const now = Date.now();
      if (isCheckingRef.current || now - lastCheckTimeRef.current < CHECK_COOLDOWN) {
        return;
      }

      isCheckingRef.current = true;
      lastCheckTimeRef.current = now;

      try {
        // 获取统计数据
        const stats = await getStatsSummary();

        // 检查并解锁成就
        const newlyUnlocked = await checkAndUnlockAchievements(stats, status.intimacy);

        // 如果有新解锁的成就，显示 Toast
        if (newlyUnlocked.length > 0) {
          console.log(
            `[useAchievementListener] Unlocked ${newlyUnlocked.length} achievement(s):`,
            newlyUnlocked.map((a) => a.name).join(', ')
          );

          // 依次显示每个成就 Toast
          newlyUnlocked.forEach((achievement) => {
            showAchievementToast(achievement);
          });
        }
      } catch (error) {
        console.error('[useAchievementListener] Failed to check achievements:', error);
      } finally {
        isCheckingRef.current = false;
      }
    };

    // 监听成就检查事件
    achievementEmitter.on('check', handleCheck);

    // 定时检查（每30秒检查一次陪伴时长类成就）
    const intervalId = setInterval(() => {
      void handleCheck();
    }, 30000);

    return () => {
      achievementEmitter.off('check', handleCheck);
      clearInterval(intervalId);
    };
  }, [status]); // 当宠物状态变化时重新注册监听器

  // 当亲密度变化时，触发成就检查
  useEffect(() => {
    void triggerAchievementCheck();
  }, [status.intimacy]);
}
