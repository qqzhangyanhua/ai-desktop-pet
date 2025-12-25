// Data Import/Export Types

import type { Conversation, Message, AppConfig } from '../../types';

// Export data format version
export const DATA_FORMAT_VERSION = '1.0.0';

// Exportable data types
export type ExportDataType =
  | 'conversations'
  | 'config'
  | 'skins'
  | 'agent_roles'
  | 'mcp_servers';

// Conversation with messages for export
export interface ConversationExport {
  conversation: Conversation;
  messages: Message[];
}

// Skin export data
export interface SkinExport {
  id: string;
  name: string;
  path: string;
  previewImage: string | null;
  isBuiltin: boolean;
  createdAt: number;
}

// Agent role export data
export interface AgentRoleExport {
  id: string;
  name: string;
  description: string | null;
  systemPrompt: string;
  tools: string[];
  createdAt: number;
}

// MCP server export data
export interface MCPServerExport {
  id: string;
  name: string;
  transport: 'stdio' | 'http';
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  enabled: boolean;
  createdAt: number;
}

// Full export data structure
export interface ExportData {
  version: string;
  exportedAt: number;
  dataTypes: ExportDataType[];
  conversations?: ConversationExport[];
  config?: AppConfig;
  skins?: SkinExport[];
  agentRoles?: AgentRoleExport[];
  mcpServers?: MCPServerExport[];
}

// Import result
export interface ImportResult {
  success: boolean;
  imported: {
    conversations: number;
    messages: number;
    config: boolean;
    skins: number;
    agentRoles: number;
    mcpServers: number;
  };
  errors: string[];
  warnings: string[];
}

// Export options
export interface ExportOptions {
  dataTypes: ExportDataType[];
  includeApiKeys?: boolean;
  filename?: string;
}

// Import options
export interface ImportOptions {
  overwriteExisting?: boolean;
  skipInvalid?: boolean;
  dataTypes?: ExportDataType[];
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  version: string;
  dataTypes: ExportDataType[];
  counts: {
    conversations: number;
    messages: number;
    skins: number;
    agentRoles: number;
    mcpServers: number;
  };
  errors: string[];
}
