/**
 * User Profile Store
 * 用户画像 Zustand Store
 */

import { create } from 'zustand';
import type { UserProfile } from '@/types';
import { DEFAULT_USER_PROFILE } from '@/types';
import { getUserProfile as loadUserProfile, updateUserProfile as saveUserProfile } from '@/services/memory';

interface UserProfileStore {
  profile: UserProfile;
  isLoading: boolean;
  error: Error | null;

  loadProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Omit<UserProfile, 'createdAt' | 'updatedAt'>>) => Promise<void>;
  setNickname: (nickname: string) => Promise<void>;
  setWorkSchedule: (schedule: { workdays: number[]; start: string; end: string } | null) => Promise<void>;
  setSleepSchedule: (wakeUpHour: number, sleepHour: number) => Promise<void>;
  addPreferredTopic: (topic: string) => Promise<void>;
  removePreferredTopic: (topic: string) => Promise<void>;
}

export const useUserProfileStore = create<UserProfileStore>((set, get) => ({
  // Initial state
  profile: DEFAULT_USER_PROFILE,
  isLoading: false,
  error: null,

  // Load profile from database
  loadProfile: async () => {
    set({ isLoading: true, error: null });

    try {
      const profile = await loadUserProfile();
      set({ profile: profile ?? DEFAULT_USER_PROFILE, isLoading: false });
    } catch (error) {
      console.error('[UserProfileStore] Failed to load profile:', error);
      set({
        error: error instanceof Error ? error : new Error('Unknown error'),
        isLoading: false,
        profile: DEFAULT_USER_PROFILE,
      });
    }
  },

  // Update profile
  updateProfile: async (updates) => {
    set({ error: null });

    try {
      const updated = await saveUserProfile(updates);
      set({ profile: updated });
    } catch (error) {
      console.error('[UserProfileStore] Failed to update profile:', error);
      set({
        error: error instanceof Error ? error : new Error('Unknown error'),
      });
    }
  },

  // Set nickname
  setNickname: async (nickname) => {
    await get().updateProfile({ nickname });
  },

  // Set work schedule
  setWorkSchedule: async (schedule) => {
    await get().updateProfile({ workSchedule: schedule });
  },

  // Set sleep schedule
  setSleepSchedule: async (wakeUpHour, sleepHour) => {
    await get().updateProfile({ wakeUpHour, sleepHour });
  },

  // Add preferred topic
  addPreferredTopic: async (topic) => {
    const { profile } = get();
    const topics = profile.preferredTopics.includes(topic)
      ? profile.preferredTopics
      : [...profile.preferredTopics, topic];

    await get().updateProfile({ preferredTopics: topics });
  },

  // Remove preferred topic
  removePreferredTopic: async (topic) => {
    const { profile } = get();
    const topics = profile.preferredTopics.filter((t) => t !== topic);

    await get().updateProfile({ preferredTopics: topics });
  },
}));
