import { useState, useCallback, useEffect, useRef } from 'react';
import { useConfigStore } from '../../stores';
import type { AppConfig, LLMConfig, VoiceConfig } from '../../types';
import { VoiceSettings } from './VoiceSettings';
import { MCPSettings } from './MCPSettings';
import { SkinSettings } from './SkinSettings';
import { DataSettings } from './DataSettings';
import { SchedulerTestPanel } from './SchedulerTestPanel';
import { GrowthStageIndicator } from '../pet/GrowthStageIndicator';
import { StatsPanel } from './StatsPanel';
import { getMCPManager } from '../../services/mcp';
import { getSkinManager } from '../../services/skin';
import type { MCPServerConfig, MCPClientState } from '../../services/mcp/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type SettingsTab = 'appearance' | 'behavior' | 'assistant' | 'statistics' | 'performance' | 'advanced';

interface SettingsPanelProps {
  onClose: () => void;
}

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

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { config, setConfig, saveConfig } = useConfigStore();
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const didSaveRef = useRef(false);
  const initialSkinIdRef = useRef(config.appearance.skinId);

  // MCP state
  const [mcpServers, setMcpServers] = useState<MCPServerConfig[]>([]);
  const [mcpServerStates, setMcpServerStates] = useState<Map<string, MCPClientState>>(new Map());

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
    const manager = getMCPManager();
    setMcpServers(manager.getServers());
    setMcpServerStates(manager.getServerStates());
  }, []);

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
      onClose();
    } catch (error) {
      console.error('Failed to save config:', error);
    } finally {
      setIsSaving(false);
    }
  }, [localConfig, setConfig, saveConfig, onClose]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  const availableModels = DEFAULT_MODELS[localConfig.llm.provider] ?? [];

  return (
    <div className="settings-overlay no-drag" onClick={handleOverlayClick}>
      <div className="settings-panel">
        <div className="settings-header">
          <span>设置中心</span>
          <button
            onClick={onClose}
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
          <Button
            className={`settings-tab ${activeTab === 'appearance' ? 'active' : ''}`}
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('appearance')}
          >
            外观
          </Button>
          <Button
            className={`settings-tab ${activeTab === 'behavior' ? 'active' : ''}`}
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('behavior')}
          >
            行为
          </Button>
          <Button
            className={`settings-tab ${activeTab === 'assistant' ? 'active' : ''}`}
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('assistant')}
          >
            智能助手
          </Button>
          <Button
            className={`settings-tab ${activeTab === 'statistics' ? 'active' : ''}`}
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('statistics')}
          >
            统计与成就
          </Button>
          <Button
            className={`settings-tab ${activeTab === 'performance' ? 'active' : ''}`}
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('performance')}
          >
            性能
          </Button>
          <Button
            className={`settings-tab ${activeTab === 'advanced' ? 'active' : ''}`}
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('advanced')}
          >
            高级
          </Button>
        </div>

        <div className="settings-content">
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
                  <Select
                    value={localConfig.appearance.background.mode}
                    onValueChange={(mode: AppConfig['appearance']['background']['mode']) =>
                      setLocalConfig((prev) => ({
                        ...prev,
                        appearance: {
                          ...prev.appearance,
                          background: {
                            mode,
                            value: undefined,
                          },
                        },
                      }))
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">透明</SelectItem>
                      <SelectItem value="preset">预设渐变</SelectItem>
                      <SelectItem value="color">纯色</SelectItem>
                      <SelectItem value="image">图片 URL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {localConfig.appearance.background.mode === 'preset' && (
                  <div className="settings-row">
                    <span className="settings-label">预设</span>
                    <Select
                      value={localConfig.appearance.background.value ?? 'light'}
                      onValueChange={(value) =>
                        setLocalConfig((prev) => ({
                          ...prev,
                          appearance: {
                            ...prev.appearance,
                            background: { mode: 'preset', value },
                          },
                        }))
                      }
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">清新浅色</SelectItem>
                        <SelectItem value="dark">柔和深色</SelectItem>
                        <SelectItem value="sunset">日落暖色</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {localConfig.appearance.background.mode === 'color' && (
                  <div className="settings-row">
                    <span className="settings-label">颜色</span>
                    <Input
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
                    <Input
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
                    <Input
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
                    <Input
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
                    <Button
                      onClick={() =>
                        setLocalConfig((prev) => ({
                          ...prev,
                          appearance: { ...prev.appearance, size: { width: 260, height: 360 } },
                        }))
                      }
                      variant="outline"
                      size="sm"
                    >
                      小
                    </Button>
                    <Button
                      onClick={() =>
                        setLocalConfig((prev) => ({
                          ...prev,
                          appearance: { ...prev.appearance, size: { width: 300, height: 400 } },
                        }))
                      }
                      variant="outline"
                      size="sm"
                    >
                      标准
                    </Button>
                    <Button
                      onClick={() =>
                        setLocalConfig((prev) => ({
                          ...prev,
                          appearance: { ...prev.appearance, size: { width: 360, height: 480 } },
                        }))
                      }
                      variant="outline"
                      size="sm"
                    >
                      大
                    </Button>
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
                  <Select
                    value={localConfig.behavior.decaySpeed}
                    onValueChange={(value: AppConfig['behavior']['decaySpeed']) =>
                      setLocalConfig((prev) => ({
                        ...prev,
                        behavior: { ...prev.behavior, decaySpeed: value },
                      }))
                    }
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="casual">休闲</SelectItem>
                      <SelectItem value="standard">标准</SelectItem>
                      <SelectItem value="hardcore">硬核</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="settings-row">
                  <span className="settings-label">互动频率</span>
                  <Select
                    value={localConfig.behavior.interactionFrequency}
                    onValueChange={(value: AppConfig['behavior']['interactionFrequency']) =>
                      setLocalConfig((prev) => ({
                        ...prev,
                        behavior: {
                          ...prev.behavior,
                          interactionFrequency: value,
                        },
                      }))
                    }
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">低</SelectItem>
                      <SelectItem value="standard">标准</SelectItem>
                      <SelectItem value="high">高</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="settings-row">
                  <span className="settings-label">自动打工</span>
                  <Checkbox
                    checked={localConfig.behavior.autoWorkEnabled}
                    onCheckedChange={(checked) =>
                      setLocalConfig((prev) => ({
                        ...prev,
                        behavior: { ...prev.behavior, autoWorkEnabled: !!checked },
                      }))
                    }
                  />
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-section-title">通知提醒设置</div>

                <div className="settings-row">
                  <span className="settings-label">气泡提示</span>
                  <Checkbox
                    checked={localConfig.behavior.notifications.bubbleEnabled}
                    onCheckedChange={(checked) =>
                      setLocalConfig((prev) => ({
                        ...prev,
                        behavior: {
                          ...prev.behavior,
                          notifications: { ...prev.behavior.notifications, bubbleEnabled: !!checked },
                        },
                      }))
                    }
                  />
                </div>

                <div className="settings-row" style={{ borderBottom: 'none' }}>
                  <span className="settings-label">Toast 提醒</span>
                  <Checkbox
                    checked={localConfig.behavior.notifications.toastEnabled}
                    onCheckedChange={(checked) =>
                      setLocalConfig((prev) => ({
                        ...prev,
                        behavior: {
                          ...prev.behavior,
                          notifications: { ...prev.behavior.notifications, toastEnabled: !!checked },
                        },
                      }))
                    }
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
                  <Select
                    value={localConfig.llm.provider}
                    onValueChange={(value) => handleProviderChange(value as LLMConfig['provider'])}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LLM_PROVIDERS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="settings-row">
                  <span className="settings-label">模型</span>
                  <Select
                    value={localConfig.llm.model}
                    onValueChange={handleModelChange}
                  >
                    <SelectTrigger className="w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {localConfig.llm.provider !== 'ollama' && (
                  <div className="settings-row">
                    <span className="settings-label">API Key</span>
                    <Input
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
                    <Input
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
                  <Input
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
                  <Input
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
                  <Checkbox
                    checked={localConfig.assistant.privacy.saveChatHistory}
                    onCheckedChange={(checked) =>
                      setLocalConfig((prev) => ({
                        ...prev,
                        assistant: {
                          ...prev.assistant,
                          privacy: { ...prev.assistant.privacy, saveChatHistory: !!checked },
                        },
                      }))
                    }
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
                <div className="settings-section-title">成长阶段</div>
                <div style={{ marginTop: '12px' }}>
                  <GrowthStageIndicator />
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-section-title">性格与角色</div>
                <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <span className="settings-label" style={{ marginBottom: '8px' }}>
                    系统提示词
                  </span>
                  <Textarea
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
                  <Checkbox
                    checked={localConfig.interaction.clickThrough}
                    onCheckedChange={(checked) =>
                      setLocalConfig((prev) => ({
                        ...prev,
                        interaction: { ...prev.interaction, clickThrough: !!checked },
                      }))
                    }
                  />
                </div>

                <div className="settings-row">
                  <span className="settings-label">左右吸附</span>
                  <Checkbox
                    checked={localConfig.interaction.snapEnabled}
                    onCheckedChange={(checked) =>
                      setLocalConfig((prev) => ({
                        ...prev,
                        interaction: { ...prev.interaction, snapEnabled: !!checked },
                      }))
                    }
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
                  <Checkbox
                    checked={localConfig.interaction.rememberPosition}
                    onCheckedChange={(checked) =>
                      setLocalConfig((prev) => ({
                        ...prev,
                        interaction: { ...prev.interaction, rememberPosition: !!checked },
                      }))
                    }
                  />
                </div>

                <div className="settings-row">
                  <span className="settings-label">靠边自动隐藏</span>
                  <Checkbox
                    checked={localConfig.interaction.autoHideEnabled}
                    onCheckedChange={(checked) =>
                      setLocalConfig((prev) => ({
                        ...prev,
                        interaction: { ...prev.interaction, autoHideEnabled: !!checked },
                      }))
                    }
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
                  开启“鼠标穿透”后无法点击宠物与设置窗口，请通过菜单栏托盘关闭穿透。
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-section-title">性能优化</div>

                <div className="settings-row">
                  <span className="settings-label">开机自启动</span>
                  <Checkbox
                    checked={localConfig.performance.launchOnStartup}
                    onCheckedChange={(checked) =>
                      setLocalConfig((prev) => ({
                        ...prev,
                        performance: { ...prev.performance, launchOnStartup: !!checked },
                      }))
                    }
                  />
                </div>

                <div className="settings-row">
                  <span className="settings-label">后台运行模式</span>
                  <Select
                    value={localConfig.performance.backgroundMode}
                    onValueChange={(value: AppConfig['performance']['backgroundMode']) =>
                      setLocalConfig((prev) => ({
                        ...prev,
                        performance: { ...prev.performance, backgroundMode: value },
                      }))
                    }
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="balanced">均衡</SelectItem>
                      <SelectItem value="battery">省电</SelectItem>
                      <SelectItem value="performance">性能</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <Select
                    value={localConfig.performance.resourceLimit}
                    onValueChange={(value: AppConfig['performance']['resourceLimit']) =>
                      setLocalConfig((prev) => ({
                        ...prev,
                        performance: { ...prev.performance, resourceLimit: value },
                      }))
                    }
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">低</SelectItem>
                      <SelectItem value="medium">中</SelectItem>
                      <SelectItem value="high">高</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-section-title">窗口行为</div>
                <div className="settings-row">
                  <span className="settings-label">窗口置顶</span>
                  <Checkbox
                    checked={localConfig.alwaysOnTop}
                    onCheckedChange={(checked) =>
                      setLocalConfig((prev) => ({
                        ...prev,
                        alwaysOnTop: !!checked,
                      }))
                    }
                  />
                </div>

                <div className="settings-row" style={{ borderBottom: 'none' }}>
                  <span className="settings-label">启动最小化</span>
                  <Checkbox
                    checked={localConfig.startMinimized}
                    onCheckedChange={(checked) =>
                      setLocalConfig((prev) => ({
                        ...prev,
                        startMinimized: !!checked,
                      }))
                    }
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
          <Button
            onClick={onClose}
            variant="outline"
          >
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </div>
  );
}
