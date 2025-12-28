import { create } from 'zustand';
import type { PetState, EmotionType, PetPosition } from '../types';

interface PetStore extends PetState {
  setPosition: (position: PetPosition) => void;
  setEmotion: (emotion: EmotionType) => void;
  setScale: (scale: number) => void;
  setVisible: (isVisible: boolean) => void;
  setCurrentSkin: (skinId: string) => void;
  setListening: (isListening: boolean) => void;
  setSpeaking: (isSpeaking: boolean) => void;
  setSpeakingTemporary: (durationMs: number) => void;
  setBubbleText: (text: string | null) => void;
  showBubble: (text: string, duration?: number) => void;
}

export const usePetStore = create<PetStore>((set) => {
  let bubbleTimer: ReturnType<typeof setTimeout> | null = null;
  let speakingTimer: ReturnType<typeof setTimeout> | null = null;

  const clearBubbleTimer = () => {
    if (!bubbleTimer) return;
    clearTimeout(bubbleTimer);
    bubbleTimer = null;
  };

  const clearSpeakingTimer = () => {
    if (!speakingTimer) return;
    clearTimeout(speakingTimer);
    speakingTimer = null;
  };

  return {
    position: { x: 100, y: 100 },
    size: { width: 300, height: 400 },
    scale: 1.0,
    emotion: 'neutral',
    isVisible: true,
    // 默认与配置保持一致：优先展示本地 Live2D 白猫
    currentSkinId: 'white-cat',
    isListening: false,
    isSpeaking: false,
    bubbleText: null,

    setPosition: (position) => set({ position }),
    setEmotion: (emotion) => set({ emotion }),
    setScale: (scale) => set({ scale }),
    setVisible: (isVisible) => set({ isVisible }),
    setCurrentSkin: (currentSkinId) => set({ currentSkinId }),
    setListening: (isListening) => set({ isListening }),
    setSpeaking: (isSpeaking) =>
      set(() => {
        if (!isSpeaking) clearSpeakingTimer();
        return { isSpeaking };
      }),
    setSpeakingTemporary: (durationMs) =>
      set(() => {
        clearSpeakingTimer();
        speakingTimer = setTimeout(() => set({ isSpeaking: false }), Math.max(300, durationMs));
        return { isSpeaking: true };
      }),
    setBubbleText: (bubbleText) =>
      set(() => {
        if (!bubbleText) clearBubbleTimer();
        return { bubbleText };
      }),
    showBubble: (text, duration = 5000) =>
      set(() => {
        clearBubbleTimer();
        bubbleTimer = setTimeout(() => set({ bubbleText: null }), Math.max(300, duration));
        return { bubbleText: text };
      }),
  };
});
