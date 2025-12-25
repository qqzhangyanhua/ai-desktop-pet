// Agent types

export interface ToolSchema {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

export interface Tool {
  name: string;
  description: string;
  schema: ToolSchema;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
  requiresConfirmation?: boolean;
}

export interface ToolCallEvent {
  type: 'tool_call';
  toolName: string;
  toolCallId: string;
  arguments: Record<string, unknown>;
}

export interface ToolResultEvent {
  type: 'tool_result';
  toolCallId: string;
  result: unknown;
  error?: string;
}

export interface TextEvent {
  type: 'text';
  content: string;
}

export interface StatusEvent {
  type: 'status';
  status: 'thinking' | 'executing' | 'done' | 'error';
  message?: string;
}

export type AgentEvent = ToolCallEvent | ToolResultEvent | TextEvent | StatusEvent;

export interface AgentRole {
  id: string;
  name: string;
  description: string | null;
  systemPrompt: string;
  tools: string[];
  createdAt: number;
}

export interface WorkflowStep {
  agentId: string;
  input?: string;
  dependsOn?: string[];
}

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  graphDefinition: {
    nodes: WorkflowStep[];
    edges: Array<{ from: string; to: string }>;
  };
  createdAt: number;
}

export type AgentStatus = 'idle' | 'thinking' | 'executing' | 'done' | 'error';

export interface AgentState {
  status: AgentStatus;
  currentAgent: string | null;
  toolResults: Record<string, unknown>;
  events: AgentEvent[];
}
