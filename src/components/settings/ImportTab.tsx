// Import Tab Component - Data import UI

import { useState } from 'react';
import { importFromFile } from '../../services/data';
import type { ImportResult } from '../../services/data';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

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
      <div className="text-xs text-amber-900/60 mb-3 italic">
        Import data from a previously exported JSON file.
      </div>

      <label className="flex items-center gap-2 mb-3 text-xs cursor-pointer text-amber-900/80 hover:text-amber-900">
        <Checkbox
          checked={overwrite}
          onCheckedChange={(checked) => setOverwrite(!!checked)}
        />
        Overwrite existing data
      </label>

      <Button
        onClick={handleImport}
        disabled={isImporting}
        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
      >
        {isImporting ? 'Importing...' : 'Import from File'}
      </Button>

      {result && (
        <div
          className={`game-alert ${
            result.success ? 'game-alert-success' : 'game-alert-error'
          }`}
        >
          <div className="font-bold mb-1.5">
            {result.success ? 'Import completed' : 'Import completed with errors'}
          </div>
          <ul className="m-0 pl-4 list-disc">
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
            <div className="mt-2 text-red-600">
              Errors: {result.errors.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
