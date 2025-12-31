/**
 * Relaxation Store
 * 放松功能状态管理
 */

import { create } from 'zustand';

interface RelaxationState {
  /** 呼吸练习是否显示 */
  breathingVisible: boolean;
  /** 当前呼吸模式ID */
  breathingPatternId: string;
  /** 故事播放器是否显示 */
  storyPlayerVisible: boolean;
  /** 当前故事ID */
  currentStoryId: string | null;
  /** 冥想面板是否显示 */
  meditationVisible: boolean;
  /** 当前冥想会话ID */
  currentMeditationId: string | null;
}

interface RelaxationActions {
  /** 打开呼吸练习 */
  openBreathing: (patternId?: string) => void;
  /** 关闭呼吸练习 */
  closeBreathing: () => void;
  /** 打开故事播放器 */
  openStoryPlayer: (storyId?: string) => void;
  /** 关闭故事播放器 */
  closeStoryPlayer: () => void;
  /** 打开冥想 */
  openMeditation: (sessionId?: string) => void;
  /** 关闭冥想 */
  closeMeditation: () => void;
  /** 关闭所有 */
  closeAll: () => void;
}

const initialState: RelaxationState = {
  breathingVisible: false,
  breathingPatternId: '478',
  storyPlayerVisible: false,
  currentStoryId: null,
  meditationVisible: false,
  currentMeditationId: null,
};

export const useRelaxationStore = create<RelaxationState & RelaxationActions>((set) => ({
  ...initialState,

  openBreathing: (patternId = '478') =>
    set({
      breathingVisible: true,
      breathingPatternId: patternId,
      // 关闭其他面板
      storyPlayerVisible: false,
      meditationVisible: false,
    }),

  closeBreathing: () =>
    set({
      breathingVisible: false,
    }),

  openStoryPlayer: (storyId) =>
    set({
      storyPlayerVisible: true,
      currentStoryId: storyId ?? null,
      // 关闭其他面板
      breathingVisible: false,
      meditationVisible: false,
    }),

  closeStoryPlayer: () =>
    set({
      storyPlayerVisible: false,
      currentStoryId: null,
    }),

  openMeditation: (sessionId) =>
    set({
      meditationVisible: true,
      currentMeditationId: sessionId ?? null,
      // 关闭其他面板
      breathingVisible: false,
      storyPlayerVisible: false,
    }),

  closeMeditation: () =>
    set({
      meditationVisible: false,
      currentMeditationId: null,
    }),

  closeAll: () =>
    set({
      breathingVisible: false,
      storyPlayerVisible: false,
      meditationVisible: false,
    }),
}));
