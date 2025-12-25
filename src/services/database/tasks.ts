// Task database operations

import { getDatabase } from './index';
import type { Task, TaskExecution, CreateTaskInput, UpdateTaskInput } from '@/types/scheduler';

/**
 * Create a new task
 */
export async function createTask(input: CreateTaskInput): Promise<string> {
  const db = await getDatabase();
  const id = crypto.randomUUID();
  const now = Date.now();

  await db.execute(
    `INSERT INTO tasks (
      id, name, description, trigger_type, trigger_config,
      action_type, action_config, enabled, metadata, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name,
      input.description || null,
      input.trigger.type,
      JSON.stringify(input.trigger.config),
      input.action.type,
      JSON.stringify(input.action.config),
      input.enabled ? 1 : 0,
      input.metadata ? JSON.stringify(input.metadata) : null,
      now,
    ]
  );

  return id;
}

/**
 * Get task by ID
 */
export async function getTask(id: string): Promise<Task | null> {
  const db = await getDatabase();
  const rows = await db.select<Array<{
    id: string;
    name: string;
    description: string | null;
    trigger_type: string;
    trigger_config: string;
    action_type: string;
    action_config: string;
    enabled: number;
    last_run: number | null;
    next_run: number | null;
    metadata: string | null;
    created_at: number;
    updated_at: number | null;
  }>>(
    'SELECT * FROM tasks WHERE id = ?',
    [id]
  );

  if (rows.length === 0) return null;

  return mapTaskFromDb(rows[0]!);
}

/**
 * Get all tasks
 */
export async function getAllTasks(): Promise<Task[]> {
  const db = await getDatabase();
  const rows = await db.select<Array<{
    id: string;
    name: string;
    description: string | null;
    trigger_type: string;
    trigger_config: string;
    action_type: string;
    action_config: string;
    enabled: number;
    last_run: number | null;
    next_run: number | null;
    metadata: string | null;
    created_at: number;
    updated_at: number | null;
  }>>('SELECT * FROM tasks ORDER BY created_at DESC');

  return rows.map(mapTaskFromDb);
}

/**
 * Get enabled tasks that are due to run
 */
export async function getDueTasks(now: number): Promise<Task[]> {
  const db = await getDatabase();
  const rows = await db.select<Array<{
    id: string;
    name: string;
    description: string | null;
    trigger_type: string;
    trigger_config: string;
    action_type: string;
    action_config: string;
    enabled: number;
    last_run: number | null;
    next_run: number | null;
    metadata: string | null;
    created_at: number;
    updated_at: number | null;
  }>>(
    'SELECT * FROM tasks WHERE enabled = 1 AND next_run IS NOT NULL AND next_run <= ? ORDER BY next_run',
    [now]
  );

  return rows.map(mapTaskFromDb);
}

/**
 * Update task
 */
export async function updateTask(id: string, updates: UpdateTaskInput): Promise<void> {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }
  if (updates.trigger !== undefined) {
    fields.push('trigger_type = ?', 'trigger_config = ?');
    values.push(updates.trigger.type, JSON.stringify(updates.trigger.config));
  }
  if (updates.action !== undefined) {
    fields.push('action_type = ?', 'action_config = ?');
    values.push(updates.action.type, JSON.stringify(updates.action.config));
  }
  if (updates.enabled !== undefined) {
    fields.push('enabled = ?');
    values.push(updates.enabled ? 1 : 0);
  }
  if (updates.lastRun !== undefined) {
    fields.push('last_run = ?');
    values.push(updates.lastRun);
  }
  if (updates.nextRun !== undefined) {
    fields.push('next_run = ?');
    values.push(updates.nextRun);
  }
  if (updates.metadata !== undefined) {
    fields.push('metadata = ?');
    values.push(JSON.stringify(updates.metadata));
  }

  if (fields.length === 0) return;

  fields.push('updated_at = ?');
  values.push(Date.now());
  values.push(id);

  await db.execute(
    `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

/**
 * Delete task
 */
export async function deleteTask(id: string): Promise<void> {
  const db = await getDatabase();
  await db.execute('DELETE FROM tasks WHERE id = ?', [id]);
}

/**
 * Create task execution record
 */
export async function createTaskExecution(taskId: string): Promise<string> {
  const db = await getDatabase();
  const id = crypto.randomUUID();

  await db.execute(
    'INSERT INTO task_executions (id, task_id, status, started_at) VALUES (?, ?, ?, ?)',
    [id, taskId, 'running', Date.now()]
  );

  return id;
}

/**
 * Update task execution
 */
export async function updateTaskExecution(
  id: string,
  status: TaskExecution['status'],
  result?: string,
  error?: string
): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();

  // Get started_at to calculate duration
  const rows = await db.select<Array<{ started_at: number }>>(
    'SELECT started_at FROM task_executions WHERE id = ?',
    [id]
  );

  const duration = rows.length > 0 && rows[0] ? now - rows[0].started_at : undefined;

  await db.execute(
    'UPDATE task_executions SET status = ?, completed_at = ?, result = ?, error = ?, duration = ? WHERE id = ?',
    [status, now, result || null, error || null, duration || null, id]
  );
}

/**
 * Get task execution history
 */
export async function getTaskExecutions(taskId: string, limit = 50): Promise<TaskExecution[]> {
  const db = await getDatabase();
  const rows = await db.select<Array<{
    id: string;
    task_id: string;
    status: string;
    started_at: number;
    completed_at: number | null;
    result: string | null;
    error: string | null;
    duration: number | null;
  }>>(
    'SELECT * FROM task_executions WHERE task_id = ? ORDER BY started_at DESC LIMIT ?',
    [taskId, limit]
  );

  return rows.map(row => ({
    id: row.id,
    taskId: row.task_id,
    status: row.status as TaskExecution['status'],
    startedAt: row.started_at,
    completedAt: row.completed_at || undefined,
    result: row.result || undefined,
    error: row.error || undefined,
    duration: row.duration || undefined,
  }));
}

/**
 * Map database row to Task type
 */
function mapTaskFromDb(row: {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: string;
  action_type: string;
  action_config: string;
  enabled: number;
  last_run: number | null;
  next_run: number | null;
  metadata: string | null;
  created_at: number;
  updated_at: number | null;
}): Task {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    trigger: {
      type: row.trigger_type as Task['trigger']['type'],
      config: JSON.parse(row.trigger_config),
    },
    action: {
      type: row.action_type as Task['action']['type'],
      config: JSON.parse(row.action_config),
    },
    enabled: row.enabled === 1,
    lastRun: row.last_run || undefined,
    nextRun: row.next_run || undefined,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at || undefined,
  };
}
