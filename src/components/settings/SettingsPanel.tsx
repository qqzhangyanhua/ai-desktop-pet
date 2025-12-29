import { useState, useCallback, useEffect, useRef } from 'react';
import { useConfigStore } from '../../stores';
import type { AppConfig, VoiceConfig } from '../../types';
import { AppearanceTab } from './tabs/AppearanceTab';
import { BehaviorTab } from './tabs/BehaviorTab';
import { AssistantTab } from './tabs/AssistantTab';
import { PerformanceTab } from './tabs/PerformanceTab';
import { AdvancedTab } from './tabs/AdvancedTab';
import { MemoryTab } from './tabs/MemoryTab';
import { StatsPanel } from './StatsPanel';
import { getMCPManager } from '../../services/mcp';
import { getSkinManager } from '../../services/skin';
import type { MCPServerConfig, MCPClientState } from '../../services/mcp/types';
import { Button } from '@/components/ui/button';

type SettingsTab = 'appearance' | 'behavior' | 'assistant' | 'statistics' | 'performance' | 'advanced' | 'memory';

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { config, setConfig, saveConfig } = useConfigStore();
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const didSaveRef = useRef(false);
  const initialSkinIdRef = useRef(config.appearance.skinId);

  const [mcpServers, setMcpServers] = useState<MCPServerConfig[]>([]);
  const [mcpServerStates, setMcpServerStates] = useState<Map<string, MCPClientState>>(new Map());

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  useEffect(() => {
    return () => {
      if (didSaveRef.current) return;
      const initialSkinId = initialSkinIdRef.current;
      getSkinManager().switchSkin(initialSkinId).catch(() => {});
    };
  }, []);

  useEffect(() => {
    const manager = getMCPManager();
    setMcpServers(manager.getServers());
    setMcpServerStates(manager.getServerStates());
  }, []);

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
          <Button
            className={`settings-tab ${activeTab === 'memory' ? 'active' : ''}`}
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('memory')}
          >
            记忆管理
          </Button>
        </div>

        <div className="settings-content">
          {activeTab === 'appearance' && (
            <AppearanceTab
              localConfig={localConfig}
              setLocalConfig={setLocalConfig}
            />
          )}

          {activeTab === 'behavior' && (
            <BehaviorTab
              localConfig={localConfig}
              setLocalConfig={setLocalConfig}
            />
          )}

          {activeTab === 'assistant' && (
            <AssistantTab
              localConfig={localConfig}
              setLocalConfig={setLocalConfig}
              handleVoiceConfigChange={handleVoiceConfigChange}
            />
          )}

          {activeTab === 'statistics' && <StatsPanel />}

          {activeTab === 'performance' && (
            <PerformanceTab
              localConfig={localConfig}
              setLocalConfig={setLocalConfig}
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

          {activeTab === 'memory' && <MemoryTab />}
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
          <Button onClick={onClose} variant="outline">
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
