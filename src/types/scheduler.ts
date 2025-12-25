// Task Scheduler Type Definitions

/**
 * Task trigger configuration - defines when a task should run
 */
export interface Trigger {
  type: 'cron' | 'interval' | 'event' | 'manual';
  config: TriggerConfig;
}

export type TriggerConfig =
  | CronTriggerConfig
  | IntervalTriggerConfig
  | EventTriggerConfig
  | ManualTriggerConfig;

export interface CronTriggerConfig {
  type: 'cron';
  expression: string; // e.g., "0 9 * * *" = every day at 9am
}

export interface IntervalTriggerConfig {
  type: 'interval';
  seconds: number; // Run every N seconds
}

export interface EventTriggerConfig {
  type: 'event';
  eventName: string; // Event to listen for
  filter?: Record<string, unknown>; // Optional filter for event data
}

export interface ManualTriggerConfig {
  type: 'manual'; // Only triggered manually by user
}

/**
 * Task action configuration - defines what to do when triggered
 */
export interface Action {
  type: 'agent_task' | 'notification' | 'workflow' | 'script';
  config: ActionConfig;
}

export type ActionConfig =
  | AgentTaskActionConfig
  | NotificationActionConfig
  | WorkflowActionConfig
  | ScriptActionConfig;

export interface AgentTaskActionConfig {
  type: 'agent_task';
  prompt: string;
  toolsAllowed?: string[]; // Optional: restrict which tools agent can use
  maxSteps?: number; // Optional: limit agent steps
}

export interface NotificationActionConfig {
  type: 'notification';
  title: string;
  body: string;
  actionButton?: string; // Optional button text
  actionCallback?: string; // Optional callback event name
}

export interface WorkflowActionConfig {
  type: 'workflow';
  workflowId: string;
  input?: Record<string, unknown>;
}

export interface ScriptActionConfig {
  type: 'script';
  code: string; // JavaScript code to execute (future feature)
}

/**
 * Task definition
 */
export interface Task {
  id: string;
  name: string;
  description?: string;
  trigger: Trigger;
  action: Action;
  enabled: boolean;
  lastRun?: number; // Unix timestamp
  nextRun?: number; // Unix timestamp
  metadata?: Record<string, unknown>; // User-defined data
  createdAt: number;
  updatedAt?: number;
}

/**
 * Task execution record
 */
export interface TaskExecution {
  id: string;
  taskId: string;
  status: 'running' | 'success' | 'failed' | 'cancelled';
  startedAt: number;
  completedAt?: number;
  result?: string; // JSON string of execution result
  error?: string;
  duration?: number; // Execution time in milliseconds
}

/**
 * Task statistics
 */
export interface TaskStats {
  taskId: string;
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  lastExecutionStatus?: TaskExecution['status'];
  averageDuration?: number;
}

/**
 * Scheduler state
 */
export interface SchedulerState {
  isRunning: boolean;
  tasks: Task[];
  executions: TaskExecution[];
  stats: Map<string, TaskStats>;
}

/**
 * Create task input (without generated fields)
 */
export type CreateTaskInput = Omit<Task, 'id' | 'lastRun' | 'nextRun' | 'createdAt' | 'updatedAt'>;

/**
 * Update task input (partial update)
 */
export type UpdateTaskInput = Partial<Omit<Task, 'id' | 'createdAt'>>;
