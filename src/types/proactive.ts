/**
 * Proactive behavior types for Phase 1.3
 */

import type { EmotionType } from './pet';
import type { UserProfile, LongTermMemory } from './memory';

/**
 * Time of day
 */
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

/**
 * Time context for proactive behavior
 */
export interface TimeContext {
  timeOfDay: TimeOfDay;
  isWorkTime: boolean;
  isOvertime: boolean;
  hoursSinceLastInteraction: number;
}

/**
 * Pet context for greeting generation
 */
export interface PetContext {
  profile: UserProfile;
  status: {
    mood: number;
    energy: number;
    intimacy: number;
    lastInteraction: number;
  };
  stage: string;
  recentMemories: LongTermMemory[];
  timeContext: TimeContext;
}

/**
 * Greeting template with condition
 */
export interface GreetingTemplate {
  condition: (ctx: PetContext) => boolean;
  templates: string[];
  emotion: EmotionType;
}

/**
 * Greeting result
 */
export interface GreetingResult {
  text: string;
  emotion: EmotionType;
}

/**
 * Time-based greeting config
 */
export interface TimeGreetingConfig {
  startHour: number;
  endHour: number;
  templates: string[];
  emotion: EmotionType;
}

/**
 * Context check result
 */
export interface ContextCheckResult {
  shouldGreet: boolean;
  reason?: string;
  greeting?: GreetingResult;
}
