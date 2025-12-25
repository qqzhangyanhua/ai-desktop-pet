// File Tool - Read and write files using Tauri fs plugin

import { readTextFile, writeTextFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import { BaseTool, createSuccessResult, createErrorResult, type ToolExecutionContext, type ToolResult } from '../base-tool';
import type { ToolSchema } from '../../../types';

interface FileReadResult {
  content: string;
  path: string;
}

interface FileWriteResult {
  written: boolean;
  path: string;
  bytes: number;
}

interface FileExistsResult {
  exists: boolean;
  path: string;
}

export class FileReadTool extends BaseTool {
  name = 'file_read';
  description = 'Read the contents of a text file. Only works within the app data directory for security.';

  schema: ToolSchema = {
    name: 'file_read',
    description: this.description,
    parameters: {
      type: 'object',
      properties: {
        filename: {
          type: 'string',
          description: 'The filename to read (relative to app data directory)',
        },
      },
      required: ['filename'],
    },
  };

  async execute(
    args: Record<string, unknown>,
    context?: ToolExecutionContext
  ): Promise<ToolResult<FileReadResult>> {
    this.validateArgs(args);

    const filename = args.filename as string;

    // Prevent directory traversal
    if (filename.includes('..') || filename.startsWith('/')) {
      return createErrorResult('Invalid filename: path traversal not allowed');
    }

    context?.onProgress?.(`Reading file: ${filename}`);

    try {
      const baseDir = await appDataDir();
      const filePath = await join(baseDir, 'user_files', filename);

      const fileExists = await exists(filePath);
      if (!fileExists) {
        return createErrorResult(`File not found: ${filename}`);
      }

      const content = await readTextFile(filePath);
      return createSuccessResult({
        content,
        path: filePath,
      });
    } catch (error) {
      return createErrorResult(
        error instanceof Error ? error.message : 'Failed to read file'
      );
    }
  }
}

export class FileWriteTool extends BaseTool {
  name = 'file_write';
  description = 'Write content to a text file. Only works within the app data directory for security.';
  requiresConfirmation = true;

  schema: ToolSchema = {
    name: 'file_write',
    description: this.description,
    parameters: {
      type: 'object',
      properties: {
        filename: {
          type: 'string',
          description: 'The filename to write to (relative to app data directory)',
        },
        content: {
          type: 'string',
          description: 'The text content to write to the file',
        },
        append: {
          type: 'boolean',
          description: 'Whether to append to the file instead of overwriting (default: false)',
        },
      },
      required: ['filename', 'content'],
    },
  };

  async execute(
    args: Record<string, unknown>,
    context?: ToolExecutionContext
  ): Promise<ToolResult<FileWriteResult>> {
    this.validateArgs(args);

    const filename = args.filename as string;
    const content = args.content as string;
    const append = (args.append as boolean) ?? false;

    // Prevent directory traversal
    if (filename.includes('..') || filename.startsWith('/')) {
      return createErrorResult('Invalid filename: path traversal not allowed');
    }

    context?.onProgress?.(`Writing file: ${filename}`);

    try {
      const baseDir = await appDataDir();
      const userFilesDir = await join(baseDir, 'user_files');

      // Ensure user_files directory exists
      const dirExists = await exists(userFilesDir);
      if (!dirExists) {
        await mkdir(userFilesDir, { recursive: true });
      }

      const filePath = await join(userFilesDir, filename);

      let finalContent = content;
      if (append) {
        try {
          const existing = await readTextFile(filePath);
          finalContent = existing + content;
        } catch {
          // File doesn't exist, just use content
        }
      }

      await writeTextFile(filePath, finalContent);

      return createSuccessResult({
        written: true,
        path: filePath,
        bytes: new TextEncoder().encode(finalContent).length,
      });
    } catch (error) {
      return createErrorResult(
        error instanceof Error ? error.message : 'Failed to write file'
      );
    }
  }
}

export class FileExistsTool extends BaseTool {
  name = 'file_exists';
  description = 'Check if a file exists in the app data directory.';

  schema: ToolSchema = {
    name: 'file_exists',
    description: this.description,
    parameters: {
      type: 'object',
      properties: {
        filename: {
          type: 'string',
          description: 'The filename to check (relative to app data directory)',
        },
      },
      required: ['filename'],
    },
  };

  async execute(
    args: Record<string, unknown>,
    context?: ToolExecutionContext
  ): Promise<ToolResult<FileExistsResult>> {
    this.validateArgs(args);

    const filename = args.filename as string;

    // Prevent directory traversal
    if (filename.includes('..') || filename.startsWith('/')) {
      return createErrorResult('Invalid filename: path traversal not allowed');
    }

    context?.onProgress?.(`Checking file: ${filename}`);

    try {
      const baseDir = await appDataDir();
      const filePath = await join(baseDir, 'user_files', filename);

      const fileExists = await exists(filePath);
      return createSuccessResult({
        exists: fileExists,
        path: filePath,
      });
    } catch (error) {
      return createErrorResult(
        error instanceof Error ? error.message : 'Failed to check file'
      );
    }
  }
}
