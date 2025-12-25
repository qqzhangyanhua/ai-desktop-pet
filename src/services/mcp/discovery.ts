// MCP Tool Discovery - Discover and convert MCP tools to internal format

import type { Tool, ToolSchema } from '../../types';
import type { MCPClient } from './client';
import type { MCPToolSchema, MCPToolCallResponse } from './types';

// Convert MCP tool schema to internal Tool format
export function convertMCPTool(
  mcpTool: MCPToolSchema,
  client: MCPClient,
  serverId: string
): Tool {
  // Convert MCP input schema to our tool schema format
  const properties: Record<string, { type: string; description: string; enum?: string[] }> = {};
  const required: string[] = mcpTool.inputSchema.required ?? [];

  if (mcpTool.inputSchema.properties) {
    for (const [key, prop] of Object.entries(mcpTool.inputSchema.properties)) {
      properties[key] = {
        type: prop.type,
        description: prop.description ?? '',
        enum: prop.enum,
      };
    }
  }

  const schema: ToolSchema = {
    name: `${serverId}:${mcpTool.name}`,
    description: mcpTool.description ?? `MCP tool: ${mcpTool.name}`,
    parameters: {
      type: 'object',
      properties,
      required,
    },
  };

  return {
    name: `${serverId}:${mcpTool.name}`,
    description: mcpTool.description ?? `MCP tool: ${mcpTool.name}`,
    schema,
    requiresConfirmation: false,
    execute: async (args: Record<string, unknown>): Promise<unknown> => {
      const response = await client.callTool({
        name: mcpTool.name,
        arguments: args,
      });

      return formatMCPResponse(response);
    },
  };
}

// Format MCP tool response for agent consumption
function formatMCPResponse(response: MCPToolCallResponse): string {
  if (response.isError) {
    const errorText = response.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('\n');
    return `Error: ${errorText || 'Unknown error'}`;
  }

  const parts: string[] = [];

  for (const content of response.content) {
    switch (content.type) {
      case 'text':
        if (content.text) {
          parts.push(content.text);
        }
        break;
      case 'image':
        parts.push(`[Image: ${content.mimeType ?? 'unknown type'}]`);
        break;
      case 'resource':
        parts.push(`[Resource: ${content.uri ?? 'unknown'}]`);
        break;
    }
  }

  return parts.join('\n');
}

// Discover all tools from connected MCP clients
export async function discoverTools(clients: Map<string, MCPClient>): Promise<Tool[]> {
  const tools: Tool[] = [];

  for (const [serverId, client] of clients) {
    if (!client.isConnected()) {
      continue;
    }

    try {
      const mcpTools = await client.listTools();

      for (const mcpTool of mcpTools) {
        const tool = convertMCPTool(mcpTool, client, serverId);
        tools.push(tool);
      }
    } catch (error) {
      console.error(`Failed to discover tools from ${serverId}:`, error);
    }
  }

  return tools;
}

// Get tool by full name (serverId:toolName)
export function getToolByName(
  tools: Tool[],
  fullName: string
): Tool | undefined {
  return tools.find((t) => t.name === fullName);
}

// Group tools by server
export function groupToolsByServer(tools: Tool[]): Map<string, Tool[]> {
  const groups = new Map<string, Tool[]>();

  for (const tool of tools) {
    const [serverId] = tool.name.split(':');
    if (serverId) {
      const serverTools = groups.get(serverId) ?? [];
      serverTools.push(tool);
      groups.set(serverId, serverTools);
    }
  }

  return groups;
}

// Filter tools by capability
export function filterToolsByCapability(
  tools: Tool[],
  capability: string
): Tool[] {
  const lowerCapability = capability.toLowerCase();
  return tools.filter(
    (t) =>
      t.name.toLowerCase().includes(lowerCapability) ||
      t.description.toLowerCase().includes(lowerCapability)
  );
}
