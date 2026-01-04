/**
 * 智能体事件监听 Hook
 * 
 * 监听智能体系统的各种事件，并与应用其他部分集成：
 * 1. 智能体执行结果 -> 宠物气泡显示
 * 2. 情绪变化 -> 宠物表情更新
 * 3. 通知事件 -> Toast 提示
 * 4. 语音播报 -> TTS
 */

import { useEffect } from 'react';
import { getTriggerManager } from '@/services/agent/dispatcher';
import { usePetStore, useAgentSystemStore, toast } from '@/stores';
import { petSpeak } from '@/services/pet/voice-link';
import { useConfigStore } from '@/stores/configStore';
import type { AgentResult } from '@/types/agent-system';

/**
 * 智能体事件监听 Hook
 */
export function useAgentListener() {
  const { globalEnabled } = useAgentSystemStore();
  const { showBubble, setEmotion, setSpeakingTemporary } = usePetStore();
  const { config } = useConfigStore();

  useEffect(() => {
    if (!globalEnabled) return;

    const triggerManager = getTriggerManager();

    // 监听智能体执行完成事件
    const handleAgentComplete = (result: AgentResult) => {
      // 显示消息气泡
      if (result.message) {
        const duration = Math.min(result.message.length * 100, 10000);
        showBubble(result.message, duration);

        // 语音播报
        if (result.shouldSpeak && config.voice.ttsEnabled) {
          void petSpeak(result.message, { priority: 'normal' });
        } else if (result.shouldSpeak) {
          setSpeakingTemporary(duration);
        }
      }

      // 更新宠物表情
      if (result.emotion) {
        // 映射智能体情绪到宠物表情
        const emotionMap: Record<string, 'happy' | 'thinking' | 'confused' | 'surprised' | 'neutral' | 'sad' | 'excited'> = {
          happy: 'happy',
          sad: 'sad',
          anxious: 'confused',
          excited: 'excited',
          calm: 'neutral',
          angry: 'sad',
          confused: 'confused',
          neutral: 'neutral',
        };
        const petEmotion = emotionMap[result.emotion] || 'neutral';
        setEmotion(petEmotion);
      }

      // 执行额外动作
      if (result.actions && Array.isArray(result.actions)) {
        for (const action of result.actions) {
          handleAgentAction(action);
        }
      }
    };

    // 监听智能体错误
    const handleAgentError = (error: { agentId: string; error: Error }) => {
      console.error('[AgentListener] Agent error:', error);
      toast.error(`智能体执行失败: ${error.error.message}`);
    };

    // 处理智能体动作
    const handleAgentAction = (action: NonNullable<AgentResult['actions']>[number]) => {
      switch (action.type) {
        case 'notification':
          if (action.payload) {
            const { title, body } = action.payload as { title?: string; body?: string };
            toast.info(body ? `${title}: ${body}` : title || '通知', 5000);
          }
          break;

        case 'trigger_agent':
          if (action.payload) {
            const { agentId, reason } = action.payload as { agentId: string; reason?: string };
            // 触发其他智能体
            triggerManager.emitEvent('agent_trigger', { agentId, reason });
          }
          break;

        // case 'update_status':
        //   // 更新宠物状态
        //   console.log('[AgentListener] Update status:', action.payload);
        //   break;

        default:
          console.warn('[AgentListener] Unknown action type:', action.type);
      }
    };

    // 注册事件监听器
    // TriggerManager 的回调已经在 useAgentSystem 中设置

    // 监听自定义事件
    const handleAgentCompleteEvent = (event: Event) => {
      const customEvent = event as CustomEvent<AgentResult>;
      handleAgentComplete(customEvent.detail);
    };

    const handleAgentErrorEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ agentId: string; error: Error }>;
      handleAgentError(customEvent.detail);
    };

    window.addEventListener('agent-complete', handleAgentCompleteEvent);
    window.addEventListener('agent-error', handleAgentErrorEvent);

    // 清理
    return () => {
      window.removeEventListener('agent-complete', handleAgentCompleteEvent);
      window.removeEventListener('agent-error', handleAgentErrorEvent);
    };
  }, [globalEnabled, showBubble, setEmotion, setSpeakingTemporary, config.voice.ttsEnabled]);
}
