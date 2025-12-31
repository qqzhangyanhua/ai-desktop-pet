/**
 * useBreathingExercise Hook
 * 呼吸练习 React Hook
 *
 * 封装 BreathingController，提供 React 友好的状态管理
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  BreathingController,
  getBreathingPattern,
  getAllBreathingPatterns,
  recommendPattern,
  formatTimeRemaining,
} from '../services/relaxation';
import type {
  BreathingPattern,
  BreathingPhase,
  BreathingSessionState,
} from '../services/relaxation';
import { petSpeak } from '../services/pet/voice-link';

interface UseBreathingExerciseOptions {
  /** 初始模式ID */
  patternId?: string;
  /** 循环次数 */
  cycles?: number;
  /** 是否启用语音引导 */
  enableVoice?: boolean;
  /** 完成回调 */
  onComplete?: () => void;
}

interface UseBreathingExerciseReturn {
  /** 当前状态 */
  state: BreathingSessionState;
  /** 当前阶段 */
  currentPhase: BreathingPhase | null;
  /** 当前模式 */
  currentPattern: BreathingPattern | null;
  /** 所有可用模式 */
  allPatterns: BreathingPattern[];
  /** 格式化的剩余时间 */
  formattedTimeRemaining: string;
  /** 阶段进度百分比 (0-100) */
  phaseProgress: number;
  /** 总进度百分比 (0-100) */
  totalProgress: number;
  /** 开始练习 */
  start: () => void;
  /** 暂停练习 */
  pause: () => void;
  /** 恢复练习 */
  resume: () => void;
  /** 停止练习 */
  stop: () => void;
  /** 重置练习 */
  reset: (cycles?: number) => void;
  /** 更换模式 */
  changePattern: (patternId: string, cycles?: number) => void;
  /** 根据场景推荐模式 */
  recommendForScenario: (scenario: 'stress' | 'sleep' | 'focus' | 'anxiety') => BreathingPattern;
  /** 切换语音引导 */
  toggleVoice: () => void;
  /** 语音是否启用 */
  voiceEnabled: boolean;
}

/**
 * 创建空状态
 */
function createEmptyState(): BreathingSessionState {
  return {
    patternId: '',
    currentPhaseIndex: 0,
    currentCycle: 1,
    targetCycles: 0,
    phaseTimeRemaining: 0,
    totalTimeRemaining: 0,
    isActive: false,
    isPaused: false,
    startedAt: null,
  };
}

/**
 * useBreathingExercise Hook
 */
export function useBreathingExercise(
  options: UseBreathingExerciseOptions = {}
): UseBreathingExerciseReturn {
  const { patternId = '478', cycles, enableVoice = true, onComplete } = options;

  const [state, setState] = useState<BreathingSessionState>(createEmptyState);
  const [currentPhase, setCurrentPhase] = useState<BreathingPhase | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(enableVoice);

  const controllerRef = useRef<BreathingController | null>(null);
  const onCompleteRef = useRef(onComplete);

  // 保持 onComplete 引用最新
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // 初始化控制器
  useEffect(() => {
    const pattern = getBreathingPattern(patternId);
    if (!pattern) return;

    const controller = new BreathingController(patternId, cycles, {
      onPhaseChange: (phase, _phaseIndex, _cycle) => {
        setCurrentPhase(phase);

        // 语音引导
        if (voiceEnabled) {
          void petSpeak(phase.instruction, { priority: 'high' });
        }
      },
      onCycleComplete: (cycle, totalCycles) => {
        if (voiceEnabled && cycle < totalCycles) {
          void petSpeak(`第${cycle}轮完成，继续`, { priority: 'normal' });
        }
      },
      onComplete: () => {
        if (voiceEnabled) {
          void petSpeak('呼吸练习完成，感觉好些了吗？', { priority: 'high' });
        }
        if (onCompleteRef.current) {
          onCompleteRef.current();
        }
      },
      onTick: (newState) => {
        setState(newState);
      },
    });

    controllerRef.current = controller;
    setState(controller.getState());

    // 设置初始阶段
    const firstPhase = pattern.phases[0];
    if (firstPhase) {
      setCurrentPhase(firstPhase);
    }

    return () => {
      controller.destroy();
    };
  }, [patternId, cycles, voiceEnabled]);

  // 开始练习
  const start = useCallback(() => {
    if (controllerRef.current) {
      if (voiceEnabled) {
        void petSpeak('开始呼吸练习，跟着我的节奏来', { priority: 'high' });
      }
      controllerRef.current.start();
      setState(controllerRef.current.getState());
    }
  }, [voiceEnabled]);

  // 暂停练习
  const pause = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.pause();
      setState(controllerRef.current.getState());
    }
  }, []);

  // 恢复练习
  const resume = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.resume();
      setState(controllerRef.current.getState());
    }
  }, []);

  // 停止练习
  const stop = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.stop();
      setState(controllerRef.current.getState());
      setCurrentPhase(null);
    }
  }, []);

  // 重置练习
  const reset = useCallback((resetCycles?: number) => {
    if (controllerRef.current) {
      controllerRef.current.reset(resetCycles);
      setState(controllerRef.current.getState());
      const phase = controllerRef.current.getCurrentPhase();
      setCurrentPhase(phase ?? null);
    }
  }, []);

  // 更换模式
  const changePattern = useCallback((newPatternId: string, newCycles?: number) => {
    if (controllerRef.current) {
      controllerRef.current.changePattern(newPatternId, newCycles);
      setState(controllerRef.current.getState());
      const phase = controllerRef.current.getCurrentPhase();
      setCurrentPhase(phase ?? null);
    }
  }, []);

  // 切换语音
  const toggleVoice = useCallback(() => {
    setVoiceEnabled((prev) => !prev);
  }, []);

  // 计算进度
  const currentPattern = getBreathingPattern(state.patternId) ?? null;
  const phaseDuration = currentPhase?.duration ?? 1;
  const phaseProgress = ((phaseDuration - state.phaseTimeRemaining) / phaseDuration) * 100;

  const cycleDuration = currentPattern?.phases.reduce((sum, p) => sum + p.duration, 0) ?? 1;
  const totalDuration = cycleDuration * state.targetCycles;
  const totalProgress = ((totalDuration - state.totalTimeRemaining) / totalDuration) * 100;

  return {
    state,
    currentPhase,
    currentPattern,
    allPatterns: getAllBreathingPatterns(),
    formattedTimeRemaining: formatTimeRemaining(state.totalTimeRemaining),
    phaseProgress: Math.min(100, Math.max(0, phaseProgress)),
    totalProgress: Math.min(100, Math.max(0, totalProgress)),
    start,
    pause,
    resume,
    stop,
    reset,
    changePattern,
    recommendForScenario: recommendPattern,
    toggleVoice,
    voiceEnabled,
  };
}
