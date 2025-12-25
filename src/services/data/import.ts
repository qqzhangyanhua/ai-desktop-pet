// Data Import Service

import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { execute, query } from '../database/index';
import { saveAppConfig, setApiKey } from '../database/config';
import type {
  ExportData,
  ImportOptions,
  ImportResult,
  ValidationResult,
  ConversationExport,
  SkinExport,
  AgentRoleExport,
  MCPServerExport,
} from './types';
import { DATA_FORMAT_VERSION } from './types';

// Validate export data structure
export function validateExportData(data: unknown): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    version: '',
    dataTypes: [],
    counts: {
      conversations: 0,
      messages: 0,
      skins: 0,
      agentRoles: 0,
      mcpServers: 0,
    },
    errors: [],
  };

  // Check if data is an object
  if (!data || typeof data !== 'object') {
    result.valid = false;
    result.errors.push('Invalid data format: expected object');
    return result;
  }

  const exportData = data as Partial<ExportData>;

  // Check version
  if (!exportData.version) {
    result.valid = false;
    result.errors.push('Missing version field');
  } else {
    result.version = exportData.version;
    // Check version compatibility
    const [major] = exportData.version.split('.');
    const [currentMajor] = DATA_FORMAT_VERSION.split('.');
    if (major !== currentMajor) {
      result.valid = false;
      result.errors.push(
        `Incompatible version: ${exportData.version} (current: ${DATA_FORMAT_VERSION})`
      );
    }
  }

  // Check exportedAt
  if (!exportData.exportedAt || typeof exportData.exportedAt !== 'number') {
    result.errors.push('Missing or invalid exportedAt field');
  }

  // Check dataTypes
  if (!Array.isArray(exportData.dataTypes)) {
    result.valid = false;
    result.errors.push('Missing or invalid dataTypes field');
  } else {
    result.dataTypes = exportData.dataTypes;
  }

  // Validate conversations
  if (exportData.conversations) {
    if (!Array.isArray(exportData.conversations)) {
      result.errors.push('Invalid conversations format');
    } else {
      result.counts.conversations = exportData.conversations.length;
      let messageCount = 0;
      for (const conv of exportData.conversations) {
        if (!conv.conversation || !conv.conversation.id) {
          result.errors.push('Invalid conversation entry');
        }
        if (Array.isArray(conv.messages)) {
          messageCount += conv.messages.length;
        }
      }
      result.counts.messages = messageCount;
    }
  }

  // Validate skins
  if (exportData.skins) {
    if (!Array.isArray(exportData.skins)) {
      result.errors.push('Invalid skins format');
    } else {
      result.counts.skins = exportData.skins.length;
    }
  }

  // Validate agent roles
  if (exportData.agentRoles) {
    if (!Array.isArray(exportData.agentRoles)) {
      result.errors.push('Invalid agentRoles format');
    } else {
      result.counts.agentRoles = exportData.agentRoles.length;
    }
  }

  // Validate MCP servers
  if (exportData.mcpServers) {
    if (!Array.isArray(exportData.mcpServers)) {
      result.errors.push('Invalid mcpServers format');
    } else {
      result.counts.mcpServers = exportData.mcpServers.length;
    }
  }

  return result;
}

// Import conversations
async function importConversations(
  conversations: ConversationExport[],
  overwrite: boolean
): Promise<{ imported: number; errors: string[] }> {
  let imported = 0;
  const errors: string[] = [];

  for (const entry of conversations) {
    try {
      const { conversation, messages } = entry;

      if (overwrite) {
        // Delete existing conversation
        await execute('DELETE FROM conversations WHERE id = ?', [conversation.id]);
      } else {
        // Check if exists
        const existing = await query<{ id: string }>(
          'SELECT id FROM conversations WHERE id = ?',
          [conversation.id]
        );
        if (existing.length > 0) {
          continue; // Skip existing
        }
      }

      // Insert conversation
      await execute(
        `INSERT INTO conversations (id, title, system_prompt, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
          conversation.id,
          conversation.title,
          conversation.systemPrompt,
          conversation.createdAt,
          conversation.updatedAt,
        ]
      );

      // Insert messages
      for (const msg of messages) {
        await execute(
          `INSERT INTO messages (id, conversation_id, role, content, tool_calls, tool_call_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            msg.id,
            msg.conversationId,
            msg.role,
            msg.content,
            msg.toolCalls ? JSON.stringify(msg.toolCalls) : null,
            msg.toolCallId ?? null,
            msg.createdAt,
          ]
        );
      }

      imported++;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to import conversation ${entry.conversation.id}: ${errMsg}`);
    }
  }

  return { imported, errors };
}

// Import skins
async function importSkins(
  skins: SkinExport[],
  overwrite: boolean
): Promise<{ imported: number; errors: string[] }> {
  let imported = 0;
  const errors: string[] = [];

  for (const skin of skins) {
    try {
      // Skip built-in skins
      if (skin.isBuiltin) {
        continue;
      }

      if (overwrite) {
        await execute('DELETE FROM skins WHERE id = ? AND is_builtin = 0', [skin.id]);
      } else {
        const existing = await query<{ id: string }>(
          'SELECT id FROM skins WHERE id = ?',
          [skin.id]
        );
        if (existing.length > 0) {
          continue;
        }
      }

      await execute(
        `INSERT INTO skins (id, name, path, preview_image, is_builtin, created_at)
         VALUES (?, ?, ?, ?, 0, ?)`,
        [skin.id, skin.name, skin.path, skin.previewImage, skin.createdAt]
      );

      imported++;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to import skin ${skin.id}: ${errMsg}`);
    }
  }

  return { imported, errors };
}

// Import agent roles
async function importAgentRoles(
  roles: AgentRoleExport[],
  overwrite: boolean
): Promise<{ imported: number; errors: string[] }> {
  let imported = 0;
  const errors: string[] = [];

  for (const role of roles) {
    try {
      if (overwrite) {
        await execute('DELETE FROM agent_roles WHERE id = ?', [role.id]);
      } else {
        const existing = await query<{ id: string }>(
          'SELECT id FROM agent_roles WHERE id = ?',
          [role.id]
        );
        if (existing.length > 0) {
          continue;
        }
      }

      await execute(
        `INSERT INTO agent_roles (id, name, description, system_prompt, tools, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          role.id,
          role.name,
          role.description,
          role.systemPrompt,
          JSON.stringify(role.tools),
          role.createdAt,
        ]
      );

      imported++;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to import agent role ${role.id}: ${errMsg}`);
    }
  }

  return { imported, errors };
}

// Import MCP servers
async function importMCPServers(
  servers: MCPServerExport[],
  overwrite: boolean
): Promise<{ imported: number; errors: string[] }> {
  let imported = 0;
  const errors: string[] = [];

  for (const server of servers) {
    try {
      if (overwrite) {
        await execute('DELETE FROM mcp_servers WHERE id = ?', [server.id]);
      } else {
        const existing = await query<{ id: string }>(
          'SELECT id FROM mcp_servers WHERE id = ?',
          [server.id]
        );
        if (existing.length > 0) {
          continue;
        }
      }

      await execute(
        `INSERT INTO mcp_servers (id, name, transport, command, args, url, env, enabled, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          server.id,
          server.name,
          server.transport,
          server.command ?? null,
          server.args ? JSON.stringify(server.args) : null,
          server.url ?? null,
          server.env ? JSON.stringify(server.env) : null,
          server.enabled ? 1 : 0,
          server.createdAt,
        ]
      );

      imported++;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to import MCP server ${server.id}: ${errMsg}`);
    }
  }

  return { imported, errors };
}

// Import data from ExportData object
export async function importData(
  data: ExportData,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    imported: {
      conversations: 0,
      messages: 0,
      config: false,
      skins: 0,
      agentRoles: 0,
      mcpServers: 0,
    },
    errors: [],
    warnings: [],
  };

  const overwrite = options.overwriteExisting ?? false;
  const dataTypes = options.dataTypes ?? data.dataTypes;

  try {
    // Import conversations
    if (dataTypes.includes('conversations') && data.conversations) {
      const convResult = await importConversations(data.conversations, overwrite);
      result.imported.conversations = convResult.imported;
      result.imported.messages = data.conversations.reduce(
        (sum, c) => sum + c.messages.length,
        0
      );
      result.errors.push(...convResult.errors);
    }

    // Import config
    if (dataTypes.includes('config') && data.config) {
      try {
        await saveAppConfig(data.config);
        // Import API key if present
        if (data.config.llm.apiKey) {
          await setApiKey(data.config.llm.provider, data.config.llm.apiKey);
        }
        result.imported.config = true;
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Failed to import config: ${errMsg}`);
      }
    }

    // Import skins
    if (dataTypes.includes('skins') && data.skins) {
      const skinResult = await importSkins(data.skins, overwrite);
      result.imported.skins = skinResult.imported;
      result.errors.push(...skinResult.errors);
    }

    // Import agent roles
    if (dataTypes.includes('agent_roles') && data.agentRoles) {
      const roleResult = await importAgentRoles(data.agentRoles, overwrite);
      result.imported.agentRoles = roleResult.imported;
      result.errors.push(...roleResult.errors);
    }

    // Import MCP servers
    if (dataTypes.includes('mcp_servers') && data.mcpServers) {
      const serverResult = await importMCPServers(data.mcpServers, overwrite);
      result.imported.mcpServers = serverResult.imported;
      result.errors.push(...serverResult.errors);
    }
  } catch (error) {
    result.success = false;
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Import failed: ${errMsg}`);
  }

  if (result.errors.length > 0) {
    result.success = false;
  }

  return result;
}

// Import from JSON string
export async function importFromJson(
  json: string,
  options: ImportOptions = {}
): Promise<ImportResult> {
  try {
    const data = JSON.parse(json) as ExportData;
    const validation = validateExportData(data);

    if (!validation.valid) {
      return {
        success: false,
        imported: {
          conversations: 0,
          messages: 0,
          config: false,
          skins: 0,
          agentRoles: 0,
          mcpServers: 0,
        },
        errors: validation.errors,
        warnings: [],
      };
    }

    return importData(data, options);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      imported: {
        conversations: 0,
        messages: 0,
        config: false,
        skins: 0,
        agentRoles: 0,
        mcpServers: 0,
      },
      errors: [`Failed to parse JSON: ${errMsg}`],
      warnings: [],
    };
  }
}

// Import from file with dialog
export async function importFromFile(options: ImportOptions = {}): Promise<ImportResult | null> {
  try {
    // Open file dialog
    const filePath = await open({
      title: 'Import Data',
      filters: [
        { name: 'JSON', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (!filePath) {
      return null; // User cancelled
    }

    const json = await readTextFile(filePath as string);
    return importFromJson(json, options);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      imported: {
        conversations: 0,
        messages: 0,
        config: false,
        skins: 0,
        agentRoles: 0,
        mcpServers: 0,
      },
      errors: [`Failed to read file: ${errMsg}`],
      warnings: [],
    };
  }
}

// Preview import without actually importing
export async function previewImport(json: string): Promise<ValidationResult> {
  try {
    const data = JSON.parse(json);
    return validateExportData(data);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return {
      valid: false,
      version: '',
      dataTypes: [],
      counts: {
        conversations: 0,
        messages: 0,
        skins: 0,
        agentRoles: 0,
        mcpServers: 0,
      },
      errors: [`Failed to parse JSON: ${errMsg}`],
    };
  }
}
