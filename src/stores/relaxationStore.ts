/**
 * Relaxation Store
 * 放松系统状态管理
 *
 * 管理呼吸放松、睡前故事、正念冥想三大活动
 */

import { create } from 'zustand';
import type {
  RelaxationActivityId,
  RelaxationSession,
} from '@/types/relaxation';
import { getRelaxationActivityById } from '@/config/relaxation';
import { usePetStore } from './petStore';
import { useCareStore } from './careStore';
import { useToastStore } from './toastStore';

interface RelaxationStore {
  /** Current active session (null if no session) */
  currentSession: RelaxationSession | null;

  /** Is any activity currently running */
  isActive: boolean;

  /** Timer reference for cleanup */
  _timerId: ReturnType<typeof setInterval> | null;

  // === Actions ===

  /**
   * Start a relaxation activity
   * 开始放松活动
   */
  startActivity: (activityId: RelaxationActivityId) => void;

  /**
   * Stop current activity
   * 停止当前活动
   */
  stopActivity: () => void;

  /**
   * Internal: Advance to next step
   * 内部：前进到下一步
   */
  _advanceStep: () => void;

  /**
   * Internal: Update progress
   * 内部：更新进度
   */
  _updateProgress: () => void;

  /**
   * Internal: Complete activity
   * 内部：完成活动
   */
  _completeActivity: () => void;

  // === Legacy Compatibility (Deprecated) ===
  /** @deprecated Use currentSession.activity.id === 'breathing' instead */
  breathingVisible: boolean;
  /** @deprecated Not used in new architecture */
  breathingPatternId: string | undefined;
  /** @deprecated Use stopActivity() instead */
  closeBreathing: () => void;

  /** @deprecated Use currentSession.activity.id === 'story' instead */
  storyPlayerVisible: boolean;
  /** @deprecated Not used in new architecture */
  currentStoryId: string | undefined;
  /** @deprecated Use stopActivity() instead */
  closeStoryPlayer: () => void;

  /** @deprecated Use currentSession.activity.id === 'meditation' instead */
  meditationVisible: boolean;
  /** @deprecated Not used in new architecture */
  currentMeditationId: string | undefined;
  /** @deprecated Use stopActivity() instead */
  closeMeditation: () => void;

  openBreathing: () => void;
  openStoryPlayer: () => void;
  openMeditation: () => void;
}

export const useRelaxationStore = create<RelaxationStore>((set, get) => ({
  currentSession: null,
  isActive: false,
  _timerId: null,

  // === Legacy Compatibility Properties (Computed) ===
  get breathingVisible() {
    const session = get().currentSession;
    return session?.activity.id === 'breathing' && get().isActive;
  },
  breathingPatternId: undefined, // Not used in new architecture
  closeBreathing: () => get().stopActivity(),

  get storyPlayerVisible() {
    const session = get().currentSession;
    return session?.activity.id === 'story' && get().isActive;
  },
  currentStoryId: undefined, // Not used in new architecture
  closeStoryPlayer: () => get().stopActivity(),

  get meditationVisible() {
    const session = get().currentSession;
    return session?.activity.id === 'meditation' && get().isActive;
  },
  currentMeditationId: undefined, // Not used in new architecture
  closeMeditation: () => get().stopActivity(),

  startActivity: (activityId) => {
    const activity = getRelaxationActivityById(activityId);

    if (!activity) {
      console.error(`[RelaxationStore] Unknown activity: ${activityId}`);
      useToastStore.getState().addToast('未知的放松活动', { type: 'error' });
      return;
    }

    // Stop existing activity if any
    if (get().isActive) {
      get().stopActivity();
    }

    // Create new session
    const session: RelaxationSession = {
      activity,
      startTime: Date.now(),
      currentStep: 0,
      isActive: true,
      progress: 0,
    };

    set({
      currentSession: session,
      isActive: true,
    });

    // Update pet animation
    usePetStore.getState().setEmotion('neutral');
    usePetStore.getState().showBubble(activity.steps[0]?.instruction || '开始...', 5000);

    // Start update loop (every second)
    const timerId = setInterval(() => {
      get()._updateProgress();
    }, 1000);

    set({ _timerId: timerId });

    console.log(`[RelaxationStore] Started activity: ${activity.name}`);
  },

  stopActivity: () => {
    const { _timerId, currentSession } = get();

    // Clear timer
    if (_timerId) {
      clearInterval(_timerId);
    }

    // Reset state
    set({
      currentSession: null,
      isActive: false,
      _timerId: null,
    });

    if (currentSession) {
      useToastStore.getState().addToast(
        `已停止 ${currentSession.activity.name}`,
        { type: 'info' }
      );
    }

    console.log('[RelaxationStore] Activity stopped');
  },

  _updateProgress: () => {
    const session = get().currentSession;
    if (!session || !session.isActive) {
      return;
    }

    const elapsed = (Date.now() - session.startTime) / 1000; // seconds
    const progress = Math.min(100, (elapsed / session.activity.duration) * 100);

    // Check if completed
    if (elapsed >= session.activity.duration) {
      get()._completeActivity();
      return;
    }

    // Update progress
    set((state) => ({
      currentSession: state.currentSession
        ? {
            ...state.currentSession,
            progress,
          }
        : null,
    }));

    // Check if need to advance step
    const activity = session.activity;
    const currentStepIndex = session.currentStep;
    const nextStepIndex = currentStepIndex + 1;

    if (nextStepIndex < activity.steps.length) {
      const nextStep = activity.steps[nextStepIndex];
      if (nextStep && elapsed >= nextStep.time) {
        get()._advanceStep();
      }
    }
  },

  _advanceStep: () => {
    set((state) => {
      if (!state.currentSession) return state;

      const newStepIndex = state.currentSession.currentStep + 1;
      const step = state.currentSession.activity.steps[newStepIndex];

      if (!step) return state;

      // Show step instruction in bubble
      usePetStore.getState().showBubble(step.instruction, 10000);

      return {
        currentSession: {
          ...state.currentSession,
          currentStep: newStepIndex,
        },
      };
    });
  },

  _completeActivity: () => {
    const session = get().currentSession;
    if (!session) return;

    const activity = session.activity;

    // Stop timer
    const timerId = get()._timerId;
    if (timerId) {
      clearInterval(timerId);
    }

    // Apply effects to care status
    const careStore = useCareStore.getState();
    if (activity.effects.mood) {
      careStore.applyAction('rest'); // Use rest action as base
    }

    // Show completion message
    usePetStore.getState().setEmotion('happy');
    usePetStore.getState().showBubble(
      `完成${activity.name}！感觉好多了~`,
      4000
    );

    useToastStore.getState().addToast(
      `完成 ${activity.name}！心情+${activity.effects.mood}`,
      { type: 'success' }
    );

    // Reset state after a delay
    setTimeout(() => {
      set({
        currentSession: null,
        isActive: false,
        _timerId: null,
      });
    }, 1000);

    console.log(`[RelaxationStore] Completed activity: ${activity.name}`);
  },

  // === Legacy Compatibility Methods ===
  openBreathing: () => {
    get().startActivity('breathing');
  },

  openStoryPlayer: () => {
    get().startActivity('story');
  },

  openMeditation: () => {
    get().startActivity('meditation');
  },
}));
