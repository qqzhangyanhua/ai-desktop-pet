// useVoice Hook - React hook for voice functionality

import { useState, useEffect, useCallback, useRef } from 'react';
import { getVoiceManager, destroyVoiceManager } from '../services/voice';
import type { VoiceManager, STTEngine, TTSEngine } from '../services/voice';
import type { VoiceState, STTResult, TTSVoice } from '../types';

interface UseVoiceOptions {
  sttEngine?: STTEngine;
  ttsEngine?: TTSEngine;
  sttLanguage?: string;
  ttsVoice?: string;
  autoInit?: boolean;
  onTranscript?: (result: STTResult) => void;
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
}

interface UseVoiceReturn {
  // State
  state: VoiceState;
  isReady: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  error: string | null;

  // STT controls
  startListening: () => boolean;
  stopListening: () => void;
  isSTTAvailable: boolean;

  // TTS controls
  speak: (text: string) => Promise<boolean>;
  stopSpeaking: () => void;
  pauseSpeaking: () => void;
  resumeSpeaking: () => void;
  isTTSAvailable: boolean;
  ttsVoices: TTSVoice[];
  setTTSVoice: (voice: string) => void;

  // Initialization
  init: () => Promise<void>;
}

export function useVoice(options: UseVoiceOptions = {}): UseVoiceReturn {
  const {
    sttEngine = 'web-speech',
    ttsEngine = 'web-speech',
    sttLanguage = 'zh-CN',
    ttsVoice,
    autoInit = true,
    onTranscript,
    onSpeakStart,
    onSpeakEnd,
  } = options;

  const [state, setState] = useState<VoiceState>({
    sttStatus: 'idle',
    ttsStatus: 'idle',
    isListening: false,
    isSpeaking: false,
    currentText: '',
    error: null,
  });

  const [isReady, setIsReady] = useState(false);
  const [ttsVoices, setTTSVoices] = useState<TTSVoice[]>([]);
  const managerRef = useRef<VoiceManager | null>(null);
  const initRef = useRef(false);

  const init = useCallback(async () => {
    if (initRef.current) return;
    initRef.current = true;

    try {
      const manager = getVoiceManager({
        sttEngine,
        ttsEngine,
        sttConfig: { language: sttLanguage },
        ttsConfig: ttsVoice ? { voice: ttsVoice } : undefined,
      });

      await manager.init((newState) => {
        setState(newState);
      });

      managerRef.current = manager;

      // Set up STT callbacks
      manager.setSTTCallbacks({
        onResult: (result) => {
          onTranscript?.(result);
        },
      });

      // Set up TTS callbacks
      manager.setTTSCallbacks({
        onStart: () => {
          onSpeakStart?.();
        },
        onEnd: () => {
          onSpeakEnd?.();
        },
      });

      // Get available voices
      setTTSVoices(manager.getTTSVoices());

      setIsReady(true);
    } catch (error) {
      console.error('Failed to initialize voice:', error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to initialize',
      }));
      initRef.current = false;
    }
  }, [sttEngine, ttsEngine, sttLanguage, ttsVoice, onTranscript, onSpeakStart, onSpeakEnd]);

  useEffect(() => {
    if (autoInit) {
      init();
    }

    return () => {
      // Don't destroy on unmount to allow persistence
    };
  }, [autoInit, init]);

  const startListening = useCallback((): boolean => {
    if (!managerRef.current) return false;
    return managerRef.current.startListening();
  }, []);

  const stopListening = useCallback((): void => {
    managerRef.current?.stopListening();
  }, []);

  const speak = useCallback(async (text: string): Promise<boolean> => {
    if (!managerRef.current) return false;
    return managerRef.current.speak(text);
  }, []);

  const stopSpeaking = useCallback((): void => {
    managerRef.current?.stopSpeaking();
  }, []);

  const pauseSpeaking = useCallback((): void => {
    managerRef.current?.pauseSpeaking();
  }, []);

  const resumeSpeaking = useCallback((): void => {
    managerRef.current?.resumeSpeaking();
  }, []);

  const setTTSVoice = useCallback((voice: string): void => {
    managerRef.current?.setTTSVoice(voice);
  }, []);

  return {
    state,
    isReady,
    isListening: state.isListening,
    isSpeaking: state.isSpeaking,
    transcript: state.currentText,
    error: state.error,

    startListening,
    stopListening,
    isSTTAvailable: managerRef.current?.isSTTAvailable() ?? false,

    speak,
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
    isTTSAvailable: managerRef.current?.isTTSAvailable() ?? false,
    ttsVoices,
    setTTSVoice,

    init,
  };
}

// Cleanup function
export function cleanupVoice(): void {
  destroyVoiceManager();
}
