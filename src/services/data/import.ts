// Data Import Service

import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import type { ExportData, ImportOptions, ImportResult, ValidationResult } from './types';
import { validateExportData } from './validators';
import {
  importConversations,
  importSkins,
  importAgentRoles,
  importMCPServers,
  importConfig,
} from './importers';

/**
 * Import data from ExportData object
 */
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
        await importConfig(data.config);
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
