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
  MessageSquare,
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
import { ChatPanel } from '../chat';

type SettingsTab = 'appearance' | 'behavior' | 'chat' | 'assistant' | 'statistics' | 'performance' | 'advanced';

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
  chat: { icon: MessageSquare, title: '聊天对话' },
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
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
        <div className="flex gap-2">
          <div className="w-3 h-3 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.32s]" />
          <div className="w-3 h-3 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.16s]" />
          <div className="w-3 h-3 bg-rose-400 rounded-full animate-bounce" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-orange-50 p-6 font-sans text-slate-700">
      <FeedbackAnimation message={currentMessage} />
      
      <div className="w-full max-w-5xl h-[85vh] bg-white/80 backdrop-blur-xl rounded-[32px] shadow-[0_20px_40px_-15px_rgba(255,182,193,0.3)] border border-white/60 flex overflow-hidden ring-1 ring-white/50">
        {/* Sidebar */}
        <aside className="w-64 bg-white/50 border-r border-white/50 flex flex-col p-6">
          <div className="mb-8 px-2">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-2 bg-rose-100 rounded-xl">
                <Home className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-800">宠物小窝</span>
            </div>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
            {(Object.keys(TAB_CONFIGS) as SettingsTab[]).map((tab) => {
              const IconComponent = TAB_CONFIGS[tab].icon;
              const isActive = activeTab === tab;
              return (
                <Button
                  key={tab}
                  variant="ghost"
                  onClick={() => setActiveTab(tab)}
                  className={`w-full justify-start gap-3 px-4 py-6 rounded-2xl transition-all duration-300 ${
                    isActive 
                      ? 'bg-white shadow-sm text-rose-500 ring-1 ring-rose-100' 
                      : 'hover:bg-white/60 text-slate-600 hover:text-rose-500'
                  }`}
                >
                  <IconComponent className={`w-5 h-5 ${isActive ? 'text-rose-500' : 'text-slate-400'}`} />
                  <span className="font-medium">{TAB_CONFIGS[tab].title.replace('设置', '')}</span>
                </Button>
              );
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white/20">
          {/* Header */}
          <header className="px-8 py-5 border-b border-white/50 flex justify-between items-center bg-white/30 backdrop-blur-sm sticky top-0 z-10">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
              <div className={`p-2 rounded-xl ${
                activeTab === 'appearance' ? 'bg-orange-100 text-orange-500' :
                activeTab === 'behavior' ? 'bg-blue-100 text-blue-500' :
                activeTab === 'chat' ? 'bg-green-100 text-green-500' :
                'bg-rose-100 text-rose-500'
              }`}>
                {(() => {
                  const IconComponent = TAB_CONFIGS[activeTab].icon;
                  return <IconComponent className="w-5 h-5" />;
                })()}
              </div>
              <span>{TAB_CONFIGS[activeTab].title}</span>
            </h2>
            <Button 
              onClick={handleClose} 
              variant="ghost" 
              className="w-10 h-10 rounded-full p-0 hover:bg-rose-100 hover:text-rose-500 transition-colors"
            >
              <span className="text-2xl leading-none">×</span>
            </Button>
          </header>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-3xl mx-auto space-y-6">
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

              {activeTab === 'chat' && <ChatPanel />}

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
          </div>

          {/* Footer */}
          <footer className="px-8 py-5 border-t border-white/50 flex justify-end gap-3 bg-white/30 backdrop-blur-sm">
            <Button 
              onClick={handleClose} 
              variant="ghost"
              className="hover:bg-slate-100 text-slate-600"
            >
              取消
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-200 rounded-xl px-6"
            >
              {isSaving ? (
                '保存中...'
              ) : (
                <span className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  保存更改
                </span>
              )}
            </Button>
          </footer>
        </div>
      </div>
    </div>
  );
}
