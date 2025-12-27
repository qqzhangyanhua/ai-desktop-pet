import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { isTauri } from '@tauri-apps/api/core';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow, monitorFromPoint, primaryMonitor } from '@tauri-apps/api/window';
import { LogicalSize, PhysicalPosition } from '@tauri-apps/api/dpi';
import { PetContainer } from './components/pet';
import { ChatWindow } from './components/chat';
import { ToastContainer } from './components/toast';
import { initDatabase } from './services/database';
import { getSchedulerManager } from './services/scheduler';
import { initializeStatsService } from './services/statistics';
import { initializeAchievements } from './services/achievements';
import { useConfigStore, usePetStore, usePetStatusStore, useSkinStore, toast } from './stores';
import { getSkinManager } from './services/skin';
import './styles/global.css';

function App() {
  const [showChat, setShowChat] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const { showBubble } = usePetStore();
  const { config, isLoaded: isConfigLoaded } = useConfigStore();

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

        const { config } = useConfigStore.getState();

        // Apply window settings (best-effort)
        if (isTauri()) {
          const appWindow = getCurrentWindow();
          const { width, height } = config.appearance.size;
          await appWindow.setSize(new LogicalSize(width, height));
          await appWindow.setAlwaysOnTop(config.alwaysOnTop);
          if (config.interaction.rememberPosition && config.interaction.lastPosition) {
            const { x, y } = config.interaction.lastPosition;
            const [monitor, outerSize] = await Promise.all([
              monitorFromPoint(x, y).then((m) => m ?? primaryMonitor()),
              appWindow.outerSize(),
            ]);
            const monitorPos = monitor?.position ?? { x: 0, y: 0 };
            const monitorSize = monitor?.size ?? { width: window.screen.width, height: window.screen.height };

            const minVisible = 60;
            const maxX = monitorPos.x + monitorSize.width - minVisible;
            const minX = monitorPos.x - outerSize.width + minVisible;
            const maxY = monitorPos.y + monitorSize.height - minVisible;
            const minY = monitorPos.y;

            const clampedX = Math.min(Math.max(x, minX), maxX);
            const clampedY = Math.min(Math.max(y, minY), maxY);

            await appWindow.setPosition(new PhysicalPosition(clampedX, clampedY));
          }
          await appWindow.setIgnoreCursorEvents(config.interaction.clickThrough);
          if (config.startMinimized) {
            await appWindow.minimize();
          }
        }

        // Load skins and apply selected skin (best-effort)
        try {
          await useSkinStore.getState().loadSkins();
          await getSkinManager().switchSkin(config.appearance.skinId);
        } catch (error) {
          console.warn('[App] Failed to load/apply skin:', error);
        }

        // Load pet status
        const { loadStatus } = usePetStatusStore.getState();
        await loadStatus();
        console.log('[App] Pet status loaded');

        // Initialize statistics service
        await initializeStatsService();
        console.log('[App] Statistics service initialized');

        // Initialize achievements
        await initializeAchievements();
        console.log('[App] Achievements initialized');

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
    const unlistenSettings = listen('open-settings', async () => {
      // Open settings in a new window
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const settingsWindow = await WebviewWindow.getByLabel('settings');

      if (settingsWindow) {
        await settingsWindow.setFocus();
      } else {
        // In dev mode, use dev server URL; in production, use settings.html
        const isDev = window.location.hostname === 'localhost';
        const url = isDev ? 'http://localhost:1420/settings.html' : 'settings.html';

        new WebviewWindow('settings', {
          url,
          title: '设置中心',
          width: 1000,
          height: 600,
          resizable: true,
          center: true,
          decorations: true,
          alwaysOnTop: false,
          skipTaskbar: false,
        });
      }
    });

    const unlistenClickThrough = listen<{ enabled: boolean }>('click-through-changed', async (e) => {
      const enabled = Boolean(e.payload?.enabled);
      const { config: current, setConfig, saveConfig } = useConfigStore.getState();
      setConfig({
        interaction: { ...current.interaction, clickThrough: enabled },
      });
      try {
        await saveConfig();
      } catch (err) {
        console.warn('[App] Failed to persist click-through config:', err);
      }
    });

    return () => {
      unlistenSettings.then((fn) => fn());
      unlistenClickThrough.then((fn) => fn());
    };
  }, []);

  // Apply window settings when config changes (best-effort)
  useEffect(() => {
    if (!isConfigLoaded) return;
    if (!isTauri()) return;

    const appWindow = getCurrentWindow();
    const { width, height } = config.appearance.size;
    appWindow.setSize(new LogicalSize(width, height)).catch((err) => {
      console.warn('[App] Failed to set window size:', err);
    });
    appWindow.setAlwaysOnTop(config.alwaysOnTop).catch((err) => {
      console.warn('[App] Failed to set always-on-top:', err);
    });
    appWindow.setIgnoreCursorEvents(config.interaction.clickThrough).catch((err) => {
      console.warn('[App] Failed to set click-through:', err);
    });
  }, [config.alwaysOnTop, config.appearance.size.height, config.appearance.size.width, isConfigLoaded]);

  // Apply skin when config changes (best-effort)
  useEffect(() => {
    if (!isConfigLoaded) return;
    getSkinManager().switchSkin(config.appearance.skinId).catch((err) => {
      console.warn('[App] Failed to switch skin:', err);
    });
  }, [config.appearance.skinId, isConfigLoaded]);

  // Sync tray check state (best-effort)
  useEffect(() => {
    if (!isConfigLoaded) return;
    if (!isTauri()) return;
    invoke('set_tray_click_through_checked', { enabled: config.interaction.clickThrough }).catch(
      (err) => {
        console.warn('[App] Failed to sync tray state:', err);
      }
    );
  }, [config.interaction.clickThrough, isConfigLoaded]);

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
      <PetContainer onOpenChat={() => setShowChat(true)} />

      {showChat && <ChatWindow onClose={() => setShowChat(false)} />}

      <ToastContainer />
    </>
  );
}

export default App;
