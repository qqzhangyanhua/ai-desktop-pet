// MCP Client - Core client implementation

import type {
  MCPServerConfig,
  MCPClientState,
  MCPServerInfo,
  MCPToolSchema,
  MCPResource,
  MCPPrompt,
  MCPToolCallRequest,
  MCPToolCallResponse,
  MCPEvent,
  JsonRpcRequest,
  JsonRpcResponse,
} from './types';
import { generateRequestId } from './types';

export interface MCPTransport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(request: JsonRpcRequest): Promise<JsonRpcResponse>;
  onMessage?(handler: (message: JsonRpcResponse) => void): void;
  isConnected(): boolean;
}

export interface MCPClientOptions {
  onEvent?: (event: MCPEvent) => void;
  timeout?: number;
}

export class MCPClient {
  private config: MCPServerConfig;
  private transport: MCPTransport | null = null;
  private state: MCPClientState = {
    status: 'disconnected',
    serverInfo: null,
    tools: [],
    resources: [],
    prompts: [],
    error: null,
  };
  private onEvent?: (event: MCPEvent) => void;

  constructor(config: MCPServerConfig, options: MCPClientOptions = {}) {
    this.config = config;
    this.onEvent = options.onEvent;
  }

  private emitEvent(event: MCPEvent): void {
    this.onEvent?.(event);
  }

  private updateState(partial: Partial<MCPClientState>): void {
    this.state = { ...this.state, ...partial };
  }

  getState(): MCPClientState {
    return { ...this.state };
  }

  getConfig(): MCPServerConfig {
    return { ...this.config };
  }

  setTransport(transport: MCPTransport): void {
    this.transport = transport;
  }

  async connect(): Promise<void> {
    if (!this.transport) {
      throw new Error('Transport not set');
    }

    this.updateState({ status: 'connecting', error: null });

    try {
      await this.transport.connect();

      // Initialize connection
      const initResponse = await this.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {
          roots: { listChanged: true },
          sampling: {},
        },
        clientInfo: {
          name: 'ai-desktop-pet',
          version: '0.1.0',
        },
      });

      const serverInfo = initResponse.result as MCPServerInfo;
      this.updateState({ serverInfo });

      // Send initialized notification
      await this.sendNotification('notifications/initialized', {});

      // Discover capabilities
      await this.discoverCapabilities();

      this.updateState({ status: 'connected' });
      this.emitEvent({ type: 'connected', data: serverInfo });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      this.updateState({ status: 'error', error: errorMessage });
      this.emitEvent({ type: 'error', error: errorMessage });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.transport?.isConnected()) {
      await this.transport.disconnect();
    }
    this.updateState({
      status: 'disconnected',
      serverInfo: null,
      tools: [],
      resources: [],
      prompts: [],
    });
    this.emitEvent({ type: 'disconnected' });
  }

  private async discoverCapabilities(): Promise<void> {
    const capabilities = this.state.serverInfo?.capabilities;

    // List tools
    if (capabilities?.tools) {
      await this.listTools();
    }

    // List resources
    if (capabilities?.resources) {
      await this.listResources();
    }

    // List prompts
    if (capabilities?.prompts) {
      await this.listPrompts();
    }
  }

  async listTools(): Promise<MCPToolSchema[]> {
    try {
      const response = await this.sendRequest('tools/list', {});
      const tools = (response.result as { tools: MCPToolSchema[] })?.tools ?? [];
      this.updateState({ tools });
      this.emitEvent({ type: 'tools_updated', data: tools });
      return tools;
    } catch (error) {
      console.error('Failed to list tools:', error);
      return [];
    }
  }

  async listResources(): Promise<MCPResource[]> {
    try {
      const response = await this.sendRequest('resources/list', {});
      const resources = (response.result as { resources: MCPResource[] })?.resources ?? [];
      this.updateState({ resources });
      this.emitEvent({ type: 'resources_updated', data: resources });
      return resources;
    } catch (error) {
      console.error('Failed to list resources:', error);
      return [];
    }
  }

  async listPrompts(): Promise<MCPPrompt[]> {
    try {
      const response = await this.sendRequest('prompts/list', {});
      const prompts = (response.result as { prompts: MCPPrompt[] })?.prompts ?? [];
      this.updateState({ prompts });
      this.emitEvent({ type: 'prompts_updated', data: prompts });
      return prompts;
    } catch (error) {
      console.error('Failed to list prompts:', error);
      return [];
    }
  }

  async callTool(request: MCPToolCallRequest): Promise<MCPToolCallResponse> {
    const response = await this.sendRequest('tools/call', {
      name: request.name,
      arguments: request.arguments ?? {},
    });

    if (response.error) {
      return {
        content: [{ type: 'text', text: response.error.message }],
        isError: true,
      };
    }

    return response.result as MCPToolCallResponse;
  }

  async readResource(uri: string): Promise<string> {
    const response = await this.sendRequest('resources/read', { uri });

    if (response.error) {
      throw new Error(response.error.message);
    }

    const result = response.result as { contents: Array<{ text?: string; blob?: string }> };
    const content = result.contents[0];

    if (content?.text) {
      return content.text;
    }
    if (content?.blob) {
      return atob(content.blob);
    }

    return '';
  }

  async getPrompt(
    name: string,
    args?: Record<string, string>
  ): Promise<{ description?: string; messages: Array<{ role: string; content: string }> }> {
    const response = await this.sendRequest('prompts/get', {
      name,
      arguments: args ?? {},
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.result as { description?: string; messages: Array<{ role: string; content: string }> };
  }

  private async sendRequest(
    method: string,
    params: Record<string, unknown>
  ): Promise<JsonRpcResponse> {
    if (!this.transport?.isConnected()) {
      throw new Error('Not connected');
    }

    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: generateRequestId(),
      method,
      params,
    };

    return this.transport.send(request);
  }

  private async sendNotification(
    method: string,
    params: Record<string, unknown>
  ): Promise<void> {
    if (!this.transport?.isConnected()) {
      throw new Error('Not connected');
    }

    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: generateRequestId(),
      method,
      params,
    };

    // Notifications don't expect a response
    await this.transport.send(request);
  }

  isConnected(): boolean {
    return this.state.status === 'connected' && (this.transport?.isConnected() ?? false);
  }
}
