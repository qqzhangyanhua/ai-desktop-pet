import { useEffect, useRef } from 'react';
import { useCareStore, useConfigStore, usePetStore } from '../stores';
import { ensurePetVoiceLinkInitialized, petSpeak } from '@/services/pet/voice-link';

const getLoopIntervalMs = (frequency: 'low' | 'standard' | 'high') => {
  switch (frequency) {
    case 'low':
      return 75000;
    case 'high':
      return 25000;
    case 'standard':
    default:
      return 45000;
  }
};

const getWarningCooldownMs = (frequency: 'low' | 'standard' | 'high') => {
  switch (frequency) {
    case 'low':
      return 45000;
    case 'high':
      return 20000;
    case 'standard':
    default:
      return 25000;
  }
};

// 养成状态轮询与提示
export function usePetCareLoop() {
  const lastWarnAtRef = useRef(0);
  const behavior = useConfigStore((s) => s.config.behavior);
  const voice = useConfigStore((s) => s.config.voice);

  useEffect(() => {
    if (voice.sttEnabled || voice.ttsEnabled) {
      ensurePetVoiceLinkInitialized();
    }

    const warningCooldown = getWarningCooldownMs(behavior.interactionFrequency);
    const loopInterval = getLoopIntervalMs(behavior.interactionFrequency);

    // 使用内联函数避免闭包依赖问题
    const tick = () => {
      // 每次执行时获取最新状态，避免闭包陈旧值
      const care = useCareStore.getState();
      const pet = usePetStore.getState();
      const currentBehavior = useConfigStore.getState().config.behavior;
      const currentVoice = useConfigStore.getState().config.voice;

      // P2-X: Detect resting state (low energy or explicit rest action)
      const isResting = care.energy < 35 || care.lastAction === 'sleep' || care.lastAction === 'rest';

      const stats = care.applyDecay(isResting);
      const report = care.getStatusReport();

      // 统一警告逻辑：病弱优先，否则显示常规警告
      const shouldWarn =
        (stats.isSick || report.warnings.length > 0) &&
        Date.now() - lastWarnAtRef.current > warningCooldown;

      if (shouldWarn) {
        // 确定警告消息和情绪
        const message = stats.isSick
          ? (report.warnings[0] || '有点不舒服，帮我清洁或喂点东西吧')
          : (report.warnings[0] || '');

        const emotion = stats.isSick ? 'sad' : report.emotion;
        const bubbleDuration = stats.isSick ? 5200 : 4200;

        if (message && currentBehavior.notifications.bubbleEnabled) {
          pet.showBubble(message, bubbleDuration);
          pet.setEmotion(emotion);

          if (currentVoice.ttsEnabled) {
            void petSpeak(message, { priority: 'high', interrupt: true });
          }
        }

        if (currentBehavior.notifications.toastEnabled && stats.isSick) {
          // toast.warning(report.warnings[0] || '宠物状态较弱，请优先喂食/清洁/休息');
        }

        lastWarnAtRef.current = Date.now();
      }
    };

    // 立即跑一次，随后定期衰减
    tick();
    const timer = setInterval(tick, loopInterval);

    return () => {
      clearInterval(timer);
    };
  }, [behavior.interactionFrequency, behavior.notifications.bubbleEnabled, behavior.notifications.toastEnabled, voice.sttEnabled, voice.ttsEnabled]);
}
