// MCP (Model Context Protocol) Types

// JSON-RPC types
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

// MCP Server configuration
export interface MCPServerConfig {
  id: string;
  name: string;
  description?: string;
  transport: 'stdio' | 'http';
  // For stdio transport
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  // For HTTP transport
  url?: string;
  headers?: Record<string, string>;
  // Connection settings
  timeout?: number;
  retryAttempts?: number;
}

// MCP connection status
export type MCPConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

// MCP Tool schema (from server)
export interface MCPToolSchema {
  name: string;
  description?: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
      default?: unknown;
    }>;
    required?: string[];
  };
}

// MCP Resource
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

// MCP Prompt
export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

// Server capabilities
export interface MCPServerCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  logging?: Record<string, unknown>;
}

// Server info
export interface MCPServerInfo {
  name: string;
  version: string;
  protocolVersion?: string;
  capabilities?: MCPServerCapabilities;
}

// Tool call request/response
export interface MCPToolCallRequest {
  name: string;
  arguments?: Record<string, unknown>;
}

export interface MCPToolCallResponse {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
    uri?: string;
  }>;
  isError?: boolean;
}

// MCP Client state
export interface MCPClientState {
  status: MCPConnectionStatus;
  serverInfo: MCPServerInfo | null;
  tools: MCPToolSchema[];
  resources: MCPResource[];
  prompts: MCPPrompt[];
  error: string | null;
}

// Event types
export type MCPEventType =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'tools_updated'
  | 'resources_updated'
  | 'prompts_updated';

export interface MCPEvent {
  type: MCPEventType;
  data?: unknown;
  error?: string;
}

// Generate request ID
let requestIdCounter = 0;
export function generateRequestId(): string {
  return `req_${Date.now()}_${++requestIdCounter}`;
}
