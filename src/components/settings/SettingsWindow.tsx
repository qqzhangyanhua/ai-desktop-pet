import { useState, useCallback, useEffect, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useConfigStore } from '../../stores';
import { initDatabase } from '../../services/database';
import type { AppConfig, LLMConfig, VoiceConfig } from '../../types';
import { VoiceSettings } from './VoiceSettings';
import { MCPSettings } from './MCPSettings';
import { SkinSettings } from './SkinSettings';
import { DataSettings } from './DataSettings';
import { SchedulerTestPanel } from './SchedulerTestPanel';
import { StatsPanel } from './StatsPanel';
import { getMCPManager } from '../../services/mcp';
import { getSkinManager } from '../../services/skin';
import type { MCPServerConfig, MCPClientState } from '../../services/mcp/types';

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

  // Initialize database and load config
  useEffect(() => {
    initDatabase()
      .then(async () => {
        await loadConfig();
        setDbReady(true);
      })
      .catch((err) => {
        console.error('[SettingsWindow] Failed to initialize:', err);
        setDbReady(true); // Set ready anyway to show UI
      });
  }, [loadConfig]);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  // 若用户在未保存的情况下预览切换了形象，关闭设置时回滚到打开前的形象
  useEffect(() => {
    return () => {
      if (didSaveRef.current) return;
      const initialSkinId = initialSkinIdRef.current;
      getSkinManager().switchSkin(initialSkinId).catch(() => {
        // 静默失败：可能是形象已被删除或未加载
      });
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

    // Auto-connect
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
  }, []);

  const handleModelChange = useCallback((model: string) => {
    setLocalConfig((prev) => ({
      ...prev,
      llm: { ...prev.llm, model },
    }));
  }, []);

  const handleApiKeyChange = useCallback((apiKey: string) => {
    setLocalConfig((prev) => ({
      ...prev,
      llm: { ...prev.llm, apiKey },
    }));
  }, []);

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
  }, []);

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
      // Close window after saving
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
      <div
        style={{
          width: '100%',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'white',
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
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', background: 'white' }}>
      <div className="settings-header">
        <span>设置中心</span>
        <button
          onClick={handleClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          ×
        </button>
      </div>

      <div className="settings-tabs">
        <button
          className={`settings-tab ${activeTab === 'appearance' ? 'active' : ''}`}
          onClick={() => setActiveTab('appearance')}
        >
          外观
        </button>
        <button
          className={`settings-tab ${activeTab === 'behavior' ? 'active' : ''}`}
          onClick={() => setActiveTab('behavior')}
        >
          行为
        </button>
        <button
          className={`settings-tab ${activeTab === 'assistant' ? 'active' : ''}`}
          onClick={() => setActiveTab('assistant')}
        >
          智能助手
        </button>
        <button
          className={`settings-tab ${activeTab === 'statistics' ? 'active' : ''}`}
          onClick={() => setActiveTab('statistics')}
        >
          统计与成就
        </button>
        <button
          className={`settings-tab ${activeTab === 'performance' ? 'active' : ''}`}
          onClick={() => setActiveTab('performance')}
        >
          性能
        </button>
        <button
          className={`settings-tab ${activeTab === 'advanced' ? 'active' : ''}`}
          onClick={() => setActiveTab('advanced')}
        >
          高级
        </button>
      </div>

      <div className="settings-content" style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'appearance' && (
          <>
            <SkinSettings
              title="宠物形象选择"
              live2dEnabled={localConfig.useLive2D}
              onLive2DEnabledChange={(enabled) =>
                setLocalConfig((prev) => ({
                  ...prev,
                  useLive2D: enabled,
                  live2d: { ...prev.live2d, useLive2D: enabled },
                }))
              }
              scale={localConfig.live2d.modelScale}
              onScaleChange={(scale) =>
                setLocalConfig((prev) => ({
                  ...prev,
                  live2d: { ...prev.live2d, modelScale: scale },
                }))
              }
              onSkinChange={(skinId) =>
                setLocalConfig((prev) => ({
                  ...prev,
                  appearance: { ...prev.appearance, skinId },
                }))
              }
            />

            <div className="settings-section">
              <div className="settings-section-title">场景背景</div>

              <div className="settings-row">
                <span className="settings-label">背景类型</span>
                <select
                  className="settings-select"
                  value={localConfig.appearance.background.mode}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      appearance: {
                        ...prev.appearance,
                        background: {
                          mode: e.target.value as AppConfig['appearance']['background']['mode'],
                          value: undefined,
                        },
                      },
                    }))
                  }
                >
                  <option value="none">透明</option>
                  <option value="preset">预设渐变</option>
                  <option value="color">纯色</option>
                  <option value="image">图片 URL</option>
                </select>
              </div>

              {localConfig.appearance.background.mode === 'preset' && (
                <div className="settings-row">
                  <span className="settings-label">预设</span>
                  <select
                    className="settings-select"
                    value={localConfig.appearance.background.value ?? 'light'}
                    onChange={(e) =>
                      setLocalConfig((prev) => ({
                        ...prev,
                        appearance: {
                          ...prev.appearance,
                          background: { mode: 'preset', value: e.target.value },
                        },
                      }))
                    }
                  >
                    <option value="light">清新浅色</option>
                    <option value="dark">柔和深色</option>
                    <option value="sunset">日落暖色</option>
                  </select>
                </div>
              )}

              {localConfig.appearance.background.mode === 'color' && (
                <div className="settings-row">
                  <span className="settings-label">颜色</span>
                  <input
                    type="text"
                    className="settings-input"
                    value={localConfig.appearance.background.value ?? 'rgba(255,255,255,0.75)'}
                    onChange={(e) =>
                      setLocalConfig((prev) => ({
                        ...prev,
                        appearance: {
                          ...prev.appearance,
                          background: { mode: 'color', value: e.target.value },
                        },
                      }))
                    }
                    placeholder="例如：rgba(255,255,255,0.75)"
                  />
                </div>
              )}

              {localConfig.appearance.background.mode === 'image' && (
                <div className="settings-row">
                  <span className="settings-label">图片 URL</span>
                  <input
                    type="text"
                    className="settings-input"
                    value={localConfig.appearance.background.value ?? ''}
                    onChange={(e) =>
                      setLocalConfig((prev) => ({
                        ...prev,
                        appearance: {
                          ...prev.appearance,
                          background: { mode: 'image', value: e.target.value },
                        },
                      }))
                    }
                    placeholder="https://..."
                  />
                </div>
              )}
            </div>

            <div className="settings-section">
              <div className="settings-section-title">透明度与尺寸</div>

              <div className="settings-row">
                <span className="settings-label">透明度</span>
                <input
                  type="range"
                  min="0.2"
                  max="1"
                  step="0.05"
                  value={localConfig.appearance.opacity}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      appearance: { ...prev.appearance, opacity: parseFloat(e.target.value) },
                    }))
                  }
                  style={{ width: '150px' }}
                />
                <span style={{ marginLeft: '8px', fontSize: '12px' }}>
                  {Math.round(localConfig.appearance.opacity * 100)}%
                </span>
              </div>

              <div className="settings-row">
                <span className="settings-label">显示尺寸</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    className="settings-input"
                    value={localConfig.appearance.size.width}
                    onChange={(e) =>
                      setLocalConfig((prev) => ({
                        ...prev,
                        appearance: {
                          ...prev.appearance,
                          size: {
                            ...prev.appearance.size,
                            width: Math.max(200, Math.min(900, parseInt(e.target.value || '0', 10))),
                          },
                        },
                      }))
                    }
                    style={{ width: '92px' }}
                  />
                  <span style={{ fontSize: '12px', color: '#666' }}>×</span>
                  <input
                    type="number"
                    className="settings-input"
                    value={localConfig.appearance.size.height}
                    onChange={(e) =>
                      setLocalConfig((prev) => ({
                        ...prev,
                        appearance: {
                          ...prev.appearance,
                          size: {
                            ...prev.appearance.size,
                            height: Math.max(240, Math.min(1200, parseInt(e.target.value || '0', 10))),
                          },
                        },
                      }))
                    }
                    style={{ width: '92px' }}
                  />
                </div>
              </div>

              <div className="settings-row" style={{ borderBottom: 'none', gap: '8px' }}>
                <span className="settings-label">快速预设</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() =>
                      setLocalConfig((prev) => ({
                        ...prev,
                        appearance: { ...prev.appearance, size: { width: 260, height: 360 } },
                      }))
                    }
                    style={{
                      padding: '6px 10px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      background: 'white',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    小
                  </button>
                  <button
                    onClick={() =>
                      setLocalConfig((prev) => ({
                        ...prev,
                        appearance: { ...prev.appearance, size: { width: 300, height: 400 } },
                      }))
                    }
                    style={{
                      padding: '6px 10px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      background: 'white',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    标准
                  </button>
                  <button
                    onClick={() =>
                      setLocalConfig((prev) => ({
                        ...prev,
                        appearance: { ...prev.appearance, size: { width: 360, height: 480 } },
                      }))
                    }
                    style={{
                      padding: '6px 10px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      background: 'white',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    大
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'behavior' && (
          <>
            <div className="settings-section">
              <div className="settings-section-title">属性衰减与互动</div>

              <div className="settings-row">
                <span className="settings-label">属性衰减速度</span>
                <select
                  className="settings-select"
                  value={localConfig.behavior.decaySpeed}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      behavior: { ...prev.behavior, decaySpeed: e.target.value as AppConfig['behavior']['decaySpeed'] },
                    }))
                  }
                >
                  <option value="casual">休闲</option>
                  <option value="standard">标准</option>
                  <option value="hardcore">硬核</option>
                </select>
              </div>

              <div className="settings-row">
                <span className="settings-label">互动频率</span>
                <select
                  className="settings-select"
                  value={localConfig.behavior.interactionFrequency}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      behavior: {
                        ...prev.behavior,
                        interactionFrequency: e.target.value as AppConfig['behavior']['interactionFrequency'],
                      },
                    }))
                  }
                >
                  <option value="low">低</option>
                  <option value="standard">标准</option>
                  <option value="high">高</option>
                </select>
              </div>

              <div className="settings-row">
                <span className="settings-label">自动打工</span>
                <input
                  type="checkbox"
                  checked={localConfig.behavior.autoWorkEnabled}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      behavior: { ...prev.behavior, autoWorkEnabled: e.target.checked },
                    }))
                  }
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-section-title">通知提醒设置</div>

              <div className="settings-row">
                <span className="settings-label">气泡提示</span>
                <input
                  type="checkbox"
                  checked={localConfig.behavior.notifications.bubbleEnabled}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      behavior: {
                        ...prev.behavior,
                        notifications: { ...prev.behavior.notifications, bubbleEnabled: e.target.checked },
                      },
                    }))
                  }
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </div>

              <div className="settings-row" style={{ borderBottom: 'none' }}>
                <span className="settings-label">Toast 提醒</span>
                <input
                  type="checkbox"
                  checked={localConfig.behavior.notifications.toastEnabled}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      behavior: {
                        ...prev.behavior,
                        notifications: { ...prev.behavior.notifications, toastEnabled: e.target.checked },
                      },
                    }))
                  }
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </div>
            </div>
          </>
        )}

        {activeTab === 'assistant' && (
          <>
            <div className="settings-section">
              <div className="settings-section-title">AI模型选择</div>

              <div className="settings-row">
                <span className="settings-label">模型提供方</span>
                <select
                  className="settings-select"
                  value={localConfig.llm.provider}
                  onChange={(e) => handleProviderChange(e.target.value as LLMConfig['provider'])}
                >
                  {LLM_PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="settings-row">
                <span className="settings-label">模型</span>
                <select
                  className="settings-select"
                  value={localConfig.llm.model}
                  onChange={(e) => handleModelChange(e.target.value)}
                >
                  {availableModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {localConfig.llm.provider !== 'ollama' && (
                <div className="settings-row">
                  <span className="settings-label">API Key</span>
                  <input
                    type="password"
                    className="settings-input"
                    value={localConfig.llm.apiKey ?? ''}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    placeholder="请输入 API Key..."
                  />
                </div>
              )}

              {localConfig.llm.provider === 'ollama' && (
                <div className="settings-row">
                  <span className="settings-label">Base URL</span>
                  <input
                    type="text"
                    className="settings-input"
                    value={localConfig.llm.baseUrl ?? 'http://localhost:11434/api'}
                    onChange={(e) => handleBaseUrlChange(e.target.value)}
                    placeholder="http://localhost:11434/api"
                  />
                </div>
              )}

              <div className="settings-row" style={{ borderBottom: 'none' }}>
                <span className="settings-label">Temperature</span>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={localConfig.llm.temperature ?? 0.7}
                  onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
                  style={{ width: '150px' }}
                />
                <span style={{ marginLeft: '8px', fontSize: '12px' }}>
                  {localConfig.llm.temperature?.toFixed(1) ?? '0.7'}
                </span>
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-section-title">快捷键设置</div>

              <div className="settings-row">
                <span className="settings-label">打开聊天</span>
                <input
                  type="text"
                  className="settings-input"
                  value={localConfig.assistant.shortcuts.openChat}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      assistant: {
                        ...prev.assistant,
                        shortcuts: { ...prev.assistant.shortcuts, openChat: e.target.value },
                      },
                    }))
                  }
                  placeholder="例如：CmdOrCtrl+Shift+C"
                />
              </div>

              <div className="settings-row" style={{ borderBottom: 'none' }}>
                <span className="settings-label">打开设置</span>
                <input
                  type="text"
                  className="settings-input"
                  value={localConfig.assistant.shortcuts.openSettings}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      assistant: {
                        ...prev.assistant,
                        shortcuts: { ...prev.assistant.shortcuts, openSettings: e.target.value },
                      },
                    }))
                  }
                  placeholder="例如：CmdOrCtrl+Shift+S"
                />
              </div>
            </div>

            <VoiceSettings config={localConfig.voice} onChange={handleVoiceConfigChange} />

            <div className="settings-section">
              <div className="settings-section-title">隐私设置（对话历史）</div>

              <div className="settings-row">
                <span className="settings-label">保存对话历史</span>
                <input
                  type="checkbox"
                  checked={localConfig.assistant.privacy.saveChatHistory}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      assistant: {
                        ...prev.assistant,
                        privacy: { ...prev.assistant.privacy, saveChatHistory: e.target.checked },
                      },
                    }))
                  }
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </div>

              <div
                className="settings-row"
                style={{
                  fontSize: '11px',
                  color: '#888',
                  borderBottom: 'none',
                  paddingTop: '4px',
                }}
              >
                关闭后：新的对话不会写入本地数据库，但当前会话仍会在窗口内显示
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-section-title">性格与角色</div>
              <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <span className="settings-label" style={{ marginBottom: '8px' }}>
                  系统提示词
                </span>
                <textarea
                  className="settings-input"
                  value={localConfig.systemPrompt}
                  onChange={(e) => handleSystemPromptChange(e.target.value)}
                  placeholder="请输入系统提示词..."
                  rows={4}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>
            </div>
          </>
        )}

        {activeTab === 'statistics' && <StatsPanel />}

        {activeTab === 'performance' && (
          <>
            <div className="settings-section">
              <div className="settings-section-title">桌宠交互体验</div>

              <div className="settings-row">
                <span className="settings-label">鼠标穿透（点到桌面）</span>
                <input
                  type="checkbox"
                  checked={localConfig.interaction.clickThrough}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      interaction: { ...prev.interaction, clickThrough: e.target.checked },
                    }))
                  }
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </div>

              <div className="settings-row">
                <span className="settings-label">左右吸附</span>
                <input
                  type="checkbox"
                  checked={localConfig.interaction.snapEnabled}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      interaction: { ...prev.interaction, snapEnabled: e.target.checked },
                    }))
                  }
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </div>

              <div className="settings-row">
                <span className="settings-label">吸附阈值</span>
                <input
                  type="range"
                  min="8"
                  max="48"
                  step="2"
                  value={localConfig.interaction.snapThreshold}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      interaction: { ...prev.interaction, snapThreshold: parseInt(e.target.value, 10) },
                    }))
                  }
                  style={{ width: '150px' }}
                  disabled={!localConfig.interaction.snapEnabled}
                />
                <span style={{ marginLeft: '8px', fontSize: '12px' }}>
                  {localConfig.interaction.snapThreshold}px
                </span>
              </div>

              <div className="settings-row" style={{ borderBottom: 'none' }}>
                <span className="settings-label">记忆窗口位置</span>
                <input
                  type="checkbox"
                  checked={localConfig.interaction.rememberPosition}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      interaction: { ...prev.interaction, rememberPosition: e.target.checked },
                    }))
                  }
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </div>

              <div className="settings-row">
                <span className="settings-label">靠边自动隐藏</span>
                <input
                  type="checkbox"
                  checked={localConfig.interaction.autoHideEnabled}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      interaction: { ...prev.interaction, autoHideEnabled: e.target.checked },
                    }))
                  }
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </div>

              <div className="settings-row">
                <span className="settings-label">隐藏露出</span>
                <input
                  type="range"
                  min="30"
                  max="120"
                  step="5"
                  value={localConfig.interaction.autoHideOffset}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      interaction: { ...prev.interaction, autoHideOffset: parseInt(e.target.value, 10) },
                    }))
                  }
                  style={{ width: '150px' }}
                  disabled={!localConfig.interaction.autoHideEnabled}
                />
                <span style={{ marginLeft: '8px', fontSize: '12px' }}>
                  {localConfig.interaction.autoHideOffset}px
                </span>
              </div>

              <div
                className="settings-row"
                style={{
                  fontSize: '11px',
                  color: '#888',
                  borderBottom: 'none',
                  paddingTop: '4px',
                }}
              >
                开启"鼠标穿透"后无法点击宠物与设置窗口,请通过菜单栏托盘关闭穿透。
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-section-title">性能优化</div>

              <div className="settings-row">
                <span className="settings-label">开机自启动</span>
                <input
                  type="checkbox"
                  checked={localConfig.performance.launchOnStartup}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      performance: { ...prev.performance, launchOnStartup: e.target.checked },
                    }))
                  }
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </div>

              <div className="settings-row">
                <span className="settings-label">后台运行模式</span>
                <select
                  className="settings-select"
                  value={localConfig.performance.backgroundMode}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      performance: { ...prev.performance, backgroundMode: e.target.value as AppConfig['performance']['backgroundMode'] },
                    }))
                  }
                >
                  <option value="balanced">均衡</option>
                  <option value="battery">省电</option>
                  <option value="performance">性能</option>
                </select>
              </div>

              <div className="settings-row">
                <span className="settings-label">动画帧率</span>
                <input
                  type="range"
                  min="15"
                  max="60"
                  step="5"
                  value={localConfig.performance.animationFps}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      performance: { ...prev.performance, animationFps: parseInt(e.target.value, 10) },
                    }))
                  }
                  style={{ width: '150px' }}
                />
                <span style={{ marginLeft: '8px', fontSize: '12px' }}>
                  {localConfig.performance.animationFps} FPS
                </span>
              </div>

              <div className="settings-row" style={{ borderBottom: 'none' }}>
                <span className="settings-label">资源占用限制</span>
                <select
                  className="settings-select"
                  value={localConfig.performance.resourceLimit}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      performance: { ...prev.performance, resourceLimit: e.target.value as AppConfig['performance']['resourceLimit'] },
                    }))
                  }
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </select>
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-section-title">窗口行为</div>
              <div className="settings-row">
                <span className="settings-label">窗口置顶</span>
                <input
                  type="checkbox"
                  checked={localConfig.alwaysOnTop}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      alwaysOnTop: e.target.checked,
                    }))
                  }
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </div>

              <div className="settings-row" style={{ borderBottom: 'none' }}>
                <span className="settings-label">启动最小化</span>
                <input
                  type="checkbox"
                  checked={localConfig.startMinimized}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      startMinimized: e.target.checked,
                    }))
                  }
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </div>
            </div>

            <div
              className="settings-section"
              style={{ marginBottom: 0, color: '#888', fontSize: '11px' }}
            >
              部分性能项当前仅保存配置，后续可接入原生插件实现真正的开机自启/后台策略。
            </div>
          </>
        )}

        {activeTab === 'advanced' && (
          <>
            <MCPSettings
              servers={mcpServers}
              serverStates={mcpServerStates}
              onAddServer={handleMCPAddServer}
              onRemoveServer={handleMCPRemoveServer}
              onConnect={handleMCPConnect}
              onDisconnect={handleMCPDisconnect}
            />
            <SchedulerTestPanel />
            <DataSettings />
          </>
        )}
      </div>

      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid #eee',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
        }}
      >
        <button
          onClick={handleClose}
          style={{
            padding: '8px 16px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            background: 'white',
            cursor: 'pointer',
          }}
        >
          取消
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '8px',
            background: '#007aff',
            color: 'white',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.7 : 1,
          }}
        >
          {isSaving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  );
}
