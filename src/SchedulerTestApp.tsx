// Simple Scheduler Test App - For quick testing
import { SchedulerTestPanel } from './components/settings/SchedulerTestPanel';
import { getSchedulerManager } from './services/scheduler';
import { initDatabase } from './services/database';
import { useEffect, useState } from 'react';

export function SchedulerTestApp() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initDatabase()
      .then(async () => {
        const scheduler = getSchedulerManager();
        await scheduler.initialize();
        setReady(true);
        console.log('Scheduler test app ready');
      })
      .catch((err) => {
        console.error('Failed to initialize:', err);
      });

    return () => {
      const scheduler = getSchedulerManager();
      scheduler.cleanup();
    };
  }, []);

  if (!ready) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading scheduler...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <SchedulerTestPanel />
    </div>
  );
}
