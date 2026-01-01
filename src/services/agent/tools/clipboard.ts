// Clipboard Tools - Read/Write system clipboard using Tauri plugin
// Refactored using defineTool to eliminate boilerplate

import { readText, writeText } from '@tauri-apps/plugin-clipboard-manager';
import { defineTool } from '../define-tool';
import type { ToolExecutionContext } from '../base-tool';

// Type definitions for tool results
interface ClipboardReadResult {
  content: string;
}

interface ClipboardWriteResult {
  written: boolean;
  content: string;
}

/**
 * Read current content from system clipboard
 * No parameters required
 */
export const clipboardReadTool = defineTool<Record<string, never>, ClipboardReadResult>({
  name: 'clipboard_read',
  description: 'Read the current content from the system clipboard.',
  parameters: {}, // No parameters

  async execute(_args, context) {
    context.onProgress?.('Reading clipboard...');
    const content = await readText();
    return {
      content: content ?? '',
    };
  },
});

/**
 * Write content to system clipboard
 * Requires user confirmation (destructive operation)
 */
export const clipboardWriteTool = defineTool<
  { content: string },
  ClipboardWriteResult
>({
  name: 'clipboard_write',
  description: 'Write content to the system clipboard.',
  requiresConfirmation: true, // Requires user approval
  parameters: {
    content: {
      type: 'string',
      description: 'The text content to write to the clipboard',
      required: true,
    },
  },

  async execute({ content }, context) {
    context.onProgress?.('Writing to clipboard...');
    await writeText(content);
    return {
      written: true,
      content,
    };
  },
});

// Legacy class exports for backward compatibility (deprecated)
// These wrap the new defineTool-based tools to maintain API compatibility
export class ClipboardReadTool {
  private static _instance = clipboardReadTool;

  get name() {
    return ClipboardReadTool._instance.name;
  }
  get description() {
    return ClipboardReadTool._instance.description;
  }
  get schema() {
    return ClipboardReadTool._instance.schema;
  }
  get requiresConfirmation() {
    return ClipboardReadTool._instance.requiresConfirmation;
  }

  async execute(args: Record<string, unknown>, context?: ToolExecutionContext) {
    return ClipboardReadTool._instance.execute(args, context);
  }

  toJSON() {
    return ClipboardReadTool._instance.toJSON();
  }
}

export class ClipboardWriteTool {
  private static _instance = clipboardWriteTool;

  get name() {
    return ClipboardWriteTool._instance.name;
  }
  get description() {
    return ClipboardWriteTool._instance.description;
  }
  get schema() {
    return ClipboardWriteTool._instance.schema;
  }
  get requiresConfirmation() {
    return ClipboardWriteTool._instance.requiresConfirmation;
  }

  async execute(args: Record<string, unknown>, context?: ToolExecutionContext) {
    return ClipboardWriteTool._instance.execute(args, context);
  }

  toJSON() {
    return ClipboardWriteTool._instance.toJSON();
  }
}
