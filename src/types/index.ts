// Re-export all types

export * from './pet';
export * from './pet-status';
export * from './pet-care';
export * from './growth-stage';
export * from './statistics';
export * from './chat';
export * from './agent';
export * from './mcp';
export * from './config';
export * from './live2d';
export * from './voice';
export * from './scheduler';
export * from './toast';
export * from './assistant';
export * from './economy';
export * from './keyboard';
export * from './system';
export * from './memory';
export * from './proactive';
export * from './message-ui';
export * from './menu';
export * from './bubble';
export * from './feedback';
export * from './food';
export * from './relaxation';
export * from './bookmark';// Agent system types - 使用命名导出避免冲突
export type {
  AgentMetadata,
  AgentConfig,
  AgentTrigger,
  AgentContext,
  AgentResult,
  AgentAction,
  AgentToolResult,
  AgentExecutionRecord,
  AgentTask,
  RegisteredAgent,
  IAgent,
  DispatcherConfig,
  AgentSystemStatus,
  MemoryPayload,
  EmotionRecord as AgentEmotionRecord,
  EmotionTrend,
  SchedulePayload,
} from './agent-system';