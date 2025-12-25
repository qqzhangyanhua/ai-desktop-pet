import { useCallback } from 'react';
import { useCareStore, usePetStore, toast } from '../stores';
import { getLive2DManager } from '../services/live2d';
import type { PetActionType } from '../types';

// 宠物互动动作调度
export function usePetActions() {
  const runPetAction = useCallback((action: PetActionType) => {
    const care = useCareStore.getState();
    const pet = usePetStore.getState();

    const effect = care.applyAction(action);
    pet.setEmotion(effect.emotion);
    pet.showBubble(effect.message, 4200);

    try {
      const manager = getLive2DManager();
      if (manager.isInitialized()) {
        manager.playAction(action);
      }
    } catch (err) {
      console.warn('[PetAction] Live2D action fallback', err);
    }

    const report = care.getStatusReport();
    const warning = report.warnings[0];
    if (warning) {
      toast.info(warning);
    }
  }, []);

  return { runPetAction };
}
