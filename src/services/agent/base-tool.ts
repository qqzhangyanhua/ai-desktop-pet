// Base Tool class for all agent tools

import type { Tool, ToolSchema } from '../../types';

export interface ToolExecutionContext {
  signal?: AbortSignal;
  onProgress?: (message: string) => void;
}

export abstract class BaseTool implements Tool {
  abstract name: string;
  abstract description: string;
  abstract schema: ToolSchema;
  requiresConfirmation = false;

  abstract execute(
    args: Record<string, unknown>,
    context?: ToolExecutionContext
  ): Promise<unknown>;

  protected validateArgs(args: Record<string, unknown>): void {
    const required = this.schema.parameters.required ?? [];
    for (const param of required) {
      if (args[param] === undefined || args[param] === null) {
        throw new Error(`Missing required parameter: ${param}`);
      }
    }
  }

  toJSON(): Tool {
    return {
      name: this.name,
      description: this.description,
      schema: this.schema,
      execute: this.execute.bind(this),
      requiresConfirmation: this.requiresConfirmation,
    };
  }
}

// Tool result wrapper for consistent responses
export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export function createSuccessResult<T>(data: T): ToolResult<T> {
  return { success: true, data };
}

export function createErrorResult(error: string): ToolResult<never> {
  return { success: false, error };
}
