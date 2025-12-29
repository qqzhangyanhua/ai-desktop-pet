/**
 * User profile service
 */

import { getUserProfile as dbGetUserProfile, updateUserProfile as dbUpdateUserProfile } from '../database/user-profiles';
import { DEFAULT_USER_PROFILE } from '../../types';
import type { UserProfile } from '../../types';

/**
 * Get user profile with default fallback
 */
export async function getUserProfile(): Promise<UserProfile> {
  const profile = await dbGetUserProfile();
  return profile ?? DEFAULT_USER_PROFILE;
}

/**
 * Update user profile
 */
export async function updateUserProfile(updates: Partial<Omit<UserProfile, 'createdAt' | 'updatedAt'>>): Promise<UserProfile> {
  return dbUpdateUserProfile(updates);
}

/**
 * Set user nickname
 */
export async function setNickname(nickname: string): Promise<UserProfile> {
  return updateUserProfile({ nickname });
}

/**
 * Set work schedule
 */
export async function setWorkSchedule(schedule: { workdays: number[]; start: string; end: string } | null): Promise<UserProfile> {
  return updateUserProfile({ workSchedule: schedule });
}

/**
 * Add preferred topic
 */
export async function addPreferredTopic(topic: string): Promise<UserProfile> {
  const profile = await getUserProfile();
  const topics = profile.preferredTopics.includes(topic)
    ? profile.preferredTopics
    : [...profile.preferredTopics, topic];

  return updateUserProfile({ preferredTopics: topics });
}

/**
 * Remove preferred topic
 */
export async function removePreferredTopic(topic: string): Promise<UserProfile> {
  const profile = await getUserProfile();
  const topics = profile.preferredTopics.filter(t => t !== topic);

  return updateUserProfile({ preferredTopics: topics });
}

/**
 * Set sleep schedule
 */
export async function setSleepSchedule(wakeUpHour: number, sleepHour: number): Promise<UserProfile> {
  return updateUserProfile({ wakeUpHour, sleepHour });
}
