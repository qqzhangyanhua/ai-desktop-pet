// Import Tab Component - Data import UI

import { useState } from 'react';
import { importFromFile } from '../../services/data';
import type { ImportResult } from '../../services/data';

export function ImportTab() {
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
