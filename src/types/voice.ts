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
