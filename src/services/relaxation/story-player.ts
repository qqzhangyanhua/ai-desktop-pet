/**
 * Story Player
 * 故事播放器
 *
 * 管理睡前故事的播放、暂停和进度控制
 */

import type {
  BedtimeStory,
  StoryPlayerState,
  StoryPlayerCallbacks,
} from './types';
import { getStoryById } from './stories';
import { petSpeak } from '../pet/voice-link';
import { getVoiceManager } from '../voice';

/**
 * 初始播放器状态
 */
function createInitialState(): StoryPlayerState {
  return {
    currentStoryId: null,
    isPlaying: false,
    currentTime: 0,
    totalDuration: 0,
    volume: 1.0,
    ambientEnabled: true,
  };
}

/**
 * StoryPlayer 类
 * 管理故事的播放状态和 TTS 调用
 */
export class StoryPlayer {
  private state: StoryPlayerState;
  private callbacks: StoryPlayerCallbacks;
  private currentStory: BedtimeStory | null = null;
  private paragraphs: string[] = [];
  private currentParagraphIndex = 0;
  private progressTimer: ReturnType<typeof setInterval> | null = null;
  private isDestroyed = false;

  constructor(callbacks?: StoryPlayerCallbacks) {
    this.state = createInitialState();
    this.callbacks = callbacks ?? {};
  }

  /**
   * 获取当前状态
   */
  getState(): StoryPlayerState {
    return { ...this.state };
  }

  /**
   * 获取当前故事
   */
  getCurrentStory(): BedtimeStory | null {
    return this.currentStory;
  }

  /**
   * 加载故事
   */
  loadStory(storyId: string): boolean {
    const story = getStoryById(storyId);
    if (!story) {
      console.error(`[StoryPlayer] Story not found: ${storyId}`);
      return false;
    }

    this.stop();
    this.currentStory = story;
    this.paragraphs = this.parseStoryContent(story.textContent);
    this.currentParagraphIndex = 0;

    this.state = {
      ...createInitialState(),
      currentStoryId: storyId,
      totalDuration: story.duration * 60, // 转换为秒
    };

    return true;
  }

  /**
   * 开始播放
   */
  async play(): Promise<void> {
    if (!this.currentStory || this.isDestroyed) {
      return;
    }

    if (this.state.isPlaying) {
      return;
    }

    this.state.isPlaying = true;
    this.callbacks.onPlayStateChange?.(true);

    // 开始播放段落
    await this.playNextParagraph();

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
    this.stopProgressTimer();
  }

  /**
   * 停止播放
   */
  stop(): void {
    this.state.isPlaying = false;
    this.state.currentTime = 0;
    this.currentParagraphIndex = 0;
    this.stopSpeakingInternal();
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
   * 设置音量
   */
  setVolume(volume: number): void {
    this.state.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * 切换背景音效
   */
  toggleAmbient(): void {
    this.state.ambientEnabled = !this.state.ambientEnabled;
  }

  /**
   * 设置回调
   */
  setCallbacks(callbacks: StoryPlayerCallbacks): void {
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
   * 解析故事内容为段落
   */
  private parseStoryContent(content: string): string[] {
    return content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  /**
   * 播放下一段落
   */
  private async playNextParagraph(): Promise<void> {
    if (this.isDestroyed || !this.state.isPlaying) {
      return;
    }

    if (this.currentParagraphIndex >= this.paragraphs.length) {
      // 播放完成
      this.handleComplete();
      return;
    }

    const paragraph = this.paragraphs[this.currentParagraphIndex];
    if (!paragraph) {
      return;
    }

    try {
      // 使用 TTS 播放段落
      await petSpeak(paragraph, {
        priority: 'high',
      });

      // 段落播放完成后，继续下一段
      this.currentParagraphIndex++;

      // 等待一小段时间再播放下一段
      if (this.state.isPlaying && !this.isDestroyed) {
        await this.delay(1500); // 段落间停顿
        await this.playNextParagraph();
      }
    } catch (error) {
      console.error('[StoryPlayer] Error playing paragraph:', error);
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

        // 如果超过预估时间，使用实际播放时间
        if (this.state.currentTime >= this.state.totalDuration) {
          this.state.totalDuration = this.state.currentTime + 60; // 扩展时间
        }
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
let playerInstance: StoryPlayer | null = null;

/**
 * 获取全局 StoryPlayer 实例
 */
export function getStoryPlayer(): StoryPlayer {
  if (!playerInstance) {
    playerInstance = new StoryPlayer();
  }
  return playerInstance;
}

/**
 * 格式化时间为 mm:ss
 */
export function formatStoryTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
