// Database import operations

import { execute, query } from '../database/index';
import { saveAppConfig, setApiKey } from '../database/config';
import type {
  ConversationExport,
  SkinExport,
  AgentRoleExport,
  MCPServerExport,
} from './types';
import type { AppConfig } from '../../types/config';

interface ImportResult {
  imported: number;
  errors: string[];
}

/**
 * Import conversations to database
 */
export async function importConversations(
  conversations: ConversationExport[],
  overwrite: boolean
): Promise<ImportResult> {
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

/**
 * Import skins to database
 */
export async function importSkins(
  skins: SkinExport[],
  overwrite: boolean
): Promise<ImportResult> {
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

/**
 * Import agent roles to database
 */
export async function importAgentRoles(
  roles: AgentRoleExport[],
  overwrite: boolean
): Promise<ImportResult> {
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

/**
 * Import MCP servers to database
 */
export async function importMCPServers(
  servers: MCPServerExport[],
  overwrite: boolean
): Promise<ImportResult> {
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

/**
 * Import application config
 */
export async function importConfig(config: AppConfig): Promise<void> {
  await saveAppConfig(config);

  // Import API key if present
  if (config.llm.apiKey) {
    await setApiKey(config.llm.provider, config.llm.apiKey);
  }
}
