/**
 * 按键说话服务
 * Push-to-Talk Service
 *
 * 按住指定按键开始录音，松开后自动识别并发送消息
 * 防抖机制：按键时长 < 200ms 视为误触
 */

import { getWebSpeechSTT } from './stt-web';
import type { PushToTalkStatus, PushToTalkConfig, STTResult } from '@/types';

/**
 * 默认配置
 */
const DEFAULT_CONFIG: PushToTalkConfig = {
  triggerKey: 'Space',
  minDuration: 200, // 200ms 防抖（PRD的300ms太长）
  maxDuration: 30000, // 30秒最大录音时长
};

/**
 * PushToTalkManager 单例类
 */
class PushToTalkManager {
  private static instance: PushToTalkManager;
  private config: PushToTalkConfig = DEFAULT_CONFIG;
  private state: PushToTalkStatus = 'idle';
  private recordingStartTime = 0;
  private recordingTimer: ReturnType<typeof setTimeout> | null = null;
  private recognizedText = '';
  private onMessageCallback?: (text: string) => void;
  private onStateChangeCallback?: (state: PushToTalkStatus) => void;

  // 键盘事件监听器
  private keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private keyUpHandler: ((e: KeyboardEvent) => void) | null = null;

  private constructor() {}

  static getInstance(): PushToTalkManager {
    if (!PushToTalkManager.instance) {
      PushToTalkManager.instance = new PushToTalkManager();
    }
    return PushToTalkManager.instance;
  }

  /**
   * 设置配置
   */
  setConfig(config: Partial<PushToTalkConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 设置消息回调
   */
  onMessage(callback: (text: string) => void): void {
    this.onMessageCallback = callback;
  }

  /**
   * 设置状态变化回调
   */
  onStateChange(callback: (state: PushToTalkStatus) => void): void {
    this.onStateChangeCallback = callback;
  }

  /**
   * 启用按键说话
   */
  async enable(): Promise<void> {
    if (this.keyDownHandler) {
      return; // 已启用
    }

    // 检查 STT 是否可用
    const stt = getWebSpeechSTT();
    if (!stt.isAvailable()) {
      throw new Error('Speech recognition is not supported in this browser');
    }

    // 设置 STT 回调
    stt.setCallbacks({
      onResult: (result: STTResult) => {
        if (result.isFinal) {
          this.recognizedText = result.text;
        }
      },
      onStart: () => {
        this.setState('recording');
      },
      onEnd: () => {
        // 录音结束，进入处理状态
        if (this.state === 'recording') {
          this.processRecording();
        }
      },
      onError: (error: Error) => {
        console.error('[PushToTalk] STT error:', error);
        this.setState('idle');
      },
    });

    // 注册键盘事件监听
    this.keyDownHandler = (e: KeyboardEvent) => {
      if (e.code === this.config.triggerKey && !e.repeat) {
        e.preventDefault();
        this.onKeyDown();
      }
    };

    this.keyUpHandler = (e: KeyboardEvent) => {
      if (e.code === this.config.triggerKey) {
        e.preventDefault();
        this.onKeyUp();
      }
    };

    document.addEventListener('keydown', this.keyDownHandler);
    document.addEventListener('keyup', this.keyUpHandler);

    console.log('[PushToTalk] Enabled with trigger key:', this.config.triggerKey);
  }

  /**
   * 禁用按键说话
   */
  async disable(): Promise<void> {
    // 停止录音
    if (this.state === 'recording') {
      const stt = getWebSpeechSTT();
      stt.abort();
    }

    // 移除键盘事件监听
    if (this.keyDownHandler) {
      document.removeEventListener('keydown', this.keyDownHandler);
      this.keyDownHandler = null;
    }
    if (this.keyUpHandler) {
      document.removeEventListener('keyup', this.keyUpHandler);
      this.keyUpHandler = null;
    }

    // 清除定时器
    if (this.recordingTimer) {
      clearTimeout(this.recordingTimer);
      this.recordingTimer = null;
    }

    this.setState('idle');
    console.log('[PushToTalk] Disabled');
  }

  /**
   * 按键按下处理
   */
  private onKeyDown(): void {
    if (this.state !== 'idle') {
      return; // 正在录音或处理中，忽略
    }

    this.recordingStartTime = Date.now();
    this.recognizedText = '';

    // 启动 STT 录音
    const stt = getWebSpeechSTT();
    stt.start();

    // 设置最大录音时长定时器
    this.recordingTimer = setTimeout(() => {
      if (this.state === 'recording') {
        console.log('[PushToTalk] Max duration reached, stopping recording');
        stt.stop();
      }
    }, this.config.maxDuration);

    console.log('[PushToTalk] Recording started');
  }

  /**
   * 按键松开处理
   */
  private onKeyUp(): void {
    if (this.state !== 'recording') {
      return;
    }

    const duration = Date.now() - this.recordingStartTime;

    // 防抖：时长 < 200ms 视为误触
    if (duration < this.config.minDuration) {
      console.log(`[PushToTalk] Ignored (too short: ${duration}ms)`);
      const stt = getWebSpeechSTT();
      stt.abort();
      this.setState('idle');
      return;
    }

    // 停止录音（会触发 onEnd 回调）
    const stt = getWebSpeechSTT();
    stt.stop();

    console.log(`[PushToTalk] Recording stopped (${duration}ms)`);
  }

  /**
   * 处理录音结果
   */
  private async processRecording(): Promise<void> {
    this.setState('processing');

    // 等待一小段时间确保 STT 完全结束
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (!this.recognizedText || this.recognizedText.trim().length === 0) {
      console.log('[PushToTalk] No recognized text');
      this.setState('idle');
      return;
    }

    const text = this.recognizedText.trim();
    console.log('[PushToTalk] Recognized:', text);

    // 发送消息
    if (this.onMessageCallback) {
      this.onMessageCallback(text);
    }

    // 重置状态
    this.recognizedText = '';
    this.setState('idle');
  }

  /**
   * 设置状态
   */
  private setState(state: PushToTalkStatus): void {
    if (this.state !== state) {
      this.state = state;
      if (this.onStateChangeCallback) {
        this.onStateChangeCallback(state);
      }
    }
  }

  /**
   * 获取当前状态
   */
  getState(): PushToTalkStatus {
    return this.state;
  }

  /**
   * 获取录音时长（毫秒）
   */
  getRecordingDuration(): number {
    if (this.state === 'recording') {
      return Date.now() - this.recordingStartTime;
    }
    return 0;
  }

  /**
   * 获取已识别文本
   */
  getRecognizedText(): string {
    return this.recognizedText;
  }
}

/**
 * 获取 PushToTalkManager 单例
 */
export function getPushToTalkManager(): PushToTalkManager {
  return PushToTalkManager.getInstance();
}

/**
 * 便捷函数：启用按键说话
 */
export async function enablePushToTalk(
  config?: Partial<PushToTalkConfig>,
  onMessage?: (text: string) => void
): Promise<void> {
  const manager = getPushToTalkManager();
  if (config) {
    manager.setConfig(config);
  }
  if (onMessage) {
    manager.onMessage(onMessage);
  }
  return manager.enable();
}

/**
 * 便捷函数：禁用按键说话
 */
export async function disablePushToTalk(): Promise<void> {
  return getPushToTalkManager().disable();
}
