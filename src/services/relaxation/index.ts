/**
 * Relaxation Service
 * 放松服务模块入口
 */

// Types
export type {
  BreathingAction,
  BreathingPhase,
  BreathingPattern,
  BreathingSessionState,
  BreathingCallbacks,
  StoryCategory,
  BedtimeStory,
  StoryPlayerState,
  StoryPlayerCallbacks,
  MeditationType,
  MeditationSegmentType,
  MeditationSegment,
  MeditationSession,
  MeditationState,
  MeditationCallbacks,
  RelaxationType,
  RelaxationStats,
} from './types';

// Breathing
export {
  BreathingController,
  BREATHING_PATTERNS,
  getAllBreathingPatterns,
  getBreathingPattern,
  recommendPattern,
  calculateCycleDuration,
  calculateTotalDuration,
  formatTimeRemaining,
} from './breathing';

// Stories
export {
  BEDTIME_STORIES,
  getAllStories,
  getStoryById,
  getStoriesByCategory,
  getRandomStory,
} from './stories';

// Story Player
export {
  StoryPlayer,
  getStoryPlayer,
  formatStoryTime,
} from './story-player';

// Meditations
export {
  MEDITATION_SESSIONS,
  getAllMeditations,
  getMeditationById,
  getMeditationsByType,
} from './meditations';

// Meditation Player
export {
  MeditationPlayer,
  getMeditationPlayer,
  formatMeditationTime,
} from './meditation-player';
