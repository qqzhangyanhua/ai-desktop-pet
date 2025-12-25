// Web Speech API STT Service

import type { STTConfig, STTResult, STTCallbacks, STTStatus } from '../../types';

// Web Speech API types
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

const DEFAULT_CONFIG: STTConfig = {
  language: 'zh-CN',
  continuous: true,
  interimResults: true,
};

export class WebSpeechSTT {
  private recognition: SpeechRecognition | null = null;
  private config: STTConfig;
  private callbacks: STTCallbacks = {};
  private status: STTStatus = 'idle';
  private isSupported: boolean;

  constructor(config: Partial<STTConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.isSupported = this.checkSupport();
  }

  private checkSupport(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  isAvailable(): boolean {
    return this.isSupported;
  }

  getStatus(): STTStatus {
    return this.status;
  }

  setConfig(config: Partial<STTConfig>): void {
    this.config = { ...this.config, ...config };
    if (this.recognition) {
      this.applyConfig();
    }
  }

  setCallbacks(callbacks: STTCallbacks): void {
    this.callbacks = callbacks;
  }

  private applyConfig(): void {
    if (!this.recognition) return;

    this.recognition.lang = this.config.language;
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.maxAlternatives = 1;
  }

  private createRecognition(): SpeechRecognition | null {
    if (!this.isSupported) return null;

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionClass();

    recognition.onstart = () => {
      this.status = 'listening';
      this.callbacks.onStart?.();
    };

    recognition.onend = () => {
      this.status = 'idle';
      this.callbacks.onEnd?.();
    };

    recognition.onerror = (event) => {
      this.status = 'error';
      const error = new Error(`Speech recognition error: ${event.error}`);
      this.callbacks.onError?.(error);
    };

    recognition.onresult = (event) => {
      const results = event.results;

      for (let i = event.resultIndex; i < results.length; i++) {
        const result = results[i];
        if (result && result[0]) {
          const sttResult: STTResult = {
            text: result[0].transcript,
            isFinal: result.isFinal,
            confidence: result[0].confidence,
          };
          this.callbacks.onResult?.(sttResult);
        }
      }
    };

    return recognition;
  }

  start(): boolean {
    if (!this.isSupported) {
      console.error('Speech recognition is not supported in this browser');
      return false;
    }

    if (this.status === 'listening') {
      return true;
    }

    try {
      this.recognition = this.createRecognition();
      if (!this.recognition) return false;

      this.applyConfig();
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      this.status = 'error';
      return false;
    }
  }

  stop(): void {
    if (this.recognition && this.status === 'listening') {
      this.recognition.stop();
    }
  }

  abort(): void {
    if (this.recognition) {
      this.recognition.abort();
      this.recognition = null;
      this.status = 'idle';
    }
  }

  destroy(): void {
    this.abort();
    this.callbacks = {};
  }
}

// Singleton instance
let sttInstance: WebSpeechSTT | null = null;

export function getWebSpeechSTT(config?: Partial<STTConfig>): WebSpeechSTT {
  if (!sttInstance) {
    sttInstance = new WebSpeechSTT(config);
  } else if (config) {
    sttInstance.setConfig(config);
  }
  return sttInstance;
}

export function destroyWebSpeechSTT(): void {
  if (sttInstance) {
    sttInstance.destroy();
    sttInstance = null;
  }
}
