/**
 * 触发器管理器
 * Trigger Manager
 *
 * 统一管理智能体触发器：
 * - 定时触发器 (ScheduleTrigger)
 * - 事件触发器 (EventTrigger)
 * - 条件触发器 (ConditionTrigger)
 * - 用户消息触发器 (UserMessageTrigger)
 */

import type {
  AgentTrigger,
  TriggerType,
  ScheduleTriggerConfig,
  EventTriggerConfig,
  ConditionTriggerConfig,
  UserMessageTriggerConfig,
  AgentContext,
} from '@/types/agent-system';

/**
 * 触发器回调函数类型
 */
type TriggerCallback = (
  agentId: string,
  triggerId: string,
  context: Partial<AgentContext>
) => void;

/**
 * 已注册触发器信息
 */
interface RegisteredTrigger {
  /** 所属智能体 ID */
  agentId: string;
  /** 触发器定义 */
  trigger: AgentTrigger;
  /** 定时器 ID（用于定时触发器） */
  timerId?: ReturnType<typeof setInterval>;
  /** 上次触发时间 */
  lastTriggeredAt?: number;
  /** 触发次数 */
  triggerCount: number;
}

/**
 * 事件监听器信息
 */
interface EventListener {
  agentId: string;
  triggerId: string;
  eventName: string;
  filter?: Record<string, unknown>;
}

/**
 * 触发器管理器
 */
export class TriggerManager {
  /** 单例实例 */
  private static instance: TriggerManager | null = null;

  /** 已注册触发器 */
  private triggers: Map<string, RegisteredTrigger> = new Map();

  /** 事件监听器 */
  private eventListeners: Map<string, EventListener[]> = new Map();

  /** 条件检查定时器 */
  private conditionCheckTimers: Map<string, ReturnType<typeof setInterval>> =
    new Map();

  /** 触发回调 */
  private onTriggerCallback: TriggerCallback | null = null;

  /** 条件评估函数注册表 */
  private conditionEvaluators: Map<
    string,
    (context: Partial<AgentContext>) => Promise<boolean>
  > = new Map();

  /** 是否正在运行 */
  private running = false;

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): TriggerManager {
    if (!TriggerManager.instance) {
      TriggerManager.instance = new TriggerManager();
    }
    return TriggerManager.instance;
  }

  /**
   * 重置单例（用于测试）
   */
  static resetInstance(): void {
    if (TriggerManager.instance) {
      TriggerManager.instance.stop();
    }
    TriggerManager.instance = null;
  }

  // ============================================================================
  // 生命周期
  // ============================================================================

  /**
   * 启动触发器管理器
   */
  start(callback: TriggerCallback): void {
    if (this.running) {
      console.warn('[TriggerManager] 已在运行中');
      return;
    }

    this.onTriggerCallback = callback;
    this.running = true;

    // 启动所有已注册的触发器
    this.triggers.forEach((registered) => {
      if (registered.trigger.enabled) {
        this.activateTrigger(registered);
      }
    });

    console.info('[TriggerManager] 已启动');
  }

  /**
   * 停止触发器管理器
   */
  stop(): void {
    if (!this.running) {
      return;
    }

    // 清理所有定时器
    this.triggers.forEach((registered) => {
      this.deactivateTrigger(registered);
    });

    // 清理条件检查定时器
    this.conditionCheckTimers.forEach((timerId) => {
      clearInterval(timerId);
    });
    this.conditionCheckTimers.clear();

    this.onTriggerCallback = null;
    this.running = false;

    console.info('[TriggerManager] 已停止');
  }

  // ============================================================================
  // 触发器注册
  // ============================================================================

  /**
   * 注册触发器
   */
  registerTrigger(agentId: string, trigger: AgentTrigger): void {
    const key = this.getTriggerKey(agentId, trigger.id);

    if (this.triggers.has(key)) {
      console.warn(`[TriggerManager] 触发器已存在: ${key}`);
      return;
    }

    const registered: RegisteredTrigger = {
      agentId,
      trigger,
      triggerCount: 0,
    };

    this.triggers.set(key, registered);

    // 如果管理器正在运行且触发器已启用，则激活
    if (this.running && trigger.enabled) {
      this.activateTrigger(registered);
    }

    console.debug(`[TriggerManager] 注册触发器: ${key}`, {
      type: trigger.type,
    });
  }

  /**
   * 注销触发器
   */
  unregisterTrigger(agentId: string, triggerId: string): void {
    const key = this.getTriggerKey(agentId, triggerId);
    const registered = this.triggers.get(key);

    if (!registered) {
      return;
    }

    this.deactivateTrigger(registered);
    this.triggers.delete(key);

    console.debug(`[TriggerManager] 注销触发器: ${key}`);
  }

  /**
   * 注销智能体的所有触发器
   */
  unregisterAgentTriggers(agentId: string): void {
    const keysToRemove: string[] = [];

    this.triggers.forEach((registered, key) => {
      if (registered.agentId === agentId) {
        this.deactivateTrigger(registered);
        keysToRemove.push(key);
      }
    });

    keysToRemove.forEach((key) => this.triggers.delete(key));

    console.debug(
      `[TriggerManager] 注销智能体所有触发器: ${agentId}`,
      { count: keysToRemove.length }
    );
  }

  /**
   * 启用/禁用触发器
   */
  setTriggerEnabled(
    agentId: string,
    triggerId: string,
    enabled: boolean
  ): boolean {
    const key = this.getTriggerKey(agentId, triggerId);
    const registered = this.triggers.get(key);

    if (!registered) {
      return false;
    }

    registered.trigger.enabled = enabled;

    if (this.running) {
      if (enabled) {
        this.activateTrigger(registered);
      } else {
        this.deactivateTrigger(registered);
      }
    }

    return true;
  }

  // ============================================================================
  // 触发器激活/停用
  // ============================================================================

  /**
   * 激活触发器
   */
  private activateTrigger(registered: RegisteredTrigger): void {
    const { trigger, agentId } = registered;

    switch (trigger.type) {
      case 'schedule':
        this.activateScheduleTrigger(registered);
        break;
      case 'event':
        this.activateEventTrigger(registered);
        break;
      case 'condition':
        this.activateConditionTrigger(registered);
        break;
      case 'user_message':
        // 用户消息触发器不需要激活，在消息到来时匹配
        break;
    }

    console.debug(`[TriggerManager] 激活触发器: ${agentId}/${trigger.id}`);
  }

  /**
   * 停用触发器
   */
  private deactivateTrigger(registered: RegisteredTrigger): void {
    const { trigger, agentId } = registered;

    // 清理定时器
    if (registered.timerId) {
      clearInterval(registered.timerId);
      registered.timerId = undefined;
    }

    // 清理事件监听
    if (trigger.type === 'event') {
      this.removeEventListener(agentId, trigger.id);
    }

    // 清理条件检查定时器
    const conditionKey = this.getTriggerKey(agentId, trigger.id);
    const conditionTimer = this.conditionCheckTimers.get(conditionKey);
    if (conditionTimer) {
      clearInterval(conditionTimer);
      this.conditionCheckTimers.delete(conditionKey);
    }
  }

  /**
   * 激活定时触发器
   */
  private activateScheduleTrigger(registered: RegisteredTrigger): void {
    const config = registered.trigger.config as ScheduleTriggerConfig;

    if (config.intervalSeconds) {
      // 间隔触发
      registered.timerId = setInterval(() => {
        this.fireTrigger(registered);
      }, config.intervalSeconds * 1000);
    } else if (config.cron) {
      // Cron 表达式触发
      // TODO: 使用 cron 解析库实现
      console.warn('[TriggerManager] Cron 触发器暂未实现');
    }
  }

  /**
   * 激活事件触发器
   */
  private activateEventTrigger(registered: RegisteredTrigger): void {
    const config = registered.trigger.config as EventTriggerConfig;
    const { agentId, trigger } = registered;

    const listener: EventListener = {
      agentId,
      triggerId: trigger.id,
      eventName: config.eventName,
      filter: config.filter,
    };

    // 添加到事件监听器列表
    const listeners = this.eventListeners.get(config.eventName) || [];
    listeners.push(listener);
    this.eventListeners.set(config.eventName, listeners);
  }

  /**
   * 移除事件监听
   */
  private removeEventListener(agentId: string, triggerId: string): void {
    this.eventListeners.forEach((listeners, eventName) => {
      const filtered = listeners.filter(
        (l) => !(l.agentId === agentId && l.triggerId === triggerId)
      );
      if (filtered.length === 0) {
        this.eventListeners.delete(eventName);
      } else {
        this.eventListeners.set(eventName, filtered);
      }
    });
  }

  /**
   * 激活条件触发器
   */
  private activateConditionTrigger(registered: RegisteredTrigger): void {
    const config = registered.trigger.config as ConditionTriggerConfig;
    const key = this.getTriggerKey(registered.agentId, registered.trigger.id);

    const timer = setInterval(async () => {
      // 检查冷却
      if (config.cooldownMs && registered.lastTriggeredAt) {
        const elapsed = Date.now() - registered.lastTriggeredAt;
        if (elapsed < config.cooldownMs) {
          return;
        }
      }

      // 评估条件
      const evaluator = this.conditionEvaluators.get(config.expression);
      if (evaluator) {
        try {
          const shouldTrigger = await evaluator({});
          if (shouldTrigger) {
            this.fireTrigger(registered);
          }
        } catch (error) {
          console.error(
            `[TriggerManager] 条件评估失败: ${config.expression}`,
            error
          );
        }
      }
    }, config.checkIntervalMs);

    this.conditionCheckTimers.set(key, timer);
  }

  // ============================================================================
  // 触发器触发
  // ============================================================================

  /**
   * 触发触发器
   */
  private fireTrigger(
    registered: RegisteredTrigger,
    context?: Partial<AgentContext>
  ): void {
    if (!this.onTriggerCallback) {
      return;
    }

    registered.lastTriggeredAt = Date.now();
    registered.triggerCount++;

    this.onTriggerCallback(
      registered.agentId,
      registered.trigger.id,
      context || {}
    );
  }

  /**
   * 发送事件（触发事件触发器）
   */
  emitEvent(
    eventName: string,
    payload?: Record<string, unknown>
  ): void {
    const listeners = this.eventListeners.get(eventName);
    if (!listeners || listeners.length === 0) {
      return;
    }

    listeners.forEach((listener) => {
      // 应用过滤器
      if (listener.filter && payload) {
        const matches = Object.entries(listener.filter).every(
          ([key, value]) => payload[key] === value
        );
        if (!matches) {
          return;
        }
      }

      const key = this.getTriggerKey(listener.agentId, listener.triggerId);
      const registered = this.triggers.get(key);

      if (registered && registered.trigger.enabled) {
        this.fireTrigger(registered, { metadata: payload });
      }
    });
  }

  /**
   * 匹配用户消息触发器
   */
  matchUserMessageTriggers(message: string): Array<{
    agentId: string;
    triggerId: string;
    score: number;
  }> {
    const matches: Array<{
      agentId: string;
      triggerId: string;
      score: number;
    }> = [];

    this.triggers.forEach((registered) => {
      if (
        registered.trigger.type !== 'user_message' ||
        !registered.trigger.enabled
      ) {
        return;
      }

      const config = registered.trigger.config as UserMessageTriggerConfig;
      let score = 0;

      // 关键词匹配
      if (config.keywords && config.keywords.length > 0) {
        const matchedKeywords = config.keywords.filter((keyword) =>
          message.toLowerCase().includes(keyword.toLowerCase())
        );
        score = matchedKeywords.length / config.keywords.length;
      }

      // 默认处理器
      if (config.isDefault && score === 0) {
        score = 0.1; // 低优先级
      }

      if (score > 0) {
        matches.push({
          agentId: registered.agentId,
          triggerId: registered.trigger.id,
          score,
        });
      }
    });

    // 按分数排序
    return matches.sort((a, b) => b.score - a.score);
  }

  // ============================================================================
  // 条件评估器注册
  // ============================================================================

  /**
   * 注册条件评估器
   */
  registerConditionEvaluator(
    expression: string,
    evaluator: (context: Partial<AgentContext>) => Promise<boolean>
  ): void {
    this.conditionEvaluators.set(expression, evaluator);
  }

  /**
   * 注销条件评估器
   */
  unregisterConditionEvaluator(expression: string): void {
    this.conditionEvaluators.delete(expression);
  }

  // ============================================================================
  // 工具方法
  // ============================================================================

  /**
   * 生成触发器唯一键
   */
  private getTriggerKey(agentId: string, triggerId: string): string {
    return `${agentId}:${triggerId}`;
  }

  /**
   * 获取触发器统计
   */
  getStats(): {
    totalTriggers: number;
    activeTriggers: number;
    byType: Record<TriggerType, number>;
  } {
    let activeTriggers = 0;
    const byType: Record<TriggerType, number> = {
      schedule: 0,
      event: 0,
      condition: 0,
      user_message: 0,
    };

    this.triggers.forEach((registered) => {
      if (registered.trigger.enabled) {
        activeTriggers++;
      }
      byType[registered.trigger.type]++;
    });

    return {
      totalTriggers: this.triggers.size,
      activeTriggers,
      byType,
    };
  }

  /**
   * 获取触发器列表
   */
  getTriggers(agentId?: string): RegisteredTrigger[] {
    const result: RegisteredTrigger[] = [];

    this.triggers.forEach((registered) => {
      if (!agentId || registered.agentId === agentId) {
        result.push(registered);
      }
    });

    return result;
  }
}

/**
 * 导出单例获取函数
 */
export const getTriggerManager = (): TriggerManager => {
  return TriggerManager.getInstance();
};
