/**
 * Pet Status Store
 * 宠物状态 Zustand Store
 *
 * Linus 准则: status 永远有值，消除 null 检查
 */

import { create } from 'zustand';
import type { PetStatus, InteractionType, GrowthStage, StageProgress } from '@/types';
import { DEFAULT_PET_STATUS } from '@/types';
import {
  getPetStatus,
  updatePetStatus,
  incrementInteractionCount,
} from '@/services/database/pet-status';
import {
  getCurrentStage,
  calculateStageProgress,
  checkStageUpgrade,
  getUpgradeCelebrationMessage,
} from '@/services/pet';

/**
 * Debounce timeout for database updates (milliseconds)
 * 数据库更新防抖延迟（毫秒）
 */
const UPDATE_DEBOUNCE_MS = 5000; // 5 seconds

/**
 * Pending updates queue
 * 待更新队列
 */
let pendingUpdates: Partial<Omit<PetStatus, 'createdAt'>> = {};
let updateTimer: ReturnType<typeof setTimeout> | null = null;

interface PetStatusStore {
  // State
  status: PetStatus;
  isLoading: boolean;
  error: Error | null;

  // Actions
  loadStatus: () => Promise<void>;
  updateStatus: (updates: Partial<Omit<PetStatus, 'createdAt'>>) => Promise<void>;
  updateStatusImmediate: (updates: Partial<Omit<PetStatus, 'createdAt'>>) => Promise<void>;
  incrementInteraction: (type: InteractionType) => Promise<void>;

  // Computed - Basic
  getMoodLevel: () => 'high' | 'medium' | 'low';
  getEnergyLevel: () => 'high' | 'medium' | 'low';
  getCooldownRemaining: (type: InteractionType) => number;

  // Computed - Growth Stage
  getCurrentStage: () => GrowthStage;
  getStageProgress: () => StageProgress;
}

export const usePetStatusStore = create<PetStatusStore>((set, get) => ({
  // Initial state - 使用默认值而不是 null
  status: DEFAULT_PET_STATUS,
  isLoading: false,
  error: null,

  // Load status from database
  loadStatus: async () => {
    set({ isLoading: true, error: null });

    try {
      const status = await getPetStatus();
      // 如果数据库没有数据，使用默认值
      set({ status: status ?? DEFAULT_PET_STATUS, isLoading: false });
    } catch (error) {
      console.error('[PetStatusStore] Failed to load status:', error);
      set({
        error: error instanceof Error ? error : new Error('Unknown error'),
        isLoading: false,
        // 发生错误也使用默认值
        status: DEFAULT_PET_STATUS,
      });
    }
  },

  // Update status in database and store (debounced)
  updateStatus: async (updates) => {
    const { status } = get();

    // Accumulate updates
    pendingUpdates = { ...pendingUpdates, ...updates };

    // Update local state immediately for UI responsiveness
    set({
      status: { ...status, ...pendingUpdates },
    });

    // Cancel existing timer
    if (updateTimer) {
      clearTimeout(updateTimer);
    }

    // Schedule debounced database write
    updateTimer = setTimeout(async () => {
      const updatesToWrite = { ...pendingUpdates };
      pendingUpdates = {};
      updateTimer = null;

      try {
        await updatePetStatus(updatesToWrite);
        console.log('[PetStatusStore] Debounced update written to database');
      } catch (error) {
        console.error('[PetStatusStore] Failed to write debounced updates:', error);
        set({
          error: error instanceof Error ? error : new Error('Unknown error'),
        });
      }
    }, UPDATE_DEBOUNCE_MS);
  },

  // Update status immediately (no debounce) - for critical updates
  updateStatusImmediate: async (updates) => {
    const { status } = get();
    if (!status) {
      console.warn('[PetStatusStore] Cannot update: status not loaded');
      return;
    }

    // Check for stage upgrade (before updating)
    const oldIntimacy = status.intimacy;
    const newIntimacy = updates.intimacy ?? oldIntimacy;
    const stageUpgrade = checkStageUpgrade(oldIntimacy, newIntimacy);

    // Cancel pending debounced update
    if (updateTimer) {
      clearTimeout(updateTimer);
      updateTimer = null;
    }

    // Merge with any pending updates
    const finalUpdates = { ...pendingUpdates, ...updates };
    pendingUpdates = {};

    set({ isLoading: true, error: null });

    try {
      // Update database
      await updatePetStatus(finalUpdates);

      // Update local state
      set({
        status: { ...status, ...finalUpdates },
        isLoading: false,
      });

      // Trigger stage upgrade celebration if needed
      if (stageUpgrade) {
        const message = getUpgradeCelebrationMessage(stageUpgrade.toStage);
        console.log(
          `[PetStatusStore] Stage upgraded: ${stageUpgrade.fromStage} → ${stageUpgrade.toStage}`
        );
        console.log(`[PetStatusStore] Celebration message: ${message}`);

        // TODO: 触发 Toast 或其他 UI 反馈
        // 可以通过事件系统或 callback 通知 UI 层
      }
    } catch (error) {
      console.error('[PetStatusStore] Failed to update status:', error);
      set({
        error: error instanceof Error ? error : new Error('Unknown error'),
        isLoading: false,
      });
    }
  },

  // Increment interaction count
  incrementInteraction: async (type) => {
    const { status } = get();
    if (!status) {
      console.warn('[PetStatusStore] Cannot increment: status not loaded');
      return;
    }

    set({ isLoading: true, error: null });

    try {
      // Update database
      await incrementInteractionCount(type);

      // Reload status to get updated values
      const updatedStatus = await getPetStatus();
      set({
        status: updatedStatus ?? DEFAULT_PET_STATUS,
        isLoading: false,
      });
    } catch (error) {
      console.error('[PetStatusStore] Failed to increment interaction:', error);
      set({
        error: error instanceof Error ? error : new Error('Unknown error'),
        isLoading: false,
      });
    }
  },

  // Get mood level (high/medium/low)
  getMoodLevel: () => {
    const { status } = get();
    if (!status) return 'medium';

    if (status.mood >= 70) return 'high';
    if (status.mood >= 40) return 'medium';
    return 'low';
  },

  // Get energy level (high/medium/low)
  getEnergyLevel: () => {
    const { status } = get();
    if (!status) return 'medium';

    if (status.energy >= 70) return 'high';
    if (status.energy >= 40) return 'medium';
    return 'low';
  },

  // Get remaining cooldown time in seconds
  getCooldownRemaining: (type) => {
    const { status } = get();
    if (!status) return 0;

    // Cooldown durations from task.md T2.2
    const cooldowns: Record<InteractionType, number> = {
      pet: 60,
      feed: 120,
      play: 90,
    };

    const cooldownDuration = cooldowns[type];

    // Get last interaction time for this type
    let lastTime: number | null = null;
    switch (type) {
      case 'pet':
        lastTime = status.lastInteraction;
        break;
      case 'feed':
        lastTime = status.lastFeed;
        break;
      case 'play':
        lastTime = status.lastPlay;
        break;
    }

    if (!lastTime) return 0;

    const elapsed = (Date.now() - lastTime) / 1000; // seconds
    const remaining = Math.max(0, cooldownDuration - elapsed);

    return Math.ceil(remaining);
  },

  // Get current growth stage based on intimacy
  getCurrentStage: () => {
    const { status } = get();
    return getCurrentStage(status.intimacy);
  },

  // Get detailed stage progress for UI display
  getStageProgress: () => {
    const { status } = get();
    return calculateStageProgress(status.intimacy);
  },
}));
