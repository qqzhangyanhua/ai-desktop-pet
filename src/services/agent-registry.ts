/**
 * 智能体注册服务
 * 
 * 负责创建和注册所有智能体实例
 */

import type { AgentDispatcher } from './agent/dispatcher/agent-dispatcher';

// P0 智能体
import {
  EmotionPerceptionAgent,
  ConversationMemoryAgent,
  ProactiveCareAgent,
  ScheduleManagerAgent,
} from './agent/agents';

// P1 智能体
import {
  HealthButlerAgent,
  WeatherLifeAgent,
  MeditationGuideAgent,
  BedtimeStoryAgent,
  AchievementAgent,
  DailySummaryAgent,
} from './agent/agents';

/**
 * 注册所有智能体
 */
export async function registerAllAgents(
  dispatcher: AgentDispatcher
): Promise<number> {
  console.log('[AgentRegistry] Registering all agents...');

  let count = 0;

  try {
    // P0 核心智能体
    console.log('[AgentRegistry] Registering P0 agents...');

    const emotionAgent = new EmotionPerceptionAgent();
    await dispatcher.registerAgent(emotionAgent, {
      priority: 'high',
      enabled: true,
      tags: ['core', 'emotion', 'p0'],
    });
    count++;

    const memoryAgent = new ConversationMemoryAgent();
    await dispatcher.registerAgent(memoryAgent, {
      priority: 'high',
      enabled: true,
      tags: ['core', 'memory', 'p0'],
    });
    count++;

    const careAgent = new ProactiveCareAgent();
    await dispatcher.registerAgent(careAgent, {
      priority: 'normal',
      enabled: true,
      tags: ['core', 'care', 'p0'],
    });
    count++;

    const scheduleAgent = new ScheduleManagerAgent();
    await dispatcher.registerAgent(scheduleAgent, {
      priority: 'normal',
      enabled: true,
      tags: ['core', 'schedule', 'p0'],
    });
    count++;

    console.log(`[AgentRegistry] ✅ Registered ${count} P0 agents`);

    // P1 增强智能体
    console.log('[AgentRegistry] Registering P1 agents...');

    const healthAgent = new HealthButlerAgent();
    await dispatcher.registerAgent(healthAgent, {
      priority: 'normal',
      enabled: true,
      tags: ['wellness', 'health', 'p1'],
    });
    count++;

    const weatherAgent = new WeatherLifeAgent();
    await dispatcher.registerAgent(weatherAgent, {
      priority: 'normal',
      enabled: true,
      tags: ['utility', 'weather', 'p1'],
    });
    count++;

    const meditationAgent = new MeditationGuideAgent();
    await dispatcher.registerAgent(meditationAgent, {
      priority: 'normal',
      enabled: true,
      tags: ['wellness', 'meditation', 'p1'],
    });
    count++;

    const storyAgent = new BedtimeStoryAgent();
    await dispatcher.registerAgent(storyAgent, {
      priority: 'low',
      enabled: true,
      tags: ['entertainment', 'story', 'p1'],
    });
    count++;

    const achievementAgent = new AchievementAgent();
    await dispatcher.registerAgent(achievementAgent, {
      priority: 'low',
      enabled: true,
      tags: ['entertainment', 'achievement', 'p1'],
    });
    count++;

    const summaryAgent = new DailySummaryAgent();
    await dispatcher.registerAgent(summaryAgent, {
      priority: 'normal',
      enabled: true,
      tags: ['productivity', 'summary', 'p1'],
    });
    count++;

    console.log(`[AgentRegistry] ✅ Registered ${count} total agents (P0 + P1)`);

    return count;
  } catch (error) {
    console.error('[AgentRegistry] Failed to register agents:', error);
    throw error;
  }
}

/**
 * 获取智能体分类统计
 */
export function getAgentStats() {
  return {
    p0: 4,
    p1: 6,
    total: 10,
    categories: {
      core: 4,
      wellness: 3,
      utility: 1,
      entertainment: 2,
      productivity: 1,
    },
  };
}
