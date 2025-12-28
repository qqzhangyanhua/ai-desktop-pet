// Scheduler Test Panel - Simple UI to test scheduler functionality

import { useState, useEffect } from 'react';
import { getSchedulerManager } from '../../services/scheduler';
import type { Task } from '../../types/scheduler';
import { Button } from '@/components/ui/button';
import { confirmAction } from '@/lib/confirm';

export function SchedulerTestPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const scheduler = getSchedulerManager();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev].slice(0, 20));
  };

  useEffect(() => {
    // Ensure scheduler event listeners are active in this window
    scheduler.initialize().catch((error) => {
      addLog(`Error initializing scheduler: ${error}`);
    });

    // Load tasks
    loadTasks();

    // Set up event listeners
    scheduler.on('started', (...args: unknown[]) => {
      const id = args[0] as string;
      addLog(`Task started: ${id}`);
    });

    scheduler.on('completed', (...args: unknown[]) => {
      const id = args[0] as string;
      addLog(`Task completed: ${id}`);
      loadTasks();
    });

    scheduler.on('failed', (...args: unknown[]) => {
      const data = args[0] as { id: string; error: string };
      addLog(`Task failed: ${data.id} - ${data.error}`);
    });

    scheduler.on('notification', (...args: unknown[]) => {
      const data = args[0] as { title: string; body: string };
      addLog(`Notification: ${data.title} - ${data.body}`);
    });
    return () => {
      scheduler.cleanup().catch(() => {});
    };
  }, []);

  const loadTasks = async () => {
    try {
      const allTasks = await scheduler.getAllTasks();
      setTasks(allTasks);
      addLog(`Loaded ${allTasks.length} tasks`);
    } catch (error) {
      addLog(`Error loading tasks: ${error}`);
    }
  };

  const createTestTask = async () => {
    setIsCreating(true);
    try {
      const taskId = await scheduler.createTask({
        name: `Test Task ${Date.now()}`,
        description: 'Created from test panel',
        trigger: {
          type: 'interval',
          config: {
            type: 'interval',
            seconds: 120, // 2 minutes
          },
        },
        action: {
          type: 'notification',
          config: {
            type: 'notification',
            title: 'Test Notification',
            body: 'This is a test from scheduler',
          },
        },
        enabled: true,
      });
      addLog(`Created task: ${taskId}`);
      await loadTasks();
    } catch (error) {
      addLog(`Error creating task: ${error}`);
    } finally {
      setIsCreating(false);
    }
  };

  const executeTask = async (taskId: string) => {
    try {
      addLog(`Executing task: ${taskId}`);
      await scheduler.executeNow(taskId);
    } catch (error) {
      addLog(`Error executing task: ${error}`);
    }
  };

  const toggleTask = async (taskId: string, enabled: boolean) => {
    try {
      await scheduler.enableTask(taskId, !enabled);
      addLog(`Task ${taskId} ${enabled ? 'disabled' : 'enabled'}`);
      await loadTasks();
    } catch (error) {
      addLog(`Error toggling task: ${error}`);
    }
  };

  const deleteTask = async (taskId: string) => {
    const ok = await confirmAction('确认删除该任务吗？', {
      title: '删除任务',
      kind: 'warning',
      okLabel: '删除',
      cancelLabel: '取消',
    });
    if (!ok) return;

    try {
      await scheduler.deleteTask(taskId);
      addLog(`Deleted task: ${taskId}`);
      await loadTasks();
    } catch (error) {
      addLog(`Error deleting task: ${error}`);
    }
  };

  return (
    <div className="settings-section">
      <div className="settings-section-title">Scheduler Test Panel</div>

      <div className="settings-row">
        <span className="settings-label">Actions</span>
        <div className="flex gap-2">
          <Button onClick={createTestTask} disabled={isCreating} className="bg-blue-600">
            {isCreating ? 'Creating...' : 'Create Test Task'}
          </Button>
          <Button onClick={loadTasks} variant="outline" className="bg-emerald-600 text-white border-0">
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Tasks List */}
        <div>
          <h3 className="text-sm font-bold text-amber-900 mb-2">Tasks ({tasks.length})</h3>
          <div className="max-h-[300px] overflow-y-auto pr-1">
            {tasks.length === 0 ? (
              <p className="text-xs text-amber-900/60 italic">No tasks yet. Create one to test!</p>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className="game-card mb-2 !p-3">
                  <div className="font-bold text-xs mb-1 text-amber-900">
                    {task.name}
                  </div>
                  <div className="text-[10px] text-amber-900/60 mb-1">
                    Type: {task.trigger.type} | Action: {task.action.type}
                  </div>
                  <div className="text-[10px] text-amber-900/40 mb-2 italic">
                    {task.description || 'No description'}
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    <Button onClick={() => executeTask(task.id)} size="sm" className="h-6 text-[10px] px-2 bg-blue-600">
                      Run Now
                    </Button>
                    <Button
                      onClick={() => toggleTask(task.id, task.enabled)}
                      size="sm"
                      className={`h-6 text-[10px] px-2 ${task.enabled ? 'bg-amber-500' : 'bg-emerald-600'}`}
                    >
                      {task.enabled ? 'Disable' : 'Enable'}
                    </Button>
                    <Button onClick={() => deleteTask(task.id)} size="sm" className="h-6 text-[10px] px-2 bg-red-600">
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Event Logs */}
        <div>
          <h3 className="text-sm font-bold text-amber-900 mb-2">Event Log</h3>
          <div className="game-log-panel h-[300px]">
            {logs.length === 0 ? (
              <div className="text-amber-100/50 italic">No events yet...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="game-log-entry text-[10px]">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="text-xs text-amber-900/70 bg-amber-500/10 p-3 rounded-lg border border-amber-900/10">
        <h4 className="font-bold mb-1">Quick Test Instructions:</h4>
        <ol className="list-decimal list-inside space-y-0.5">
          <li>Click "Create Test Task" to create a task that runs every 2 minutes</li>
          <li>Click "Run Now" to execute the task immediately</li>
          <li>Watch the Event Log for task execution events</li>
          <li>Notifications will be logged to the Event Log</li>
          <li>Check Rust console for backend logs</li>
        </ol>
      </div>
    </div>
  );
}
