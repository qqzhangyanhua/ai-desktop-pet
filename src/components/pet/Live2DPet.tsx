// Live2DPet - Live2D model display component

import { useEffect } from 'react';
import { useLive2D } from '../../hooks';
import { usePetStore } from '../../stores';
import type { Live2DModelConfig } from '../../types';

// Default model configuration - local models for better performance
const DEFAULT_MODELS: Live2DModelConfig[] = [
  {
    name: 'white-cat',
    path: '/whitecatfree_vts/white-cat.model3.json',
    scale: 0.15,
    position: [0, 60],
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
  console.log('[Live2DPet] Component mounted/updated with models:', models.map(m => m.name));

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

  console.log('[Live2DPet] Hook state - isReady:', isReady, 'state.isLoaded:', state.isLoaded, 'error:', error);

  // Notify parent when ready
  useEffect(() => {
    console.log('[Live2DPet] Ready check - isReady:', isReady, 'state.isLoaded:', state.isLoaded, 'will call onReady:', isReady && state.isLoaded);
    if (isReady && state.isLoaded) {
      console.log('[Live2DPet] Calling onReady callback!');
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
