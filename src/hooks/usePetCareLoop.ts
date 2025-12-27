import { useEffect, useRef } from 'react';
import { useCareStore, useConfigStore, usePetStore, toast } from '../stores';
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

    const tick = () => {
      const care = useCareStore.getState();
      const pet = usePetStore.getState();

      const stats = care.applyDecay();
      const report = care.getStatusReport();

      // 病弱提示
      if (stats.isSick && Date.now() - lastWarnAtRef.current > warningCooldown) {
        if (behavior.notifications.bubbleEnabled) {
          const msg = '有点不舒服，帮我清洁或喂点东西吧';
          pet.showBubble(msg, 5200);
          pet.setEmotion('sad');
          if (voice.ttsEnabled) {
            void petSpeak(msg, { priority: 'high', interrupt: true });
          }
        }
        if (behavior.notifications.toastEnabled) {
          toast.warning('宠物状态较弱，请优先喂食/清洁/休息');
        }
        lastWarnAtRef.current = Date.now();
        return;
      }

      // 低频提醒，避免频繁打扰
      if (
        report.warnings.length > 0 &&
        Date.now() - lastWarnAtRef.current > warningCooldown
      ) {
        const warning = report.warnings[0];
        if (warning) {
          if (behavior.notifications.bubbleEnabled) {
            pet.showBubble(warning, 4200);
            pet.setEmotion(report.emotion);
            if (voice.ttsEnabled) {
              void petSpeak(warning, { priority: 'high', interrupt: true });
            }
          }
          lastWarnAtRef.current = Date.now();
        }
      }
    };

    // 立即跑一次，随后定期衰减
    tick();
    const timer = setInterval(tick, loopInterval);

    return () => {
      clearInterval(timer);
    };
  }, [behavior, voice.sttEnabled, voice.ttsEnabled]);
}
