import { useState, useCallback, useEffect, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  Palette,
  Bone,
  Brain,
  Trophy,
  Zap,
  Settings2,
  Home,
  Save,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfigStore } from '../../stores';
import { initDatabase } from '../../services/database';
import type { AppConfig, LLMConfig, VoiceConfig } from '../../types';
import { getMCPManager } from '../../services/mcp';
import { getSkinManager } from '../../services/skin';
import type { MCPServerConfig, MCPClientState } from '../../services/mcp/types';
import {
  AppearanceTab,
  BehaviorTab,
  AssistantTab,
  StatisticsTab,
  PerformanceTab,
  AdvancedTab,
} from './tabs';
import { FeedbackAnimation, useFeedback } from './FeedbackAnimation';

type SettingsTab = 'appearance' | 'behavior' | 'assistant' | 'statistics' | 'performance' | 'advanced';

const LLM_PROVIDERS = [
  { value: 'openai', label: 'GPT（OpenAI）' },
  { value: 'anthropic', label: 'Claude（Anthropic）' },
  { value: 'ollama', label: '本地模型（Ollama）' },
] as const;

const DEFAULT_MODELS: Record<string, string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229'],
  ollama: ['llama2', 'mistral', 'codellama', 'neural-chat'],
};

const TAB_CONFIGS = {
  appearance: { icon: Palette, title: '外观设置' },
  behavior: { icon: Bone, title: '行为设置' },
  assistant: { icon: Brain, title: '智能助手' },
  statistics: { icon: Trophy, title: '统计成就' },
  performance: { icon: Zap, title: '性能设置' },
  advanced: { icon: Settings2, title: '高级设置' },
} as const satisfies Record<SettingsTab, { icon: LucideIcon; title: string }>;

export function SettingsWindow() {
  const { config, setConfig, saveConfig, loadConfig } = useConfigStore();
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const [dbReady, setDbReady] = useState(false);
  const didSaveRef = useRef(false);
  const initialSkinIdRef = useRef(config.appearance.skinId);

  // MCP state
  const [mcpServers, setMcpServers] = useState<MCPServerConfig[]>([]);
  const [mcpServerStates, setMcpServerStates] = useState<Map<string, MCPClientState>>(new Map());

  // Feedback system
  const { currentMessage, showFeedback } = useFeedback();

  // Initialize database and load config
  useEffect(() => {
    initDatabase()
      .then(async () => {
        await loadConfig();
        setDbReady(true);
      })
      .catch((err) => {
        console.error('[SettingsWindow] Failed to initialize:', err);
        setDbReady(true);
      });
  }, [loadConfig]);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  // Rollback skin if user closes without saving
  useEffect(() => {
    return () => {
      if (didSaveRef.current) return;
      getSkinManager().switchSkin(initialSkinIdRef.current).catch(() => {});
    };
  }, []);

  // Load MCP servers
  useEffect(() => {
    if (!dbReady) return;
    const manager = getMCPManager();
    setMcpServers(manager.getServers());
    setMcpServerStates(manager.getServerStates());
  }, [dbReady]);

  const handleMCPAddServer = useCallback(async (config: MCPServerConfig) => {
    const manager = getMCPManager();
    manager.addServer(config);
    setMcpServers(manager.getServers());

    try {
      await manager.connectServer(config.id);
      setMcpServerStates(manager.getServerStates());
    } catch (error) {
      console.error('Failed to connect to server:', error);
    }
  }, []);

  const handleMCPRemoveServer = useCallback((serverId: string) => {
    const manager = getMCPManager();
    manager.removeServer(serverId);
    setMcpServers(manager.getServers());
    setMcpServerStates(manager.getServerStates());
  }, []);

  const handleMCPConnect = useCallback(async (serverId: string) => {
    const manager = getMCPManager();
    try {
      await manager.connectServer(serverId);
      setMcpServerStates(manager.getServerStates());
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  }, []);

  const handleMCPDisconnect = useCallback(async (serverId: string) => {
    const manager = getMCPManager();
    await manager.disconnectServer(serverId);
    setMcpServerStates(manager.getServerStates());
  }, []);

  const handleProviderChange = useCallback((provider: LLMConfig['provider']) => {
    const defaultModel = DEFAULT_MODELS[provider]?.[0] ?? '';
    setLocalConfig((prev) => ({
      ...prev,
      llm: {
        ...prev.llm,
        provider,
        model: defaultModel,
        apiKey: provider === 'ollama' ? undefined : prev.llm.apiKey,
        baseUrl: provider === 'ollama' ? 'http://localhost:11434/api' : undefined,
      },
    }));

    const providerLabels: Record<string, string> = {
      openai: 'GPT',
      anthropic: 'Claude',
      ollama: '本地模型',
    };
    showFeedback(`已切换到 ${providerLabels[provider] || provider}!`, 'success');
  }, [showFeedback]);

  const handleModelChange = useCallback((model: string) => {
    setLocalConfig((prev) => ({
      ...prev,
      llm: { ...prev.llm, model },
    }));
    showFeedback(`模型已切换: ${model}`, 'info');
  }, [showFeedback]);

  const handleApiKeyChange = useCallback((apiKey: string) => {
    setLocalConfig((prev) => ({
      ...prev,
      llm: { ...prev.llm, apiKey },
    }));
    if (apiKey.trim()) {
      showFeedback('API Key 已更新!', 'success');
    }
  }, [showFeedback]);

  const handleBaseUrlChange = useCallback((baseUrl: string) => {
    setLocalConfig((prev) => ({
      ...prev,
      llm: { ...prev.llm, baseUrl: baseUrl || undefined },
    }));
  }, []);

  const handleTemperatureChange = useCallback((temperature: number) => {
    setLocalConfig((prev) => ({
      ...prev,
      llm: { ...prev.llm, temperature },
    }));

    if (temperature < 0.3) {
      showFeedback('宠物变得严谨了!', 'info');
    } else if (temperature > 1.5) {
      showFeedback('宠物变得有创意了!', 'success');
    }
  }, [showFeedback]);

  const handleSystemPromptChange = useCallback((systemPrompt: string) => {
    setLocalConfig((prev) => ({
      ...prev,
      systemPrompt,
    }));
  }, []);

  const handleVoiceConfigChange = useCallback((voice: VoiceConfig) => {
    setLocalConfig((prev) => ({
      ...prev,
      voice,
    }));
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      setConfig(localConfig);
      await saveConfig();
      didSaveRef.current = true;
      const appWindow = getCurrentWindow();
      await appWindow.close();
    } catch (error) {
      console.error('Failed to save config:', error);
    } finally {
      setIsSaving(false);
    }
  }, [localConfig, setConfig, saveConfig]);

  const handleClose = useCallback(async () => {
    const appWindow = getCurrentWindow();
    await appWindow.close();
  }, []);

  const availableModels = DEFAULT_MODELS[localConfig.llm.provider] ?? [];

  if (!dbReady) {
    return (
      <div className="settings-loading-container">
        <div className="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-window-wrapper">
      <FeedbackAnimation message={currentMessage} />
      <div className="pet-settings-container">
        <aside className="settings-sidebar">
          <div className="settings-sidebar-header">
            <div className="settings-sidebar-title">
              <Home className="w-4 h-4" />
              <span>宠物小窝</span>
            </div>
          </div>

          <nav className="settings-nav">
            {(Object.keys(TAB_CONFIGS) as SettingsTab[]).map((tab) => {
              const IconComponent = TAB_CONFIGS[tab].icon;
              return (
                <Button
                  key={tab}
                  className={`settings-nav-item ${activeTab === tab ? 'active' : ''}`}
                  variant="ghost"
                  onClick={() => setActiveTab(tab)}
                >
                  <span className="settings-nav-icon">
                    <IconComponent className="w-4 h-4" />
                  </span>
                  <span>{TAB_CONFIGS[tab].title.replace('设置', '')}</span>
                </Button>
              );
            })}
          </nav>
        </aside>

        <div className="settings-content-area">
          <header className="settings-content-header">
            <h2 className="settings-content-title">
              {(() => {
                const IconComponent = TAB_CONFIGS[activeTab].icon;
                return <IconComponent className="w-5 h-5" />;
              })()}
              <span>{TAB_CONFIGS[activeTab].title}</span>
            </h2>
            <Button onClick={handleClose} variant="ghost" className="settings-close-btn">×</Button>
          </header>

          <div className="settings-content-body">
            {activeTab === 'appearance' && (
              <AppearanceTab
                config={localConfig}
                onConfigChange={setLocalConfig}
                onFeedback={showFeedback}
              />
            )}

            {activeTab === 'behavior' && (
              <BehaviorTab
                config={localConfig}
                onConfigChange={setLocalConfig}
                onFeedback={showFeedback}
              />
            )}

            {activeTab === 'assistant' && (
              <AssistantTab
                config={localConfig}
                onConfigChange={setLocalConfig}
                llmProviders={LLM_PROVIDERS}
                availableModels={availableModels}
                onProviderChange={handleProviderChange}
                onModelChange={handleModelChange}
                onApiKeyChange={handleApiKeyChange}
                onBaseUrlChange={handleBaseUrlChange}
                onTemperatureChange={handleTemperatureChange}
                onSystemPromptChange={handleSystemPromptChange}
                onVoiceConfigChange={handleVoiceConfigChange}
                onFeedback={showFeedback}
              />
            )}

            {activeTab === 'statistics' && <StatisticsTab />}

            {activeTab === 'performance' && (
              <PerformanceTab
                config={localConfig}
                onConfigChange={setLocalConfig}
                onFeedback={showFeedback}
              />
            )}

            {activeTab === 'advanced' && (
              <AdvancedTab
                mcpServers={mcpServers}
                mcpServerStates={mcpServerStates}
                onAddServer={handleMCPAddServer}
                onRemoveServer={handleMCPRemoveServer}
                onConnect={handleMCPConnect}
                onDisconnect={handleMCPDisconnect}
              />
            )}
          </div>

          <footer className="settings-content-footer">
            <Button onClick={handleClose} variant="outline">
              取消
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                '保存中...'
              ) : (
                <span className="flex items-center gap-1">
                  <Save className="w-4 h-4" />
                  保存
                </span>
              )}
            </Button>
          </footer>
        </div>
      </div>
    </div>
  );
}
