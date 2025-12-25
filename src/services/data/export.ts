// Data Export Service

import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { query } from '../database/index';
import { loadAppConfig, getApiKey } from '../database/config';
import type {
  ExportData,
  ExportOptions,
  ExportDataType,
  ConversationExport,
  SkinExport,
  AgentRoleExport,
  MCPServerExport,
} from './types';
import { DATA_FORMAT_VERSION } from './types';

// Database row types
interface ConversationRow {
  id: string;
  title: string | null;
  system_prompt: string | null;
  created_at: number;
  updated_at: number;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  tool_calls: string | null;
  tool_call_id: string | null;
  created_at: number;
}

interface SkinRow {
  id: string;
  name: string;
  path: string;
  preview_image: string | null;
  is_builtin: number;
  created_at: number;
}

interface AgentRoleRow {
  id: string;
  name: string;
  description: string | null;
  system_prompt: string;
  tools: string | null;
  created_at: number;
}

interface MCPServerRow {
  id: string;
  name: string;
  transport: string;
  command: string | null;
  args: string | null;
  url: string | null;
  env: string | null;
  enabled: number;
  created_at: number;
}

// Export conversations with messages
async function exportConversations(): Promise<ConversationExport[]> {
  const conversations = await query<ConversationRow>(
    'SELECT * FROM conversations ORDER BY updated_at DESC'
  );

  const result: ConversationExport[] = [];

  for (const conv of conversations) {
    const messages = await query<MessageRow>(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [conv.id]
    );

    result.push({
      conversation: {
        id: conv.id,
        title: conv.title ?? '',
        systemPrompt: conv.system_prompt,
        createdAt: conv.created_at,
        updatedAt: conv.updated_at,
      },
      messages: messages.map((msg) => ({
        id: msg.id,
        conversationId: msg.conversation_id,
        role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
        content: msg.content,
        toolCalls: msg.tool_calls ? JSON.parse(msg.tool_calls) : undefined,
        toolCallId: msg.tool_call_id ?? undefined,
        createdAt: msg.created_at,
      })),
    });
  }

  return result;
}

// Export skins (custom only, not built-in)
async function exportSkins(): Promise<SkinExport[]> {
  const skins = await query<SkinRow>(
    'SELECT * FROM skins WHERE is_builtin = 0 ORDER BY created_at DESC'
  );

  return skins.map((skin) => ({
    id: skin.id,
    name: skin.name,
    path: skin.path,
    previewImage: skin.preview_image,
    isBuiltin: skin.is_builtin === 1,
    createdAt: skin.created_at,
  }));
}

// Export agent roles
async function exportAgentRoles(): Promise<AgentRoleExport[]> {
  const roles = await query<AgentRoleRow>(
    'SELECT * FROM agent_roles ORDER BY created_at DESC'
  );

  return roles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    systemPrompt: role.system_prompt,
    tools: role.tools ? JSON.parse(role.tools) : [],
    createdAt: role.created_at,
  }));
}

// Export MCP servers
async function exportMCPServers(): Promise<MCPServerExport[]> {
  const servers = await query<MCPServerRow>(
    'SELECT * FROM mcp_servers ORDER BY created_at DESC'
  );

  return servers.map((server) => ({
    id: server.id,
    name: server.name,
    transport: server.transport as 'stdio' | 'http',
    command: server.command ?? undefined,
    args: server.args ? JSON.parse(server.args) : undefined,
    url: server.url ?? undefined,
    env: server.env ? JSON.parse(server.env) : undefined,
    enabled: server.enabled === 1,
    createdAt: server.created_at,
  }));
}

// Build export data
export async function buildExportData(options: ExportOptions): Promise<ExportData> {
  const exportData: ExportData = {
    version: DATA_FORMAT_VERSION,
    exportedAt: Date.now(),
    dataTypes: options.dataTypes,
  };

  for (const dataType of options.dataTypes) {
    switch (dataType) {
      case 'conversations':
        exportData.conversations = await exportConversations();
        break;
      case 'config':
        {
          const config = await loadAppConfig();
          // Optionally include API keys
          if (options.includeApiKeys) {
            const openaiKey = await getApiKey('openai');
            const anthropicKey = await getApiKey('anthropic');
            if (openaiKey && config.llm.provider === 'openai') {
              config.llm.apiKey = openaiKey;
            } else if (anthropicKey && config.llm.provider === 'anthropic') {
              config.llm.apiKey = anthropicKey;
            }
          }
          exportData.config = config;
        }
        break;
      case 'skins':
        exportData.skins = await exportSkins();
        break;
      case 'agent_roles':
        exportData.agentRoles = await exportAgentRoles();
        break;
      case 'mcp_servers':
        exportData.mcpServers = await exportMCPServers();
        break;
    }
  }

  return exportData;
}

// Export to JSON string
export async function exportToJson(options: ExportOptions): Promise<string> {
  const data = await buildExportData(options);
  return JSON.stringify(data, null, 2);
}

// Export to file with dialog
export async function exportToFile(options: ExportOptions): Promise<boolean> {
  try {
    const data = await buildExportData(options);
    const json = JSON.stringify(data, null, 2);

    // Generate default filename
    const date = new Date().toISOString().split('T')[0];
    const defaultName = options.filename ?? `ai-pet-export-${date}.json`;

    // Open save dialog
    const filePath = await save({
      title: 'Export Data',
      defaultPath: defaultName,
      filters: [
        { name: 'JSON', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (!filePath) {
      return false; // User cancelled
    }

    await writeTextFile(filePath, json);
    return true;
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
}

// Export all data types
export async function exportAll(
  includeApiKeys = false
): Promise<string> {
  const allTypes: ExportDataType[] = [
    'conversations',
    'config',
    'skins',
    'agent_roles',
    'mcp_servers',
  ];

  return exportToJson({
    dataTypes: allTypes,
    includeApiKeys,
  });
}

// Export only conversations
export async function exportConversationsOnly(): Promise<string> {
  return exportToJson({
    dataTypes: ['conversations'],
  });
}

// Export only settings
export async function exportSettingsOnly(includeApiKeys = false): Promise<string> {
  return exportToJson({
    dataTypes: ['config', 'agent_roles', 'mcp_servers'],
    includeApiKeys,
  });
}
