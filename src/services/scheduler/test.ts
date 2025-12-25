// Simple test script for TaskScheduler
// Run this in the browser console to test scheduler functionality

import { getSchedulerManager } from '@/services/scheduler';

export async function testScheduler() {
  console.log('=== TaskScheduler Test Suite ===\n');

  const scheduler = getSchedulerManager();

  try {
    // Test 1: Create an interval task
    console.log('Test 1: Creating interval task...');
    const taskId = await scheduler.createTask({
      name: 'Test Interval Task',
      description: 'Runs every 2 minutes',
      trigger: {
        type: 'interval',
        config: {
          type: 'interval',
          seconds: 120,
        },
      },
      action: {
        type: 'notification',
        config: {
          type: 'notification',
          title: 'Test Notification',
          body: 'This is a test notification from scheduler',
        },
      },
      enabled: true,
    });
    console.log('✓ Task created:', taskId);

    // Test 2: Get the task
    console.log('\nTest 2: Getting task...');
    const task = await scheduler.getTask(taskId);
    console.log('✓ Task retrieved:', task);

    // Test 3: Get all tasks
    console.log('\nTest 3: Getting all tasks...');
    const allTasks = await scheduler.getAllTasks();
    console.log(`✓ Found ${allTasks.length} tasks`);

    // Test 4: Update task
    console.log('\nTest 4: Updating task...');
    await scheduler.updateTask(taskId, {
      name: 'Updated Test Task',
      enabled: false,
    });
    const updated = await scheduler.getTask(taskId);
    console.log('✓ Task updated:', updated.name, '| Enabled:', updated.enabled);

    // Test 5: Execute task immediately
    console.log('\nTest 5: Executing task now...');

    // Set up event listener
    scheduler.on('started', (...args: unknown[]) => {
      const id = args[0] as string;
      console.log('✓ Task started:', id);
    });

    scheduler.on('completed', (...args: unknown[]) => {
      const id = args[0] as string;
      console.log('✓ Task completed:', id);
    });

    scheduler.on('notification', (...args: unknown[]) => {
      const data = args[0] as { title: string; body: string };
      console.log('✓ Notification received:', data);
    });

    await scheduler.enableTask(taskId, true); // Re-enable
    await scheduler.executeNow(taskId);

    // Wait a bit for execution
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Test 6: Get execution history
    console.log('\nTest 6: Getting execution history...');
    const executions = await scheduler.getExecutions(taskId);
    console.log(`✓ Found ${executions.length} executions`);
    if (executions.length > 0) {
      console.log('  Latest execution:', executions[0]);
    }

    // Test 7: Create a cron task
    console.log('\nTest 7: Creating cron task...');
    const cronTaskId = await scheduler.createTask({
      name: 'Daily Morning Task',
      description: 'Runs at 9 AM every day',
      trigger: {
        type: 'cron',
        config: {
          type: 'cron',
          expression: '0 9 * * *', // 9 AM every day
        },
      },
      action: {
        type: 'notification',
        config: {
          type: 'notification',
          title: 'Good Morning',
          body: 'Time to start your day!',
        },
      },
      enabled: true,
    });
    console.log('✓ Cron task created:', cronTaskId);

    // Clean up test tasks
    console.log('\nCleaning up test tasks...');
    await scheduler.deleteTask(taskId);
    await scheduler.deleteTask(cronTaskId);
    console.log('✓ Test tasks deleted');

    console.log('\n=== All tests passed! ===');
    return true;
  } catch (error) {
    console.error('\n✗ Test failed:', error);
    return false;
  }
}

// Auto-run in development
if (import.meta.env.DEV) {
  console.log('Scheduler test available. Run `testScheduler()` in console to test.');
}
