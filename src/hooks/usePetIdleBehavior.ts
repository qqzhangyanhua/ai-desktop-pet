import { useEffect, useRef } from 'react';
import { useCareStore, useConfigStore, usePetStore } from '@/stores';
import { getIdleBehavior, getIdleGestureOnly } from '@/services/pet/idle-behavior';
import { getLive2DManager } from '@/services/live2d';

const getIdleIntervalMs = (frequency: 'low' | 'standard' | 'high') => {
  switch (frequency) {
    case 'low':
      return 135000; // 2m15s
    case 'high':
      return 45000;
    case 'standard':
    default:
      return 85000;
  }
};

const getMinAfterActionMs = (frequency: 'low' | 'standard' | 'high') => {
  switch (frequency) {
    case 'low':
      return 70000;
    case 'high':
      return 25000;
    case 'standard':
    default:
      return 45000;
  }
};

/**
 * 日常行为循环（轻量、低打扰）
 * - 不和养成告警/气泡冲突
 * - 刚互动完不插话
 */
export function usePetIdleBehavior() {
  const behavior = useConfigStore((s) => s.config.behavior);
  const lastIdleAtRef = useRef(0);
  const lastActionAtRef = useRef(0);

  useEffect(() => {
    // 记录用户动作时间，用于“别太黏”
    const unsub = useCareStore.subscribe((state, prev) => {
      if (state.lastAction && state.lastAction !== prev.lastAction) {
        lastActionAtRef.current = Date.now();
      }
    });
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    const idleInterval = getIdleIntervalMs(behavior.interactionFrequency);
    const minAfterAction = getMinAfterActionMs(behavior.interactionFrequency);
    const bubbleEnabled = behavior.notifications.bubbleEnabled;

    const timer = window.setInterval(() => {
      const now = Date.now();
      if (now - lastIdleAtRef.current < idleInterval) return;
      if (now - lastActionAtRef.current < minAfterAction) return;

      const pet = usePetStore.getState();
      if (pet.isSpeaking) return;
      if (pet.bubbleText) return;

      const care = useCareStore.getState();
      const report = care.getStatusReport();
      const hasWarning = report.warnings.length > 0;

      if (hasWarning || care.isSick) {
        // 有告警/生病时不插话，只做轻量小动作
        const gestureOnly = getIdleGestureOnly(care);
        pet.setEmotion(gestureOnly.emotion);
        try {
          const manager = getLive2DManager();
          if (manager.isInitialized() && gestureOnly.gesture) {
            manager.playIdleGesture(gestureOnly.gesture);
          }
        } catch {
          // ignore
        }
      } else if (bubbleEnabled) {
        const result = getIdleBehavior(care);
        pet.setEmotion(result.emotion);
        pet.showBubble(result.message, result.bubbleDurationMs);

        // Live2D 小动作（不强制，不影响养成数值）
        try {
          const manager = getLive2DManager();
          if (manager.isInitialized() && result.gesture) {
            manager.playIdleGesture(result.gesture);
          }
        } catch {
          // ignore
        }
      } else {
        // 关闭气泡时仍允许 Live2D 有轻微动作
        const gestureOnly = getIdleGestureOnly(care);
        try {
          const manager = getLive2DManager();
          if (manager.isInitialized() && gestureOnly.gesture) {
            manager.playIdleGesture(gestureOnly.gesture);
          }
        } catch {
          // ignore
        }
      }

      lastIdleAtRef.current = now;
    }, 5000);

    return () => {
      window.clearInterval(timer);
    };
  }, [behavior]);
}
