// Define Tool - Factory function for creating agent tools with minimal boilerplate
// Eliminates repetitive code by auto-generating schema, validation, and error handling

import {
  BaseTool,
  createSuccessResult,
  createErrorResult,
  type ToolExecutionContext,
  type ToolResult,
} from './base-tool';
import type { ToolSchema } from '../../types';

/**
 * Parameter definition for tool arguments
 * Supports common JSON Schema types
 */
export interface ParameterDefinition {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  enum?: (string | number)[]; // Support both string and number enums
  required?: boolean; // Default: false
  default?: unknown;
}

/**
 * Tool definition input
 * Generic types ensure type-safe parameter access in execute function
 */
export interface ToolDefinition<TArgs extends Record<string, unknown>, TResult> {
  /** Unique tool identifier (snake_case recommended) */
  name: string;

  /** Human-readable description for LLM context */
  description: string;

  /** Parameter definitions - automatically converted to JSON Schema */
  parameters: Record<keyof TArgs, ParameterDefinition>;

  /** Whether tool execution requires user confirmation */
  requiresConfirmation?: boolean;

  /**
   * Tool execution logic
   * @param args - Type-safe arguments matching parameter definitions
   * @param context - Execution context with progress callback and abort signal
   * @returns Tool result data (auto-wrapped in ToolResult)
   */
  execute: (args: TArgs, context: ToolExecutionContext) => Promise<TResult>;
}

/**
 * Factory function to create agent tools with automatic boilerplate handling
 *
 * Benefits:
 * - Reduces tool code by ~70% (eliminates schema duplication, validation, error handling)
 * - Type-safe parameter access in execute function
 * - Automatic JSON Schema generation from parameter definitions
 * - Auto-wraps results in ToolResult format
 * - Backward compatible with BaseTool (returns BaseTool instance)
 *
 * Example:
 * ```typescript
 * export const myTool = defineTool({
 *   name: 'my_tool',
 *   description: 'Does something useful',
 *   parameters: {
 *     input: {
 *       type: 'string',
 *       description: 'Input text',
 *       required: true,
 *     },
 *   },
 *   async execute({ input }, context) {
 *     context.onProgress?.('Processing...');
 *     return { result: input.toUpperCase() };
 *   },
 * });
 * ```
 */
export function defineTool<
  TArgs extends Record<string, unknown> = Record<string, unknown>,
  TResult = unknown
>(definition: ToolDefinition<TArgs, TResult>): BaseTool {
  // Convert parameter definitions to JSON Schema format
  const schemaProperties: Record<
    string,
    { type: string; description: string; enum?: string[] | number[] }
  > = {};
  const requiredParams: string[] = [];

  for (const [key, param] of Object.entries(definition.parameters)) {
    schemaProperties[key] = {
      type: param.type,
      description: param.description,
      ...(param.enum && { enum: param.enum }),
    } as { type: string; description: string; enum?: string[] | number[] };

    if (param.required) {
      requiredParams.push(key);
    }
  }

  const schema: ToolSchema = {
    name: definition.name,
    description: definition.description,
    parameters: {
      type: 'object',
      properties: schemaProperties,
      ...(requiredParams.length > 0 && { required: requiredParams }),
    },
  };

  // Create anonymous BaseTool instance
  // Using anonymous class pattern to avoid polluting namespace
  return new (class extends BaseTool {
    name = definition.name;
    description = definition.description;
    schema = schema;
    requiresConfirmation = definition.requiresConfirmation ?? false;

    async execute(
      args: Record<string, unknown>,
      context?: ToolExecutionContext
    ): Promise<ToolResult<TResult>> {
      // Step 1: Automatic parameter validation
      this.validateArgs(args);

      // Step 2: Execute user logic with automatic error handling
      try {
        const result = await definition.execute(args as TArgs, context ?? {});
        return createSuccessResult(result);
      } catch (error) {
        // Handle AbortError specially (user cancellation)
        if (error instanceof Error && error.name === 'AbortError') {
          return createErrorResult('Operation cancelled by user');
        }

        // Generic error handling
        const errorMessage =
          error instanceof Error ? error.message : 'Tool execution failed';
        return createErrorResult(errorMessage);
      }
    }
  })();
}

/**
 * Type helper to extract parameter types from tool definition
 * Useful for creating tool-specific types
 */
export type InferToolArgs<T> = T extends ToolDefinition<infer A, unknown>
  ? A
  : Record<string, unknown>;

/**
 * Type helper to extract result type from tool definition
 */
export type InferToolResult<T> = T extends ToolDefinition<Record<string, unknown>, infer R>
  ? R
  : unknown;
