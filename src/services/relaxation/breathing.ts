/**
 * Breathing Exercise Controller
 * 呼吸练习控制器
 *
 * 管理呼吸练习的计时、阶段切换和回调触发
 */

import type {
  BreathingPattern,
  BreathingPhase,
  BreathingSessionState,
  BreathingCallbacks,
} from './types';

// ============================================
// 预设呼吸模式
// ============================================

export const BREATHING_PATTERNS: Record<string, BreathingPattern> = {
  '478': {
    id: '478',
    name: '4-7-8 放松法',
    description: '经典放松呼吸法，帮助快速平静心情，适合压力大或入睡困难时使用',
    phases: [
      { action: 'inhale', duration: 4, instruction: '深深吸气...' },
      { action: 'hold', duration: 7, instruction: '屏住呼吸...' },
      { action: 'exhale', duration: 8, instruction: '缓缓呼气...' },
    ],
    recommendedCycles: 3,
    suitableFor: ['stress', 'sleep', 'anxiety'],
  },
  box: {
    id: 'box',
    name: '方块呼吸',
    description: '四步均匀呼吸法，常用于提升专注力和镇定情绪',
    phases: [
      { action: 'inhale', duration: 4, instruction: '吸气...' },
      { action: 'hold', duration: 4, instruction: '保持...' },
      { action: 'exhale', duration: 4, instruction: '呼气...' },
      { action: 'hold', duration: 4, instruction: '保持...' },
    ],
    recommendedCycles: 4,
    suitableFor: ['focus', 'anxiety'],
  },
  relaxing: {
    id: 'relaxing',
    name: '简易放松呼吸',
    description: '入门级呼吸练习，适合初学者和快速减压',
    phases: [
      { action: 'inhale', duration: 4, instruction: '慢慢吸气...' },
      { action: 'exhale', duration: 6, instruction: '慢慢呼气...' },
    ],
    recommendedCycles: 5,
    suitableFor: ['stress'],
  },
  energizing: {
    id: 'energizing',
    name: '活力呼吸',
    description: '短促有力的呼吸，帮助提神醒脑',
    phases: [
      { action: 'inhale', duration: 2, instruction: '快速吸气！' },
      { action: 'exhale', duration: 2, instruction: '用力呼气！' },
    ],
    recommendedCycles: 10,
    suitableFor: ['focus'],
  },
};

/**
 * 获取所有呼吸模式列表
 */
export function getAllBreathingPatterns(): BreathingPattern[] {
  return Object.values(BREATHING_PATTERNS);
}

/**
 * 根据ID获取呼吸模式
 */
export function getBreathingPattern(id: string): BreathingPattern | undefined {
  return BREATHING_PATTERNS[id];
}

/**
 * 根据场景推荐呼吸模式
 */
export function recommendPattern(
  scenario: 'stress' | 'sleep' | 'focus' | 'anxiety'
): BreathingPattern {
  const patterns = getAllBreathingPatterns();
  const suitable = patterns.filter((p) => p.suitableFor.includes(scenario));
  // 返回第一个匹配的，或默认返回 4-7-8
  return suitable[0] ?? BREATHING_PATTERNS['478']!;
}

// ============================================
// 呼吸练习控制器
// ============================================

/**
 * 创建初始会话状态
 */
function createInitialState(patternId: string, targetCycles: number): BreathingSessionState {
  const pattern = getBreathingPattern(patternId);
  const firstPhase = pattern?.phases[0];
  const cycleDuration = pattern?.phases.reduce((sum, p) => sum + p.duration, 0) ?? 0;

  return {
    patternId,
    currentPhaseIndex: 0,
    currentCycle: 1,
    targetCycles,
    phaseTimeRemaining: firstPhase?.duration ?? 0,
    totalTimeRemaining: cycleDuration * targetCycles,
    isActive: false,
    isPaused: false,
    startedAt: null,
  };
}

/**
 * BreathingController 类
 * 管理呼吸练习的状态和计时
 */
export class BreathingController {
  private state: BreathingSessionState;
  private pattern: BreathingPattern;
  private callbacks: BreathingCallbacks;
  private timerId: ReturnType<typeof setInterval> | null = null;

  constructor(patternId: string, cycles?: number, callbacks?: BreathingCallbacks) {
    const pattern = getBreathingPattern(patternId);
    if (!pattern) {
      throw new Error(`Unknown breathing pattern: ${patternId}`);
    }

    this.pattern = pattern;
    this.callbacks = callbacks ?? {};
    this.state = createInitialState(patternId, cycles ?? pattern.recommendedCycles);
  }

  /**
   * 获取当前状态
   */
  getState(): BreathingSessionState {
    return { ...this.state };
  }

  /**
   * 获取当前阶段
   */
  getCurrentPhase(): BreathingPhase | undefined {
    return this.pattern.phases[this.state.currentPhaseIndex];
  }

  /**
   * 开始练习
   */
  start(): void {
    if (this.state.isActive && !this.state.isPaused) {
      return; // 已在运行
    }

    this.state.isActive = true;
    this.state.isPaused = false;
    this.state.startedAt = this.state.startedAt ?? Date.now();

    // 触发初始阶段回调
    const phase = this.getCurrentPhase();
    if (phase && this.callbacks.onPhaseChange) {
      this.callbacks.onPhaseChange(phase, this.state.currentPhaseIndex, this.state.currentCycle);
    }

    // 启动定时器（每秒触发）
    this.timerId = setInterval(() => this.tick(), 1000);
  }

  /**
   * 暂停练习
   */
  pause(): void {
    if (!this.state.isActive || this.state.isPaused) {
      return;
    }

    this.state.isPaused = true;
    this.clearTimer();
  }

  /**
   * 恢复练习
   */
  resume(): void {
    if (!this.state.isActive || !this.state.isPaused) {
      return;
    }

    this.state.isPaused = false;
    this.timerId = setInterval(() => this.tick(), 1000);
  }

  /**
   * 停止练习
   */
  stop(): void {
    this.clearTimer();
    this.state = createInitialState(this.pattern.id, this.state.targetCycles);
  }

  /**
   * 重置练习
   */
  reset(cycles?: number): void {
    this.stop();
    this.state = createInitialState(this.pattern.id, cycles ?? this.pattern.recommendedCycles);
  }

  /**
   * 更换模式
   */
  changePattern(patternId: string, cycles?: number): void {
    const pattern = getBreathingPattern(patternId);
    if (!pattern) {
      throw new Error(`Unknown breathing pattern: ${patternId}`);
    }

    this.stop();
    this.pattern = pattern;
    this.state = createInitialState(patternId, cycles ?? pattern.recommendedCycles);
  }

  /**
   * 设置回调
   */
  setCallbacks(callbacks: BreathingCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * 每秒计时逻辑
   */
  private tick(): void {
    if (!this.state.isActive || this.state.isPaused) {
      return;
    }

    // 减少剩余时间
    this.state.phaseTimeRemaining--;
    this.state.totalTimeRemaining--;

    // 触发 tick 回调
    if (this.callbacks.onTick) {
      this.callbacks.onTick(this.getState());
    }

    // 检查阶段是否结束
    if (this.state.phaseTimeRemaining <= 0) {
      this.nextPhase();
    }
  }

  /**
   * 进入下一阶段
   */
  private nextPhase(): void {
    const nextIndex = this.state.currentPhaseIndex + 1;

    if (nextIndex >= this.pattern.phases.length) {
      // 当前循环结束
      this.nextCycle();
    } else {
      // 进入下一阶段
      this.state.currentPhaseIndex = nextIndex;
      const phase = this.pattern.phases[nextIndex]!;
      this.state.phaseTimeRemaining = phase.duration;

      if (this.callbacks.onPhaseChange) {
        this.callbacks.onPhaseChange(phase, nextIndex, this.state.currentCycle);
      }
    }
  }

  /**
   * 进入下一循环
   */
  private nextCycle(): void {
    // 触发循环完成回调
    if (this.callbacks.onCycleComplete) {
      this.callbacks.onCycleComplete(this.state.currentCycle, this.state.targetCycles);
    }

    if (this.state.currentCycle >= this.state.targetCycles) {
      // 全部完成
      this.complete();
    } else {
      // 进入下一循环
      this.state.currentCycle++;
      this.state.currentPhaseIndex = 0;
      const phase = this.pattern.phases[0]!;
      this.state.phaseTimeRemaining = phase.duration;

      if (this.callbacks.onPhaseChange) {
        this.callbacks.onPhaseChange(phase, 0, this.state.currentCycle);
      }
    }
  }

  /**
   * 练习完成
   */
  private complete(): void {
    this.clearTimer();
    this.state.isActive = false;

    if (this.callbacks.onComplete) {
      this.callbacks.onComplete();
    }
  }

  /**
   * 清除定时器
   */
  private clearTimer(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * 销毁控制器
   */
  destroy(): void {
    this.clearTimer();
  }
}

/**
 * 计算单个循环的总时长（秒）
 */
export function calculateCycleDuration(pattern: BreathingPattern): number {
  return pattern.phases.reduce((sum, phase) => sum + phase.duration, 0);
}

/**
 * 计算完整练习的总时长（秒）
 */
export function calculateTotalDuration(pattern: BreathingPattern, cycles?: number): number {
  const cycleDuration = calculateCycleDuration(pattern);
  return cycleDuration * (cycles ?? pattern.recommendedCycles);
}

/**
 * 格式化剩余时间为 mm:ss
 */
export function formatTimeRemaining(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
