import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { isTauri } from '@tauri-apps/api/core';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow, monitorFromPoint, primaryMonitor } from '@tauri-apps/api/window';
import { LogicalSize, PhysicalPosition } from '@tauri-apps/api/dpi';
import { PetContainer } from './components/pet';
import { ToastContainer } from './components/toast';
import { RecordingIndicator } from './components/RecordingIndicator';
import { DebugPanel } from './components/DebugPanel';
import { AchievementToastContainer } from './components/toast/AchievementToastContainer';
import { PromptDialog } from './components/common/PromptDialog';
import { initDatabase } from './services/database';
import { getSchedulerManager } from './services/scheduler';
import { getShortcutManager } from './services/keyboard';
import { getAutostartManager } from './services/system';
import { getPushToTalkManager } from './services/voice';
import { initializeStatsService } from './services/statistics';
import { initializeAchievements } from './services/achievements';
import { AgentRuntime } from './services/agent';
import { useConfigStore, usePetStore, usePetStatusStore, useSkinStore, useUserProfileStore, useCareStore, useChatStore, toast } from './stores';
import { flushPendingUpdates } from './stores/petStatusStore';
import { getSkinManager } from './services/skin';
import { getWindowManager } from './services/window';
import { petSpeak } from './services/pet/voice-link';
import { useAchievementListener, useAgentSystem, useAgentListener } from './hooks';
import { useProactiveBehavior } from './hooks/useProactiveBehavior';
import { usePerformanceMode } from './hooks/usePerformanceMode';
import './styles/global.css';

// 🔥 在模块加载时立即初始化 Live2D（在任何组件渲染之前）
// 动态导入并立即调用初始化
import('./services/live2d/global-init')
  .then(({ initGlobalLive2D }) => {
    return initGlobalLive2D();
  })
  .then((instance) => {
    // Live2D 初始化完成
  })
  .catch((error) => {
    console.error('[INIT] ❌ Live2D 初始化失败:', error);
  });

function App() {
  const [dbReady, setDbReady] = useState(false);
  const { showBubble, setEmotion, setSpeakingTemporary } = usePetStore();
  const { config, isLoaded: isConfigLoaded } = useConfigStore();
  const { loadProfile: loadUserProfile } = useUserProfileStore();

  // 监听成就解锁事件
  useAchievementListener();

  // Enable proactive behavior
  useProactiveBehavior(true);

  // Enable performance mode management
  usePerformanceMode();

  // 初始化智能体系统
  useAgentSystem({
    autoStart: true,
    enableInDev: true,
  });

  // 监听智能体事件
  useAgentListener();

  // Live2D 已在模块级别初始化，这里不需要再次调用

  // Initialize database, scheduler, and load config
  useEffect(() => {
    initDatabase()
      .then(async () => {
        // Load config directly from store
        const { loadConfig } = useConfigStore.getState();
        await loadConfig();

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

        // P2-1-D: Load care status from database
        const { loadFromDatabase: loadCareStatus } = useCareStore.getState();
        await loadCareStatus();

        // Load user profile
        await loadUserProfile();

        // Initialize statistics service
        await initializeStatsService();

        // Initialize achievements
        await initializeAchievements();

        // Initialize bookmark manager
        try {
          const { bookmarkManager } = await import('@/services/bookmark');
          const { getDatabase } = await import('@/services/database');
          const db = await getDatabase();
          await bookmarkManager.initialize(db);
        } catch (error) {
          console.warn('[App] Failed to initialize bookmark manager:', error);
        }

        // Note: Agent system is initialized via useAgentSystem hook

        // Initialize scheduler
        const scheduler = getSchedulerManager();
        await scheduler.initialize();

        // Initialize shortcuts (best-effort)
        try {
          const shortcutManager = getShortcutManager();
          await shortcutManager.registerShortcuts(config.assistant.shortcuts);
        } catch (error) {
          console.warn('[App] Failed to register shortcuts:', error);
        }

        // Sync autostart status (best-effort)
        try {
          const autostartManager = getAutostartManager();
          await autostartManager.setAutostart(config.performance.launchOnStartup);
        } catch (error) {
          console.warn('[App] Failed to sync autostart:', error);
        }

        // Start resource monitoring (best-effort)
        try {
          const { startResourceMonitoring } = await import('./services/performance');
          startResourceMonitoring();
        } catch (error) {
          console.warn('[App] Failed to start resource monitoring:', error);
        }

        setDbReady(true);

        // Show welcome bubble after initialization
        setTimeout(() => {
          const welcomeMsg = '你好!我是你的AI桌面宠物';
          const duration = 3000;
          setEmotion('happy');
          showBubble(welcomeMsg, duration);
          
          const config = useConfigStore.getState().config;
          if (config.voice.ttsEnabled) {
            void petSpeak(welcomeMsg, { priority: 'normal' });
          } else {
            setSpeakingTemporary(duration);
          }
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

  // Handle beforeunload to flush pending updates
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Synchronously flush pending updates before page unloads
      // Note: In Tauri, this may be called when the window is closing
      void flushPendingUpdates();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Also flush when component unmounts
      void flushPendingUpdates();
    };
  }, []);

  // Listen for tray menu events
  useEffect(() => {
    const unlistenSettings = listen('open-settings', async () => {
      // Open settings window using WindowManager
      const windowManager = getWindowManager();
      await windowManager.openSettingsWindow();
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

  // Handle scheduler events (notifications / agent tasks / workflows)
  useEffect(() => {
    if (!dbReady) return;

    const scheduler = getSchedulerManager();

    const onNotification = (...args: unknown[]) => {
      const payload = args[0] as { title?: string; body?: string } | undefined;
      if (!payload) return;
      const title = payload.title?.trim() || '任务提醒';
      const body = payload.body?.trim() || '';
      
      // Skip if it's a proactive greeting placeholder (handled by useProactiveBehavior)
      if (body === '${greeting}') return;

      // toast.info(body ? `${title}：${body}` : title, 6000);
      const bubble = body ? `${title}\n${body}` : title;
      usePetStore.getState().showBubble(bubble, 6000);
    };

    const onAgentExecute = (...args: unknown[]) => {
      const payload = args[0] as
        | { prompt?: string; toolsAllowed?: string[]; maxSteps?: number }
        | undefined;
      if (!payload) return;
      void (async () => {
        const prompt = payload.prompt?.trim();
        if (!prompt) return;

        const { config } = useConfigStore.getState();
        if (config.llm.provider !== 'ollama' && !config.llm.apiKey) {
          // toast.error('未配置 API Key，无法执行定时任务');
          usePetStore.getState().showBubble('未配置 API Key，无法执行定时任务', 5200);
          return;
        }
        // toast.info('正在执行定时任务…', 3000);
        usePetStore.getState().showBubble('正在执行定时任务…', 3000);
        usePetStore.getState().setEmotion('thinking');

        try {
          const runtime = new AgentRuntime({
            llmConfig: {
              provider: config.llm.provider,
              model: config.llm.model,
              apiKey: config.llm.apiKey,
              baseUrl: config.llm.baseUrl,
              temperature: config.llm.temperature,
              maxTokens: config.llm.maxTokens,
            },
            systemPrompt: config.systemPrompt,
            maxSteps: payload.maxSteps ?? 5,
            source: 'scheduler',
            allowedTools: config.assistant.agent.enabledTools,
          });

          const enabledTools = payload.toolsAllowed?.length
            ? payload.toolsAllowed.filter((t) => config.assistant.agent.enabledTools.includes(t))
            : config.assistant.agent.enabledTools;

          const result = await runtime.run([{ role: 'user', content: prompt }], enabledTools);
          usePetStore.getState().setEmotion('happy');
          usePetStore.getState().showBubble(result.content.slice(0, 120) || '任务已完成', 6500);
          // toast.success('定时任务已完成');
        } catch (err) {
          usePetStore.getState().setEmotion('confused');
          // toast.error(err instanceof Error ? `定时任务失败：${err.message}` : '定时任务失败');
          usePetStore.getState().showBubble('定时任务执行失败', 5200);
        }
      })();
    };

    const onWorkflowExecute = (...args: unknown[]) => {
      const payload = args[0] as { workflowId?: string } | undefined;
      if (!payload?.workflowId) return;
      // toast.info(`收到工作流执行请求：${payload.workflowId}`, 5000);
      usePetStore.getState().showBubble(`收到工作流执行请求：${payload.workflowId}`, 5000);
    };

    scheduler.on('notification', onNotification);
    scheduler.on('agent_execute', onAgentExecute);
    scheduler.on('workflow_execute', onWorkflowExecute);

    return () => {
      scheduler.off('notification', onNotification);
      scheduler.off('agent_execute', onAgentExecute);
      scheduler.off('workflow_execute', onWorkflowExecute);
    };
  }, [dbReady]);

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

  // Enable/disable push-to-talk based on config (best-effort)
  useEffect(() => {
    if (!isConfigLoaded) return;
    if (!dbReady) return;

    const manager = getPushToTalkManager();

    if (config.voice.pushToTalkEnabled && config.voice.sttEnabled) {
      try {
        manager.setConfig({
          triggerKey: config.voice.pushToTalkKey,
          minDuration: 200,
          maxDuration: 30000,
        });

        // Set message callback to send recognized text to chat
        manager.onMessage((text) => {
          // Send to chat window
          const chatState = useChatStore.getState();
          const conversationId = chatState.currentConversationId || 'default';

          useChatStore.getState().addMessage({
            id: `voice_${Date.now()}`,
            conversationId,
            role: 'user',
            content: text,
            createdAt: Date.now(),
          });

          // Also show in pet bubble for immediate feedback
          usePetStore.getState().showBubble(`语音: ${text}`, 2000);
        });

        manager.enable().catch((err) => {
          console.warn('[App] Failed to enable push-to-talk:', err);
        });
      } catch (error) {
        console.warn('[App] Failed to setup push-to-talk:', error);
      }
    } else {
      manager.disable().catch((err) => {
        console.warn('[App] Failed to disable push-to-talk:', err);
      });
    }
  }, [
    config.voice.pushToTalkEnabled,
    config.voice.sttEnabled,
    config.voice.pushToTalkKey,
    isConfigLoaded,
    dbReady,
  ]);

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
      <PetContainer />

      <RecordingIndicator />

      <ToastContainer />

      <AchievementToastContainer />
      
      <DebugPanel />

      <PromptDialog />
    </>
  );
}

export default App;
