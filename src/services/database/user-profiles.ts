/**
 * User profiles database operations
 */

import { query, execute } from './index';
import type { UserProfile, WorkSchedule } from '../../types';

interface UserProfileRow {
  id: number;
  nickname: string;
  wake_up_hour: number;
  sleep_hour: number;
  preferred_topics: string | null;
  work_schedule: string | null;
  created_at: number;
  updated_at: number;
}

function rowToUserProfile(row: UserProfileRow): UserProfile {
  return {
    nickname: row.nickname,
    wakeUpHour: row.wake_up_hour,
    sleepHour: row.sleep_hour,
    preferredTopics: row.preferred_topics ? JSON.parse(row.preferred_topics) : [],
    workSchedule: row.work_schedule ? (JSON.parse(row.work_schedule) as WorkSchedule) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get user profile (always returns id=1 record)
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  const rows = await query<UserProfileRow>(
    `SELECT * FROM user_profiles WHERE id = 1`
  );

  if (rows.length === 0) return null;

  const row = rows[0];
  if (!row) return null;

  return rowToUserProfile(row);
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  updates: Partial<Omit<UserProfile, 'createdAt' | 'updatedAt'>>
): Promise<UserProfile> {
  const sets: string[] = [];
  const params: unknown[] = [];

  if (updates.nickname !== undefined) {
    sets.push('nickname = ?');
    params.push(updates.nickname);
  }

  if (updates.wakeUpHour !== undefined) {
    sets.push('wake_up_hour = ?');
    params.push(updates.wakeUpHour);
  }

  if (updates.sleepHour !== undefined) {
    sets.push('sleep_hour = ?');
    params.push(updates.sleepHour);
  }

  if (updates.preferredTopics !== undefined) {
    sets.push('preferred_topics = ?');
    params.push(JSON.stringify(updates.preferredTopics));
  }

  if (updates.workSchedule !== undefined) {
    sets.push('work_schedule = ?');
    params.push(JSON.stringify(updates.workSchedule));
  }

  sets.push('updated_at = ?');
  params.push(Date.now());
  params.push(1); // id

  await execute(`UPDATE user_profiles SET ${sets.join(', ')} WHERE id = ?`, params);

  // Return updated profile
  const profile = await getUserProfile();
  if (!profile) {
    throw new Error('Failed to fetch updated profile');
  }
  return profile;
}
