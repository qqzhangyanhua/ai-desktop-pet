/**
 * Agent 服务统一导出
 * 包含旧的 AI Agent Runtime 和新的智能体系统
 */

// 旧的 AI Agent Runtime（用于 LLM 工具调用）
export { AgentRuntime } from './runtime';
export type { AgentRuntimeConfig, AgentRunResult } from './runtime';
export { createBuiltInTools } from './tools';
export { BaseTool } from './base-tool';

// 新的智能体系统
// 核心组件
export { BaseAgent, DEFAULT_AGENT_CONFIG } from './agents/base-agent';
export { AgentDispatcher, getAgentDispatcher } from './dispatcher/agent-dispatcher';
export { TriggerManager, getTriggerManager } from './dispatcher/trigger-manager';

// 智能体实例
export * from './agents';

// 工具
export * from './tools';

// 工具函数
export * from './utils';

// 集成接口
export * from './integration';
