// Web Speech Synthesis TTS Service

import type { TTSConfig, TTSVoice, TTSCallbacks, TTSStatus } from '../../types';

const DEFAULT_CONFIG: TTSConfig = {
  voice: '',
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
};

export class WebSpeechTTS {
  private config: TTSConfig;
  private callbacks: TTSCallbacks = {};
  private status: TTSStatus = 'idle';
  private isSupported: boolean;
  private voices: SpeechSynthesisVoice[] = [];

  constructor(config: Partial<TTSConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.isSupported = this.checkSupport();

    if (this.isSupported) {
      this.loadVoices();
    }
  }

  private checkSupport(): boolean {
    return 'speechSynthesis' in window;
  }

  private loadVoices(): void {
    const loadVoiceList = () => {
      this.voices = window.speechSynthesis.getVoices();

      // Set default voice if not set
      if (!this.config.voice && this.voices.length > 0) {
        // Prefer Chinese voices
        const chineseVoice = this.voices.find(
          (v) => v.lang.startsWith('zh') || v.lang.includes('Chinese')
        );
        const firstVoice = this.voices[0];
        this.config.voice = chineseVoice?.name ?? firstVoice?.name ?? '';
      }
    };

    // Voices might not be available immediately
    if (window.speechSynthesis.getVoices().length > 0) {
      loadVoiceList();
    } else {
      window.speechSynthesis.onvoiceschanged = loadVoiceList;
    }
  }

  isAvailable(): boolean {
    return this.isSupported;
  }

  getStatus(): TTSStatus {
    return this.status;
  }

  getVoices(): TTSVoice[] {
    return this.voices.map((v) => ({
      id: v.name,
      name: v.name,
      language: v.lang,
      gender: this.detectGender(v.name),
    }));
  }

  private detectGender(name: string): 'male' | 'female' | 'neutral' {
    const lowerName = name.toLowerCase();
    if (
      lowerName.includes('female') ||
      lowerName.includes('woman') ||
      lowerName.includes('xiaoxiao') ||
      lowerName.includes('xiaoyi')
    ) {
      return 'female';
    }
    if (
      lowerName.includes('male') ||
      lowerName.includes('man') ||
      lowerName.includes('yunxi') ||
      lowerName.includes('yunyang')
    ) {
      return 'male';
    }
    return 'neutral';
  }

  setConfig(config: Partial<TTSConfig>): void {
    this.config = { ...this.config, ...config };
  }

  setCallbacks(callbacks: TTSCallbacks): void {
    this.callbacks = callbacks;
  }

  speak(text: string): boolean {
    if (!this.isSupported) {
      console.error('Speech synthesis is not supported');
      return false;
    }

    if (!text.trim()) {
      return false;
    }

    // Cancel any ongoing speech
    this.stop();

    try {
      const utterance = new SpeechSynthesisUtterance(text);

      // Apply config
      utterance.rate = this.config.rate;
      utterance.pitch = this.config.pitch;
      utterance.volume = this.config.volume;

      // Set voice
      if (this.config.voice) {
        const voice = this.voices.find((v) => v.name === this.config.voice);
        if (voice) {
          utterance.voice = voice;
        }
      }

      // Event handlers
      utterance.onstart = () => {
        this.status = 'speaking';
        this.callbacks.onStart?.();
      };

      utterance.onend = () => {
        this.status = 'idle';
        this.callbacks.onEnd?.();
      };

      utterance.onerror = (event) => {
        this.status = 'error';
        this.callbacks.onError?.(new Error(`TTS error: ${event.error}`));
      };

      utterance.onboundary = (event) => {
        this.callbacks.onBoundary?.(event.charIndex);
      };

      this.status = 'loading';
      window.speechSynthesis.speak(utterance);

      return true;
    } catch (error) {
      console.error('Failed to speak:', error);
      this.status = 'error';
      return false;
    }
  }

  stop(): void {
    if (this.isSupported) {
      window.speechSynthesis.cancel();
      this.status = 'idle';
    }
  }

  pause(): void {
    if (this.isSupported && this.status === 'speaking') {
      window.speechSynthesis.pause();
    }
  }

  resume(): void {
    if (this.isSupported) {
      window.speechSynthesis.resume();
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
let ttsInstance: WebSpeechTTS | null = null;

export function getWebSpeechTTS(config?: Partial<TTSConfig>): WebSpeechTTS {
  if (!ttsInstance) {
    ttsInstance = new WebSpeechTTS(config);
  } else if (config) {
    ttsInstance.setConfig(config);
  }
  return ttsInstance;
}

export function destroyWebSpeechTTS(): void {
  if (ttsInstance) {
    ttsInstance.destroy();
    ttsInstance = null;
  }
}
