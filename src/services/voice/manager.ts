// Voice Manager - Unified STT and TTS management

import { WebSpeechSTT, getWebSpeechSTT, destroyWebSpeechSTT } from './stt-web';
import { WebSpeechTTS, getWebSpeechTTS, destroyWebSpeechTTS } from './tts-web';
import { EdgeTTS, getEdgeTTS, destroyEdgeTTS } from './tts-edge';
import type {
  STTConfig,
  TTSConfig,
  STTResult,
  STTCallbacks,
  TTSCallbacks,
  TTSVoice,
  VoiceState,
} from '../../types';

export type STTEngine = 'web-speech';
export type TTSEngine = 'web-speech' | 'edge-tts';

interface VoiceManagerConfig {
  sttEngine: STTEngine;
  ttsEngine: TTSEngine;
  sttConfig?: Partial<STTConfig>;
  ttsConfig?: Partial<TTSConfig>;
}

const DEFAULT_MANAGER_CONFIG: VoiceManagerConfig = {
  sttEngine: 'web-speech',
  ttsEngine: 'web-speech',
};

export class VoiceManager {
  private config: VoiceManagerConfig;
  private stt: WebSpeechSTT | null = null;
  private tts: WebSpeechTTS | EdgeTTS | null = null;
  private state: VoiceState = {
    sttStatus: 'idle',
    ttsStatus: 'idle',
    isListening: false,
    isSpeaking: false,
    currentText: '',
    error: null,
  };
  private onStateChange?: (state: VoiceState) => void;

  constructor(config: Partial<VoiceManagerConfig> = {}) {
    this.config = { ...DEFAULT_MANAGER_CONFIG, ...config };
  }

  async init(onStateChange?: (state: VoiceState) => void): Promise<void> {
    this.onStateChange = onStateChange;

    // Initialize STT
    await this.initSTT();

    // Initialize TTS
    await this.initTTS();
  }

  private async initSTT(): Promise<void> {
    if (this.config.sttEngine === 'web-speech') {
      this.stt = getWebSpeechSTT(this.config.sttConfig);

      this.stt.setCallbacks({
        onStart: () => {
          this.updateState({ sttStatus: 'listening', isListening: true });
        },
        onEnd: () => {
          this.updateState({ sttStatus: 'idle', isListening: false });
        },
        onResult: (result: STTResult) => {
          this.updateState({ currentText: result.text });
        },
        onError: (error: Error) => {
          this.updateState({
            sttStatus: 'error',
            isListening: false,
            error: error.message,
          });
        },
      });
    }
  }

  private async initTTS(): Promise<void> {
    if (this.config.ttsEngine === 'edge-tts') {
      const edgeTTS = getEdgeTTS(this.config.ttsConfig);
      const isAvailable = await edgeTTS.checkAvailability();

      if (isAvailable) {
        this.tts = edgeTTS;
      } else {
        // Fall back to web speech
        console.warn('Edge TTS not available, falling back to Web Speech');
        this.config.ttsEngine = 'web-speech';
        this.tts = getWebSpeechTTS(this.config.ttsConfig);
      }
    } else {
      this.tts = getWebSpeechTTS(this.config.ttsConfig);
    }

    if (this.tts) {
      this.tts.setCallbacks({
        onStart: () => {
          this.updateState({ ttsStatus: 'speaking', isSpeaking: true });
        },
        onEnd: () => {
          this.updateState({ ttsStatus: 'idle', isSpeaking: false });
        },
        onError: (error: Error) => {
          this.updateState({
            ttsStatus: 'error',
            isSpeaking: false,
            error: error.message,
          });
        },
      });
    }
  }

  private updateState(partial: Partial<VoiceState>): void {
    this.state = { ...this.state, ...partial };
    this.onStateChange?.({ ...this.state });
  }

  getState(): VoiceState {
    return { ...this.state };
  }

  // STT Methods
  isSTTAvailable(): boolean {
    return this.stt?.isAvailable() ?? false;
  }

  startListening(): boolean {
    if (!this.stt) return false;
    return this.stt.start();
  }

  stopListening(): void {
    this.stt?.stop();
  }

  setSTTLanguage(language: string): void {
    if (this.stt) {
      this.stt.setConfig({ language });
    }
  }

  setSTTCallbacks(callbacks: STTCallbacks): void {
    if (this.stt) {
      const currentCallbacks = {
        onStart: () => {
          this.updateState({ sttStatus: 'listening', isListening: true });
          callbacks.onStart?.();
        },
        onEnd: () => {
          this.updateState({ sttStatus: 'idle', isListening: false });
          callbacks.onEnd?.();
        },
        onResult: (result: STTResult) => {
          this.updateState({ currentText: result.text });
          callbacks.onResult?.(result);
        },
        onError: (error: Error) => {
          this.updateState({
            sttStatus: 'error',
            isListening: false,
            error: error.message,
          });
          callbacks.onError?.(error);
        },
      };
      this.stt.setCallbacks(currentCallbacks);
    }
  }

  // TTS Methods
  isTTSAvailable(): boolean {
    return this.tts?.isAvailable() ?? false;
  }

  async speak(text: string): Promise<boolean> {
    if (!this.tts) return false;

    if (this.tts instanceof EdgeTTS) {
      return this.tts.speak(text);
    } else {
      return this.tts.speak(text);
    }
  }

  stopSpeaking(): void {
    this.tts?.stop();
  }

  pauseSpeaking(): void {
    this.tts?.pause();
  }

  resumeSpeaking(): void {
    this.tts?.resume();
  }

  getTTSVoices(): TTSVoice[] {
    return this.tts?.getVoices() ?? [];
  }

  setTTSVoice(voice: string): void {
    if (this.tts) {
      this.tts.setConfig({ voice });
    }
  }

  setTTSConfig(config: Partial<TTSConfig>): void {
    if (this.tts) {
      this.tts.setConfig(config);
    }
  }

  setTTSCallbacks(callbacks: TTSCallbacks): void {
    if (this.tts) {
      const currentCallbacks: TTSCallbacks = {
        onStart: () => {
          this.updateState({ ttsStatus: 'speaking', isSpeaking: true });
          callbacks.onStart?.();
        },
        onEnd: () => {
          this.updateState({ ttsStatus: 'idle', isSpeaking: false });
          callbacks.onEnd?.();
        },
        onError: (error: Error) => {
          this.updateState({
            ttsStatus: 'error',
            isSpeaking: false,
            error: error.message,
          });
          callbacks.onError?.(error);
        },
        onBoundary: callbacks.onBoundary,
      };
      this.tts.setCallbacks(currentCallbacks);
    }
  }

  // Engine switching
  async switchTTSEngine(engine: TTSEngine): Promise<void> {
    if (this.config.ttsEngine === engine) return;

    // Stop current TTS
    this.tts?.stop();

    // Destroy current TTS instance
    if (this.config.ttsEngine === 'edge-tts') {
      destroyEdgeTTS();
    } else {
      destroyWebSpeechTTS();
    }

    // Initialize new engine
    this.config.ttsEngine = engine;
    await this.initTTS();
  }

  // Cleanup
  destroy(): void {
    this.stt?.destroy();
    this.tts?.destroy();
    destroyWebSpeechSTT();
    destroyWebSpeechTTS();
    destroyEdgeTTS();
    this.stt = null;
    this.tts = null;
  }
}

// Singleton instance
let voiceManagerInstance: VoiceManager | null = null;

export function getVoiceManager(config?: Partial<VoiceManagerConfig>): VoiceManager {
  if (!voiceManagerInstance) {
    voiceManagerInstance = new VoiceManager(config);
  }
  return voiceManagerInstance;
}

export async function initVoiceManager(
  config?: Partial<VoiceManagerConfig>,
  onStateChange?: (state: VoiceState) => void
): Promise<VoiceManager> {
  const manager = getVoiceManager(config);
  await manager.init(onStateChange);
  return manager;
}

export function destroyVoiceManager(): void {
  if (voiceManagerInstance) {
    voiceManagerInstance.destroy();
    voiceManagerInstance = null;
  }
}
