/**
 * Meditation Player
 * 冥想播放器
 *
 * 管理冥想引导的播放、暂停和进度控制
 */

import type {
  MeditationSession,
  MeditationSegment,
  MeditationState,
  MeditationCallbacks,
} from './types';
import { getMeditationById } from './meditations';
import { petSpeak } from '../pet/voice-link';
import { getVoiceManager } from '../voice';

/**
 * 初始播放器状态
 */
function createInitialState(): MeditationState {
  return {
    currentSessionId: null,
    isPlaying: false,
    currentSegmentIndex: 0,
    currentTime: 0,
    totalDuration: 0,
  };
}

/**
 * MeditationPlayer 类
 * 管理冥想的播放状态和 TTS 调用
 */
export class MeditationPlayer {
  private state: MeditationState;
  private callbacks: MeditationCallbacks;
  private currentSession: MeditationSession | null = null;
  private segmentTimer: ReturnType<typeof setTimeout> | null = null;
  private progressTimer: ReturnType<typeof setInterval> | null = null;
  private isDestroyed = false;

  constructor(callbacks?: MeditationCallbacks) {
    this.state = createInitialState();
    this.callbacks = callbacks ?? {};
  }

  /**
   * 获取当前状态
   */
  getState(): MeditationState {
    return { ...this.state };
  }

  /**
   * 获取当前会话
   */
  getCurrentSession(): MeditationSession | null {
    return this.currentSession;
  }

  /**
   * 获取当前段落
   */
  getCurrentSegment(): MeditationSegment | null {
    if (!this.currentSession) return null;
    return this.currentSession.segments[this.state.currentSegmentIndex] ?? null;
  }

  /**
   * 加载冥想会话
   */
  loadSession(sessionId: string): boolean {
    const session = getMeditationById(sessionId);
    if (!session) {
      console.error(`[MeditationPlayer] Session not found: ${sessionId}`);
      return false;
    }

    this.stop();
    this.currentSession = session;

    // 计算总时长
    const totalDuration = session.segments.reduce((sum, seg) => sum + seg.duration, 0);

    this.state = {
      ...createInitialState(),
      currentSessionId: sessionId,
      totalDuration,
    };

    return true;
  }

  /**
   * 开始播放
   */
  async play(): Promise<void> {
    if (!this.currentSession || this.isDestroyed) {
      return;
    }

    if (this.state.isPlaying) {
      return;
    }

    this.state.isPlaying = true;
    this.callbacks.onPlayStateChange?.(true);

    // 开始播放当前段落
    await this.playCurrentSegment();

    // 启动进度更新定时器
    this.startProgressTimer();
  }

  /**
   * 暂停播放
   */
  pause(): void {
    if (!this.state.isPlaying) {
      return;
    }

    this.state.isPlaying = false;
    this.callbacks.onPlayStateChange?.(false);
    this.stopSpeakingInternal();
    this.stopSegmentTimer();
    this.stopProgressTimer();
  }

  /**
   * 停止播放
   */
  stop(): void {
    this.state.isPlaying = false;
    this.state.currentTime = 0;
    this.state.currentSegmentIndex = 0;
    this.stopSpeakingInternal();
    this.stopSegmentTimer();
    this.stopProgressTimer();
    this.callbacks.onPlayStateChange?.(false);
  }

  /**
   * 切换播放/暂停
   */
  togglePlay(): void {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      void this.play();
    }
  }

  /**
   * 设置回调
   */
  setCallbacks(callbacks: MeditationCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * 销毁播放器
   */
  destroy(): void {
    this.isDestroyed = true;
    this.stop();
  }

  /**
   * 播放当前段落
   */
  private async playCurrentSegment(): Promise<void> {
    if (this.isDestroyed || !this.state.isPlaying || !this.currentSession) {
      return;
    }

    const segment = this.currentSession.segments[this.state.currentSegmentIndex];
    if (!segment) {
      // 播放完成
      this.handleComplete();
      return;
    }

    // 触发段落变化回调
    this.callbacks.onSegmentChange?.(segment, this.state.currentSegmentIndex);

    try {
      // 使用 TTS 播放段落内容
      await petSpeak(segment.content, {
        priority: 'high',
      });

      // 段落播放完成后，等待剩余时间
      if (this.state.isPlaying && !this.isDestroyed) {
        // 简单实现：每段按 duration 时间进行
        const waitTime = Math.max(1000, segment.duration * 1000 - 3000); // 减去TTS时间估计

        await this.delay(waitTime);

        // 进入下一段
        this.state.currentSegmentIndex++;
        await this.playCurrentSegment();
      }
    } catch (error) {
      console.error('[MeditationPlayer] Error playing segment:', error);
      this.callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 处理播放完成
   */
  private handleComplete(): void {
    this.state.isPlaying = false;
    this.state.currentTime = this.state.totalDuration;
    this.stopProgressTimer();
    this.callbacks.onPlayStateChange?.(false);
    this.callbacks.onComplete?.();
  }

  /**
   * 启动进度更新定时器
   */
  private startProgressTimer(): void {
    this.stopProgressTimer();
    this.progressTimer = setInterval(() => {
      if (this.state.isPlaying) {
        this.state.currentTime++;
        this.callbacks.onProgress?.(this.state.currentTime, this.state.totalDuration);
      }
    }, 1000);
  }

  /**
   * 停止进度更新定时器
   */
  private stopProgressTimer(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  /**
   * 停止段落定时器
   */
  private stopSegmentTimer(): void {
    if (this.segmentTimer) {
      clearTimeout(this.segmentTimer);
      this.segmentTimer = null;
    }
  }

  /**
   * 内部停止语音播放
   */
  private stopSpeakingInternal(): void {
    try {
      const manager = getVoiceManager();
      manager.stopSpeaking();
    } catch {
      // ignore - voice manager might not be initialized
    }
  }

  /**
   * 延迟工具函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * 全局播放器实例
 */
let playerInstance: MeditationPlayer | null = null;

/**
 * 获取全局 MeditationPlayer 实例
 */
export function getMeditationPlayer(): MeditationPlayer {
  if (!playerInstance) {
    playerInstance = new MeditationPlayer();
  }
  return playerInstance;
}

/**
 * 格式化冥想时间为 mm:ss
 */
export function formatMeditationTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
