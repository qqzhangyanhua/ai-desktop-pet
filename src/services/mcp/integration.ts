// MCP Integration - Manage MCP servers and integrate with Agent

import type { Tool } from '../../types';
import type { MCPServerConfig, MCPEvent, MCPClientState } from './types';
import { MCPClient } from './client';
import { createStdioTransport } from './transport-stdio';
import { createHttpTransport } from './transport-http';
import { discoverTools } from './discovery';

export interface MCPManagerState {
  servers: Map<string, MCPClientState>;
  tools: Tool[];
  isInitialized: boolean;
}

export interface MCPManagerEvents {
  onServerChange?: (serverId: string, state: MCPClientState) => void;
  onToolsChange?: (tools: Tool[]) => void;
  onError?: (serverId: string, error: string) => void;
}

export class MCPManager {
  private clients: Map<string, MCPClient> = new Map();
  private configs: Map<string, MCPServerConfig> = new Map();
  private tools: Tool[] = [];
  private events: MCPManagerEvents;
  private isInitialized = false;

  constructor(events: MCPManagerEvents = {}) {
    this.events = events;
  }

  // Add a server configuration
  addServer(config: MCPServerConfig): void {
    this.configs.set(config.id, config);
  }

  // Remove a server configuration
  removeServer(serverId: string): void {
    this.configs.delete(serverId);
    const client = this.clients.get(serverId);
    if (client) {
      client.disconnect().catch(console.error);
      this.clients.delete(serverId);
    }
  }

  // Get all server configurations
  getServers(): MCPServerConfig[] {
    return Array.from(this.configs.values());
  }

  // Connect to a specific server
  async connectServer(serverId: string): Promise<void> {
    const config = this.configs.get(serverId);
    if (!config) {
      throw new Error(`Server not found: ${serverId}`);
    }

    // Create client
    const client = new MCPClient(config, {
      onEvent: (event) => this.handleServerEvent(serverId, event),
    });

    // Create transport based on config
    const transport =
      config.transport === 'stdio'
        ? createStdioTransport(config)
        : createHttpTransport(config);

    client.setTransport(transport);

    // Store client
    this.clients.set(serverId, client);

    // Connect
    try {
      await client.connect();
      this.events.onServerChange?.(serverId, client.getState());

      // Refresh tools after connection
      await this.refreshTools();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      this.events.onError?.(serverId, errorMessage);
      throw error;
    }
  }

  // Disconnect from a specific server
  async disconnectServer(serverId: string): Promise<void> {
    const client = this.clients.get(serverId);
    if (client) {
      await client.disconnect();
      this.events.onServerChange?.(serverId, client.getState());

      // Refresh tools after disconnection
      await this.refreshTools();
    }
  }

  // Connect to all configured servers
  async connectAll(): Promise<void> {
    const connections = Array.from(this.configs.keys()).map((serverId) =>
      this.connectServer(serverId).catch((error) => {
        console.error(`Failed to connect to ${serverId}:`, error);
      })
    );

    await Promise.all(connections);
    this.isInitialized = true;
  }

  // Disconnect from all servers
  async disconnectAll(): Promise<void> {
    const disconnections = Array.from(this.clients.keys()).map((serverId) =>
      this.disconnectServer(serverId).catch(console.error)
    );

    await Promise.all(disconnections);
  }

  // Get client for a specific server
  getClient(serverId: string): MCPClient | undefined {
    return this.clients.get(serverId);
  }

  // Get state for all servers
  getServerStates(): Map<string, MCPClientState> {
    const states = new Map<string, MCPClientState>();
    for (const [serverId, client] of this.clients) {
      states.set(serverId, client.getState());
    }
    return states;
  }

  // Refresh tools from all connected servers
  async refreshTools(): Promise<Tool[]> {
    this.tools = await discoverTools(this.clients);
    this.events.onToolsChange?.(this.tools);
    return this.tools;
  }

  // Get all available MCP tools
  getTools(): Tool[] {
    return [...this.tools];
  }

  // Get tools for a specific server
  getServerTools(serverId: string): Tool[] {
    const prefix = `${serverId}:`;
    return this.tools.filter((t) => t.name.startsWith(prefix));
  }

  // Handle server events
  private handleServerEvent(serverId: string, event: MCPEvent): void {
    const client = this.clients.get(serverId);
    if (!client) return;

    switch (event.type) {
      case 'connected':
      case 'disconnected':
        this.events.onServerChange?.(serverId, client.getState());
        break;

      case 'error':
        if (event.error) {
          this.events.onError?.(serverId, event.error);
        }
        break;

      case 'tools_updated':
        this.refreshTools().catch(console.error);
        break;
    }
  }

  // Check if initialized
  isReady(): boolean {
    return this.isInitialized;
  }

  // Get manager state
  getState(): MCPManagerState {
    return {
      servers: this.getServerStates(),
      tools: this.tools,
      isInitialized: this.isInitialized,
    };
  }
}

// Singleton instance
let mcpManagerInstance: MCPManager | null = null;

export function getMCPManager(events?: MCPManagerEvents): MCPManager {
  if (!mcpManagerInstance) {
    mcpManagerInstance = new MCPManager(events);
  }
  return mcpManagerInstance;
}

export function destroyMCPManager(): void {
  if (mcpManagerInstance) {
    mcpManagerInstance.disconnectAll().catch(console.error);
    mcpManagerInstance = null;
  }
}

// Helper to integrate MCP tools with AgentRuntime
export function getMCPToolsForAgent(): Tool[] {
  const manager = getMCPManager();
  return manager.getTools();
}
