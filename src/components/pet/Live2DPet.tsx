// Live2DPet - Live2D model display component

import { useEffect } from 'react';
import { useLive2D } from '../../hooks';
import { usePetStore } from '../../stores';
import type { Live2DModelConfig } from '../../types';

// Default model configuration using free online models
const DEFAULT_MODELS: Live2DModelConfig[] = [
  {
    name: 'shizuku',
    path: 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku/shizuku.model.json',
    scale: 0.25,
    position: [0, 50],
    stageStyle: {
      height: 400,
      width: 300,
    },
  },
  {
    name: 'haru',
    path: 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/haru_greeter_t03.model3.json',
    scale: 0.08,
    position: [0, 80],
    stageStyle: {
      height: 400,
      width: 300,
    },
  },
];

interface Live2DPetProps {
  models?: Live2DModelConfig[];
  onReady?: () => void;
  onError?: (error: Error) => void;
}

export function Live2DPet({
  models = DEFAULT_MODELS,
  onReady,
  onError,
}: Live2DPetProps) {
  const { emotion, bubbleText } = usePetStore();

  const {
    state,
    isReady,
    error,
    showMessage,
    triggerEmotion,
  } = useLive2D({
    models,
    dockedPosition: 'right',
    autoInit: true,
  });

  // Notify parent when ready
  useEffect(() => {
    if (isReady && state.isLoaded) {
      onReady?.();
    }
  }, [isReady, state.isLoaded, onReady]);

  // Handle errors
  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  // Show bubble text as Live2D message
  useEffect(() => {
    if (bubbleText && isReady) {
      showMessage(bubbleText, 5000);
    }
  }, [bubbleText, isReady, showMessage]);

  // Trigger emotion changes
  useEffect(() => {
    if (isReady && emotion) {
      triggerEmotion(emotion);
    }
  }, [emotion, isReady, triggerEmotion]);

  // OhMyLive2D renders itself to the DOM
  // This component just manages the integration
  return null;
}

export { DEFAULT_MODELS };
