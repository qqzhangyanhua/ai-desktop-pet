// Backup Tab Component - Backup management UI

import { useState, useEffect, useCallback } from 'react';
import {
  createBackup,
  listBackups,
  restoreBackup,
  deleteBackup,
  exportBackupToFile,
  importBackupFromFile,
} from '../../services/data';
import type { BackupMeta } from '../../services/data';
import { Button } from '@/components/ui/button';

export function BackupTab() {
  const [backups, setBackups] = useState<BackupMeta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const loadBackups = useCallback(async () => {
    setIsLoading(true);
    try {
      const { backups: list } = await listBackups();
      setBackups(list);
    } catch (error) {
      console.error('Failed to load backups:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  const handleCreateBackup = async () => {
    setIsCreating(true);
    setMessage(null);

    try {
      await createBackup();
      await loadBackups();
      setMessage({ type: 'success', text: 'Backup created successfully' });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Failed to create backup';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestore = async (backup: BackupMeta) => {
    if (!window.confirm(`Restore from backup "${backup.name}"? This will overwrite current data.`)) {
      return;
    }

    setIsRestoring(backup.id);
    setMessage(null);

    try {
      const result = await restoreBackup(backup.name);
      if (result.success) {
        setMessage({ type: 'success', text: 'Backup restored successfully' });
      } else {
        setMessage({ type: 'error', text: result.errors.join(', ') });
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Failed to restore backup';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setIsRestoring(null);
    }
  };

  const handleDelete = async (backup: BackupMeta) => {
    if (!window.confirm(`Delete backup "${backup.name}"?`)) {
      return;
    }

    try {
      await deleteBackup(backup.name);
      await loadBackups();
      setMessage({ type: 'success', text: 'Backup deleted' });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Failed to delete backup';
      setMessage({ type: 'error', text: errMsg });
    }
  };

  const handleExportBackup = async () => {
    try {
      const success = await exportBackupToFile();
      if (success) {
        setMessage({ type: 'success', text: 'Backup exported to file' });
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Export failed';
      setMessage({ type: 'error', text: errMsg });
    }
  };

  const handleImportBackup = async () => {
    try {
      const result = await importBackupFromFile();
      if (result) {
        if (result.success) {
          setMessage({ type: 'success', text: 'Backup imported and restored' });
        } else {
          setMessage({ type: 'error', text: result.errors.join(', ') });
        }
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Import failed';
      setMessage({ type: 'error', text: errMsg });
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <Button
          onClick={handleCreateBackup}
          disabled={isCreating}
          className="flex-1 bg-indigo-500 hover:bg-indigo-600"
        >
          {isCreating ? 'Creating...' : 'Create Backup'}
        </Button>
        <Button
          onClick={handleExportBackup}
          variant="outline"
          className="flex-1"
        >
          Export to File
        </Button>
        <Button
          onClick={handleImportBackup}
          variant="outline"
          className="flex-1"
        >
          Import File
        </Button>
      </div>

      {message && (
        <div
          style={{
            padding: '8px',
            marginBottom: '12px',
            fontSize: '11px',
            borderRadius: '4px',
            backgroundColor: message.type === 'success' ? '#dcfce7' : '#fef2f2',
            color: message.type === 'success' ? '#16a34a' : '#ef4444',
          }}
        >
          {message.text}
        </div>
      )}

      <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
        Available Backups
      </div>

      {isLoading ? (
        <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '16px' }}>
          Loading...
        </div>
      ) : backups.length === 0 ? (
        <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '16px' }}>
          No backups found
        </div>
      ) : (
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {backups.map((backup) => (
            <div
              key={backup.id}
              style={{
                padding: '8px',
                marginBottom: '6px',
                backgroundColor: '#f8fafc',
                borderRadius: '4px',
                fontSize: '11px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: 'bold' }}>{backup.name}</span>
                <span style={{ color: '#64748b' }}>{formatSize(backup.size)}</span>
              </div>
              <div style={{ color: '#64748b', marginBottom: '6px' }}>
                {formatDate(backup.createdAt)}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <Button
                  onClick={() => handleRestore(backup)}
                  disabled={isRestoring === backup.id}
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  {isRestoring === backup.id ? 'Restoring...' : 'Restore'}
                </Button>
                <Button
                  onClick={() => handleDelete(backup)}
                  variant="outline"
                  size="sm"
                  className="bg-red-50 text-red-500 border-red-200 hover:bg-red-100"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
