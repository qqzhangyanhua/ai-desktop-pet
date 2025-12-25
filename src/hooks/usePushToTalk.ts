// usePushToTalk - Hook for Push-to-Talk voice input

import { useEffect, useRef, useCallback } from 'react';
import { getVoiceManager } from '../services/voice';
import type { STTResult } from '../types';

interface UsePushToTalkOptions {
  enabled: boolean;
  shortcut: string;
  onResult?: (result: STTResult) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

export function usePushToTalk(options: UsePushToTalkOptions) {
  const {
    enabled,
    shortcut,
    onResult,
    onStart,
    onEnd,
    onError,
  } = options;

  const isListeningRef = useRef(false);
  const voiceManagerRef = useRef(getVoiceManager());

  // Handle key down - start listening
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Check if pressed key matches configured shortcut
      const pressedKey = event.key;
      if (pressedKey !== shortcut) return;

      // Prevent default behavior
      event.preventDefault();

      // Already listening
      if (isListeningRef.current) return;

      // Start listening
      const manager = voiceManagerRef.current;
      if (manager.isSTTAvailable()) {
        const started = manager.startListening();
        if (started) {
          isListeningRef.current = true;
          onStart?.();
        }
      }
    },
    [enabled, shortcut, onStart]
  );

  // Handle key up - stop listening
  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Check if released key matches configured shortcut
      const releasedKey = event.key;
      if (releasedKey !== shortcut) return;

      // Prevent default behavior
      event.preventDefault();

      // Not listening
      if (!isListeningRef.current) return;

      // Stop listening
      const manager = voiceManagerRef.current;
      manager.stopListening();
      isListeningRef.current = false;
      onEnd?.();
    },
    [enabled, shortcut, onEnd]
  );

  // Set up voice manager callbacks
  useEffect(() => {
    if (!enabled) return;

    const manager = voiceManagerRef.current;

    manager.setSTTCallbacks({
      onResult: (result: STTResult) => {
        onResult?.(result);
      },
      onError: (error: Error) => {
        isListeningRef.current = false;
        onError?.(error);
      },
    });
  }, [enabled, onResult, onError]);

  // Set up global keyboard listeners
  useEffect(() => {
    if (!enabled) return;

    // Add keyboard event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);

      // Stop listening if currently active
      if (isListeningRef.current) {
        const manager = voiceManagerRef.current;
        manager.stopListening();
        isListeningRef.current = false;
      }
    };
  }, [enabled, handleKeyDown, handleKeyUp]);

  return {
    isListening: isListeningRef.current,
  };
}
