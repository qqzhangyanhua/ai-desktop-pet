// Scheduler Manager - Frontend service for task scheduling

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type {
  Task,
  TaskExecution,
  CreateTaskInput,
  UpdateTaskInput,
} from '@/types/scheduler';

/**
 * Scheduler Manager
 * Manages task scheduling and execution
 */
export class SchedulerManager {
  private static instance: SchedulerManager;
  private unlistenFns: UnlistenFn[] = [];
  private eventHandlers = new Map<string, Set<(...args: unknown[]) => void>>();
  private initialized = false;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): SchedulerManager {
    if (!this.instance) {
      this.instance = new SchedulerManager();
    }
    return this.instance;
  }

  /**
   * Initialize event listeners
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    // Listen for task started events
    const unlistenStarted = await listen<string>('task_started', (event) => {
      this.emit('started', event.payload);
    });
    this.unlistenFns.push(unlistenStarted);

    // Listen for task completed events
    const unlistenCompleted = await listen<string>('task_completed', (event) => {
      this.emit('completed', event.payload);
    });
    this.unlistenFns.push(unlistenCompleted);

    // Listen for task failed events
    const unlistenFailed = await listen<{ id: string; error: string }>(
      'task_failed',
      (event) => {
        this.emit('failed', event.payload);
      }
    );
    this.unlistenFns.push(unlistenFailed);

    // Listen for notification actions
    const unlistenNotification = await listen<{
      title: string;
      body: string;
      actionButton?: string;
    }>('task_notification', (event) => {
      this.emit('notification', event.payload);
    });
    this.unlistenFns.push(unlistenNotification);

    // Listen for agent task actions
    const unlistenAgent = await listen<{
      prompt: string;
      toolsAllowed?: string[];
      maxSteps?: number;
    }>('task_agent_execute', (event) => {
      this.emit('agent_execute', event.payload);
    });
    this.unlistenFns.push(unlistenAgent);

    // Listen for workflow actions
    const unlistenWorkflow = await listen<{
      workflowId: string;
      input?: Record<string, unknown>;
    }>('task_workflow_execute', (event) => {
      this.emit('workflow_execute', event.payload);
    });
    this.unlistenFns.push(unlistenWorkflow);

    this.initialized = true;
    console.log('[SchedulerManager] Initialized');
  }

  /**
   * Cleanup event listeners
   */
  async cleanup(): Promise<void> {
    for (const unlisten of this.unlistenFns) {
      unlisten();
    }
    this.unlistenFns = [];
    this.eventHandlers.clear();
    this.initialized = false;
    console.log('[SchedulerManager] Cleaned up');
  }

  /**
   * Create a new task
   */
  async createTask(input: CreateTaskInput): Promise<string> {
    return await invoke<string>('scheduler_create_task', {
      name: input.name,
      description: input.description,
      triggerType: input.trigger.type,
      triggerConfig: JSON.stringify(input.trigger.config),
      actionType: input.action.type,
      actionConfig: JSON.stringify(input.action.config),
      enabled: input.enabled,
      metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
    });
  }

  /**
   * Get task by ID
   */
  async getTask(id: string): Promise<Task> {
    const task = await invoke<Task>('scheduler_get_task', { id });
    return this.parseTask(task);
  }

  /**
   * Get all tasks
   */
  async getAllTasks(): Promise<Task[]> {
    const tasks = await invoke<Task[]>('scheduler_get_all_tasks');
    return tasks.map(t => this.parseTask(t));
  }

  /**
   * Update task
   */
  async updateTask(id: string, updates: UpdateTaskInput): Promise<void> {
    await invoke('scheduler_update_task', {
      id,
      name: updates.name,
      description: updates.description,
      triggerType: updates.trigger?.type,
      triggerConfig: updates.trigger
        ? JSON.stringify(updates.trigger.config)
        : undefined,
      actionType: updates.action?.type,
      actionConfig: updates.action
        ? JSON.stringify(updates.action.config)
        : undefined,
      enabled: updates.enabled,
      metadata: updates.metadata ? JSON.stringify(updates.metadata) : undefined,
    });
  }

  /**
   * Delete task
   */
  async deleteTask(id: string): Promise<void> {
    await invoke('scheduler_delete_task', { id });
  }

  /**
   * Enable/disable task
   */
  async enableTask(id: string, enabled: boolean): Promise<void> {
    await invoke('scheduler_enable_task', { id, enabled });
  }

  /**
   * Execute task immediately
   */
  async executeNow(id: string): Promise<void> {
    await invoke('scheduler_execute_now', { id });
  }

  /**
   * Get task execution history
   */
  async getExecutions(taskId: string, limit = 50): Promise<TaskExecution[]> {
    return await invoke<TaskExecution[]>('scheduler_get_executions', {
      taskId,
      limit,
    });
  }

  /**
   * Register event handler
   */
  on(event: string, handler: (...args: unknown[]) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * Unregister event handler
   */
  off(event: string, handler: (...args: unknown[]) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emit event to handlers
   */
  private emit(event: string, ...args: unknown[]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`[SchedulerManager] Error in ${event} handler:`, error);
        }
      });
    }
  }

  /**
   * Parse task from backend (handle JSON fields)
   */
  private parseTask(task: Task): Task {
    return {
      ...task,
      trigger: {
        type: task.trigger.type,
        config:
          typeof task.trigger.config === 'string'
            ? JSON.parse(task.trigger.config)
            : task.trigger.config,
      },
      action: {
        type: task.action.type,
        config:
          typeof task.action.config === 'string'
            ? JSON.parse(task.action.config)
            : task.action.config,
      },
      metadata:
        typeof task.metadata === 'string'
          ? JSON.parse(task.metadata)
          : task.metadata,
    };
  }
}

/**
 * Get singleton instance
 */
export function getSchedulerManager(): SchedulerManager {
  return SchedulerManager.getInstance();
}
