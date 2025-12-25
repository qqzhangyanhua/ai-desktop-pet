// Opener Tool - Open URLs and applications using Tauri shell plugin

import { open } from '@tauri-apps/plugin-shell';
import { BaseTool, createSuccessResult, createErrorResult, type ToolExecutionContext, type ToolResult } from '../base-tool';
import type { ToolSchema } from '../../../types';

interface OpenResult {
  opened: boolean;
  target: string;
}

export class OpenUrlTool extends BaseTool {
  name = 'open_url';
  description = 'Open a URL in the default web browser.';

  schema: ToolSchema = {
    name: 'open_url',
    description: this.description,
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to open in the browser (must start with http:// or https://)',
        },
      },
      required: ['url'],
    },
  };

  async execute(
    args: Record<string, unknown>,
    context?: ToolExecutionContext
  ): Promise<ToolResult<OpenResult>> {
    this.validateArgs(args);

    const url = args.url as string;

    // Validate URL format
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return createErrorResult('URL must start with http:// or https://');
    }

    context?.onProgress?.(`Opening URL: ${url}`);

    try {
      await open(url);
      return createSuccessResult({
        opened: true,
        target: url,
      });
    } catch (error) {
      return createErrorResult(
        error instanceof Error ? error.message : 'Failed to open URL'
      );
    }
  }
}

export class OpenAppTool extends BaseTool {
  name = 'open_app';
  description = 'Open a file or application with the system default handler.';
  requiresConfirmation = true;

  schema: ToolSchema = {
    name: 'open_app',
    description: this.description,
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path to the file or application to open',
        },
      },
      required: ['path'],
    },
  };

  async execute(
    args: Record<string, unknown>,
    context?: ToolExecutionContext
  ): Promise<ToolResult<OpenResult>> {
    this.validateArgs(args);

    const path = args.path as string;

    context?.onProgress?.(`Opening: ${path}`);

    try {
      await open(path);
      return createSuccessResult({
        opened: true,
        target: path,
      });
    } catch (error) {
      return createErrorResult(
        error instanceof Error ? error.message : 'Failed to open application'
      );
    }
  }
}
