// Data validation utilities for import/export

import type { ExportData, ValidationResult } from './types';
import { DATA_FORMAT_VERSION } from './types';

/**
 * Validate export data structure
 */
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
