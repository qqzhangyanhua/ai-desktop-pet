/**
 * Relaxation System Type Definitions
 * 放松系统类型定义
 *
 * 三大放松功能：呼吸放松、睡前故事、正念冥想
 */

/**
 * Relaxation activity ID - 放松活动ID
 */
export type RelaxationActivityId = 'breathing' | 'story' | 'meditation';

/**
 * Relaxation step - 放松活动步骤
 */
export interface RelaxationStep {
  /** Step start time in seconds from activity start */
  time: number;

  /** Instruction text to display */
  instruction: string;

  /** Optional: Animation to play during this step */
  animation?: string;
}

/**
 * Relaxation activity definition - 放松活动定义
 */
export interface RelaxationActivity {
  /** Unique identifier */
  id: RelaxationActivityId;

  /** Display name */
  name: string;

  /** Total duration in seconds */
  duration: number;

  /** Live2D animation ID */
  animation: string;

  /** Optional: Audio file path */
  audioPath?: string;

  /** Step-by-step instructions */
  steps: RelaxationStep[];

  /** Effects after completion */
  effects: {
    /** Stress reduction (not implemented yet, reserved) */
    stress?: number;

    /** Mood increase */
    mood: number;

    /** Energy change */
    energy?: number;

    /** Boredom reduction */
    boredom?: number;
  };

  /** Icon emoji */
  icon?: string;

  /** Description */
  description?: string;
}

/**
 * Relaxation session state - 放松会话状态
 */
export interface RelaxationSession {
  /** Current activity */
  activity: RelaxationActivity;

  /** Session start time (timestamp) */
  startTime: number;

  /** Current step index */
  currentStep: number;

  /** Is session active */
  isActive: boolean;

  /** Progress percentage (0-100) */
  progress: number;
}

/**
 * Activity display names - 活动显示名称
 */
export const RELAXATION_ACTIVITY_NAMES: Record<RelaxationActivityId, string> = {
  breathing: '呼吸放松',
  story: '睡前故事',
  meditation: '正念冥想',
};

/**
 * Activity icons - 活动图标
 */
export const RELAXATION_ACTIVITY_ICONS: Record<RelaxationActivityId, string> = {
  breathing: '🌬️',
  story: '📖',
  meditation: '🧘',
};
