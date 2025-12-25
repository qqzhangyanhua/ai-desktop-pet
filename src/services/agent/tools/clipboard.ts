// Clipboard Tool - Using Tauri clipboard plugin

import { readText, writeText } from '@tauri-apps/plugin-clipboard-manager';
import { BaseTool, createSuccessResult, createErrorResult, type ToolExecutionContext, type ToolResult } from '../base-tool';
import type { ToolSchema } from '../../../types';

interface ClipboardReadResult {
  content: string;
}

interface ClipboardWriteResult {
  written: boolean;
  content: string;
}

export class ClipboardReadTool extends BaseTool {
  name = 'clipboard_read';
  description = 'Read the current content from the system clipboard.';

  schema: ToolSchema = {
    name: 'clipboard_read',
    description: this.description,
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  };

  async execute(
    _args: Record<string, unknown>,
    context?: ToolExecutionContext
  ): Promise<ToolResult<ClipboardReadResult>> {
    context?.onProgress?.('Reading clipboard...');

    try {
      const content = await readText();
      return createSuccessResult({
        content: content ?? '',
      });
    } catch (error) {
      return createErrorResult(
        error instanceof Error ? error.message : 'Failed to read clipboard'
      );
    }
  }
}

export class ClipboardWriteTool extends BaseTool {
  name = 'clipboard_write';
  description = 'Write content to the system clipboard.';
  requiresConfirmation = true;

  schema: ToolSchema = {
    name: 'clipboard_write',
    description: this.description,
    parameters: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The text content to write to the clipboard',
        },
      },
      required: ['content'],
    },
  };

  async execute(
    args: Record<string, unknown>,
    context?: ToolExecutionContext
  ): Promise<ToolResult<ClipboardWriteResult>> {
    this.validateArgs(args);

    const content = args.content as string;

    context?.onProgress?.('Writing to clipboard...');

    try {
      await writeText(content);
      return createSuccessResult({
        written: true,
        content,
      });
    } catch (error) {
      return createErrorResult(
        error instanceof Error ? error.message : 'Failed to write to clipboard'
      );
    }
  }
}
