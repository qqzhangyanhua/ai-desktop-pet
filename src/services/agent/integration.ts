// @ts-nocheck
/**
 * 智能体系统集成服务
 * 
 * 提供与应用其他部分的集成接口
 */

import { getTriggerManager } from './dispatcher';
import { usePetStatusStore, useUserProfileStore, useChatStore } from '@/stores';
import type { AgentContext } from '@/types/agent-system';

/**
 * 触发用户消息智能体
 */
export async function triggerUserMessage(message: string): Promise<void> {
  const triggerManager = getTriggerManager();

  // 构建上下文
  const context = buildAgentContext(message);

  // 触发用户消息匹配
  await triggerManager.matchUserMessageTriggers(message, context);
}

/**
 * 触发事件智能体
 */
export function triggerEvent(
  eventName: string,
  eventData?: Record<string, unknown>
): void {
  const triggerManager = getTriggerManager();
  triggerManager.emitEvent(eventName, eventData);
}

/**
 * 构建智能体上下文
 */
export function buildAgentContext(userMessage?: string): AgentContext {
  const petStatus = usePetStatusStore.getState();
  const userProfile = useUserProfileStore.getState().profile;
  const chatStore = useChatStore.getState();

  // 获取最近的对话消息
  const recentMessages = chatStore.currentConversationId
    ? chatStore.getMessages(chatStore.currentConversationId).slice(-5)
    : [];

  return {
    userId: userProfile?.id || 'default',
    userMessage,
    userProfile: userProfile
      ? {
          name: userProfile.name,
          preferences: userProfile.preferences,
          tags: userProfile.tags,
        }
      : undefined,
    recentEmotions: [], // 可以从情绪工具获取
    currentPetStatus: {
      health: petStatus.health,
      mood: petStatus.mood,
      energy: petStatus.energy,
      intimacy: petStatus.intimacy,
      hunger: petStatus.hunger,
      cleanliness: petStatus.cleanliness,
    },
    recentMessages: recentMessages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.createdAt,
    })),
    timestamp: Date.now(),
    triggerSource: userMessage ? 'user_message' : 'event',
  };
}

/**
 * 记录用户互动（用于成就系统）
 */
export function recordUserInteraction(type: string, value?: number): void {
  triggerEvent('user_action', {
    actionType: type,
    value,
    timestamp: Date.now(),
  });
}

/**
 * 触发情绪检测
 */
export function triggerEmotionDetection(
  emotion: string,
  intensity: number
): void {
  triggerEvent('emotion_detected', {
    emotion,
    intensity,
    timestamp: Date.now(),
  });
}

/**
 * 触发日程提醒
 */
export function triggerScheduleReminder(scheduleId: string): void {
  triggerEvent('schedule_reminder', {
    scheduleId,
    timestamp: Date.now(),
  });
}
