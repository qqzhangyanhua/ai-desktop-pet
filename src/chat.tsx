import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { ChatWindow } from './components/chat/ChatWindow';
import { initDatabase } from './services/database';
import { useConfigStore, usePetStatusStore, useUserProfileStore } from './stores';
import './styles/global.css';

// Inner component that waits for initialization
function ChatApp() {
  const [ready, setReady] = useState(false);
  const { loadConfig } = useConfigStore();
  const { loadStatus } = usePetStatusStore();
  const { loadProfile } = useUserProfileStore();

  useEffect(() => {
    console.log('[Chat] Starting initialization...');

    initDatabase()
      .then(async () => {
        console.log('[Chat] Database initialized');

        // Load config
        await loadConfig();
        console.log('[Chat] Config loaded');

        // Load pet status
        await loadStatus();
        console.log('[Chat] Pet status loaded');

        // Load user profile
        await loadProfile();
        console.log('[Chat] User profile loaded');

        setReady(true);
        console.log('[Chat] Initialization complete');
      })
      .catch((err) => {
        console.error('[Chat] Failed to initialize:', err);
        // Set ready anyway to prevent infinite loading
        setReady(true);
      });
  }, [loadConfig, loadStatus, loadProfile]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-purple-100 to-pink-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return <ChatWindow />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ChatApp />
  </React.StrictMode>
);
