// MCP HTTP Transport - Communicate with MCP servers via HTTP/SSE

import type { MCPTransport } from './client';
import type { JsonRpcRequest, JsonRpcResponse, MCPServerConfig } from './types';

export class HttpTransport implements MCPTransport {
  private config: MCPServerConfig;
  private connected = false;
  private eventSource: EventSource | null = null;
  private onMessageHandler?: (message: JsonRpcResponse) => void;
  private timeout: number;

  constructor(config: MCPServerConfig) {
    this.config = config;
    this.timeout = config.timeout ?? 30000;
  }

  async connect(): Promise<void> {
    if (!this.config.url) {
      throw new Error('URL not specified for HTTP transport');
    }

    // Set up SSE connection for server-initiated messages
    try {
      const sseUrl = new URL('/sse', this.config.url).toString();
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onopen = () => {
        this.connected = true;
      };

      this.eventSource.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as JsonRpcResponse;
          this.onMessageHandler?.(message);
        } catch (error) {
          console.error(`[MCP ${this.config.name}] Failed to parse SSE message:`, error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error(`[MCP ${this.config.name}] SSE error:`, error);
        this.connected = false;
      };

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, this.timeout);

        if (this.eventSource) {
          this.eventSource.onopen = () => {
            clearTimeout(timeout);
            this.connected = true;
            resolve();
          };

          this.eventSource.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('Connection failed'));
          };
        }
      });
    } catch {
      // SSE not supported, fall back to polling or simple HTTP
      this.connected = true;
    }
  }

  async disconnect(): Promise<void> {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.connected = false;
  }

  async send(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    if (!this.config.url) {
      throw new Error('URL not specified');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.config.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data as JsonRpcResponse;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  onMessage(handler: (message: JsonRpcResponse) => void): void {
    this.onMessageHandler = handler;
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// Factory function
export function createHttpTransport(config: MCPServerConfig): HttpTransport {
  return new HttpTransport(config);
}
