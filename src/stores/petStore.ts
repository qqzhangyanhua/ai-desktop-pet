import { create } from 'zustand';
import type { PetState, EmotionType, PetPosition } from '../types';
import type { ProactiveRequest } from '../types/pet-status';

interface PetStore extends PetState {
  // 原有方法
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

  // 主动请求状态管理
  currentProactiveRequest: ProactiveRequest | null;
  lastProactiveRequestTime: number;
  consecutiveDeclines: number;

  triggerProactiveRequest: (request: ProactiveRequest) => void;
  respondToProactiveRequest: (response: 'accepted' | 'declined') => void;
  clearProactiveRequest: () => void;
}

export const usePetStore = create<PetStore>((set, get) => {
  let bubbleTimer: ReturnType<typeof setTimeout> | null = null;
  let speakingTimer: ReturnType<typeof setTimeout> | null = null;
  let requestTimeoutTimer: ReturnType<typeof setTimeout> | null = null;

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

  const clearRequestTimeoutTimer = () => {
    if (!requestTimeoutTimer) return;
    clearTimeout(requestTimeoutTimer);
    requestTimeoutTimer = null;
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

    // 主动请求状态初始值
    currentProactiveRequest: null,
    lastProactiveRequestTime: 0,
    consecutiveDeclines: 0,

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

    /**
     * 触发主动请求
     * 显示气泡，设置8秒超时自动清除
     */
    triggerProactiveRequest: (request) =>
      set(() => {
        console.log('[PetStore] Triggering proactive request:', request.type);

        // 清除旧的超时
        clearRequestTimeoutTimer();
        clearBubbleTimer();

        // 设置请求超时（8秒后自动标记为忽略）
        requestTimeoutTimer = setTimeout(() => {
          const current = get().currentProactiveRequest;
          if (current && current.id === request.id && !current.responded) {
            console.log('[PetStore] Request timed out, marking as ignored');
            set({
              currentProactiveRequest: {
                ...current,
                responded: true,
                response: 'ignored',
              },
              bubbleText: null,
            });

            // 延迟清除请求（留给UI响应时间）
            setTimeout(() => {
              set({ currentProactiveRequest: null });
            }, 1000);
          }
        }, 8000);

        return {
          currentProactiveRequest: request,
          lastProactiveRequestTime: Date.now(),
          bubbleText: request.message,
          emotion: request.emotion,
        };
      }),

    /**
     * 响应主动请求
     */
    respondToProactiveRequest: (response) =>
      set((state) => {
        const request = state.currentProactiveRequest;
        if (!request || request.responded) {
          console.warn('[PetStore] No active request to respond to');
          return state;
        }

        console.log('[PetStore] User responded to request:', response);

        // 清除超时
        clearRequestTimeoutTimer();
        clearBubbleTimer();

        // 更新拒绝计数
        const newDeclines =
          response === 'declined' ? state.consecutiveDeclines + 1 : 0;

        return {
          currentProactiveRequest: {
            ...request,
            responded: true,
            response,
          },
          consecutiveDeclines: newDeclines,
          bubbleText: null, // 清除气泡，由互动系统接管
        };
      }),

    /**
     * 清除当前请求
     */
    clearProactiveRequest: () =>
      set(() => {
        clearRequestTimeoutTimer();
        clearBubbleTimer();
        return {
          currentProactiveRequest: null,
          bubbleText: null,
        };
      }),
  };
});
