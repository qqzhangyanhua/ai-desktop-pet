// Unit tests for defineTool factory function

import { describe, it, expect, vi } from 'vitest';
import { defineTool } from '../define-tool';
import type { ToolResult } from '../base-tool';

describe('defineTool', () => {
  describe('Basic functionality', () => {
    it('should create a BaseTool instance with correct metadata', () => {
      const tool = defineTool({
        name: 'test_tool',
        description: 'A test tool',
        parameters: {},
        async execute() {
          return { success: true };
        },
      });

      expect(tool.name).toBe('test_tool');
      expect(tool.description).toBe('A test tool');
      expect(tool.schema.name).toBe('test_tool');
      expect(tool.requiresConfirmation).toBe(false);
    });

    it('should set requiresConfirmation when specified', () => {
      const tool = defineTool({
        name: 'dangerous_tool',
        description: 'Requires confirmation',
        parameters: {},
        requiresConfirmation: true,
        async execute() {
          return {};
        },
      });

      expect(tool.requiresConfirmation).toBe(true);
    });
  });

  describe('JSON Schema generation', () => {
    it('should generate correct schema for string parameters', () => {
      const tool = defineTool({
        name: 'echo_tool',
        description: 'Echoes input',
        parameters: {
          message: {
            type: 'string',
            description: 'Message to echo',
            required: true,
          },
        },
        async execute({ message }) {
          return { echo: message };
        },
      });

      expect(tool.schema.parameters.properties).toEqual({
        message: {
          type: 'string',
          description: 'Message to echo',
        },
      });
      expect(tool.schema.parameters.required).toEqual(['message']);
    });

    it('should handle multiple parameters with different types', () => {
      const tool = defineTool({
        name: 'multi_param_tool',
        description: 'Multiple params',
        parameters: {
          name: {
            type: 'string',
            description: 'Name',
            required: true,
          },
          age: {
            type: 'number',
            description: 'Age',
            required: false,
          },
          active: {
            type: 'boolean',
            description: 'Is active',
            required: true,
          },
        },
        async execute() {
          return {};
        },
      });

      expect(tool.schema.parameters.properties).toHaveProperty('name');
      expect(tool.schema.parameters.properties).toHaveProperty('age');
      expect(tool.schema.parameters.properties).toHaveProperty('active');
      expect(tool.schema.parameters.required).toEqual(['name', 'active']);
    });

    it('should handle enum parameters', () => {
      const tool = defineTool({
        name: 'enum_tool',
        description: 'Enum test',
        parameters: {
          color: {
            type: 'string',
            description: 'Color choice',
            enum: ['red', 'green', 'blue'],
            required: true,
          },
        },
        async execute() {
          return {};
        },
      });

      expect(tool.schema.parameters.properties['color']?.enum).toEqual([
        'red',
        'green',
        'blue',
      ]);
    });

    it('should handle no required parameters', () => {
      const tool = defineTool({
        name: 'optional_tool',
        description: 'All params optional',
        parameters: {
          opt1: {
            type: 'string',
            description: 'Optional 1',
          },
        },
        async execute() {
          return {};
        },
      });

      expect(tool.schema.parameters.required).toBeUndefined();
    });
  });

  describe('Parameter validation', () => {
    it('should validate required parameters', async () => {
      const tool = defineTool({
        name: 'validation_tool',
        description: 'Validates params',
        parameters: {
          required_param: {
            type: 'string',
            description: 'Required',
            required: true,
          },
        },
        async execute({ required_param }) {
          return { value: required_param };
        },
      });

      // Missing required parameter should throw and be caught
      await expect(async () => {
        await tool.execute({});
      }).rejects.toThrow('Missing required parameter');
    });

    it('should pass validation with all required params', async () => {
      const tool = defineTool({
        name: 'valid_tool',
        description: 'Valid params',
        parameters: {
          name: {
            type: 'string',
            description: 'Name',
            required: true,
          },
        },
        async execute({ name }) {
          return { greeting: `Hello ${name}` };
        },
      });

      const result = (await tool.execute({ name: 'World' })) as ToolResult<{
        greeting: string;
      }>;
      expect(result.success).toBe(true);
      expect(result.data?.greeting).toBe('Hello World');
    });
  });

  describe('Error handling', () => {
    it('should wrap execution errors in ToolResult', async () => {
      const tool = defineTool({
        name: 'failing_tool',
        description: 'Always fails',
        parameters: {},
        async execute() {
          throw new Error('Intentional failure');
        },
      });

      const result = (await tool.execute({})) as ToolResult;
      expect(result.success).toBe(false);
      expect(result.error).toBe('Intentional failure');
    });

    it('should handle AbortError specially', async () => {
      const tool = defineTool({
        name: 'abortable_tool',
        description: 'Can be aborted',
        parameters: {},
        async execute() {
          const error = new Error('Aborted');
          error.name = 'AbortError';
          throw error;
        },
      });

      const result = (await tool.execute({})) as ToolResult;
      expect(result.success).toBe(false);
      expect(result.error).toContain('cancelled');
    });

    it('should handle non-Error exceptions', async () => {
      const tool = defineTool({
        name: 'weird_error_tool',
        description: 'Throws non-Error',
        parameters: {},
        async execute() {
          throw 'String error'; // eslint-disable-line no-throw-literal
        },
      });

      const result = (await tool.execute({})) as ToolResult;
      expect(result.success).toBe(false);
      expect(result.error).toBe('Tool execution failed');
    });
  });

  describe('Execution context', () => {
    it('should pass context to execute function', async () => {
      const onProgress = vi.fn();

      const tool = defineTool({
        name: 'context_tool',
        description: 'Uses context',
        parameters: {},
        async execute(_args, context) {
          context.onProgress?.('Step 1');
          context.onProgress?.('Step 2');
          return { done: true };
        },
      });

      await tool.execute({}, { onProgress });
      expect(onProgress).toHaveBeenCalledWith('Step 1');
      expect(onProgress).toHaveBeenCalledWith('Step 2');
    });

    it('should handle abort signal', async () => {
      const controller = new AbortController();
      const tool = defineTool({
        name: 'abortable_tool',
        description: 'Respects abort',
        parameters: {},
        async execute(_args, context) {
          if (context.signal?.aborted) {
            throw new Error('Already aborted');
          }
          return { success: true };
        },
      });

      controller.abort();
      const result = (await tool.execute({}, { signal: controller.signal })) as ToolResult;
      expect(result.success).toBe(false);
    });
  });

  describe('Type safety', () => {
    it('should provide type-safe parameter access', async () => {
      const tool = defineTool<{ text: string; count: number }, { result: string }>({
        name: 'typed_tool',
        description: 'Type-safe tool',
        parameters: {
          text: {
            type: 'string',
            description: 'Input text',
            required: true,
          },
          count: {
            type: 'number',
            description: 'Repeat count',
            required: true,
          },
        },
        async execute({ text, count }) {
          // TypeScript should infer text as string and count as number
          return { result: text.repeat(count) };
        },
      });

      const result = (await tool.execute({ text: 'a', count: 3 })) as ToolResult<{
        result: string;
      }>;
      expect(result.success).toBe(true);
      expect(result.data?.result).toBe('aaa');
    });
  });

  describe('Backward compatibility', () => {
    it('should return BaseTool instance compatible with toJSON()', () => {
      const tool = defineTool({
        name: 'compatible_tool',
        description: 'Backward compatible',
        parameters: {},
        async execute() {
          return {};
        },
      });

      const json = tool.toJSON();
      expect(json).toHaveProperty('name');
      expect(json).toHaveProperty('description');
      expect(json).toHaveProperty('schema');
      expect(json).toHaveProperty('execute');
      expect(typeof json.execute).toBe('function');
    });
  });
});
