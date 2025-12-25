import { useState, useCallback, useEffect } from 'react';
import { useConfigStore } from '../../stores';
import type { LLMConfig, VoiceConfig } from '../../types';
import { VoiceSettings } from './VoiceSettings';
import { MCPSettings } from './MCPSettings';
import { SkinSettings } from './SkinSettings';
import { DataSettings } from './DataSettings';
import { SchedulerTestPanel } from './SchedulerTestPanel';
import { getMCPManager } from '../../services/mcp';
import type { MCPServerConfig, MCPClientState } from '../../services/mcp/types';

type SettingsTab = 'general' | 'mcp' | 'skin' | 'data' | 'scheduler';

interface SettingsPanelProps {
  onClose: () => void;
}

const LLM_PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'ollama', label: 'Ollama (Local)' },
] as const;

const DEFAULT_MODELS: Record<string, string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229'],
  ollama: ['llama2', 'mistral', 'codellama', 'neural-chat'],
};

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { config, setConfig, saveConfig } = useConfigStore();
  const [localConfig, setLocalConfig] = useState(config);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // MCP state
  const [mcpServers, setMcpServers] = useState<MCPServerConfig[]>([]);
  const [mcpServerStates, setMcpServerStates] = useState<Map<string, MCPClientState>>(new Map());

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

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
          <span>Settings</span>
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
            x
          </button>
        </div>

        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
          <button
            className={`settings-tab ${activeTab === 'mcp' ? 'active' : ''}`}
            onClick={() => setActiveTab('mcp')}
          >
            MCP
          </button>
          <button
            className={`settings-tab ${activeTab === 'skin' ? 'active' : ''}`}
            onClick={() => setActiveTab('skin')}
          >
            Skins
          </button>
          <button
            className={`settings-tab ${activeTab === 'scheduler' ? 'active' : ''}`}
            onClick={() => setActiveTab('scheduler')}
          >
            Scheduler
          </button>
          <button
            className={`settings-tab ${activeTab === 'data' ? 'active' : ''}`}
            onClick={() => setActiveTab('data')}
          >
            Data
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'general' && (
            <>
              <div className="settings-section">
                <div className="settings-section-title">AI Provider</div>

            <div className="settings-row">
              <span className="settings-label">Provider</span>
              <select
                className="settings-select"
                value={localConfig.llm.provider}
                onChange={(e) =>
                  handleProviderChange(e.target.value as LLMConfig['provider'])
                }
              >
                {LLM_PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="settings-row">
              <span className="settings-label">Model</span>
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
                  placeholder="Enter API key..."
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

            <div className="settings-row">
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
            <div className="settings-section-title">Personality</div>
            <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <span className="settings-label" style={{ marginBottom: '8px' }}>
                System Prompt
              </span>
              <textarea
                className="settings-input"
                value={localConfig.systemPrompt}
                onChange={(e) => handleSystemPromptChange(e.target.value)}
                placeholder="Enter system prompt..."
                rows={4}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>
          </div>

          <VoiceSettings
            config={localConfig.voice}
            onChange={handleVoiceConfigChange}
          />

          <div className="settings-section">
            <div className="settings-section-title">Live2D Model</div>
            <div className="settings-row">
              <span className="settings-label">Enable Live2D</span>
              <input
                type="checkbox"
                checked={localConfig.useLive2D}
                onChange={(e) =>
                  setLocalConfig((prev) => ({
                    ...prev,
                    useLive2D: e.target.checked,
                    live2d: { ...prev.live2d, useLive2D: e.target.checked },
                  }))
                }
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
            </div>
            <div className="settings-row">
              <span className="settings-label">Model Scale</span>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={localConfig.live2d?.modelScale ?? 1.0}
                onChange={(e) =>
                  setLocalConfig((prev) => ({
                    ...prev,
                    live2d: { ...prev.live2d, modelScale: parseFloat(e.target.value) },
                  }))
                }
                style={{ width: '150px' }}
                disabled={!localConfig.useLive2D}
              />
              <span style={{ marginLeft: '8px', fontSize: '12px' }}>
                {(localConfig.live2d?.modelScale ?? 1.0).toFixed(1)}x
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
              {localConfig.useLive2D
                ? 'Live2D model will be displayed'
                : 'Placeholder pet will be displayed'}
            </div>
          </div>
            </>
          )}

          {activeTab === 'mcp' && (
            <MCPSettings
              servers={mcpServers}
              serverStates={mcpServerStates}
              onAddServer={handleMCPAddServer}
              onRemoveServer={handleMCPRemoveServer}
              onConnect={handleMCPConnect}
              onDisconnect={handleMCPDisconnect}
            />
          )}

          {activeTab === 'skin' && (
            <SkinSettings
              scale={localConfig.live2d?.modelScale ?? 1.0}
              onScaleChange={(scale) =>
                setLocalConfig((prev) => ({
                  ...prev,
                  live2d: { ...prev.live2d, modelScale: scale },
                }))
              }
            />
          )}

          {activeTab === 'scheduler' && (
            <SchedulerTestPanel />
          )}

          {activeTab === 'data' && (
            <DataSettings />
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
            onClick={onClose}
            style={{
              padding: '8px 16px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              background: 'white',
              cursor: 'pointer',
            }}
          >
            Cancel
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
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
