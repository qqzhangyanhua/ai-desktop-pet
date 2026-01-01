// File Tool - Read and write files using Tauri fs plugin
// Refactored using defineTool to eliminate boilerplate

import { readTextFile, writeTextFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import { defineTool } from '../define-tool';
import type { ToolExecutionContext } from '../base-tool';

// Type definitions for tool results
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

/**
 * Helper function to validate filename and prevent path traversal
 */
function validateFilename(filename: string): void {
  if (filename.includes('..') || filename.startsWith('/')) {
    throw new Error('Invalid filename: path traversal not allowed');
  }
}

/**
 * Helper function to construct file path in app data directory
 */
async function getUserFilePath(filename: string): Promise<string> {
  const baseDir = await appDataDir();
  return await join(baseDir, 'user_files', filename);
}

/**
 * Read the contents of a text file
 * Only works within the app data directory for security
 */
export const fileReadTool = defineTool<
  { filename: string },
  FileReadResult
>({
  name: 'file_read',
  description: 'Read the contents of a text file. Only works within the app data directory for security.',
  parameters: {
    filename: {
      type: 'string',
      description: 'The filename to read (relative to app data directory)',
      required: true,
    },
  },

  async execute({ filename }, context) {
    validateFilename(filename);
    context.onProgress?.(`Reading file: ${filename}`);

    const filePath = await getUserFilePath(filename);

    const fileExists = await exists(filePath);
    if (!fileExists) {
      throw new Error(`File not found: ${filename}`);
    }

    const content = await readTextFile(filePath);
    return {
      content,
      path: filePath,
    };
  },
});

/**
 * Write content to a text file
 * Only works within the app data directory for security
 * Requires user confirmation (security measure)
 */
export const fileWriteTool = defineTool<
  { filename: string; content: string; append?: boolean },
  FileWriteResult
>({
  name: 'file_write',
  description: 'Write content to a text file. Only works within the app data directory for security.',
  requiresConfirmation: true,
  parameters: {
    filename: {
      type: 'string',
      description: 'The filename to write to (relative to app data directory)',
      required: true,
    },
    content: {
      type: 'string',
      description: 'The text content to write to the file',
      required: true,
    },
    append: {
      type: 'boolean',
      description: 'Whether to append to the file instead of overwriting (default: false)',
      required: false,
    },
  },

  async execute({ filename, content, append = false }, context) {
    validateFilename(filename);
    context.onProgress?.(`Writing file: ${filename}`);

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

    return {
      written: true,
      path: filePath,
      bytes: new TextEncoder().encode(finalContent).length,
    };
  },
});

/**
 * Check if a file exists in the app data directory
 */
export const fileExistsTool = defineTool<
  { filename: string },
  FileExistsResult
>({
  name: 'file_exists',
  description: 'Check if a file exists in the app data directory.',
  parameters: {
    filename: {
      type: 'string',
      description: 'The filename to check (relative to app data directory)',
      required: true,
    },
  },

  async execute({ filename }, context) {
    validateFilename(filename);
    context.onProgress?.(`Checking file: ${filename}`);

    const filePath = await getUserFilePath(filename);
    const fileExists = await exists(filePath);

    return {
      exists: fileExists,
      path: filePath,
    };
  },
});

// Legacy class exports for backward compatibility (deprecated)
export class FileReadTool {
  private static _instance = fileReadTool;

  get name() {
    return FileReadTool._instance.name;
  }
  get description() {
    return FileReadTool._instance.description;
  }
  get schema() {
    return FileReadTool._instance.schema;
  }
  get requiresConfirmation() {
    return FileReadTool._instance.requiresConfirmation;
  }

  async execute(args: Record<string, unknown>, context?: ToolExecutionContext) {
    return FileReadTool._instance.execute(args, context);
  }

  toJSON() {
    return FileReadTool._instance.toJSON();
  }
}

export class FileWriteTool {
  private static _instance = fileWriteTool;

  get name() {
    return FileWriteTool._instance.name;
  }
  get description() {
    return FileWriteTool._instance.description;
  }
  get schema() {
    return FileWriteTool._instance.schema;
  }
  get requiresConfirmation() {
    return FileWriteTool._instance.requiresConfirmation;
  }

  async execute(args: Record<string, unknown>, context?: ToolExecutionContext) {
    return FileWriteTool._instance.execute(args, context);
  }

  toJSON() {
    return FileWriteTool._instance.toJSON();
  }
}

export class FileExistsTool {
  private static _instance = fileExistsTool;

  get name() {
    return FileExistsTool._instance.name;
  }
  get description() {
    return FileExistsTool._instance.description;
  }
  get schema() {
    return FileExistsTool._instance.schema;
  }
  get requiresConfirmation() {
    return FileExistsTool._instance.requiresConfirmation;
  }

  async execute(args: Record<string, unknown>, context?: ToolExecutionContext) {
    return FileExistsTool._instance.execute(args, context);
  }

  toJSON() {
    return FileExistsTool._instance.toJSON();
  }
}
