/**
 * 智能体基类
 * Base Agent Abstract Class
 *
 * 所有智能体的抽象基类，提供通用能力：
 * - 生命周期管理
 * - 工具调用
 * - 日志记录
 * - 错误处理
 * - 超时控制
 */

import type {
  IAgent,
  AgentMetadata,
  AgentConfig,
  AgentTrigger,
  AgentContext,
  AgentResult,
  AgentToolResult,
  AgentAction,
  EmotionType,
} from '@/types/agent-system';

/**
 * 默认智能体配置
 */
export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  enabled: true,
  tools: [],
  maxSteps: 5,
  timeoutMs: 30000,
  settings: {},
};

/**
 * 智能体日志级别
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * 智能体日志条目
 */
interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

/**
 * 智能体抽象基类
 */
export abstract class BaseAgent implements IAgent {
  /** 元数据 */
  abstract readonly metadata: AgentMetadata;

  /** 配置 */
  config: AgentConfig;

  /** 触发器列表 */
  triggers: AgentTrigger[] = [];

  /** 是否已初始化 */
  protected initialized = false;

  /** 日志缓存 */
  protected logs: LogEntry[] = [];

  /** 最大日志条数 */
  protected maxLogEntries = 100;

  /** 工具注册表 */
  protected toolRegistry: Map<
    string,
    (args: Record<string, unknown>) => Promise<AgentToolResult>
  > = new Map();

  constructor(config?: Partial<AgentConfig>) {
    this.config = {
      ...DEFAULT_AGENT_CONFIG,
      ...config,
    };
  }

  // ============================================================================
  // 生命周期方法
  // ============================================================================

  /**
   * 初始化智能体
   * 子类可重写以添加自定义初始化逻辑
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      this.log('warn', '智能体已初始化，跳过重复初始化');
      return;
    }

    this.log('info', `初始化智能体: ${this.metadata.name}`);

    // 注册内置工具
    this.registerBuiltinTools();

    // 子类自定义初始化
    await this.onInitialize();

    this.initialized = true;
    this.log('info', `智能体初始化完成: ${this.metadata.name}`);
  }

  /**
   * 子类自定义初始化钩子
   */
  protected async onInitialize(): Promise<void> {
    // 默认为空，子类可重写
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    this.log('info', `清理智能体资源: ${this.metadata.name}`);

    // 子类自定义清理
    await this.onCleanup();

    this.toolRegistry.clear();
    this.logs = [];
    this.initialized = false;
  }

  /**
   * 子类自定义清理钩子
   */
  protected async onCleanup(): Promise<void> {
    // 默认为空，子类可重写
  }

  // ============================================================================
  // 触发与执行
  // ============================================================================

  /**
   * 检查是否应该触发
   * 默认实现：始终返回 true
   * 子类可重写以实现条件触发
   */
  async shouldTrigger(_context: AgentContext): Promise<boolean> {
    return true;
  }

  /**
   * 执行智能体
   * 带超时控制的执行包装
   */
  async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();

    this.log('info', `开始执行智能体: ${this.metadata.name}`, {
      triggerSource: context.triggerSource,
      triggerId: context.triggerId,
    });

    try {
      // 检查是否已初始化
      if (!this.initialized) {
        await this.initialize();
      }

      // 检查是否启用
      if (!this.config.enabled) {
        return this.createResult(false, '智能体已禁用');
      }

      // 带超时的执行
      const result = await this.executeWithTimeout(
        () => this.onExecute(context),
        this.config.timeoutMs
      );

      const duration = Date.now() - startTime;
      this.log('info', `智能体执行完成: ${this.metadata.name}`, {
        success: result.success,
        duration,
      });

      return {
        ...result,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.log('error', `智能体执行失败: ${this.metadata.name}`, {
        error: errorMessage,
        duration,
      });

      return this.createResult(false, undefined, errorMessage);
    }
  }

  /**
   * 子类必须实现的执行逻辑
   */
  protected abstract onExecute(context: AgentContext): Promise<AgentResult>;

  // ============================================================================
  // 工具调用
  // ============================================================================

  /**
   * 注册内置工具
   */
  protected registerBuiltinTools(): void {
    // 默认不注册任何工具，子类可重写
  }

  /**
   * 注册工具
   */
  protected registerTool(
    name: string,
    handler: (args: Record<string, unknown>) => Promise<AgentToolResult>
  ): void {
    if (this.toolRegistry.has(name)) {
      this.log('warn', `工具已存在，将被覆盖: ${name}`);
    }
    this.toolRegistry.set(name, handler);
    this.log('debug', `注册工具: ${name}`);
  }

  /**
   * 调用工具
   */
  protected async callTool<T = unknown>(
    name: string,
    args: Record<string, unknown> = {}
  ): Promise<AgentToolResult<T>> {
    const handler = this.toolRegistry.get(name);

    if (!handler) {
      this.log('error', `工具不存在: ${name}`);
      return {
        success: false,
        error: `工具不存在: ${name}`,
      };
    }

    // 检查工具权限
    if (
      this.config.tools.length > 0 &&
      !this.config.tools.includes(name)
    ) {
      this.log('error', `智能体无权调用工具: ${name}`);
      return {
        success: false,
        error: `智能体无权调用工具: ${name}`,
      };
    }

    this.log('debug', `调用工具: ${name}`, { args });

    try {
      const result = await handler(args);
      this.log('debug', `工具调用完成: ${name}`, { success: result.success });
      return result as AgentToolResult<T>;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.log('error', `工具调用失败: ${name}`, { error: errorMessage });
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // ============================================================================
  // 辅助方法
  // ============================================================================

  /**
   * 创建执行结果
   */
  protected createResult(
    success: boolean,
    message?: string,
    error?: string,
    options?: {
      shouldSpeak?: boolean;
      emotion?: EmotionType;
      animation?: string;
      actions?: AgentAction[];
      data?: Record<string, unknown>;
    }
  ): AgentResult {
    return {
      success,
      message,
      error,
      ...options,
    };
  }

  /**
   * 带超时的执行
   */
  protected async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`执行超时 (${timeoutMs}ms)`));
      }, timeoutMs);

      fn()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * 日志记录
   */
  protected log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>
  ): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      data,
    };

    this.logs.push(entry);

    // 限制日志条数
    if (this.logs.length > this.maxLogEntries) {
      this.logs.shift();
    }

    // 同时输出到控制台
    const prefix = `[${this.metadata?.id || 'Agent'}]`;
    switch (level) {
      case 'debug':
        console.debug(prefix, message, data || '');
        break;
      case 'info':
        console.info(prefix, message, data || '');
        break;
      case 'warn':
        console.warn(prefix, message, data || '');
        break;
      case 'error':
        console.error(prefix, message, data || '');
        break;
    }
  }

  /**
   * 获取日志
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * 清空日志
   */
  clearLogs(): void {
    this.logs = [];
  }

  // ============================================================================
  // 配置管理
  // ============================================================================

  /**
   * 更新配置
   */
  updateConfig(config: Partial<AgentConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
    this.log('info', '配置已更新', { config: this.config });
  }

  /**
   * 获取设置值
   */
  protected getSetting<T>(key: string, defaultValue: T): T {
    const value = this.config.settings?.[key];
    return value !== undefined ? (value as T) : defaultValue;
  }

  /**
   * 设置设置值
   */
  protected setSetting<T>(key: string, value: T): void {
    if (!this.config.settings) {
      this.config.settings = {};
    }
    this.config.settings[key] = value;
  }

  // ============================================================================
  // 触发器管理
  // ============================================================================

  /**
   * 添加触发器
   */
  addTrigger(trigger: AgentTrigger): void {
    // 检查重复
    const exists = this.triggers.some((t) => t.id === trigger.id);
    if (exists) {
      this.log('warn', `触发器已存在: ${trigger.id}`);
      return;
    }

    this.triggers.push(trigger);
    this.log('info', `添加触发器: ${trigger.id}`, { type: trigger.type });
  }

  /**
   * 移除触发器
   */
  removeTrigger(triggerId: string): boolean {
    const index = this.triggers.findIndex((t) => t.id === triggerId);
    if (index === -1) {
      return false;
    }

    this.triggers.splice(index, 1);
    this.log('info', `移除触发器: ${triggerId}`);
    return true;
  }

  /**
   * 启用/禁用触发器
   */
  setTriggerEnabled(triggerId: string, enabled: boolean): boolean {
    const trigger = this.triggers.find((t) => t.id === triggerId);
    if (!trigger) {
      return false;
    }

    trigger.enabled = enabled;
    this.log('info', `触发器 ${enabled ? '启用' : '禁用'}: ${triggerId}`);
    return true;
  }
}
