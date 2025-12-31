/**
 * 智能体调度器
 * Agent Dispatcher
 *
 * 统一管理智能体的调度与执行：
 * - 智能体注册与生命周期管理
 * - 任务队列与并发控制
 * - 优先级调度
 * - 执行历史记录
 */

import type {
  IAgent,
  AgentContext,
  AgentResult,
  AgentTask,
  AgentExecutionRecord,
  RegisteredAgent,
  DispatcherConfig,
  AgentSystemStatus,
} from '@/types/agent-system';
import {
  DEFAULT_DISPATCHER_CONFIG,
} from '@/types/agent-system';
import { TriggerManager, getTriggerManager } from './trigger-manager';

/**
 * 智能体调度器
 */
export class AgentDispatcher {
  /** 单例实例 */
  private static instance: AgentDispatcher | null = null;

  /** 已注册智能体实例 */
  private agents: Map<string, IAgent> = new Map();

  /** 智能体注册信息 */
  private registeredAgents: Map<string, RegisteredAgent> = new Map();

  /** 任务队列 */
  private taskQueue: AgentTask[] = [];

  /** 活跃任务 */
  private activeTasks: Map<string, AgentTask> = new Map();

  /** 执行历史 */
  private executionHistory: AgentExecutionRecord[] = [];

  /** 调度器配置 */
  private config: DispatcherConfig;

  /** 触发器管理器 */
  private triggerManager: TriggerManager;

  /** 调度器状态 */
  private status: AgentSystemStatus = 'idle';

  /** 处理循环定时器 */
  private processTimer: ReturnType<typeof setInterval> | null = null;

  /** 最大历史记录数 */
  private maxHistorySize = 1000;

  private constructor(config?: Partial<DispatcherConfig>) {
    this.config = {
      ...DEFAULT_DISPATCHER_CONFIG,
      ...config,
    };
    this.triggerManager = getTriggerManager();
  }

  /**
   * 获取单例实例
   */
  static getInstance(config?: Partial<DispatcherConfig>): AgentDispatcher {
    if (!AgentDispatcher.instance) {
      AgentDispatcher.instance = new AgentDispatcher(config);
    }
    return AgentDispatcher.instance;
  }

  /**
   * 重置单例（用于测试）
   */
  static resetInstance(): void {
    if (AgentDispatcher.instance) {
      AgentDispatcher.instance.stop();
    }
    AgentDispatcher.instance = null;
  }

  // ============================================================================
  // 生命周期
  // ============================================================================

  /**
   * 启动调度器
   */
  async start(): Promise<void> {
    if (this.status === 'running') {
      console.warn('[AgentDispatcher] 已在运行中');
      return;
    }

    console.info('[AgentDispatcher] 启动调度器...');

    // 初始化所有智能体
    for (const [agentId, agent] of this.agents) {
      try {
        await agent.initialize();
        const registered = this.registeredAgents.get(agentId);
        if (registered) {
          registered.status = 'running';
        }
      } catch (error) {
        console.error(`[AgentDispatcher] 智能体初始化失败: ${agentId}`, error);
        const registered = this.registeredAgents.get(agentId);
        if (registered) {
          registered.status = 'error';
          registered.errorCount++;
        }
      }
    }

    // 启动触发器管理器
    this.triggerManager.start(this.handleTrigger.bind(this));

    // 启动任务处理循环
    this.processTimer = setInterval(() => {
      this.processQueue();
    }, 100);

    this.status = 'running';
    console.info('[AgentDispatcher] 调度器已启动');
  }

  /**
   * 停止调度器
   */
  async stop(): Promise<void> {
    if (this.status === 'idle') {
      return;
    }

    console.info('[AgentDispatcher] 停止调度器...');

    // 停止任务处理循环
    if (this.processTimer) {
      clearInterval(this.processTimer);
      this.processTimer = null;
    }

    // 停止触发器管理器
    this.triggerManager.stop();

    // 取消所有待处理任务
    this.taskQueue.forEach((task) => {
      task.status = 'cancelled';
    });
    this.taskQueue = [];

    // 清理所有智能体
    for (const agent of this.agents.values()) {
      try {
        await agent.cleanup();
      } catch (error) {
        console.error(
          `[AgentDispatcher] 智能体清理失败: ${agent.metadata.id}`,
          error
        );
      }
    }

    this.status = 'idle';
    console.info('[AgentDispatcher] 调度器已停止');
  }

  /**
   * 暂停调度器
   */
  pause(): void {
    if (this.status !== 'running') {
      return;
    }

    if (this.processTimer) {
      clearInterval(this.processTimer);
      this.processTimer = null;
    }

    this.status = 'paused';
    console.info('[AgentDispatcher] 调度器已暂停');
  }

  /**
   * 恢复调度器
   */
  resume(): void {
    if (this.status !== 'paused') {
      return;
    }

    this.processTimer = setInterval(() => {
      this.processQueue();
    }, 100);

    this.status = 'running';
    console.info('[AgentDispatcher] 调度器已恢复');
  }

  // ============================================================================
  // 智能体注册
  // ============================================================================

  /**
   * 注册智能体
   */
  registerAgent(agent: IAgent): void {
    const { id } = agent.metadata;

    if (this.agents.has(id)) {
      console.warn(`[AgentDispatcher] 智能体已注册: ${id}`);
      return;
    }

    this.agents.set(id, agent);

    // 创建注册信息
    const registered: RegisteredAgent = {
      metadata: agent.metadata,
      config: agent.config,
      triggers: agent.triggers,
      status: 'idle',
      executionCount: 0,
      errorCount: 0,
    };
    this.registeredAgents.set(id, registered);

    // 注册触发器
    agent.triggers.forEach((trigger) => {
      this.triggerManager.registerTrigger(id, trigger);
    });

    console.info(`[AgentDispatcher] 注册智能体: ${id}`, {
      name: agent.metadata.name,
      triggers: agent.triggers.length,
    });

    // 如果调度器正在运行，初始化智能体
    if (this.status === 'running') {
      agent.initialize().catch((error) => {
        console.error(`[AgentDispatcher] 智能体初始化失败: ${id}`, error);
        registered.status = 'error';
        registered.errorCount++;
      });
    }
  }

  /**
   * 注销智能体
   */
  async unregisterAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return;
    }

    // 注销触发器
    this.triggerManager.unregisterAgentTriggers(agentId);

    // 清理智能体
    try {
      await agent.cleanup();
    } catch (error) {
      console.error(`[AgentDispatcher] 智能体清理失败: ${agentId}`, error);
    }

    this.agents.delete(agentId);
    this.registeredAgents.delete(agentId);

    console.info(`[AgentDispatcher] 注销智能体: ${agentId}`);
  }

  /**
   * 获取已注册智能体
   */
  getAgent(agentId: string): IAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * 获取所有已注册智能体信息
   */
  getRegisteredAgents(): RegisteredAgent[] {
    return Array.from(this.registeredAgents.values());
  }

  // ============================================================================
  // 任务调度
  // ============================================================================

  /**
   * 处理触发器回调
   */
  private handleTrigger(
    agentId: string,
    triggerId: string,
    context: Partial<AgentContext>
  ): void {
    const agent = this.agents.get(agentId);
    if (!agent) {
      console.warn(`[AgentDispatcher] 智能体不存在: ${agentId}`);
      return;
    }

    // 构建完整上下文
    const fullContext = this.buildContext(context, 'schedule', triggerId);

    // 创建任务并加入队列
    this.enqueueTask(agentId, fullContext);
  }

  /**
   * 分发用户消息
   */
  async dispatchUserMessage(
    message: string,
    context?: Partial<AgentContext>
  ): Promise<AgentResult | null> {
    // 匹配用户消息触发器
    const matches = this.triggerManager.matchUserMessageTriggers(message);

    if (matches.length === 0) {
      return null;
    }

    // 选择最高分匹配
    const bestMatch = matches[0];
    const agent = this.agents.get(bestMatch.agentId);

    if (!agent) {
      return null;
    }

    // 构建上下文并执行
    const fullContext = this.buildContext(
      {
        ...context,
        userMessage: message,
      },
      'user_message',
      bestMatch.triggerId
    );

    return this.executeAgent(agent, fullContext);
  }

  /**
   * 直接执行智能体
   */
  async executeAgentById(
    agentId: string,
    context?: Partial<AgentContext>
  ): Promise<AgentResult | null> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      console.warn(`[AgentDispatcher] 智能体不存在: ${agentId}`);
      return null;
    }

    const fullContext = this.buildContext(context || {}, 'event');
    return this.executeAgent(agent, fullContext);
  }

  /**
   * 加入任务队列
   */
  private enqueueTask(agentId: string, context: AgentContext): string {
    // 检查队列大小
    if (this.taskQueue.length >= this.config.queueSize) {
      console.warn('[AgentDispatcher] 任务队列已满');
      // 移除最老的任务
      this.taskQueue.shift();
    }

    const task: AgentTask = {
      id: this.generateTaskId(),
      agentId,
      context,
      createdAt: Date.now(),
      status: 'pending',
      retryCount: 0,
    };

    // 根据优先级插入
    const agent = this.agents.get(agentId);
    const priority = agent?.metadata.priority || 'normal';
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };

    const insertIndex = this.taskQueue.findIndex((t) => {
      const tAgent = this.agents.get(t.agentId);
      const tPriority = tAgent?.metadata.priority || 'normal';
      return priorityOrder[priority] < priorityOrder[tPriority];
    });

    if (insertIndex === -1) {
      this.taskQueue.push(task);
    } else {
      this.taskQueue.splice(insertIndex, 0, task);
    }

    console.debug(`[AgentDispatcher] 任务入队: ${task.id}`, {
      agentId,
      queueLength: this.taskQueue.length,
    });

    return task.id;
  }

  /**
   * 处理任务队列
   */
  private async processQueue(): Promise<void> {
    // 检查并发限制
    if (this.activeTasks.size >= this.config.maxConcurrency) {
      return;
    }

    // 获取下一个任务
    const task = this.taskQueue.shift();
    if (!task) {
      return;
    }

    const agent = this.agents.get(task.agentId);
    if (!agent) {
      console.warn(`[AgentDispatcher] 任务智能体不存在: ${task.agentId}`);
      return;
    }

    // 标记为运行中
    task.status = 'running';
    task.startedAt = Date.now();
    this.activeTasks.set(task.id, task);

    try {
      // 执行智能体
      const result = await this.executeAgent(agent, task.context);

      // 更新任务状态
      task.status = result.success ? 'completed' : 'failed';
      task.completedAt = Date.now();
      task.result = result;

      // 记录执行历史
      this.recordExecution(agent, task, result);
    } catch (error) {
      task.status = 'failed';
      task.completedAt = Date.now();
      task.result = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };

      // 检查是否需要重试
      if (task.retryCount < this.config.maxRetries) {
        task.retryCount++;
        task.status = 'pending';
        task.startedAt = undefined;
        task.completedAt = undefined;

        // 延迟后重新入队
        setTimeout(() => {
          this.taskQueue.unshift(task);
        }, this.config.retryDelayMs);
      }
    } finally {
      this.activeTasks.delete(task.id);
    }
  }

  /**
   * 执行智能体
   */
  private async executeAgent(
    agent: IAgent,
    context: AgentContext
  ): Promise<AgentResult> {
    const registered = this.registeredAgents.get(agent.metadata.id);

    try {
      // 检查是否应该触发
      const shouldTrigger = await agent.shouldTrigger(context);
      if (!shouldTrigger) {
        return {
          success: true,
          message: '触发条件不满足，跳过执行',
        };
      }

      // 执行
      const result = await agent.execute(context);

      // 更新统计
      if (registered) {
        registered.executionCount++;
        registered.lastExecutedAt = Date.now();
      }

      return result;
    } catch (error) {
      if (registered) {
        registered.errorCount++;
      }
      throw error;
    }
  }

  /**
   * 记录执行历史
   */
  private recordExecution(
    agent: IAgent,
    task: AgentTask,
    result: AgentResult
  ): void {
    const record: AgentExecutionRecord = {
      id: task.id,
      agentId: agent.metadata.id,
      agentName: agent.metadata.name,
      triggerType: task.context.triggerSource,
      startedAt: task.startedAt || task.createdAt,
      completedAt: task.completedAt || Date.now(),
      success: result.success,
      duration: result.duration || 0,
      message: result.message,
      error: result.error,
    };

    this.executionHistory.push(record);

    // 限制历史记录大小
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory.shift();
    }
  }

  // ============================================================================
  // 辅助方法
  // ============================================================================

  /**
   * 构建完整上下文
   */
  private buildContext(
    partial: Partial<AgentContext>,
    triggerSource: AgentContext['triggerSource'],
    triggerId?: string
  ): AgentContext {
    return {
      userId: partial.userId || 'default',
      userMessage: partial.userMessage,
      userProfile: partial.userProfile || {
        nickname: '用户',
        wakeUpHour: 7,
        sleepHour: 23,
        preferredTopics: [],
        workSchedule: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      recentEmotions: partial.recentEmotions || [],
      currentPetStatus: partial.currentPetStatus || {
        nickname: '宠物',
        mood: 80,
        energy: 80,
        intimacy: 50,
        lastInteraction: Date.now(),
        lastFeed: null,
        lastPlay: null,
        totalInteractions: 0,
        coins: 0,
        experience: 0,
        createdAt: Date.now(),
      },
      timestamp: Date.now(),
      triggerSource,
      triggerId,
      metadata: partial.metadata,
    };
  }

  /**
   * 生成任务 ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================================================
  // 状态查询
  // ============================================================================

  /**
   * 获取调度器状态
   */
  getStatus(): AgentSystemStatus {
    return this.status;
  }

  /**
   * 获取任务队列
   */
  getTaskQueue(): AgentTask[] {
    return [...this.taskQueue];
  }

  /**
   * 获取活跃任务
   */
  getActiveTasks(): AgentTask[] {
    return Array.from(this.activeTasks.values());
  }

  /**
   * 获取执行历史
   */
  getExecutionHistory(limit?: number): AgentExecutionRecord[] {
    const history = [...this.executionHistory].reverse();
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    status: AgentSystemStatus;
    agentCount: number;
    queueSize: number;
    activeTasks: number;
    totalExecutions: number;
    successRate: number;
  } {
    const totalExecutions = this.executionHistory.length;
    const successCount = this.executionHistory.filter((r) => r.success).length;

    return {
      status: this.status,
      agentCount: this.agents.size,
      queueSize: this.taskQueue.length,
      activeTasks: this.activeTasks.size,
      totalExecutions,
      successRate: totalExecutions > 0 ? successCount / totalExecutions : 1,
    };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<DispatcherConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }
}

/**
 * 导出单例获取函数
 */
export const getAgentDispatcher = (
  config?: Partial<DispatcherConfig>
): AgentDispatcher => {
  return AgentDispatcher.getInstance(config);
};
