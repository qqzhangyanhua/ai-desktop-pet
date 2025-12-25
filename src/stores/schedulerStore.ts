// Scheduler Store - Global state management for task scheduler

import { create } from 'zustand';
import type { Task, TaskExecution } from '@/types/scheduler';
import { getSchedulerManager } from '@/services/scheduler';

interface SchedulerStore {
  // State
  tasks: Task[];
  executions: Map<string, TaskExecution[]>;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadTasks: () => Promise<void>;
  refreshTask: (taskId: string) => Promise<void>;
  loadExecutions: (taskId: string) => Promise<void>;
  clearError: () => void;
}

export const useSchedulerStore = create<SchedulerStore>((set, get) => ({
  // Initial state
  tasks: [],
  executions: new Map(),
  isLoading: false,
  error: null,

  // Load all tasks
  loadTasks: async () => {
    try {
      set({ isLoading: true, error: null });
      const scheduler = getSchedulerManager();
      const tasks = await scheduler.getAllTasks();
      set({ tasks, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load tasks';
      set({ error: message, isLoading: false });
      console.error('[SchedulerStore] Load tasks error:', error);
    }
  },

  // Refresh single task
  refreshTask: async (taskId: string) => {
    try {
      const scheduler = getSchedulerManager();
      const task = await scheduler.getTask(taskId);
      const tasks = get().tasks;
      const index = tasks.findIndex((t) => t.id === taskId);

      if (index >= 0) {
        const updated = [...tasks];
        updated[index] = task;
        set({ tasks: updated });
      } else {
        set({ tasks: [...tasks, task] });
      }
    } catch (error) {
      console.error('[SchedulerStore] Refresh task error:', error);
    }
  },

  // Load task execution history
  loadExecutions: async (taskId: string) => {
    try {
      const scheduler = getSchedulerManager();
      const executions = await scheduler.getExecutions(taskId);
      const executionsMap = new Map(get().executions);
      executionsMap.set(taskId, executions);
      set({ executions: executionsMap });
    } catch (error) {
      console.error('[SchedulerStore] Load executions error:', error);
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}));
