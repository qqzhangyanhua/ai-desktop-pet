// Data Settings Component - Import/Export/Backup UI

import { useState, useEffect, useCallback } from 'react';
import {
  exportToFile,
  importFromFile,
  createBackup,
  listBackups,
  restoreBackup,
  deleteBackup,
  exportBackupToFile,
  importBackupFromFile,
} from '../../services/data';
import type {
  ExportDataType,
  BackupMeta,
  ImportResult,
} from '../../services/data';

type TabType = 'export' | 'import' | 'backup';

function ExportTab() {
  const [selectedTypes, setSelectedTypes] = useState<ExportDataType[]>([
    'conversations',
    'config',
  ]);
  const [includeApiKeys, setIncludeApiKeys] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const allTypes: { type: ExportDataType; label: string }[] = [
    { type: 'conversations', label: 'Chat History' },
    { type: 'config', label: 'Settings' },
    { type: 'skins', label: 'Custom Skins' },
    { type: 'agent_roles', label: 'Agent Roles' },
    { type: 'mcp_servers', label: 'MCP Servers' },
  ];

  const toggleType = (type: ExportDataType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleExport = async () => {
    if (selectedTypes.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one data type' });
      return;
    }

    setIsExporting(true);
    setMessage(null);

    try {
      const success = await exportToFile({
        dataTypes: selectedTypes,
        includeApiKeys,
      });

      if (success) {
        setMessage({ type: 'success', text: 'Data exported successfully' });
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Export failed';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
          Select data to export:
        </div>
        {allTypes.map(({ type, label }) => (
          <label
            key={type}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '6px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={selectedTypes.includes(type)}
              onChange={() => toggleType(type)}
            />
            {label}
          </label>
        ))}
      </div>

      {selectedTypes.includes('config') && (
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
            fontSize: '11px',
            color: '#ef4444',
          }}
        >
          <input
            type="checkbox"
            checked={includeApiKeys}
            onChange={(e) => setIncludeApiKeys(e.target.checked)}
          />
          Include API Keys (security risk)
        </label>
      )}

      <button
        onClick={handleExport}
        disabled={isExporting || selectedTypes.length === 0}
        style={{
          width: '100%',
          padding: '10px',
          fontSize: '13px',
          fontWeight: 'bold',
          backgroundColor: '#6366f1',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: isExporting ? 'not-allowed' : 'pointer',
          opacity: isExporting || selectedTypes.length === 0 ? 0.7 : 1,
        }}
      >
        {isExporting ? 'Exporting...' : 'Export to File'}
      </button>

      {message && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px',
            fontSize: '11px',
            borderRadius: '4px',
            backgroundColor: message.type === 'success' ? '#dcfce7' : '#fef2f2',
            color: message.type === 'success' ? '#16a34a' : '#ef4444',
          }}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}

function ImportTab() {
  const [isImporting, setIsImporting] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleImport = async () => {
    setIsImporting(true);
    setResult(null);

    try {
      const importResult = await importFromFile({ overwriteExisting: overwrite });
      if (importResult) {
        setResult(importResult);
      }
    } catch (error) {
      setResult({
        success: false,
        imported: {
          conversations: 0,
          messages: 0,
          config: false,
          skins: 0,
          agentRoles: 0,
          mcpServers: 0,
        },
        errors: [error instanceof Error ? error.message : 'Import failed'],
        warnings: [],
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div>
      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
        Import data from a previously exported JSON file.
      </div>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
          fontSize: '12px',
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={overwrite}
          onChange={(e) => setOverwrite(e.target.checked)}
        />
        Overwrite existing data
      </label>

      <button
        onClick={handleImport}
        disabled={isImporting}
        style={{
          width: '100%',
          padding: '10px',
          fontSize: '13px',
          fontWeight: 'bold',
          backgroundColor: '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: isImporting ? 'not-allowed' : 'pointer',
          opacity: isImporting ? 0.7 : 1,
        }}
      >
        {isImporting ? 'Importing...' : 'Import from File'}
      </button>

      {result && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px',
            fontSize: '11px',
            borderRadius: '6px',
            backgroundColor: result.success ? '#dcfce7' : '#fef2f2',
            border: `1px solid ${result.success ? '#86efac' : '#fecaca'}`,
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>
            {result.success ? 'Import completed' : 'Import completed with errors'}
          </div>
          <ul style={{ margin: 0, paddingLeft: '16px' }}>
            {result.imported.conversations > 0 && (
              <li>Conversations: {result.imported.conversations}</li>
            )}
            {result.imported.messages > 0 && <li>Messages: {result.imported.messages}</li>}
            {result.imported.config && <li>Settings imported</li>}
            {result.imported.skins > 0 && <li>Skins: {result.imported.skins}</li>}
            {result.imported.agentRoles > 0 && (
              <li>Agent Roles: {result.imported.agentRoles}</li>
            )}
            {result.imported.mcpServers > 0 && (
              <li>MCP Servers: {result.imported.mcpServers}</li>
            )}
          </ul>
          {result.errors.length > 0 && (
            <div style={{ marginTop: '8px', color: '#ef4444' }}>
              Errors: {result.errors.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BackupTab() {
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
        <button
          onClick={handleCreateBackup}
          disabled={isCreating}
          style={{
            flex: 1,
            padding: '8px',
            fontSize: '12px',
            backgroundColor: '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isCreating ? 'not-allowed' : 'pointer',
          }}
        >
          {isCreating ? 'Creating...' : 'Create Backup'}
        </button>
        <button
          onClick={handleExportBackup}
          style={{
            flex: 1,
            padding: '8px',
            fontSize: '12px',
            backgroundColor: '#f1f5f9',
            color: '#334155',
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Export to File
        </button>
        <button
          onClick={handleImportBackup}
          style={{
            flex: 1,
            padding: '8px',
            fontSize: '12px',
            backgroundColor: '#f1f5f9',
            color: '#334155',
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Import File
        </button>
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
                <button
                  onClick={() => handleRestore(backup)}
                  disabled={isRestoring === backup.id}
                  style={{
                    padding: '4px 8px',
                    fontSize: '10px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: isRestoring === backup.id ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isRestoring === backup.id ? 'Restoring...' : 'Restore'}
                </button>
                <button
                  onClick={() => handleDelete(backup)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '10px',
                    backgroundColor: '#fef2f2',
                    color: '#ef4444',
                    border: '1px solid #fecaca',
                    borderRadius: '3px',
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DataSettings() {
  const [activeTab, setActiveTab] = useState<TabType>('backup');

  const tabs: { id: TabType; label: string }[] = [
    { id: 'backup', label: 'Backup' },
    { id: 'export', label: 'Export' },
    { id: 'import', label: 'Import' },
  ];

  return (
    <div className="settings-section">
      <div className="settings-section-title">Data Management</div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '12px',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '8px',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              backgroundColor: activeTab === tab.id ? '#6366f1' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#64748b',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'export' && <ExportTab />}
      {activeTab === 'import' && <ImportTab />}
      {activeTab === 'backup' && <BackupTab />}
    </div>
  );
}
