/**
 * Proactive behavior hook
 * 设置并处理主动行为任务（定时问候等）
 */

import { useEffect, useCallback } from 'react';
import { usePetStore } from '../stores';
import { getSchedulerManager } from '../services/scheduler';
import { generateContextGreeting } from '../services/proactive';
import type { SchedulerManager } from '../services/scheduler/manager';

/**
 * Setup proactive greeting tasks
 */
async function setupGreetingTasks(scheduler: SchedulerManager): Promise<void> {
  // Morning greeting (7-9 AM)
  await scheduler.createTask({
    name: 'morning-greeting',
    description: '每日晨间问候',
    trigger: {
      type: 'cron',
      config: { type: 'cron', expression: '0 7-9 * * *' },
    },
    action: {
      type: 'notification',
      config: {
        type: 'notification',
        title: '早安问候',
        body: '${greeting}', // Placeholder, will be replaced by event handler
      },
    },
    enabled: true,
  });

  // Afternoon greeting (12-14 PM)
  await scheduler.createTask({
    name: 'afternoon-greeting',
    description: '午间问候',
    trigger: {
      type: 'cron',
      config: { type: 'cron', expression: '0 12-14 * * *' },
    },
    action: {
      type: 'notification',
      config: {
        type: 'notification',
        title: '午间问候',
        body: '${greeting}',
      },
    },
    enabled: true,
  });

  // Evening greeting (18-20 PM)
  await scheduler.createTask({
    name: 'evening-greeting',
    description: '晚间问候',
    trigger: {
      type: 'cron',
      config: { type: 'cron', expression: '0 18-20 * * *' },
    },
    action: {
      type: 'notification',
      config: {
        type: 'notification',
        title: '晚间问候',
        body: '${greeting}',
      },
    },
    enabled: true,
  });
}

/**
 * Handle proactive greeting event
 */
async function handleGreetingEvent(): Promise<void> {
  const result = await generateContextGreeting();

  // Show bubble and set emotion
  usePetStore.getState().showBubble(result.text, 5000);
  usePetStore.getState().setEmotion(result.emotion);
}

/**
 * Hook for proactive behavior
 */
export function useProactiveBehavior(enabled: boolean = true) {
  const { setEmotion, showBubble } = usePetStore();

  useEffect(() => {
    if (!enabled) return;

    let scheduler: SchedulerManager | null = null;
    let notificationHandler: (() => void) | null = null;

    const setup = async () => {
      try {
        scheduler = getSchedulerManager();

        // Setup greeting tasks
        await setupGreetingTasks(scheduler);

        // Register event handler for greetings
        notificationHandler = () => {
          handleGreetingEvent().catch((error) => {
            console.error('[useProactiveBehavior] Failed to handle greeting:', error);
          });
        };

        scheduler.on('notification', notificationHandler);

        console.log('[useProactiveBehavior] Proactive tasks registered');
      } catch (error) {
        console.error('[useProactiveBehavior] Failed to setup proactive tasks:', error);
      }
    };

    setup();

    return () => {
      if (scheduler && notificationHandler) {
        scheduler.off('notification', notificationHandler);
      }
    };
  }, [enabled]);

  /**
   * Trigger immediate greeting (manual trigger)
   */
  const triggerGreeting = useCallback(async () => {
    try {
      const result = await generateContextGreeting();
      showBubble(result.text, 5000);
      setEmotion(result.emotion);
    } catch (error) {
      console.error('[useProactiveBehavior] Failed to trigger greeting:', error);
    }
  }, [setEmotion, showBubble]);

  return {
    triggerGreeting,
  };
}
