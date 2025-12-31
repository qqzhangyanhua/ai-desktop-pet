/**
 * Relaxation Service Types
 * 放松服务类型定义
 *
 * 包含呼吸练习、睡前故事、冥想等放松功能的类型
 */

// ============================================
// 呼吸练习相关类型
// ============================================

/** 呼吸动作类型 */
export type BreathingAction = 'inhale' | 'hold' | 'exhale';

/** 呼吸阶段 */
export interface BreathingPhase {
  /** 动作类型 */
  action: BreathingAction;
  /** 持续时间（秒） */
  duration: number;
  /** 语音指导文字 */
  instruction: string;
}

/** 呼吸模式 */
export interface BreathingPattern {
  /** 唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 描述说明 */
  description: string;
  /** 呼吸阶段序列 */
  phases: BreathingPhase[];
  /** 推荐循环次数 */
  recommendedCycles: number;
  /** 适用场景 */
  suitableFor: Array<'stress' | 'sleep' | 'focus' | 'anxiety'>;
}

/** 呼吸练习会话状态 */
export interface BreathingSessionState {
  /** 当前使用的模式ID */
  patternId: string;
  /** 当前阶段索引 */
  currentPhaseIndex: number;
  /** 当前循环次数（从1开始） */
  currentCycle: number;
  /** 目标循环次数 */
  targetCycles: number;
  /** 阶段剩余秒数 */
  phaseTimeRemaining: number;
  /** 会话总剩余秒数 */
  totalTimeRemaining: number;
  /** 是否正在进行 */
  isActive: boolean;
  /** 是否暂停 */
  isPaused: boolean;
  /** 会话开始时间戳 */
  startedAt: number | null;
}

/** 呼吸练习回调 */
export interface BreathingCallbacks {
  /** 阶段变化回调 */
  onPhaseChange?: (phase: BreathingPhase, phaseIndex: number, cycle: number) => void;
  /** 循环完成回调 */
  onCycleComplete?: (cycle: number, totalCycles: number) => void;
  /** 会话完成回调 */
  onComplete?: () => void;
  /** 时间更新回调（每秒） */
  onTick?: (state: BreathingSessionState) => void;
}

// ============================================
// 睡前故事相关类型
// ============================================

/** 故事类别 */
export type StoryCategory = 'nature' | 'fantasy' | 'meditation' | 'adventure';

/** 睡前故事 */
export interface BedtimeStory {
  /** 唯一标识 */
  id: string;
  /** 故事标题 */
  title: string;
  /** 预估时长（分钟） */
  duration: number;
  /** 故事类别 */
  category: StoryCategory;
  /** 故事文本内容（用于TTS） */
  textContent: string;
  /** 预录音频URL（可选） */
  audioUrl?: string;
  /** 背景音效类型 */
  ambientSound?: 'rain' | 'forest' | 'ocean' | 'fireplace' | 'none';
  /** 故事简介 */
  summary: string;
}

/** 故事播放状态 */
export interface StoryPlayerState {
  /** 当前播放的故事ID */
  currentStoryId: string | null;
  /** 是否正在播放 */
  isPlaying: boolean;
  /** 当前播放进度（秒） */
  currentTime: number;
  /** 总时长（秒） */
  totalDuration: number;
  /** 音量（0-1） */
  volume: number;
  /** 背景音效是否开启 */
  ambientEnabled: boolean;
}

/** 故事播放器回调 */
export interface StoryPlayerCallbacks {
  /** 播放状态变化 */
  onPlayStateChange?: (isPlaying: boolean) => void;
  /** 播放进度更新 */
  onProgress?: (currentTime: number, totalDuration: number) => void;
  /** 播放完成 */
  onComplete?: () => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
}

// ============================================
// 冥想相关类型
// ============================================

/** 冥想类型 */
export type MeditationType = 'body_scan' | 'focused' | 'loving_kindness';

/** 冥想段落类型 */
export type MeditationSegmentType =
  | 'intro'
  | 'breathing'
  | 'focus'
  | 'guidance'
  | 'affirmation'
  | 'integration'
  | 'closing';

/** 冥想脚本片段 */
export interface MeditationSegment {
  /** 段落类型 */
  type: MeditationSegmentType;
  /** 持续时间（秒） */
  duration: number;
  /** 引导文字 */
  content: string;
  /** 额外指导 */
  instruction?: string;
}

/** 冥想会话 */
export interface MeditationSession {
  /** 唯一标识 */
  id: string;
  /** 会话标题 */
  title: string;
  /** 会话描述 */
  description: string;
  /** 冥想类型 */
  type: MeditationType;
  /** 预估时长（分钟） */
  duration: number;
  /** 脚本片段 */
  segments: MeditationSegment[];
}

/** 冥想状态 */
export interface MeditationState {
  /** 当前会话ID */
  currentSessionId: string | null;
  /** 是否正在播放 */
  isPlaying: boolean;
  /** 当前片段索引 */
  currentSegmentIndex: number;
  /** 已进行时间（秒） */
  currentTime: number;
  /** 总时长（秒） */
  totalDuration: number;
}

/** 冥想回调 */
export interface MeditationCallbacks {
  /** 播放状态变化 */
  onPlayStateChange?: (isPlaying: boolean) => void;
  /** 播放进度更新 */
  onProgress?: (currentTime: number, totalDuration: number) => void;
  /** 片段变化回调 */
  onSegmentChange?: (segment: MeditationSegment, index: number) => void;
  /** 完成回调 */
  onComplete?: () => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
}

// ============================================
// 统一放松服务类型
// ============================================

/** 放松活动类型 */
export type RelaxationType = 'breathing' | 'story' | 'meditation';

/** 放松服务统计 */
export interface RelaxationStats {
  /** 呼吸练习完成次数 */
  breathingSessionsCompleted: number;
  /** 故事播放完成次数 */
  storiesCompleted: number;
  /** 冥想完成次数 */
  meditationSessionsCompleted: number;
  /** 总放松时间（分钟） */
  totalRelaxationMinutes: number;
  /** 最常用的呼吸模式ID */
  favoriteBreathingPattern: string | null;
  /** 最后一次活动时间 */
  lastActivityAt: number | null;
}
