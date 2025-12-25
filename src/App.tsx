import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { PetContainer } from './components/pet';
import { ChatWindow } from './components/chat';
import { SettingsPanel } from './components/settings';
import { ToastContainer } from './components/toast';
import { initDatabase } from './services/database';
import { getSchedulerManager } from './services/scheduler';
import { useConfigStore, usePetStore, toast } from './stores';
import './styles/global.css';

function App() {
  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const { showBubble } = usePetStore();

  // Initialize database, scheduler, and load config
  useEffect(() => {
    console.log('[App] Starting initialization...');

    initDatabase()
      .then(async () => {
        console.log('[App] Database initialized');

        // Load config directly from store
        const { loadConfig } = useConfigStore.getState();
        await loadConfig();
        console.log('[App] Config loaded');

        // Initialize scheduler
        const scheduler = getSchedulerManager();
        await scheduler.initialize();
        console.log('[App] Scheduler initialized');

        setDbReady(true);
        console.log('[App] Database and scheduler ready');

        // Show welcome bubble after initialization
        setTimeout(() => {
          showBubble('你好!我是你的AI桌面宠物', 3000);
        }, 500);
      })
      .catch((err) => {
        console.error('[App] Failed to initialize:', err);
        toast.error('Failed to initialize application');
        // Set ready anyway to prevent infinite loading
        setDbReady(true);
      });

    // Cleanup on unmount
    return () => {
      const scheduler = getSchedulerManager();
      scheduler.cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency - run only once on mount

  // Listen for tray menu events
  useEffect(() => {
    const unlistenSettings = listen('open-settings', () => {
      setShowSettings(true);
    });

    return () => {
      unlistenSettings.then((fn) => fn());
    };
  }, []);

  if (!dbReady) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        <div className="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    );
  }

  return (
    <>
      <PetContainer
        onOpenChat={() => setShowChat(true)}
        onOpenSettings={() => setShowSettings(true)}
      />

      {showChat && <ChatWindow onClose={() => setShowChat(false)} />}

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      <ToastContainer />
    </>
  );
}

export default App;
