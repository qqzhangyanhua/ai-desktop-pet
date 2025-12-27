// Scheduler Test Panel - Simple UI to test scheduler functionality

import { useState, useEffect } from 'react';
import { getSchedulerManager } from '../../services/scheduler';
import type { Task } from '../../types/scheduler';
import { Button } from '@/components/ui/button';

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
    if (!confirm('Delete this task?')) return;

    try {
      await scheduler.deleteTask(taskId);
      addLog(`Deleted task: ${taskId}`);
      await loadTasks();
    } catch (error) {
      addLog(`Error deleting task: ${error}`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px' }}>
      <h2>Scheduler Test Panel</h2>

      <div style={{ marginBottom: '20px' }}>
        <Button onClick={createTestTask} disabled={isCreating} className="bg-blue-600 hover:bg-blue-700">
          {isCreating ? 'Creating...' : 'Create Test Task'}
        </Button>
        <Button onClick={loadTasks} variant="outline" className="ml-2 bg-emerald-600 text-white hover:bg-emerald-700 border-0">
          Refresh
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Tasks List */}
        <div>
          <h3>Tasks ({tasks.length})</h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {tasks.length === 0 ? (
              <p style={{ color: '#666' }}>No tasks yet. Create one to test!</p>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    padding: '10px',
                    marginBottom: '10px',
                    backgroundColor: task.enabled ? '#f8f9fa' : '#e9ecef',
                  }}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                    {task.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
                    Type: {task.trigger.type} | Action: {task.action.type}
                  </div>
                  <div style={{ fontSize: '11px', color: '#999', marginBottom: '8px' }}>
                    {task.description || 'No description'}
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <Button onClick={() => executeTask(task.id)} size="sm" className="bg-blue-600 hover:bg-blue-700">
                      Run Now
                    </Button>
                    <Button
                      onClick={() => toggleTask(task.id, task.enabled)}
                      size="sm"
                      className={task.enabled ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'}
                    >
                      {task.enabled ? 'Disable' : 'Enable'}
                    </Button>
                    <Button onClick={() => deleteTask(task.id)} size="sm" className="bg-red-600 hover:bg-red-700">
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
          <h3>Event Log</h3>
          <div
            style={{
              maxHeight: '400px',
              overflowY: 'auto',
              backgroundColor: '#1e1e1e',
              color: '#d4d4d4',
              padding: '10px',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '12px',
            }}
          >
            {logs.length === 0 ? (
              <div style={{ color: '#666' }}>No events yet...</div>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  style={{
                    padding: '2px 0',
                    borderBottom: '1px solid #333',
                  }}
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <h4>Quick Test Instructions:</h4>
        <ol style={{ fontSize: '14px', lineHeight: '1.6' }}>
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
