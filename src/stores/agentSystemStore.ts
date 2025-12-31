/**
 * 智能体系统状态管理
 * Agent System Store
 *
 * 管理智能体系统的全局状态：
 * - 系统启停控制
 * - 已注册智能体
 * - 活跃任务
 * - 执行历史
 * - 全局配置
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AgentSystemStatus,
  RegisteredAgent,
  AgentTask,
  AgentExecutionRecord,
  DispatcherConfig,
} from '@/types/agent-system';
import { DEFAULT_DISPATCHER_CONFIG } from '@/types/agent-system';

/**
 * 智能体系统 Store 接口
 */
interface AgentSystemStore {
  // ============================================================================
  // 状态
  // ============================================================================

  /** 系统状态 */
  systemStatus: AgentSystemStatus;

  /** 已注册智能体列表 */
  registeredAgents: RegisteredAgent[];

  /** 活跃任务列表 */
  activeTasks: AgentTask[];

  /** 执行历史（最近 100 条） */
  executionHistory: AgentExecutionRecord[];

  /** 调度器配置 */
  dispatcherConfig: DispatcherConfig;

  /** 全局开关 */
  globalEnabled: boolean;

  /** 上次检查时间 */
  lastCheckAt: number;

  /** 智能体开关状态 */
  agentEnabledMap: Record<string, boolean>;

  // ============================================================================
  // 系统控制 Actions
  // ============================================================================

  /** 设置系统状态 */
  setSystemStatus: (status: AgentSystemStatus) => void;

  /** 启动系统 */
  startSystem: () => void;

  /** 停止系统 */
  stopSystem: () => void;

  /** 暂停系统 */
  pauseSystem: () => void;

  /** 恢复系统 */
  resumeSystem: () => void;

  /** 设置全局开关 */
  setGlobalEnabled: (enabled: boolean) => void;

  // ============================================================================
  // 智能体管理 Actions
  // ============================================================================

  /** 添加已注册智能体 */
  addRegisteredAgent: (agent: RegisteredAgent) => void;

  /** 移除已注册智能体 */
  removeRegisteredAgent: (agentId: string) => void;

  /** 更新智能体状态 */
  updateAgentStatus: (agentId: string, status: AgentSystemStatus) => void;

  /** 更新智能体执行统计 */
  updateAgentStats: (
    agentId: string,
    stats: { executionCount?: number; errorCount?: number }
  ) => void;

  /** 设置智能体开关 */
  setAgentEnabled: (agentId: string, enabled: boolean) => void;

  /** 获取智能体是否启用 */
  isAgentEnabled: (agentId: string) => boolean;

  // ============================================================================
  // 任务管理 Actions
  // ============================================================================

  /** 添加活跃任务 */
  addActiveTask: (task: AgentTask) => void;

  /** 移除活跃任务 */
  removeActiveTask: (taskId: string) => void;

  /** 更新任务状态 */
  updateTaskStatus: (
    taskId: string,
    status: AgentTask['status'],
    result?: AgentTask['result']
  ) => void;

  /** 清空所有活跃任务 */
  clearActiveTasks: () => void;

  // ============================================================================
  // 执行历史 Actions
  // ============================================================================

  /** 添加执行记录 */
  addExecutionRecord: (record: AgentExecutionRecord) => void;

  /** 清空执行历史 */
  clearExecutionHistory: () => void;

  /** 获取最近执行记录 */
  getRecentExecutions: (limit?: number) => AgentExecutionRecord[];

  // ============================================================================
  // 配置管理 Actions
  // ============================================================================

  /** 更新调度器配置 */
  updateDispatcherConfig: (config: Partial<DispatcherConfig>) => void;

  /** 重置为默认配置 */
  resetConfig: () => void;

  // ============================================================================
  // 统计查询
  // ============================================================================

  /** 获取系统统计 */
  getSystemStats: () => {
    agentCount: number;
    activeTaskCount: number;
    totalExecutions: number;
    successRate: number;
    isRunning: boolean;
  };

  // ============================================================================
  // 重置
  // ============================================================================

  /** 重置所有状态 */
  reset: () => void;
}

/**
 * 初始状态
 */
const initialState = {
  systemStatus: 'idle' as AgentSystemStatus,
  registeredAgents: [] as RegisteredAgent[],
  activeTasks: [] as AgentTask[],
  executionHistory: [] as AgentExecutionRecord[],
  dispatcherConfig: DEFAULT_DISPATCHER_CONFIG,
  globalEnabled: true,
  lastCheckAt: Date.now(),
  agentEnabledMap: {} as Record<string, boolean>,
};

/**
 * 智能体系统 Store
 */
export const useAgentSystemStore = create<AgentSystemStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ============================================================================
      // 系统控制 Actions
      // ============================================================================

      setSystemStatus: (status) => set({ systemStatus: status }),

      startSystem: () =>
        set({
          systemStatus: 'running',
          lastCheckAt: Date.now(),
        }),

      stopSystem: () =>
        set({
          systemStatus: 'idle',
          activeTasks: [],
        }),

      pauseSystem: () => set({ systemStatus: 'paused' }),

      resumeSystem: () => set({ systemStatus: 'running' }),

      setGlobalEnabled: (enabled) => set({ globalEnabled: enabled }),

      // ============================================================================
      // 智能体管理 Actions
      // ============================================================================

      addRegisteredAgent: (agent) =>
        set((state) => {
          // 检查是否已存在
          const exists = state.registeredAgents.some(
            (a) => a.metadata.id === agent.metadata.id
          );
          if (exists) {
            return state;
          }

          return {
            registeredAgents: [...state.registeredAgents, agent],
          };
        }),

      removeRegisteredAgent: (agentId) =>
        set((state) => ({
          registeredAgents: state.registeredAgents.filter(
            (a) => a.metadata.id !== agentId
          ),
        })),

      updateAgentStatus: (agentId, status) =>
        set((state) => ({
          registeredAgents: state.registeredAgents.map((a) =>
            a.metadata.id === agentId ? { ...a, status } : a
          ),
        })),

      updateAgentStats: (agentId, stats) =>
        set((state) => ({
          registeredAgents: state.registeredAgents.map((a) =>
            a.metadata.id === agentId
              ? {
                  ...a,
                  executionCount:
                    stats.executionCount ?? a.executionCount,
                  errorCount: stats.errorCount ?? a.errorCount,
                  lastExecutedAt: Date.now(),
                }
              : a
          ),
        })),

      setAgentEnabled: (agentId, enabled) =>
        set((state) => ({
          agentEnabledMap: {
            ...state.agentEnabledMap,
            [agentId]: enabled,
          },
        })),

      isAgentEnabled: (agentId) => {
        const state = get();
        return state.agentEnabledMap[agentId] ?? true;
      },

      // ============================================================================
      // 任务管理 Actions
      // ============================================================================

      addActiveTask: (task) =>
        set((state) => ({
          activeTasks: [...state.activeTasks, task],
        })),

      removeActiveTask: (taskId) =>
        set((state) => ({
          activeTasks: state.activeTasks.filter((t) => t.id !== taskId),
        })),

      updateTaskStatus: (taskId, status, result) =>
        set((state) => ({
          activeTasks: state.activeTasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status,
                  result,
                  completedAt: ['completed', 'failed', 'cancelled'].includes(
                    status
                  )
                    ? Date.now()
                    : undefined,
                }
              : t
          ),
        })),

      clearActiveTasks: () => set({ activeTasks: [] }),

      // ============================================================================
      // 执行历史 Actions
      // ============================================================================

      addExecutionRecord: (record) =>
        set((state) => {
          const newHistory = [...state.executionHistory, record];
          // 限制历史记录数量
          if (newHistory.length > 100) {
            newHistory.shift();
          }
          return { executionHistory: newHistory };
        }),

      clearExecutionHistory: () => set({ executionHistory: [] }),

      getRecentExecutions: (limit = 20) => {
        const state = get();
        return [...state.executionHistory].reverse().slice(0, limit);
      },

      // ============================================================================
      // 配置管理 Actions
      // ============================================================================

      updateDispatcherConfig: (config) =>
        set((state) => ({
          dispatcherConfig: {
            ...state.dispatcherConfig,
            ...config,
          },
        })),

      resetConfig: () =>
        set({
          dispatcherConfig: DEFAULT_DISPATCHER_CONFIG,
        }),

      // ============================================================================
      // 统计查询
      // ============================================================================

      getSystemStats: () => {
        const state = get();
        const totalExecutions = state.executionHistory.length;
        const successCount = state.executionHistory.filter(
          (r) => r.success
        ).length;

        return {
          agentCount: state.registeredAgents.length,
          activeTaskCount: state.activeTasks.length,
          totalExecutions,
          successRate:
            totalExecutions > 0 ? successCount / totalExecutions : 1,
          isRunning: state.systemStatus === 'running',
        };
      },

      // ============================================================================
      // 重置
      // ============================================================================

      reset: () => set(initialState),
    }),
    {
      name: 'agent-system-store',
      partialize: (state) => ({
        // 只持久化配置相关的状态
        dispatcherConfig: state.dispatcherConfig,
        globalEnabled: state.globalEnabled,
        agentEnabledMap: state.agentEnabledMap,
      }),
    }
  )
);

/**
 * 选择器 Hooks
 */
export const useAgentSystemStatus = () =>
  useAgentSystemStore((state) => state.systemStatus);

export const useRegisteredAgents = () =>
  useAgentSystemStore((state) => state.registeredAgents);

export const useActiveTasks = () =>
  useAgentSystemStore((state) => state.activeTasks);

export const useExecutionHistory = () =>
  useAgentSystemStore((state) => state.executionHistory);

export const useAgentSystemStats = () =>
  useAgentSystemStore((state) => state.getSystemStats());

export const useAgentEnabled = (agentId: string) =>
  useAgentSystemStore((state) => state.isAgentEnabled(agentId));
