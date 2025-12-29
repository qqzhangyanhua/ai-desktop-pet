/**
 * User profile types for Phase 1.1 memory system
 */

/**
 * Work schedule configuration
 */
export interface WorkSchedule {
  workdays: number[]; // [1,2,3,4,5] = Monday to Friday (0=Sunday)
  start: string; // "09:00"
  end: string; // "18:00"
}

/**
 * User profile stored in database
 */
export interface UserProfile {
  nickname: string;
  wakeUpHour: number;
  sleepHour: number;
  preferredTopics: string[];
  workSchedule: WorkSchedule | null;
  createdAt: number;
  updatedAt: number;
}

/**
 * Default user profile
 */
export const DEFAULT_USER_PROFILE: UserProfile = {
  nickname: '主人',
  wakeUpHour: 7,
  sleepHour: 23,
  preferredTopics: [],
  workSchedule: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

/**
 * Memory category
 */
export type MemoryCategory = 'preference' | 'event' | 'habit';

/**
 * Long term memory stored in database
 */
export interface LongTermMemory {
  id: string;
  category: MemoryCategory;
  content: string;
  importance: number; // 1-10
  lastAccessed: number;
  accessCount: number;
  createdAt: number;
}

/**
 * Emotion detection result
 */
export interface EmotionDetectionResult {
  detected: boolean;
  emotion: 'happy' | 'sad' | 'anxious' | 'excited' | 'neutral';
  confidence: number; // 0-1
  keywords: string[];
}

/**
 * Care history record
 */
export interface CareHistoryRecord {
  id: number;
  actionType: string;
  timestamp: number;
}

/**
 * Memory extraction result from LLM
 */
export interface ExtractedMemory {
  category: MemoryCategory;
  content: string;
  importance: number;
}
