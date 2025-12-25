// Backup and Restore Service

import { save, open } from '@tauri-apps/plugin-dialog';
import {
  readFile,
  writeFile,
  readDir,
  mkdir,
  exists,
  remove,
} from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import { exportAll } from './export';
import { importFromJson } from './import';
import type { ExportDataType, ImportResult } from './types';

// Backup metadata
export interface BackupMeta {
  id: string;
  name: string;
  createdAt: number;
  size: number;
  dataTypes: ExportDataType[];
}

// List of available backups
export interface BackupList {
  backups: BackupMeta[];
  backupDir: string;
}

// Get backup directory path
async function getBackupDir(): Promise<string> {
  const appData = await appDataDir();
  return join(appData, 'backups');
}

// Ensure backup directory exists
async function ensureBackupDir(): Promise<string> {
  const backupDir = await getBackupDir();
  if (!(await exists(backupDir))) {
    await mkdir(backupDir, { recursive: true });
  }
  return backupDir;
}

// Generate backup filename
function generateBackupName(): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `backup-${timestamp}.json`;
}

// Create a backup
export async function createBackup(name?: string): Promise<BackupMeta> {
  const backupDir = await ensureBackupDir();
  const backupName = name ?? generateBackupName();
  const backupPath = await join(backupDir, backupName);

  // Export all data
  const json = await exportAll(false); // Don't include API keys in backup

  // Write to file
  const encoder = new TextEncoder();
  const data = encoder.encode(json);
  await writeFile(backupPath, data);

  // Parse to get metadata
  const exportData = JSON.parse(json);

  return {
    id: backupName.replace('.json', ''),
    name: backupName,
    createdAt: Date.now(),
    size: data.length,
    dataTypes: exportData.dataTypes,
  };
}

// List all backups
export async function listBackups(): Promise<BackupList> {
  const backupDir = await ensureBackupDir();

  try {
    const entries = await readDir(backupDir);
    const backups: BackupMeta[] = [];

    for (const entry of entries) {
      if (entry.name?.endsWith('.json')) {
        try {
          const filePath = await join(backupDir, entry.name);
          const data = await readFile(filePath);

          // Try to parse and extract metadata
          const decoder = new TextDecoder();
          const json = decoder.decode(data);
          const exportData = JSON.parse(json);

          backups.push({
            id: entry.name.replace('.json', ''),
            name: entry.name,
            createdAt: exportData.exportedAt ?? 0,
            size: data.length,
            dataTypes: exportData.dataTypes ?? [],
          });
        } catch {
          // Skip invalid files
          continue;
        }
      }
    }

    // Sort by creation date (newest first)
    backups.sort((a, b) => b.createdAt - a.createdAt);

    return { backups, backupDir };
  } catch {
    return { backups: [], backupDir };
  }
}

// Restore from a backup
export async function restoreBackup(backupName: string): Promise<ImportResult> {
  const backupDir = await getBackupDir();
  const backupPath = await join(backupDir, backupName);

  if (!(await exists(backupPath))) {
    return {
      success: false,
      imported: {
        conversations: 0,
        messages: 0,
        config: false,
        skins: 0,
        agentRoles: 0,
        mcpServers: 0,
      },
      errors: ['Backup file not found'],
      warnings: [],
    };
  }

  const data = await readFile(backupPath);
  const decoder = new TextDecoder();
  const json = decoder.decode(data);

  return importFromJson(json, { overwriteExisting: true });
}

// Delete a backup
export async function deleteBackup(backupName: string): Promise<boolean> {
  try {
    const backupDir = await getBackupDir();
    const backupPath = await join(backupDir, backupName);

    if (await exists(backupPath)) {
      await remove(backupPath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to delete backup:', error);
    return false;
  }
}

// Export backup to external location
export async function exportBackupToFile(): Promise<boolean> {
  try {
    const json = await exportAll(false);
    const date = new Date().toISOString().split('T')[0];
    const defaultName = `ai-pet-backup-${date}.json`;

    const filePath = await save({
      title: 'Save Backup',
      defaultPath: defaultName,
      filters: [
        { name: 'JSON', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (!filePath) {
      return false;
    }

    const encoder = new TextEncoder();
    await writeFile(filePath, encoder.encode(json));
    return true;
  } catch (error) {
    console.error('Failed to export backup:', error);
    return false;
  }
}

// Import backup from external file
export async function importBackupFromFile(): Promise<ImportResult | null> {
  try {
    const filePath = await open({
      title: 'Import Backup',
      filters: [
        { name: 'JSON', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (!filePath) {
      return null;
    }

    const data = await readFile(filePath as string);
    const decoder = new TextDecoder();
    const json = decoder.decode(data);

    return importFromJson(json, { overwriteExisting: true });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      imported: {
        conversations: 0,
        messages: 0,
        config: false,
        skins: 0,
        agentRoles: 0,
        mcpServers: 0,
      },
      errors: [`Failed to import backup: ${errMsg}`],
      warnings: [],
    };
  }
}

// Auto backup (called periodically or on important events)
export async function autoBackup(): Promise<BackupMeta | null> {
  try {
    // Keep only last 5 auto backups
    const { backups } = await listBackups();
    const autoBackups = backups.filter((b) => b.name.startsWith('auto-'));

    if (autoBackups.length >= 5) {
      // Delete oldest auto backups
      const toDelete = autoBackups.slice(4);
      for (const backup of toDelete) {
        await deleteBackup(backup.name);
      }
    }

    // Create new auto backup
    const timestamp = Date.now();
    const name = `auto-${timestamp}.json`;
    return createBackup(name);
  } catch (error) {
    console.error('Auto backup failed:', error);
    return null;
  }
}

// Create quick backup before risky operations
export async function createQuickBackup(): Promise<BackupMeta> {
  const timestamp = Date.now();
  const name = `quick-${timestamp}.json`;
  return createBackup(name);
}

// Selective restore (only specific data types)
export async function selectiveRestore(
  backupName: string,
  dataTypes: ExportDataType[]
): Promise<ImportResult> {
  const backupDir = await getBackupDir();
  const backupPath = await join(backupDir, backupName);

  if (!(await exists(backupPath))) {
    return {
      success: false,
      imported: {
        conversations: 0,
        messages: 0,
        config: false,
        skins: 0,
        agentRoles: 0,
        mcpServers: 0,
      },
      errors: ['Backup file not found'],
      warnings: [],
    };
  }

  const data = await readFile(backupPath);
  const decoder = new TextDecoder();
  const json = decoder.decode(data);

  return importFromJson(json, {
    overwriteExisting: true,
    dataTypes,
  });
}
