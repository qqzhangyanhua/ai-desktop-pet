// Edge TTS Service - Uses edge-tts CLI through Tauri shell

import { Command } from '@tauri-apps/plugin-shell';
import { tempDir, join } from '@tauri-apps/api/path';
import { exists, remove } from '@tauri-apps/plugin-fs';
import type { TTSConfig, TTSVoice, TTSCallbacks, TTSStatus } from '../../types';

// Edge TTS voice list (partial - most commonly used)
const EDGE_TTS_VOICES: TTSVoice[] = [
  // Chinese
  { id: 'zh-CN-XiaoxiaoNeural', name: 'Xiaoxiao (Female)', language: 'zh-CN', gender: 'female' },
  { id: 'zh-CN-YunxiNeural', name: 'Yunxi (Male)', language: 'zh-CN', gender: 'male' },
  { id: 'zh-CN-YunjianNeural', name: 'Yunjian (Male)', language: 'zh-CN', gender: 'male' },
  { id: 'zh-CN-XiaoyiNeural', name: 'Xiaoyi (Female)', language: 'zh-CN', gender: 'female' },
  { id: 'zh-CN-YunyangNeural', name: 'Yunyang (Male)', language: 'zh-CN', gender: 'male' },
  { id: 'zh-TW-HsiaoChenNeural', name: 'HsiaoChen (Female)', language: 'zh-TW', gender: 'female' },
  { id: 'zh-TW-YunJheNeural', name: 'YunJhe (Male)', language: 'zh-TW', gender: 'male' },
  // English
  { id: 'en-US-JennyNeural', name: 'Jenny (Female)', language: 'en-US', gender: 'female' },
  { id: 'en-US-GuyNeural', name: 'Guy (Male)', language: 'en-US', gender: 'male' },
  { id: 'en-US-AriaNeural', name: 'Aria (Female)', language: 'en-US', gender: 'female' },
  { id: 'en-GB-SoniaNeural', name: 'Sonia (Female)', language: 'en-GB', gender: 'female' },
  { id: 'en-GB-RyanNeural', name: 'Ryan (Male)', language: 'en-GB', gender: 'male' },
  // Japanese
  { id: 'ja-JP-NanamiNeural', name: 'Nanami (Female)', language: 'ja-JP', gender: 'female' },
  { id: 'ja-JP-KeitaNeural', name: 'Keita (Male)', language: 'ja-JP', gender: 'male' },
  // Korean
  { id: 'ko-KR-SunHiNeural', name: 'SunHi (Female)', language: 'ko-KR', gender: 'female' },
  { id: 'ko-KR-InJoonNeural', name: 'InJoon (Male)', language: 'ko-KR', gender: 'male' },
];

interface EdgeTTSConfig extends TTSConfig {
  voice: string;
}

const DEFAULT_CONFIG: EdgeTTSConfig = {
  voice: 'zh-CN-XiaoxiaoNeural',
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
};

export class EdgeTTS {
  private config: EdgeTTSConfig;
  private callbacks: TTSCallbacks = {};
  private status: TTSStatus = 'idle';
  private currentAudio: HTMLAudioElement | null = null;
  private isAvailableFlag: boolean | null = null;

  constructor(config: Partial<EdgeTTSConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async checkAvailability(): Promise<boolean> {
    if (this.isAvailableFlag !== null) {
      return this.isAvailableFlag;
    }

    try {
      // Check if edge-tts is installed
      const command = Command.create('edge-tts', ['--version']);
      await command.execute();
      this.isAvailableFlag = true;
      return true;
    } catch {
      // edge-tts not found, try python edge-tts
      try {
        const command = Command.create('python', ['-m', 'edge_tts', '--version']);
        await command.execute();
        this.isAvailableFlag = true;
        return true;
      } catch {
        this.isAvailableFlag = false;
        return false;
      }
    }
  }

  isAvailable(): boolean {
    return this.isAvailableFlag ?? false;
  }

  getStatus(): TTSStatus {
    return this.status;
  }

  getVoices(): TTSVoice[] {
    return EDGE_TTS_VOICES;
  }

  setConfig(config: Partial<EdgeTTSConfig>): void {
    this.config = { ...this.config, ...config };
  }

  setCallbacks(callbacks: TTSCallbacks): void {
    this.callbacks = callbacks;
  }

  async speak(text: string): Promise<boolean> {
    if (!text.trim()) {
      return false;
    }

    // Stop any current speech
    this.stop();

    this.status = 'loading';

    try {
      // Generate audio file
      const tempDirPath = await tempDir();
      const outputPath = await join(tempDirPath, `tts_${Date.now()}.mp3`);

      // Build command arguments
      const args = [
        '--text', text,
        '--voice', this.config.voice,
        '--write-media', outputPath,
      ];

      // Add rate if not default
      if (this.config.rate !== 1.0) {
        const ratePercent = Math.round((this.config.rate - 1) * 100);
        args.push('--rate', `${ratePercent >= 0 ? '+' : ''}${ratePercent}%`);
      }

      // Add pitch if not default
      if (this.config.pitch !== 1.0) {
        const pitchHz = Math.round((this.config.pitch - 1) * 50);
        args.push('--pitch', `${pitchHz >= 0 ? '+' : ''}${pitchHz}Hz`);
      }

      // Add volume if not default
      if (this.config.volume !== 1.0) {
        const volumePercent = Math.round((this.config.volume - 1) * 100);
        args.push('--volume', `${volumePercent >= 0 ? '+' : ''}${volumePercent}%`);
      }

      // Try edge-tts first, then python module
      let command: ReturnType<typeof Command.create>;
      try {
        command = Command.create('edge-tts', args);
        await command.execute();
      } catch {
        command = Command.create('python', ['-m', 'edge_tts', ...args]);
        await command.execute();
      }

      // Check if file was created
      const fileExists = await exists(outputPath);
      if (!fileExists) {
        throw new Error('Audio file was not created');
      }

      // Play audio
      this.currentAudio = new Audio(`file://${outputPath}`);

      this.currentAudio.onplay = () => {
        this.status = 'speaking';
        this.callbacks.onStart?.();
      };

      this.currentAudio.onended = async () => {
        this.status = 'idle';
        this.currentAudio = null;
        this.callbacks.onEnd?.();

        // Clean up temp file
        try {
          await remove(outputPath);
        } catch {
          // Ignore cleanup errors
        }
      };

      this.currentAudio.onerror = () => {
        this.status = 'error';
        this.currentAudio = null;
        this.callbacks.onError?.(new Error('Failed to play audio'));
      };

      await this.currentAudio.play();
      return true;
    } catch (error) {
      this.status = 'error';
      console.error('Edge TTS error:', error);
      this.callbacks.onError?.(
        error instanceof Error ? error : new Error('Edge TTS failed')
      );
      return false;
    }
  }

  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.status = 'idle';
  }

  pause(): void {
    if (this.currentAudio && this.status === 'speaking') {
      this.currentAudio.pause();
    }
  }

  resume(): void {
    if (this.currentAudio) {
      this.currentAudio.play();
    }
  }

  isSpeaking(): boolean {
    return this.status === 'speaking';
  }

  destroy(): void {
    this.stop();
    this.callbacks = {};
  }
}

// Singleton instance
let edgeTTSInstance: EdgeTTS | null = null;

export function getEdgeTTS(config?: Partial<EdgeTTSConfig>): EdgeTTS {
  if (!edgeTTSInstance) {
    edgeTTSInstance = new EdgeTTS(config);
  } else if (config) {
    edgeTTSInstance.setConfig(config);
  }
  return edgeTTSInstance;
}

export function destroyEdgeTTS(): void {
  if (edgeTTSInstance) {
    edgeTTSInstance.destroy();
    edgeTTSInstance = null;
  }
}
