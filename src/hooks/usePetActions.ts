import { useCallback } from 'react';
import { useCareStore, useConfigStore, usePetStore, toast } from '../stores';
import { getLive2DManager } from '../services/live2d';
import type { PetActionType } from '../types';
import { getPetActionFeedback } from '@/services/pet/action-feedback';
import { ensurePetVoiceLinkInitialized, petSpeak } from '@/services/pet/voice-link';

// 宠物互动动作调度
export function usePetActions() {
  const runPetAction = useCallback((action: PetActionType) => {
    const care = useCareStore.getState();
    const pet = usePetStore.getState();
    const config = useConfigStore.getState().config;

    if (config.voice.sttEnabled || config.voice.ttsEnabled) {
      ensurePetVoiceLinkInitialized();
    }

    const before = {
      satiety: care.satiety,
      energy: care.energy,
      hygiene: care.hygiene,
      mood: care.mood,
      boredom: care.boredom,
      isSick: care.isSick,
      lastAction: care.lastAction,
    };

    care.applyAction(action);
    const after = {
      satiety: care.satiety,
      energy: care.energy,
      hygiene: care.hygiene,
      mood: care.mood,
      boredom: care.boredom,
      isSick: care.isSick,
      lastAction: care.lastAction,
    };

    const report = care.getStatusReport();
    const feedback = getPetActionFeedback({ action, before, after, report });

    pet.setEmotion(feedback.emotion);

    if (config.behavior.notifications.bubbleEnabled) {
      pet.showBubble(feedback.message, feedback.bubbleDurationMs);
      if (config.voice.ttsEnabled) {
        void petSpeak(feedback.message, { priority: 'normal', interrupt: true });
      } else {
        pet.setSpeakingTemporary(feedback.bubbleDurationMs);
      }
    }

    try {
      const manager = getLive2DManager();
      if (manager.isInitialized()) {
        manager.playAction(action);
      }
    } catch (err) {
      console.warn('[PetAction] Live2D action fallback', err);
    }

    const warning = report.warnings[0];
    if (warning && config.behavior.notifications.toastEnabled) {
      toast.info(warning);
    }
  }, []);

  return { runPetAction };
}
