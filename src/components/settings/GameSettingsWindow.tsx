import { useState, useCallback, useEffect, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  Mic,
  Smile,
  Users,
  Trophy,
  Bell,
  Shield,
  Fish,
  Briefcase,
  ShoppingBag,
  Home,
  Save,
  ArrowLeft
} from 'lucide-react';
import { useConfigStore, usePetStatusStore } from '../../stores';
import { initDatabase } from '../../services/database';
import { getMCPManager } from '../../services/mcp';
import { getSkinManager } from '../../services/skin';
import type { AppConfig, LLMConfig, VoiceConfig } from '../../types';
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
import './game-ui.css';

// Re-use logic types
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

export function GameSettingsWindow() {
  const { config, setConfig, saveConfig, loadConfig } = useConfigStore();
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab | null>(null); // Null means showing the dashboard
  const [dbReady, setDbReady] = useState(false);
  const didSaveRef = useRef(false);
  const initialSkinIdRef = useRef(config.appearance.skinId);

  // Pet Status
  const { status: petStatus, getStageProgress } = usePetStatusStore();
  const stageProgress = getStageProgress();
  
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

  useEffect(() => {
    return () => {
      if (didSaveRef.current) return;
      getSkinManager().switchSkin(initialSkinIdRef.current).catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!dbReady) return;
    const manager = getMCPManager();
    setMcpServers(manager.getServers());
    setMcpServerStates(manager.getServerStates());
  }, [dbReady]);

  // --- Handlers (Copied from SettingsWindow) ---
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
    showFeedback(`已切换提供商为 ${provider}`, 'success');
  }, [showFeedback]);

  const handleModelChange = useCallback((model: string) => {
    setLocalConfig((prev) => ({ ...prev, llm: { ...prev.llm, model } }));
  }, []);

  const handleApiKeyChange = useCallback((apiKey: string) => {
    setLocalConfig((prev) => ({ ...prev, llm: { ...prev.llm, apiKey } }));
  }, []);

  const handleBaseUrlChange = useCallback((baseUrl: string) => {
    setLocalConfig((prev) => ({ ...prev, llm: { ...prev.llm, baseUrl: baseUrl || undefined } }));
  }, []);

  const handleTemperatureChange = useCallback((temperature: number) => {
    setLocalConfig((prev) => ({ ...prev, llm: { ...prev.llm, temperature } }));
  }, []);

  const handleSystemPromptChange = useCallback((systemPrompt: string) => {
    setLocalConfig((prev) => ({ ...prev, systemPrompt }));
  }, []);

  const handleVoiceConfigChange = useCallback((voice: VoiceConfig) => {
    setLocalConfig((prev) => ({ ...prev, voice }));
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      setConfig(localConfig);
      await saveConfig();
      didSaveRef.current = true;
      if (activeTab === null) {
          // If on dashboard, close window
          const appWindow = getCurrentWindow();
          await appWindow.close();
      } else {
          // If on tab, just show feedback
          showFeedback('设置已保存！', 'success');
      }
    } catch (error) {
      console.error('Failed to save config:', error);
    } finally {
      setIsSaving(false);
    }
  }, [localConfig, setConfig, saveConfig, activeTab, showFeedback]);

  const handleClose = useCallback(async () => {
    const appWindow = getCurrentWindow();
    await appWindow.close();
  }, []);

  const handleBackToDashboard = () => {
      setActiveTab(null);
  }

  const availableModels = DEFAULT_MODELS[localConfig.llm.provider] ?? [];

  if (!dbReady) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
        <div className="text-xl font-bold text-rose-500 animate-pulse">Loading...</div>
      </div>
    );
  }

  // --- Render ---

  const renderDashboard = () => (
    <div className="flex w-full h-full p-6 gap-6">
      {/* Left Panel: Profile */}
      <div className="w-1/3 flex flex-col gap-4">
          <div className="game-parchment rounded-2xl p-4 flex-1 flex flex-col items-center relative overflow-hidden border-2 border-amber-900/10">
              {/* Pet Image Placeholder */}
              <div className="w-40 h-40 bg-white/50 rounded-full mb-4 border-4 border-white/80 shadow-inner flex items-center justify-center overflow-hidden">
                  {/* Ideally render Live2D static or image here. Using simple placeholder for now */}
                   <img src="/models/default/texture_00.png" alt="Pet" className="w-full h-full object-cover opacity-80" 
                        onError={(e) => {
                           (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';
                           (e.target as HTMLImageElement).style.backgroundColor = '#fca5a5';
                        }}
                   />
              </div>

              {/* Stats */}
              <div className="w-full space-y-2 px-2">
                  <div className="flex justify-between text-amber-900 font-bold border-b border-amber-900/20 pb-1 text-sm">
                      <span>昵称：</span>
                      <span>我的宠物</span>
                  </div>
                  <div className="flex justify-between text-amber-900 font-bold border-b border-amber-900/20 pb-1 text-sm">
                      <span>阶段：</span>
                      <span>{stageProgress.config.name}</span>
                  </div>
                   <div className="flex justify-between text-amber-900 font-bold border-b border-amber-900/20 pb-1 text-sm">
                      <span>心情：</span>
                      <span>{Math.round(petStatus.mood)}/100</span>
                  </div>
                   <div className="flex justify-between text-amber-900 font-bold border-b border-amber-900/20 pb-1 text-sm">
                      <span>精力：</span>
                      <span>{Math.round(petStatus.energy)}/100</span>
                  </div>

                  {/* XP Bar (Mapped to Intimacy Progress) */}
                  <div className="mt-2">
                      <div className="flex justify-between text-[10px] text-amber-900 mb-0.5 font-bold">
                          <span>亲密度</span>
                          <span>{Math.round(stageProgress.intimacy)} / {stageProgress.config.intimacyRange[1]}</span>
                      </div>
                      <div className="game-progress-bar h-2">
                          <div className="game-progress-fill" style={{ width: `${Math.max(0, Math.min(100, stageProgress.progressPercent))}%` }}></div>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* Right Panel: Actions */}
      <div className="flex-1 flex flex-col gap-4">
          {/* Title */}
          <div className="game-title-board rounded-xl p-2 text-center text-xl font-bold tracking-widest relative -mt-2 mx-auto w-3/4 z-10">
              互动交流设置
          </div>

          {/* Grid Buttons */}
          <div className="grid grid-cols-2 gap-3 flex-1">
              <button className="game-btn game-btn-blue text-base py-2" onClick={() => setActiveTab('assistant')}>
                  <Mic size={24} />
                  语音交流
              </button>
              <button className="game-btn game-btn-orange text-base py-2" onClick={() => setActiveTab('behavior')}>
                  <Smile size={24} />
                  动作表情
              </button>
              <button className="game-btn game-btn-green text-base py-2" onClick={() => setActiveTab('advanced')}>
                  <Users size={24} />
                  好友拜访
              </button>
              <button className="game-btn game-btn-pink text-base py-2" onClick={() => setActiveTab('statistics')}>
                  <Trophy size={24} />
                  分享成就
              </button>
              <button className="game-btn game-btn-orange text-base py-2" onClick={() => setActiveTab('behavior')}>
                  <Bell size={24} />
                  消息通知
              </button>
              <button className="game-btn game-btn-purple text-base py-2" onClick={() => setActiveTab('assistant')}>
                  <Shield size={24} />
                  隐私设置
              </button>
          </div>

          {/* Bottom Action Row */}
          <div className="flex gap-3 h-12 mt-1">
               <button className="game-btn game-btn-brown flex-1 justify-center text-xs" onClick={() => showFeedback('投喂成功！', 'success')}>
                  <Fish size={18} />
                  喂养宠物
               </button>
               <button className="game-btn game-btn-brown flex-1 justify-center text-xs" onClick={() => showFeedback('开始工作...', 'info')}>
                  <Briefcase size={18} />
                  工作学习
               </button>
               <button className="game-btn game-btn-brown flex-1 justify-center text-xs" onClick={() => setActiveTab('appearance')}>
                  <ShoppingBag size={18} />
                  商城道具
               </button>
               <button className="game-btn game-btn-green w-20 justify-center" onClick={handleClose}>
                  <Home size={20} />
               </button>
          </div>
      </div>
    </div>
  );

  const renderActiveTab = () => (
      <div className="flex flex-col h-full w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-amber-900/20 bg-white/30 backdrop-blur-sm rounded-t-xl">
              <button onClick={handleBackToDashboard} className="p-2 hover:bg-white/50 rounded-full transition-colors text-amber-900">
                  <ArrowLeft size={24} />
              </button>
              <h2 className="text-xl font-bold text-amber-900">
                  {activeTab === 'appearance' && '外观设置'}
                  {activeTab === 'behavior' && '行为设置'}
                  {activeTab === 'assistant' && '助手设置'}
                  {activeTab === 'statistics' && '数据统计'}
                  {activeTab === 'performance' && '性能设置'}
                  {activeTab === 'advanced' && '高级设置'}
              </h2>
              <button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className={`game-btn game-btn-green py-2 px-4 text-sm h-10 ${isSaving ? 'opacity-70 cursor-wait' : ''}`}
              >
                  <Save size={16} className="mr-2"/>
                  {isSaving ? '保存中...' : '保存更改'}
              </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 game-scrollbar bg-white/40">
              <div className="max-w-3xl mx-auto space-y-6">
                {activeTab === 'appearance' && (
                    <AppearanceTab
                    localConfig={localConfig}
                    setLocalConfig={setLocalConfig}
                    onFeedback={showFeedback}
                    />
                )}

                {activeTab === 'behavior' && (
                    <BehaviorTab
                    localConfig={localConfig}
                    setLocalConfig={setLocalConfig}
                    onFeedback={showFeedback}
                    />
                )}

                {activeTab === 'assistant' && (
                    <AssistantTab
                    localConfig={localConfig}
                    setLocalConfig={setLocalConfig}
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
                    localConfig={localConfig}
                    setLocalConfig={setLocalConfig}
                    onFeedback={showFeedback}
                    />
                )}

                {activeTab === 'advanced' && (
                    <AdvancedTab
                    mcpServers={mcpServers}
                    mcpServerStates={mcpServerStates}
                    onMCPAddServer={handleMCPAddServer}
                    onMCPRemoveServer={handleMCPRemoveServer}
                    onMCPConnect={handleMCPConnect}
                    onMCPDisconnect={handleMCPDisconnect}
                    />
                )}
              </div>
          </div>
      </div>
  );

  return (
    <div className="fixed inset-0 flex items-center justify-center p-2 game-container" 
         style={{ 
             background: 'linear-gradient(to bottom, #87CEEB, #E0F7FA)', // Fallback Nature BG
             // backgroundImage: 'url(/bg-nature.png)' // Uncomment if image exists
         }}>
      
      <FeedbackAnimation message={currentMessage} />

      {/* Main Board */}
      <div className="game-wood-board w-full max-w-5xl h-[90vh] rounded-[24px] overflow-hidden flex flex-col shadow-2xl">
          {/* Content */}
          <div className="w-full h-full relative" 
               style={{ 
                   background: '#FDF5E6', // Fallback inner bg
                   // backgroundImage: 'url(/ui-wood-pattern.png)' 
               }}>
                {activeTab ? renderActiveTab() : renderDashboard()}
          </div>
      </div>
    </div>
  );
}
