// Export Tab Component - Data export UI

import { useState } from 'react';
import { exportToFile } from '../../services/data';
import type { ExportDataType } from '../../services/data';

export function ExportTab() {
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
