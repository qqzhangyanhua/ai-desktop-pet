// Export Tab Component - Data export UI

import { useState } from 'react';
import { exportToFile } from '../../services/data';
import type { ExportDataType } from '../../services/data';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

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
      <div className="mb-3">
        <div className="text-xs font-bold mb-2 text-amber-900">
          Select data to export:
        </div>
        {allTypes.map(({ type, label }) => (
          <label
            key={type}
            className="flex items-center gap-2 mb-1.5 text-xs cursor-pointer text-amber-900/80 hover:text-amber-900"
          >
            <Checkbox
              checked={selectedTypes.includes(type)}
              onCheckedChange={() => toggleType(type)}
            />
            {label}
          </label>
        ))}
      </div>

      {selectedTypes.includes('config') && (
        <label className="flex items-center gap-2 mb-3 text-[11px] text-red-500 cursor-pointer">
          <Checkbox
            checked={includeApiKeys}
            onCheckedChange={(checked) => setIncludeApiKeys(!!checked)}
          />
          Include API Keys (security risk)
        </label>
      )}

      <Button
        onClick={handleExport}
        disabled={isExporting || selectedTypes.length === 0}
        className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold"
      >
        {isExporting ? 'Exporting...' : 'Export to File'}
      </Button>

      {message && (
        <div
          className={`game-alert ${
            message.type === 'success' ? 'game-alert-success' : 'game-alert-error'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
