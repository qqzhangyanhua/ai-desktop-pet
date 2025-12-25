// MCP Settings Component

import { useState, useCallback } from 'react';
import type { MCPServerConfig, MCPClientState, MCPToolSchema } from '../../services/mcp/types';

interface MCPSettingsProps {
  servers: MCPServerConfig[];
  serverStates: Map<string, MCPClientState>;
  onAddServer: (config: MCPServerConfig) => void;
  onRemoveServer: (serverId: string) => void;
  onConnect: (serverId: string) => void;
  onDisconnect: (serverId: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  connected: '#22c55e',
  connecting: '#f59e0b',
  disconnected: '#94a3b8',
  error: '#ef4444',
};

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
    <div
      style={{
        padding: '12px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        backgroundColor: 'white',
        marginBottom: '8px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: STATUS_COLORS[status] || '#94a3b8',
              }}
            />
            <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{config.name}</span>
            <span
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                backgroundColor: '#f1f5f9',
                borderRadius: '4px',
                color: '#64748b',
              }}
            >
              {config.transport}
            </span>
          </div>

          {config.description && (
            <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0' }}>
              {config.description}
            </p>
          )}

          {config.transport === 'stdio' && config.command && (
            <p style={{ fontSize: '10px', color: '#94a3b8', margin: '4px 0', fontFamily: 'monospace' }}>
              {config.command} {config.args?.join(' ')}
            </p>
          )}

          {config.transport === 'http' && config.url && (
            <p style={{ fontSize: '10px', color: '#94a3b8', margin: '4px 0', fontFamily: 'monospace' }}>
              {config.url}
            </p>
          )}

          {state?.error && (
            <p style={{ fontSize: '11px', color: '#ef4444', margin: '4px 0' }}>
              Error: {state.error}
            </p>
          )}

          {isConnected && state?.tools && state.tools.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {state.tools.length} tools available
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                {state.tools.slice(0, 5).map((tool: MCPToolSchema) => (
                  <span
                    key={tool.name}
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      backgroundColor: '#eef2ff',
                      borderRadius: '4px',
                      color: '#6366f1',
                    }}
                  >
                    {tool.name}
                  </span>
                ))}
                {state.tools.length > 5 && (
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                    +{state.tools.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          {isConnected ? (
            <button
              onClick={onDisconnect}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                border: '1px solid #fecaca',
                borderRadius: '4px',
                backgroundColor: '#fef2f2',
                color: '#ef4444',
                cursor: 'pointer',
              }}
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={onConnect}
              disabled={isConnecting}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                border: '1px solid #86efac',
                borderRadius: '4px',
                backgroundColor: '#dcfce7',
                color: '#16a34a',
                cursor: isConnecting ? 'not-allowed' : 'pointer',
                opacity: isConnecting ? 0.7 : 1,
              }}
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </button>
          )}
          <button
            onClick={onRemove}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              backgroundColor: 'white',
              color: '#64748b',
              cursor: 'pointer',
            }}
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
    <div
      style={{
        padding: '16px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        backgroundColor: '#fafafa',
        marginBottom: '12px',
      }}
    >
      <h4 style={{ margin: '0 0 12px', fontSize: '14px' }}>Add MCP Server</h4>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
          Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., File System"
          style={{
            width: '100%',
            padding: '8px',
            fontSize: '13px',
            border: errors.name ? '1px solid #ef4444' : '1px solid #e2e8f0',
            borderRadius: '6px',
            boxSizing: 'border-box',
          }}
        />
        {errors.name && <span style={{ fontSize: '11px', color: '#ef4444' }}>{errors.name}</span>}
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
          Description
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description"
          style={{
            width: '100%',
            padding: '8px',
            fontSize: '13px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
          Transport
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setTransport('stdio')}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              border: transport === 'stdio' ? '1px solid #6366f1' : '1px solid #e2e8f0',
              borderRadius: '6px',
              backgroundColor: transport === 'stdio' ? '#eef2ff' : 'white',
              color: transport === 'stdio' ? '#6366f1' : '#64748b',
              cursor: 'pointer',
            }}
          >
            stdio
          </button>
          <button
            onClick={() => setTransport('http')}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              border: transport === 'http' ? '1px solid #6366f1' : '1px solid #e2e8f0',
              borderRadius: '6px',
              backgroundColor: transport === 'http' ? '#eef2ff' : 'white',
              color: transport === 'http' ? '#6366f1' : '#64748b',
              cursor: 'pointer',
            }}
          >
            HTTP
          </button>
        </div>
      </div>

      {transport === 'stdio' && (
        <>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
              Command *
            </label>
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="e.g., npx"
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '13px',
                fontFamily: 'monospace',
                border: errors.command ? '1px solid #ef4444' : '1px solid #e2e8f0',
                borderRadius: '6px',
                boxSizing: 'border-box',
              }}
            />
            {errors.command && <span style={{ fontSize: '11px', color: '#ef4444' }}>{errors.command}</span>}
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
              Arguments
            </label>
            <input
              type="text"
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              placeholder="e.g., -y @modelcontextprotocol/server-filesystem"
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '13px',
                fontFamily: 'monospace',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </>
      )}

      {transport === 'http' && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
            URL *
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="e.g., http://localhost:3000/mcp"
            style={{
              width: '100%',
              padding: '8px',
              fontSize: '13px',
              fontFamily: 'monospace',
              border: errors.url ? '1px solid #ef4444' : '1px solid #e2e8f0',
              borderRadius: '6px',
              boxSizing: 'border-box',
            }}
          />
          {errors.url && <span style={{ fontSize: '11px', color: '#ef4444' }}>{errors.url}</span>}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button
          onClick={onCancel}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            backgroundColor: 'white',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: '#6366f1',
            color: 'white',
            cursor: 'pointer',
          }}
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
          style={{
            width: '100%',
            padding: '8px',
            marginBottom: '12px',
            fontSize: '12px',
            border: '1px dashed #e2e8f0',
            borderRadius: '6px',
            backgroundColor: 'white',
            cursor: 'pointer',
            color: '#64748b',
          }}
        >
          + Add MCP Server
        </button>
      )}

      {servers.length === 0 ? (
        <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
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

      <div
        style={{
          fontSize: '11px',
          color: '#94a3b8',
          padding: '8px',
          backgroundColor: '#f8fafc',
          borderRadius: '6px',
          marginTop: '8px',
        }}
      >
        MCP servers provide additional tools for the AI agent. Connect to servers like filesystem,
        GitHub, or custom servers to extend capabilities.
      </div>
    </div>
  );
}
