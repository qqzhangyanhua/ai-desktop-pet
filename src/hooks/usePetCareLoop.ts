import { useEffect, useRef } from 'react';
import { useCareStore, usePetStore, toast } from '../stores';

const WARNING_COOLDOWN = 25000;

// 养成状态轮询与提示
export function usePetCareLoop() {
  const lastWarnAtRef = useRef(0);

  useEffect(() => {
    const tick = () => {
      const care = useCareStore.getState();
      const pet = usePetStore.getState();

      const stats = care.applyDecay();
      const report = care.getStatusReport();

      // 病弱提示
      if (stats.isSick && Date.now() - lastWarnAtRef.current > WARNING_COOLDOWN) {
        pet.showBubble('有点不舒服，帮我清洁或喂点东西吧', 5200);
        pet.setEmotion('sad');
        toast.warn('宠物状态较弱，请优先喂食/清洁/休息');
        lastWarnAtRef.current = Date.now();
        return;
      }

      // 低频提醒，避免频繁打扰
      if (
        report.warnings.length > 0 &&
        Date.now() - lastWarnAtRef.current > WARNING_COOLDOWN
      ) {
        pet.showBubble(report.warnings[0], 4200);
        pet.setEmotion(report.emotion);
        lastWarnAtRef.current = Date.now();
      }
    };

    // 立即跑一次，随后定期衰减
    tick();
    const timer = setInterval(tick, 45000);

    return () => {
      clearInterval(timer);
    };
  }, []);
}
