/**
 * Performance Manager Service
 * 性能管理服务
 *
 * 智能后台运行策略，当窗口失去焦点或最小化时，
 * 自动降低资源占用（渲染帧率、任务频率）
 */

import type { PerformanceMode } from '@/types';
import { useConfigStore } from '@/stores';

/**
 * 性能模式配置
 */
interface PerformanceModeConfig {
  fps: number;
  taskIntervalMs: number;
  idleAnimationInterval: number;
}

/**
 * 各模式的具体配置
 */
const MODE_CONFIGS: Record<PerformanceMode, PerformanceModeConfig> = {
  performance: {
    fps: 60,
    taskIntervalMs: 60000, // 1 minute
    idleAnimationInterval: 5000,
  },
  balanced: {
    fps: 30,
    taskIntervalMs: 120000, // 2 minutes
    idleAnimationInterval: 10000,
  },
  battery: {
    fps: 15,
    taskIntervalMs: 300000, // 5 minutes
    idleAnimationInterval: 20000,
  },
};

/**
 * 性能管理器事件回调
 */
interface PerformanceCallbacks {
  onFpsChange?: (fps: number) => void;
  onModeChange?: (mode: PerformanceMode) => void;
}

/**
 * PerformanceManager 单例类
 */
class PerformanceManager {
  private static instance: PerformanceManager;
  private currentMode: PerformanceMode = 'balanced';
  private isWindowFocused = true;
  private isWindowMinimized = false;
  private callbacks: PerformanceCallbacks = {};
  private autoSwitchEnabled = true;

  private constructor() {}

  static getInstance(): PerformanceManager {
    if (!PerformanceManager.instance) {
      PerformanceManager.instance = new PerformanceManager();
    }
    return PerformanceManager.instance;
  }

  /**
   * 初始化性能管理器
   */
  async initialize(): Promise<void> {
    // 从配置中读取初始模式
    const { config } = useConfigStore.getState();
    this.currentMode = config.performance.backgroundMode;

    console.log('[PerformanceManager] Initialized with mode:', this.currentMode);
  }

  /**
   * 设置回调
   */
  setCallbacks(callbacks: PerformanceCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * 根据窗口状态调整性能模式
   */
  async adjustForWindowState(focused: boolean, minimized: boolean): Promise<void> {
    this.isWindowFocused = focused;
    this.isWindowMinimized = minimized;

    if (!this.autoSwitchEnabled) {
      return;
    }

    const { config } = useConfigStore.getState();
    const configuredMode = config.performance.backgroundMode;

    let targetMode: PerformanceMode;

    if (minimized) {
      // 最小化时总是切换到省电模式
      targetMode = 'battery';
    } else if (!focused && configuredMode !== 'performance') {
      // 失焦时切换到配置的后台模式（除非是性能模式）
      targetMode = configuredMode;
    } else {
      // 获得焦点时恢复性能模式
      targetMode = 'performance';
    }

    await this.setMode(targetMode);
  }

  /**
   * 设置性能模式
   */
  async setMode(mode: PerformanceMode): Promise<void> {
    if (this.currentMode === mode) {
      return;
    }

    const previousMode = this.currentMode;
    this.currentMode = mode;

    const config = MODE_CONFIGS[mode];

    // 通知 fps 变化
    if (this.callbacks.onFpsChange) {
      this.callbacks.onFpsChange(config.fps);
    }

    // 通知模式变化
    if (this.callbacks.onModeChange) {
      this.callbacks.onModeChange(mode);
    }

    console.log(
      `[PerformanceManager] Mode changed: ${previousMode} -> ${mode} (fps: ${config.fps})`
    );
  }

  /**
   * 获取当前模式
   */
  getCurrentMode(): PerformanceMode {
    return this.currentMode;
  }

  /**
   * 获取当前 FPS
   */
  getCurrentFps(): number {
    return MODE_CONFIGS[this.currentMode].fps;
  }

  /**
   * 获取当前任务间隔
   */
  getTaskInterval(): number {
    return MODE_CONFIGS[this.currentMode].taskIntervalMs;
  }

  /**
   * 获取当前闲置动画间隔
   */
  getIdleAnimationInterval(): number {
    return MODE_CONFIGS[this.currentMode].idleAnimationInterval;
  }

  /**
   * 获取模式配置
   */
  getModeConfig(mode: PerformanceMode): PerformanceModeConfig {
    return MODE_CONFIGS[mode];
  }

  /**
   * 设置自动切换开关
   */
  setAutoSwitchEnabled(enabled: boolean): void {
    this.autoSwitchEnabled = enabled;
  }

  /**
   * 是否启用自动切换
   */
  isAutoSwitchEnabled(): boolean {
    return this.autoSwitchEnabled;
  }

  /**
   * 获取窗口状态
   */
  getWindowState(): { focused: boolean; minimized: boolean } {
    return {
      focused: this.isWindowFocused,
      minimized: this.isWindowMinimized,
    };
  }

  /**
   * 手动触发窗口焦点事件
   */
  async onWindowFocus(): Promise<void> {
    await this.adjustForWindowState(true, false);
  }

  /**
   * 手动触发窗口失焦事件
   */
  async onWindowBlur(): Promise<void> {
    await this.adjustForWindowState(false, false);
  }

  /**
   * 手动触发窗口最小化事件
   */
  async onWindowMinimize(): Promise<void> {
    await this.adjustForWindowState(false, true);
  }

  /**
   * 手动触发窗口恢复事件
   */
  async onWindowRestore(): Promise<void> {
    await this.adjustForWindowState(true, false);
  }
}

/**
 * 获取 PerformanceManager 单例
 */
export function getPerformanceManager(): PerformanceManager {
  return PerformanceManager.getInstance();
}

/**
 * 便捷函数：初始化性能管理器
 */
export async function initializePerformanceManager(): Promise<void> {
  const manager = getPerformanceManager();
  await manager.initialize();
}

/**
 * 便捷函数：获取当前 FPS
 */
export function getCurrentFps(): number {
  return getPerformanceManager().getCurrentFps();
}

/**
 * 便捷函数：获取当前任务间隔
 */
export function getTaskInterval(): number {
  return getPerformanceManager().getTaskInterval();
}
