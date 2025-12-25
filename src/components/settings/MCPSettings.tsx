// MCP Settings Component

import { useState, useCallback } from 'react';
import type { MCPServerConfig, MCPClientState, MCPToolSchema } from '../../services/mcp/types';
import { serverCardStyles, formStyles, settingsStyles } from './mcp/styles';

interface MCPSettingsProps {
  servers: MCPServerConfig[];
  serverStates: Map<string, MCPClientState>;
  onAddServer: (config: MCPServerConfig) => void;
  onRemoveServer: (serverId: string) => void;
  onConnect: (serverId: string) => void;
  onDisconnect: (serverId: string) => void;
}

function ServerCard({
  config,
  state,
  onConnect,
  onDisconnect,
  onRemove,
}: {
  config: MCPServerConfig;
  state: MCPClientState | undefined;
  onConnect: () => void;
  onDisconnect: () => void;
  onRemove: () => void;
}) {
  const status = state?.status ?? 'disconnected';
  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  return (
    <div style={serverCardStyles.container}>
      <div style={serverCardStyles.header}>
        <div style={serverCardStyles.content}>
          <div style={serverCardStyles.titleRow}>
            <div style={serverCardStyles.statusIndicator(status)} />
            <span style={serverCardStyles.title}>{config.name}</span>
            <span style={serverCardStyles.transportBadge}>
              {config.transport}
            </span>
          </div>

          {config.description && (
            <p style={serverCardStyles.description}>
              {config.description}
            </p>
          )}

          {config.transport === 'stdio' && config.command && (
            <p style={serverCardStyles.commandText}>
              {config.command} {config.args?.join(' ')}
            </p>
          )}

          {config.transport === 'http' && config.url && (
            <p style={serverCardStyles.commandText}>
              {config.url}
            </p>
          )}

          {state?.error && (
            <p style={serverCardStyles.errorText}>
              Error: {state.error}
            </p>
          )}

          {isConnected && state?.tools && state.tools.length > 0 && (
            <div style={serverCardStyles.toolsContainer}>
              <span style={serverCardStyles.toolsLabel}>
                {state.tools.length} tools available
              </span>
              <div style={serverCardStyles.toolsList}>
                {state.tools.slice(0, 5).map((tool: MCPToolSchema) => (
                  <span
                    key={tool.name}
                    style={serverCardStyles.toolBadge}
                  >
                    {tool.name}
                  </span>
                ))}
                {state.tools.length > 5 && (
                  <span style={serverCardStyles.toolsMore}>
                    +{state.tools.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={serverCardStyles.actions}>
          {isConnected ? (
            <button
              onClick={onDisconnect}
              style={serverCardStyles.disconnectButton}
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={onConnect}
              disabled={isConnecting}
              style={serverCardStyles.connectButton(isConnecting)}
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </button>
          )}
          <button
            onClick={onRemove}
            style={serverCardStyles.removeButton}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function AddServerForm({
  onAdd,
  onCancel,
}: {
  onAdd: (config: MCPServerConfig) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [transport, setTransport] = useState<'stdio' | 'http'>('stdio');
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState('');
  const [url, setUrl] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (transport === 'stdio' && !command.trim()) {
      newErrors.command = 'Command is required';
    }

    if (transport === 'http' && !url.trim()) {
      newErrors.url = 'URL is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, transport, command, url]);

  const handleSubmit = useCallback(() => {
    if (!validate()) return;

    const config: MCPServerConfig = {
      id: `mcp_${Date.now()}`,
      name: name.trim(),
      description: description.trim() || undefined,
      transport,
      ...(transport === 'stdio'
        ? {
            command: command.trim(),
            args: args.trim() ? args.split(' ').filter(Boolean) : undefined,
          }
        : {
            url: url.trim(),
          }),
    };

    onAdd(config);
  }, [name, description, transport, command, args, url, validate, onAdd]);

  return (
    <div style={formStyles.container}>
      <h4 style={formStyles.title}>Add MCP Server</h4>

      <div style={formStyles.fieldContainer}>
        <label style={formStyles.label}>
          Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., File System"
          style={formStyles.input(!!errors.name)}
        />
        {errors.name && <span style={formStyles.errorText}>{errors.name}</span>}
      </div>

      <div style={formStyles.fieldContainer}>
        <label style={formStyles.label}>
          Description
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description"
          style={formStyles.input(false)}
        />
      </div>

      <div style={formStyles.fieldContainer}>
        <label style={formStyles.label}>
          Transport
        </label>
        <div style={formStyles.transportButtons}>
          <button
            onClick={() => setTransport('stdio')}
            style={formStyles.transportButton(transport === 'stdio')}
          >
            stdio
          </button>
          <button
            onClick={() => setTransport('http')}
            style={formStyles.transportButton(transport === 'http')}
          >
            HTTP
          </button>
        </div>
      </div>

      {transport === 'stdio' && (
        <>
          <div style={formStyles.fieldContainer}>
            <label style={formStyles.label}>
              Command *
            </label>
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="e.g., npx"
              style={formStyles.inputMonospace(!!errors.command)}
            />
            {errors.command && <span style={formStyles.errorText}>{errors.command}</span>}
          </div>

          <div style={formStyles.fieldContainer}>
            <label style={formStyles.label}>
              Arguments
            </label>
            <input
              type="text"
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              placeholder="e.g., -y @modelcontextprotocol/server-filesystem"
              style={formStyles.inputMonospace(false)}
            />
          </div>
        </>
      )}

      {transport === 'http' && (
        <div style={formStyles.fieldContainer}>
          <label style={formStyles.label}>
            URL *
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="e.g., http://localhost:3000/mcp"
            style={formStyles.inputMonospace(!!errors.url)}
          />
          {errors.url && <span style={formStyles.errorText}>{errors.url}</span>}
        </div>
      )}

      <div style={formStyles.buttonRow}>
        <button
          onClick={onCancel}
          style={formStyles.cancelButton}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          style={formStyles.submitButton}
        >
          Add Server
        </button>
      </div>
    </div>
  );
}

export function MCPSettings({
  servers,
  serverStates,
  onAddServer,
  onRemoveServer,
  onConnect,
  onDisconnect,
}: MCPSettingsProps) {
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAdd = useCallback(
    (config: MCPServerConfig) => {
      onAddServer(config);
      setShowAddForm(false);
    },
    [onAddServer]
  );

  return (
    <div className="settings-section">
      <div className="settings-section-title">MCP Servers</div>

      {showAddForm ? (
        <AddServerForm onAdd={handleAdd} onCancel={() => setShowAddForm(false)} />
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          style={settingsStyles.addButton}
        >
          + Add MCP Server
        </button>
      )}

      {servers.length === 0 ? (
        <p style={settingsStyles.emptyState}>
          No MCP servers configured
        </p>
      ) : (
        servers.map((server) => (
          <ServerCard
            key={server.id}
            config={server}
            state={serverStates.get(server.id)}
            onConnect={() => onConnect(server.id)}
            onDisconnect={() => onDisconnect(server.id)}
            onRemove={() => onRemoveServer(server.id)}
          />
        ))
      )}

      <div style={settingsStyles.helpText}>
        MCP servers provide additional tools for the AI agent. Connect to servers like filesystem,
        GitHub, or custom servers to extend capabilities.
      </div>
    </div>
  );
}
