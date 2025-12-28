import { MCPSettings } from '../MCPSettings';
import { SchedulerTestPanel } from '../SchedulerTestPanel';
import { DataSettings } from '../DataSettings';
import type { MCPServerConfig, MCPClientState } from '../../../services/mcp/types';

interface AdvancedTabProps {
  mcpServers: MCPServerConfig[];
  mcpServerStates: Map<string, MCPClientState>;
  onMCPAddServer: (config: MCPServerConfig) => void;
  onMCPRemoveServer: (serverId: string) => void;
  onMCPConnect: (serverId: string) => Promise<void>;
  onMCPDisconnect: (serverId: string) => Promise<void>;
}

export function AdvancedTab({
  mcpServers,
  mcpServerStates,
  onMCPAddServer,
  onMCPRemoveServer,
  onMCPConnect,
  onMCPDisconnect,
}: AdvancedTabProps) {
  return (
    <>
      <MCPSettings
        servers={mcpServers}
        serverStates={mcpServerStates}
        onAddServer={onMCPAddServer}
        onRemoveServer={onMCPRemoveServer}
        onConnect={onMCPConnect}
        onDisconnect={onMCPDisconnect}
      />
      <SchedulerTestPanel />
      <DataSettings />
    </>
  );
}
