// MCP types

export type MCPTransport = 'stdio' | 'http';

export interface MCPServerConfig {
  id: string;
  name: string;
  transport: MCPTransport;
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  enabled: boolean;
  createdAt: number;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export type MCPConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface MCPConnection {
  serverId: string;
  status: MCPConnectionStatus;
  tools: MCPTool[];
  resources: MCPResource[];
  error?: string;
}

export interface MCPState {
  servers: MCPServerConfig[];
  connections: Record<string, MCPConnection>;
}
