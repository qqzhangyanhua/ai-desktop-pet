import { useEffect } from 'react';
import { useConfigStore } from '@/stores';
import { usePetActions } from '@/hooks/usePetActions';

const getAutoWorkIntervalMs = (frequency: 'low' | 'standard' | 'high') => {
  switch (frequency) {
    case 'low':
      return 35 * 60 * 1000;
    case 'high':
      return 12 * 60 * 1000;
    case 'standard':
    default:
      return 20 * 60 * 1000;
  }
};

export function useAutoWork() {
  const behavior = useConfigStore((s) => s.config.behavior);
  const { runPetAction } = usePetActions();

  useEffect(() => {
    if (!behavior.autoWorkEnabled) return;

    const intervalMs = getAutoWorkIntervalMs(behavior.interactionFrequency);
    const timer = setInterval(() => {
      runPetAction('work');
    }, intervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [behavior.autoWorkEnabled, behavior.interactionFrequency, runPetAction]);
}

