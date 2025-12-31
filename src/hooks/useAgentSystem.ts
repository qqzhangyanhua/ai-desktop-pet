/**
 * 智能体系统初始化 Hook
 * 
 * 负责：
 * 1. 初始化 AgentDispatcher 和 TriggerManager
 * 2. 注册所有智能体
 * 3. 启动智能体系统
 * 4. 监听系统状态
 */

import { useEffect, useRef } from 'react';
import { getAgentDispatcher, getTriggerManager } from '@/services/agent/dispatcher';
import { useAgentSystemStore } from '@/stores/agentSystemStore';
import { registerAllAgents } from '@/services/agent-registry';
import { toast } from '@/stores';

/**
 * 智能体系统初始化配置
 */
interface UseAgentSystemOptions {
  /** 是否自动启动 */
  autoStart?: boolean;
  /** 是否在开发模式下启用 */
  enableInDev?: boolean;
}

/**
 * 智能体系统初始化 Hook
 */
export function useAgentSystem(options: UseAgentSystemOptions = {}) {
  const {
    autoStart = true,
    enableInDev = true,
  } = options;

  const initialized = useRef(false);
  const { globalEnabled, systemStatus } = useAgentSystemStore();

  useEffect(() => {
    // 避免重复初始化
    if (initialized.current) return;

    // 开发模式检查
    if (import.meta.env.DEV && !enableInDev) {
      console.log('[AgentSystem] Skipped in development mode');
      return;
    }

    // 全局开关检查
    if (!globalEnabled) {
      console.log('[AgentSystem] Disabled by global switch');
      return;
    }

    const initializeSystem = async () => {
      try {
        console.log('[AgentSystem] Starting initialization...');

        // 获取 Dispatcher 和 TriggerManager
        const dispatcher = getAgentDispatcher();
        const triggerManager = getTriggerManager();

        // 注册所有智能体
        console.log('[AgentSystem] Registering agents...');
        const registeredCount = await registerAllAgents(dispatcher);
        console.log(`[AgentSystem] Registered ${registeredCount} agents`);

        // 启动系统
        if (autoStart) {
          console.log('[AgentSystem] Starting dispatcher...');
          await dispatcher.start();

          console.log('[AgentSystem] Starting trigger manager...');
          triggerManager.start((agentId, triggerId) => {
            // 触发回调 - 调度器会处理
            console.log('[AgentSystem] Trigger fired:', { agentId, triggerId });
          });

          console.log('[AgentSystem] ✅ Agent system started successfully');

          // 更新状态
          useAgentSystemStore.getState().setSystemStatus('running');
        }

        initialized.current = true;
      } catch (error) {
        console.error('[AgentSystem] Failed to initialize:', error);
        toast.error('智能体系统初始化失败');
        useAgentSystemStore.getState().setSystemStatus('error');
      }
    };

    void initializeSystem();

    // 清理函数
    return () => {
      if (initialized.current) {
        console.log('[AgentSystem] Cleaning up...');
        const dispatcher = getAgentDispatcher();
        const triggerManager = getTriggerManager();

        void dispatcher.stop();
        void triggerManager.stop();

        initialized.current = false;
      }
    };
  }, [autoStart, enableInDev, globalEnabled]);

  return {
    initialized: initialized.current,
    systemStatus,
    globalEnabled,
  };
}
