import { MCPSettings } from '../MCPSettings';
import { SchedulerTestPanel } from '../SchedulerTestPanel';
import { DataSettings } from '../DataSettings';
import { AgentToolPolicyPanel } from '../AgentToolPolicyPanel';
import { useMCPManagement } from '../../../hooks/useMCPManagement';

export function AdvancedTab() {
  const { mcpServers, mcpServerStates, handlers } = useMCPManagement(true);

  return (
    <>
      <AgentToolPolicyPanel />
      <MCPSettings
        servers={mcpServers}
        serverStates={mcpServerStates}
        onAddServer={handlers.handleMCPAddServer}
        onRemoveServer={handlers.handleMCPRemoveServer}
        onConnect={handlers.handleMCPConnect}
        onDisconnect={handlers.handleMCPDisconnect}
      />
      <SchedulerTestPanel />
      <DataSettings />
    </>
  );
}
