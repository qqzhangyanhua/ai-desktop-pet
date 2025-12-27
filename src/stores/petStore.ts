import { create } from 'zustand';
import type { PetState, EmotionType, PetPosition } from '../types';

interface PetStore extends PetState {
  setPosition: (position: PetPosition) => void;
  setEmotion: (emotion: EmotionType) => void;
  setScale: (scale: number) => void;
  setVisible: (isVisible: boolean) => void;
  setCurrentSkin: (skinId: string) => void;
  setSpeaking: (isSpeaking: boolean) => void;
  setBubbleText: (text: string | null) => void;
  showBubble: (text: string, duration?: number) => void;
}

export const usePetStore = create<PetStore>((set) => ({
  position: { x: 100, y: 100 },
  size: { width: 300, height: 400 },
  scale: 1.0,
  emotion: 'neutral',
  isVisible: true,
  currentSkinId: 'shizuku',
  isSpeaking: false,
  bubbleText: null,

  setPosition: (position) => set({ position }),
  setEmotion: (emotion) => set({ emotion }),
  setScale: (scale) => set({ scale }),
  setVisible: (isVisible) => set({ isVisible }),
  setCurrentSkin: (currentSkinId) => set({ currentSkinId }),
  setSpeaking: (isSpeaking) => set({ isSpeaking }),
  setBubbleText: (bubbleText) => set({ bubbleText }),
  showBubble: (text, duration = 5000) => {
    set({ bubbleText: text });
    setTimeout(() => set({ bubbleText: null }), duration);
  },
}));
