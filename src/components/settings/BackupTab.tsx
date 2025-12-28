// 备份管理组件 - 备份管理界面

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
import { confirmAction } from '@/lib/confirm';

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
      setMessage({ type: 'success', text: '备份创建成功' });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : '创建备份失败';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestore = async (backup: BackupMeta) => {
    const ok = await confirmAction(
      `确认从备份「${backup.name}」恢复吗？这会覆盖当前数据。`,
      {
        title: '恢复备份',
        kind: 'warning',
        okLabel: '恢复',
        cancelLabel: '取消',
      }
    );
    if (!ok) return;

    setIsRestoring(backup.id);
    setMessage(null);

    try {
      const result = await restoreBackup(backup.name);
      if (result.success) {
        setMessage({ type: 'success', text: '备份恢复成功' });
      } else {
        setMessage({ type: 'error', text: result.errors.join(', ') });
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : '恢复备份失败';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setIsRestoring(null);
    }
  };

  const handleDelete = async (backup: BackupMeta) => {
    const ok = await confirmAction(`确认删除备份「${backup.name}」吗？`, {
      title: '删除备份',
      kind: 'warning',
      okLabel: '删除',
      cancelLabel: '取消',
    });
    if (!ok) return;

    try {
      await deleteBackup(backup.name);
      await loadBackups();
      setMessage({ type: 'success', text: '备份已删除' });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : '删除备份失败';
      setMessage({ type: 'error', text: errMsg });
    }
  };

  const handleExportBackup = async () => {
    try {
      const success = await exportBackupToFile();
      if (success) {
        setMessage({ type: 'success', text: '备份已导出到文件' });
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : '导出失败';
      setMessage({ type: 'error', text: errMsg });
    }
  };

  const handleImportBackup = async () => {
    try {
      const result = await importBackupFromFile();
      if (result) {
        if (result.success) {
          setMessage({ type: 'success', text: '备份已导入并恢复' });
        } else {
          setMessage({ type: 'error', text: result.errors.join(', ') });
        }
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : '导入失败';
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
      <div className="flex gap-2 mb-3">
        <Button
          onClick={handleCreateBackup}
          disabled={isCreating}
          className="flex-1 bg-indigo-500 hover:bg-indigo-600"
        >
          {isCreating ? '创建中...' : '创建备份'}
        </Button>
        <Button
          onClick={handleExportBackup}
          variant="outline"
          className="flex-1"
        >
          导出到文件
        </Button>
        <Button
          onClick={handleImportBackup}
          variant="outline"
          className="flex-1"
        >
          从文件导入
        </Button>
      </div>

      {message && (
        <div
          className={`game-alert ${
            message.type === 'success' ? 'game-alert-success' : 'game-alert-error'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="text-xs font-bold mb-2 text-amber-900">
        可用备份
      </div>

      {isLoading ? (
        <div className="text-xs text-amber-900/60 text-center p-4">
          加载中...
        </div>
      ) : backups.length === 0 ? (
        <div className="text-xs text-amber-900/60 text-center p-4">
          未找到备份
        </div>
      ) : (
        <div className="max-h-[200px] overflow-y-auto pr-1">
          {backups.map((backup) => (
            <div key={backup.id} className="game-card mb-2 !p-3">
              <div className="flex justify-between mb-1">
                <span className="font-bold text-xs text-amber-900">{backup.name}</span>
                <span className="text-xs text-amber-900/60">{formatSize(backup.size)}</span>
              </div>
              <div className="text-[10px] text-amber-900/60 mb-2">
                {formatDate(backup.createdAt)}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleRestore(backup)}
                  disabled={isRestoring === backup.id}
                  size="sm"
                  className="h-7 text-[10px] px-3 bg-emerald-500 hover:bg-emerald-600"
                >
                  {isRestoring === backup.id ? '恢复中...' : '恢复'}
                </Button>
                <Button
                  onClick={() => handleDelete(backup)}
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] px-3 bg-red-50 text-red-500 border-red-200 hover:bg-red-100"
                >
                  删除
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
