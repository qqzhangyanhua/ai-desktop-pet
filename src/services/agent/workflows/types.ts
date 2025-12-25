// Multi-Agent Workflow Types

import type { CoreMessage } from 'ai';

// Agent role identifiers
export type AgentRoleType =
  | 'supervisor'
  | 'researcher'
  | 'writer'
  | 'executor'
  | 'custom';

// Workflow execution status
export type WorkflowStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'completed'
  | 'error'
  | 'cancelled';

// Node status in the graph
export type NodeStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'error'
  | 'skipped';

// Agent message in workflow
export interface AgentMessage {
  id: string;
  from: string;
  to: string;
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

// Task assigned to agent
export interface AgentTask {
  id: string;
  description: string;
  assignedTo: string;
  dependsOn: string[];
  status: NodeStatus;
  result?: string;
  error?: string;
}

// Workflow state for LangGraph-style execution
export interface WorkflowState {
  // Current status
  status: WorkflowStatus;
  currentNode: string | null;

  // Original input
  input: string;

  // Messages history
  messages: AgentMessage[];

  // Tasks breakdown
  tasks: AgentTask[];

  // Intermediate results by agent
  results: Record<string, string>;

  // Final output
  output: string | null;

  // Error info
  error: string | null;

  // Iteration counter
  iteration: number;
  maxIterations: number;

  // Timestamps
  startTime: number | null;
  endTime: number | null;
}

// Node definition in workflow graph
export interface WorkflowNode {
  id: string;
  type: AgentRoleType;
  name: string;
  systemPrompt: string;
  tools: string[];

  // Node execution function
  execute: (state: WorkflowState) => Promise<Partial<WorkflowState>>;
}

// Edge definition for conditional routing
export interface WorkflowEdge {
  from: string;
  to: string | ((state: WorkflowState) => string);
  condition?: (state: WorkflowState) => boolean;
}

// Workflow graph definition
export interface WorkflowGraph {
  id: string;
  name: string;
  description: string;

  // Nodes (agents)
  nodes: Map<string, WorkflowNode>;

  // Edges (transitions)
  edges: WorkflowEdge[];

  // Entry point
  entryPoint: string;

  // End nodes
  endNodes: string[];
}

// Workflow execution event
export interface WorkflowEvent {
  type: 'node_start' | 'node_end' | 'message' | 'task_update' | 'status_change' | 'error';
  nodeId?: string;
  message?: AgentMessage;
  task?: AgentTask;
  status?: WorkflowStatus;
  error?: string;
  timestamp: number;
}

// Workflow execution options
export interface WorkflowOptions {
  maxIterations?: number;
  onEvent?: (event: WorkflowEvent) => void;
  signal?: AbortSignal;
}

// LLM messages adapter
export function workflowMessagesToCore(messages: AgentMessage[]): CoreMessage[] {
  return messages.map((m) => ({
    role: 'assistant' as const,
    content: `[${m.from}]: ${m.content}`,
  }));
}

// Create initial workflow state
export function createInitialState(input: string, maxIterations = 10): WorkflowState {
  return {
    status: 'idle',
    currentNode: null,
    input,
    messages: [],
    tasks: [],
    results: {},
    output: null,
    error: null,
    iteration: 0,
    maxIterations,
    startTime: null,
    endTime: null,
  };
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
