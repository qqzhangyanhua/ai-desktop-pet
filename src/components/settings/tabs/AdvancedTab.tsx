import { MCPSettings } from '../MCPSettings';
import { SchedulerTestPanel } from '../SchedulerTestPanel';
import { DataSettings } from '../DataSettings';
import { AgentAuditPanel } from '../AgentAuditPanel';
import { AgentToolPolicyPanel } from '../AgentToolPolicyPanel';
import type { MCPServerConfig, MCPClientState } from '../../../services/mcp/types';

interface AdvancedTabProps {
  mcpServers: MCPServerConfig[];
  mcpServerStates: Map<string, MCPClientState>;
  onAddServer: (config: MCPServerConfig) => Promise<void>;
  onRemoveServer: (serverId: string) => void;
  onConnect: (serverId: string) => Promise<void>;
  onDisconnect: (serverId: string) => Promise<void>;
}

export function AdvancedTab({
  mcpServers,
  mcpServerStates,
  onAddServer,
  onRemoveServer,
  onConnect,
  onDisconnect,
}: AdvancedTabProps) {
  return (
    <>
      <MCPSettings
        servers={mcpServers}
        serverStates={mcpServerStates}
        onAddServer={onAddServer}
        onRemoveServer={onRemoveServer}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />
      <AgentToolPolicyPanel />
      <AgentAuditPanel />
      <SchedulerTestPanel />
      <DataSettings />
    </>
  );
}
