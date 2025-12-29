/**
 * Proactive behavior hook
 * 设置并处理主动行为任务（定时问候等）
 */

import { useEffect, useCallback } from 'react';
import { usePetStore, useConfigStore } from '../stores';
import { getSchedulerManager } from '../services/scheduler';
import { generateContextGreeting } from '../services/proactive';
import { petSpeak } from '../services/pet/voice-link';
import type { SchedulerManager } from '../services/scheduler/manager';
import type { GreetingResult } from '../types';

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
 * Process greeting result: show bubble, set emotion, handle voice
 * 统一处理问候结果：显示气泡、设置表情、处理语音/动画
 */
async function processGreetingResult(result: GreetingResult): Promise<void> {
  const config = useConfigStore.getState().config;
  const pet = usePetStore.getState();

  // 设置表情
  pet.setEmotion(result.emotion);

  // 统一气泡样式与行为：检查配置、处理语音/动画
  if (config.behavior.notifications.bubbleEnabled) {
    const duration = 5200; // 与其它系统提醒保持一致
    pet.showBubble(result.text, duration);
    
    if (config.voice.ttsEnabled) {
      void petSpeak(result.text, { priority: 'normal', interrupt: true });
    } else {
      pet.setSpeakingTemporary(duration);
    }
  }
}

/**
 * Handle proactive greeting event
 */
async function handleGreetingEvent(): Promise<void> {
  const result = await generateContextGreeting();
  await processGreetingResult(result);
}

/**
 * Hook for proactive behavior
 */
export function useProactiveBehavior(enabled: boolean = true) {
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
      await processGreetingResult(result);
    } catch (error) {
      console.error('[useProactiveBehavior] Failed to trigger greeting:', error);
    }
  }, []);

  return {
    triggerGreeting,
  };
}
