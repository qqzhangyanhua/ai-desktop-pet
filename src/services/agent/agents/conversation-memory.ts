// @ts-nocheck
/**
 * 对话记忆智能体
 * Conversation Memory Agent
 *
 * 实现跨会话记忆与用户画像：
 * - 信息提取
 * - 用户画像更新
 * - 记忆检索
 * - 隐私保护
 */

import { BaseAgent } from './base-agent';
import type {
  AgentMetadata,
  AgentContext,
  AgentResult,
  AgentTrigger,
  MemoryPayload,
} from '@/types/agent-system';
import { memoryTool } from '../tools/memory-tool';

/**
 * 对话记忆智能体元数据
 */
const CONVERSATION_MEMORY_METADATA: AgentMetadata = {
  id: 'agent-conversation-memory',
  name: '对话记忆智能体',
  description: '让宠物"记住"用户，越用越懂你',
  version: '1.0.0',
  icon: '🧠',
  category: 'utility',
  priority: 'high',
  isSystem: true,
};

/**
 * 默认触发器
 */
const DEFAULT_TRIGGERS: AgentTrigger[] = [
  {
    id: 'trigger-after-conversation',
    type: 'user_message',
    config: {
      keywords: [
        '喜欢',
        '不喜欢',
        '最爱',
        '讨厌',
        '生日',
        '纪念日',
        '习惯',
        '每天',
        '每周',
        '总是',
      ],
    },
    enabled: true,
    description: '检测到可能包含偏好信息的对话',
  },
];

/**
 * 偏好提取模式
 */
const PREFERENCE_PATTERNS = [
  { pattern: /我喜欢(.+)/g, type: 'preference' as const, positive: true },
  { pattern: /我爱(.+)/g, type: 'preference' as const, positive: true },
  { pattern: /我最爱(.+)/g, type: 'preference' as const, positive: true },
  { pattern: /我不喜欢(.+)/g, type: 'preference' as const, positive: false },
  { pattern: /我讨厌(.+)/g, type: 'preference' as const, positive: false },
  { pattern: /我的生日是(.+)/g, type: 'event' as const },
  { pattern: /(.+)是我的生日/g, type: 'event' as const },
  { pattern: /我每天(.+)/g, type: 'habit' as const },
  { pattern: /我总是(.+)/g, type: 'habit' as const },
  { pattern: /我习惯(.+)/g, type: 'habit' as const },
];

/**
 * 敏感词过滤
 */
const SENSITIVE_KEYWORDS = [
  '密码',
  '银行卡',
  '身份证',
  '手机号',
  '账号',
  '地址',
  '住址',
];

/**
 * 对话记忆智能体
 */
export class ConversationMemoryAgent extends BaseAgent {
  readonly metadata = CONVERSATION_MEMORY_METADATA;

  /** 本次会话提取的记忆数量 */
  private extractedCount: number = 0;

  constructor() {
    super({
      enabled: true,
      tools: ['memory_save', 'memory_search', 'memory_stats'],
      maxSteps: 5,
      timeoutMs: 15000,
    });

    this.triggers = [...DEFAULT_TRIGGERS];
  }

  /**
   * 初始化钩子
   */
  protected async onInitialize(): Promise<void> {
    this.registerBuiltinTools();
  }

  /**
   * 注册内置工具
   */
  protected registerBuiltinTools(): void {
    // 保存记忆工具
    this.registerTool('memory_save', async (args) => {
      return memoryTool.save(args as MemoryPayload);
    });

    // 搜索记忆工具
    this.registerTool('memory_search', async (args) => {
      return memoryTool.search({
        category: args.category as MemoryPayload['type'] | undefined,
        keyword: args.keyword as string | undefined,
        minImportance: args.minImportance as number | undefined,
        limit: args.limit as number | undefined,
      });
    });

    // 记忆统计工具
    this.registerTool('memory_stats', async () => {
      return memoryTool.getStats();
    });
  }

  /**
   * 检查是否应该触发
   */
  async shouldTrigger(context: AgentContext): Promise<boolean> {
    if (!context.userMessage) {
      return false;
    }

    // 检查是否包含可提取的信息
    return this.hasExtractableInfo(context.userMessage);
  }

  /**
   * 执行记忆提取
   */
  protected async onExecute(context: AgentContext): Promise<AgentResult> {
    const { userMessage } = context;

    if (!userMessage) {
      return this.createResult(false, '没有用户消息');
    }

    this.log('info', '开始记忆提取', { messageLength: userMessage.length });

    // 1. 检查敏感信息
    if (this.containsSensitiveInfo(userMessage)) {
      this.log('warn', '检测到敏感信息，跳过记录');
      return this.createResult(true, undefined, undefined, {
        data: { skipped: true, reason: 'sensitive_info' },
      });
    }

    // 2. 提取记忆
    const extractedMemories = this.extractMemories(userMessage);

    if (extractedMemories.length === 0) {
      return this.createResult(true, undefined, undefined, {
        data: { extractedCount: 0 },
      });
    }

    this.log('info', `提取到 ${extractedMemories.length} 条记忆`);

    // 3. 保存记忆
    const savedMemories: string[] = [];

    for (const memory of extractedMemories) {
      const result = await this.callTool('memory_save', memory);
      if (result.success) {
        savedMemories.push(memory.content);
        this.extractedCount++;
      }
    }

    // 4. 生成反馈消息
    let message: string | undefined;

    if (savedMemories.length > 0) {
      const sample = savedMemories[0];
      if (sample.length > 20) {
        message = `我记住了: ${sample.substring(0, 20)}...`;
      } else {
        message = `我记住了: ${sample}`;
      }
    }

    return this.createResult(true, message, undefined, {
      data: {
        extractedCount: savedMemories.length,
        memories: savedMemories,
      },
    });
  }

  /**
   * 检查是否包含可提取信息
   */
  private hasExtractableInfo(text: string): boolean {
    return PREFERENCE_PATTERNS.some((p) => p.pattern.test(text));
  }

  /**
   * 检查是否包含敏感信息
   */
  private containsSensitiveInfo(text: string): boolean {
    const lowerText = text.toLowerCase();
    return SENSITIVE_KEYWORDS.some((keyword) => lowerText.includes(keyword));
  }

  /**
   * 提取记忆
   */
  private extractMemories(text: string): MemoryPayload[] {
    const memories: MemoryPayload[] = [];

    for (const pattern of PREFERENCE_PATTERNS) {
      // 重置正则表达式
      pattern.pattern.lastIndex = 0;

      let match;
      while ((match = pattern.pattern.exec(text)) !== null) {
        const content = match[1].trim();

        // 过滤太短或太长的内容
        if (content.length < 2 || content.length > 100) {
          continue;
        }

        // 构建记忆
        const memory: MemoryPayload = {
          type: pattern.type,
          content: this.formatMemoryContent(pattern, content),
          importance: this.calculateImportance(pattern.type, content),
        };

        // 检查重复
        if (!memories.some((m) => m.content === memory.content)) {
          memories.push(memory);
        }
      }
    }

    return memories;
  }

  /**
   * 格式化记忆内容
   */
  private formatMemoryContent(
    pattern: (typeof PREFERENCE_PATTERNS)[0],
    content: string
  ): string {
    if (pattern.type === 'preference') {
      return pattern.positive ? `喜欢${content}` : `不喜欢${content}`;
    }

    if (pattern.type === 'event') {
      return `生日: ${content}`;
    }

    if (pattern.type === 'habit') {
      return `习惯: ${content}`;
    }

    return content;
  }

  /**
   * 计算重要度
   */
  private calculateImportance(
    type: MemoryPayload['type'],
    content: string
  ): number {
    // 事件类型最重要
    if (type === 'event') {
      return 9;
    }

    // 偏好次之
    if (type === 'preference') {
      return 7;
    }

    // 习惯
    if (type === 'habit') {
      return 6;
    }

    // 默认
    return 5;
  }

  /**
   * 搜索相关记忆
   */
  async searchRelatedMemories(keyword: string, limit: number = 5) {
    const result = await this.callTool('memory_search', {
      keyword,
      limit,
    });

    return result.data || [];
  }

  /**
   * 获取用户偏好
   */
  async getUserPreferences() {
    const result = await this.callTool('memory_search', {
      category: 'preference',
      limit: 20,
    });

    return result.data || [];
  }

  /**
   * 获取记忆统计
   */
  async getMemoryStats() {
    const result = await this.callTool('memory_stats', {});
    return result.data;
  }

  /**
   * 获取本次会话提取数量
   */
  getExtractedCount(): number {
    return this.extractedCount;
  }

  /**
   * 重置会话计数
   */
  resetSessionCount(): void {
    this.extractedCount = 0;
  }
}
