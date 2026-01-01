// Opener Tool - Open URLs and applications using Tauri shell plugin
// Refactored using defineTool to eliminate boilerplate

import { open } from '@tauri-apps/plugin-shell';
import { defineTool } from '../define-tool';
import type { ToolExecutionContext } from '../base-tool';

// Type definitions for tool results
interface OpenResult {
  opened: boolean;
  target: string;
}

/**
 * Open URL in default web browser
 * Requires user confirmation (security measure)
 */
export const openUrlTool = defineTool<{ url: string }, OpenResult>({
  name: 'open_url',
  description: 'Open a URL in the default web browser.',
  requiresConfirmation: true,
  parameters: {
    url: {
      type: 'string',
      description: 'The URL to open in the browser (must start with http:// or https://)',
      required: true,
    },
  },

  async execute({ url }, context) {
    // Validate URL format
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error('URL must start with http:// or https://');
    }

    context.onProgress?.(`Opening URL: ${url}`);
    await open(url);

    return {
      opened: true,
      target: url,
    };
  },
});

/**
 * Open file or application with system default handler
 * Requires user confirmation (security measure)
 */
export const openAppTool = defineTool<{ path: string }, OpenResult>({
  name: 'open_app',
  description: 'Open a file or application with the system default handler.',
  requiresConfirmation: true,
  parameters: {
    path: {
      type: 'string',
      description: 'The path to the file or application to open',
      required: true,
    },
  },

  async execute({ path }, context) {
    context.onProgress?.(`Opening: ${path}`);
    await open(path);

    return {
      opened: true,
      target: path,
    };
  },
});

// Legacy class exports for backward compatibility (deprecated)
export class OpenUrlTool {
  private static _instance = openUrlTool;

  get name() {
    return OpenUrlTool._instance.name;
  }
  get description() {
    return OpenUrlTool._instance.description;
  }
  get schema() {
    return OpenUrlTool._instance.schema;
  }
  get requiresConfirmation() {
    return OpenUrlTool._instance.requiresConfirmation;
  }

  async execute(args: Record<string, unknown>, context?: ToolExecutionContext) {
    return OpenUrlTool._instance.execute(args, context);
  }

  toJSON() {
    return OpenUrlTool._instance.toJSON();
  }
}

export class OpenAppTool {
  private static _instance = openAppTool;

  get name() {
    return OpenAppTool._instance.name;
  }
  get description() {
    return OpenAppTool._instance.description;
  }
  get schema() {
    return OpenAppTool._instance.schema;
  }
  get requiresConfirmation() {
    return OpenAppTool._instance.requiresConfirmation;
  }

  async execute(args: Record<string, unknown>, context?: ToolExecutionContext) {
    return OpenAppTool._instance.execute(args, context);
  }

  toJSON() {
    return OpenAppTool._instance.toJSON();
  }
}
