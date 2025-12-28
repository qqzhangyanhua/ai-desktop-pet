// Voice types

export interface STTConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
}

export interface STTResult {
  text: string;
  isFinal: boolean;
  confidence: number;
}

export interface TTSConfig {
  voice: string;
  rate: number;
  pitch: number;
  volume: number;
}

export interface TTSVoice {
  id: string;
  name: string;
  language: string;
  gender?: 'male' | 'female' | 'neutral';
}

export type STTStatus = 'idle' | 'listening' | 'processing' | 'error';
export type TTSStatus = 'idle' | 'speaking' | 'loading' | 'error';

export interface VoiceState {
  sttStatus: STTStatus;
  ttsStatus: TTSStatus;
  isListening: boolean;
  isSpeaking: boolean;
  currentText: string;
  error: string | null;
}

export interface STTCallbacks {
  onResult?: (result: STTResult) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

export interface TTSCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
  onBoundary?: (charIndex: number) => void;
}

/**
 * 按键说话状态
 */
export type PushToTalkStatus = 'idle' | 'recording' | 'processing';

/**
 * 按键说话配置
 */
export interface PushToTalkConfig {
  /** 触发键（如 "Space", "KeyV"） */
  triggerKey: string;
  /** 最短录音时长（毫秒），防止误触 */
  minDuration: number;
  /** 最长录音时长（毫秒），防止忘记松开 */
  maxDuration: number;
}

/**
 * 按键说话状态接口
 */
export interface PushToTalkState {
  status: PushToTalkStatus;
  isRecording: boolean;
  recordingDuration: number;
  lastRecognizedText: string;
}
