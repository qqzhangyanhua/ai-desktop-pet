// MCP stdio Transport - Communicate with MCP servers via stdin/stdout

import { Command, type Child } from '@tauri-apps/plugin-shell';
import type { MCPTransport } from './client';
import type { JsonRpcRequest, JsonRpcResponse, MCPServerConfig } from './types';

interface PendingRequest {
  resolve: (response: JsonRpcResponse) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export class StdioTransport implements MCPTransport {
  private config: MCPServerConfig;
  private child: Child | null = null;
  private connected = false;
  private pendingRequests: Map<string | number, PendingRequest> = new Map();
  private messageBuffer = '';
  private timeout: number;
  private onMessageHandler?: (message: JsonRpcResponse) => void;

  constructor(config: MCPServerConfig) {
    this.config = config;
    this.timeout = config.timeout ?? 30000;
  }

  async connect(): Promise<void> {
    if (!this.config.command) {
      throw new Error('Command not specified for stdio transport');
    }

    const args = this.config.args ?? [];

    // Create command
    const command = Command.create(this.config.command, args);

    // Set up event handlers before spawning
    command.on('close', () => {
      this.connected = false;
      this.rejectAllPending('Process exited');
    });

    command.on('error', (error: string) => {
      console.error(`[MCP ${this.config.name}] error:`, error);
      this.connected = false;
      this.rejectAllPending(error);
    });

    command.stdout.on('data', (data: string) => {
      this.handleStdout(data);
    });

    command.stderr.on('data', (data: string) => {
      console.error(`[MCP ${this.config.name}] stderr:`, data);
    });

    // Spawn process
    this.child = await command.spawn();
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (this.child) {
      await this.child.kill();
      this.child = null;
    }
    this.connected = false;
    this.rejectAllPending('Disconnected');
  }

  async send(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    if (!this.connected || !this.child) {
      throw new Error('Not connected');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(request.id);
        reject(new Error('Request timeout'));
      }, this.timeout);

      this.pendingRequests.set(request.id, { resolve, reject, timeout });

      // Write request to stdin
      const message = JSON.stringify(request) + '\n';
      this.child?.write(message).catch((error: Error) => {
        this.pendingRequests.delete(request.id);
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  onMessage(handler: (message: JsonRpcResponse) => void): void {
    this.onMessageHandler = handler;
  }

  isConnected(): boolean {
    return this.connected;
  }

  private handleStdout(data: string): void {
    this.messageBuffer += data;

    // Process complete JSON messages (newline-delimited)
    const lines = this.messageBuffer.split('\n');
    this.messageBuffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const message = JSON.parse(line) as JsonRpcResponse;
        this.handleMessage(message);
      } catch {
        console.error(`[MCP ${this.config.name}] Failed to parse message:`, line);
      }
    }
  }

  private handleMessage(message: JsonRpcResponse): void {
    // Check if it's a response to a pending request
    if (message.id !== undefined) {
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.id);
        pending.resolve(message);
        return;
      }
    }

    // Otherwise, it's a notification or unsolicited message
    this.onMessageHandler?.(message);
  }

  private rejectAllPending(reason: string): void {
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error(reason));
      this.pendingRequests.delete(id);
    }
  }
}

// Factory function
export function createStdioTransport(config: MCPServerConfig): StdioTransport {
  return new StdioTransport(config);
}
