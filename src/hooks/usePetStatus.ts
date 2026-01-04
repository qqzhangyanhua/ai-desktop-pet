/**
 * Pet Status Hook
 * 宠物状态 React Hook
 *
 * Provides convenient access to pet status with automatic decay checking
 * and interaction handling
 */

import { useEffect, useCallback, useRef, useMemo } from 'react';
import { usePetStatusStore, usePetStore } from '@/stores';
import { handleInteraction, getAllCooldowns } from '@/services/pet/interaction';
import { applyDecay } from '@/services/pet/status';
import { getMoodEmotion, shouldUpdateEmotion } from '@/services/pet/emotion';
import type { InteractionType, InteractionResult } from '@/types';

/**
 * Decay check interval (milliseconds)
 * 衰减检查间隔（毫秒）
 */
const DECAY_CHECK_INTERVAL = 30000; // 30 seconds

/**
 * Minimum change threshold to trigger database update
 * 触发数据库更新的最小变化阈值
 */
const MIN_CHANGE_THRESHOLD = 1;

/**
 * Hook for managing pet status
 * 管理宠物状态的 Hook
 *
 * Features:
 * - Auto-loads status on mount
 * - Periodic decay checking (every 30 seconds)
 * - Interaction handling with database updates
 * - Computed level values for UI
 *
 * @returns Pet status and interaction functions
 */
export function usePetStatus() {
  const {
    status,
    isLoading,
    error,
    loadStatus,
    updateStatus,
    incrementInteraction,
    getMoodLevel,
    getEnergyLevel,
  } = usePetStatusStore();

  const { emotion: currentEmotion, setEmotion } = usePetStore();
  const previousIntimacyRef = useRef<number | undefined>(undefined);

  // Load status on mount
  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  // Apply decay periodically
  useEffect(() => {
    const timer = setInterval(() => {
      const decayed = applyDecay(status);

      // Only update if significant change (reduce DB writes)
      const moodDiff = Math.abs(decayed.mood - status.mood);
      const energyDiff = Math.abs(decayed.energy - status.energy);

      if (moodDiff > MIN_CHANGE_THRESHOLD || energyDiff > MIN_CHANGE_THRESHOLD) {
        void updateStatus({
          mood: decayed.mood,
          energy: decayed.energy,
        });
      }
    }, DECAY_CHECK_INTERVAL);

    return () => clearInterval(timer);
  }, [status, updateStatus]);

  // Update emotion based on mood/energy changes
  useEffect(() => {
    // Calculate new emotion from current mood/energy
    const newEmotion = getMoodEmotion(status.mood, status.energy);

    // Update emotion if it should change
    if (shouldUpdateEmotion(currentEmotion, newEmotion)) {
      setEmotion(newEmotion);
    }

    // Track intimacy for future comparisons
    previousIntimacyRef.current = status.intimacy;
  }, [status, currentEmotion, setEmotion]);

  /**
   * Perform an interaction with the pet
   * 执行宠物互动
   *
   * @param type - Interaction type (pet/feed/play)
   * @returns Interaction result
   */
  const performInteraction = useCallback(
    async (type: InteractionType): Promise<InteractionResult> => {
      try {
        // Handle interaction (checks cooldown, applies effects)
        const result = await handleInteraction(type, status);

        if (result.success) {
          // Update store and database
          await updateStatus({
            mood: result.newStatus.mood,
            energy: result.newStatus.energy,
            intimacy: result.newStatus.intimacy,
          });

          // Increment interaction count and timestamps
          await incrementInteraction(type);
        }

        return result;
      } catch (error) {
        console.error('[usePetStatus] Interaction failed:', error);
        return {
          success: false,
          message: '互动失败，请稍后重试',
          newStatus: status,
        };
      }
    },
    [status, updateStatus, incrementInteraction]
  );

  /**
   * Get current mood level category
   * 获取当前心情等级
   */
  const moodLevel = getMoodLevel();

  /**
   * Get current energy level category
   * 获取当前精力等级
   */
  const energyLevel = getEnergyLevel();

  /**
   * Get cooldown remaining time for a specific interaction type
   * 获取指定互动类型的剩余冷却时间
   *
   * @param type - Interaction type
   * @returns Remaining cooldown in seconds (0 if not on cooldown)
   */
  const getCooldownRemaining = useCallback(
    (type: InteractionType): number => {
      const cooldowns = getAllCooldowns(status);
      return cooldowns[type];
    },
    [status]
  );

  // Stable return value using useMemo to prevent unnecessary re-renders
  return useMemo(
    () => ({
      // State
      status,
      isLoading,
      error,

      // Computed levels
      moodLevel,
      energyLevel,

      // Actions
      performInteraction,
      getCooldownRemaining,
      loadStatus,
      updateStatus,
    }),
    [
      status,
      isLoading,
      error,
      moodLevel,
      energyLevel,
      performInteraction,
      getCooldownRemaining,
      loadStatus,
      updateStatus,
    ]
  );
}
