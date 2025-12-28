// 导入标签组件 - 数据导入界面

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
        errors: [error instanceof Error ? error.message : '导入失败'],
        warnings: [],
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div>
      <div className="text-xs text-amber-900/60 mb-3 italic">
        从之前导出的 JSON 文件导入数据。
      </div>

      <label className="flex items-center gap-2 mb-3 text-xs cursor-pointer text-amber-900/80 hover:text-amber-900">
        <Checkbox
          checked={overwrite}
          onCheckedChange={(checked) => setOverwrite(!!checked)}
        />
        覆盖现有数据
      </label>

      <Button
        onClick={handleImport}
        disabled={isImporting}
        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
      >
        {isImporting ? '导入中...' : '从文件导入'}
      </Button>

      {result && (
        <div
          className={`game-alert ${
            result.success ? 'game-alert-success' : 'game-alert-error'
          }`}
        >
          <div className="font-bold mb-1.5">
            {result.success ? '导入完成' : '导入完成（包含错误）'}
          </div>
          <ul className="m-0 pl-4 list-disc">
            {result.imported.conversations > 0 && (
              <li>对话：{result.imported.conversations}</li>
            )}
            {result.imported.messages > 0 && <li>消息：{result.imported.messages}</li>}
            {result.imported.config && <li>设置已导入</li>}
            {result.imported.skins > 0 && <li>形象：{result.imported.skins}</li>}
            {result.imported.agentRoles > 0 && (
              <li>智能体角色：{result.imported.agentRoles}</li>
            )}
            {result.imported.mcpServers > 0 && (
              <li>MCP 服务器：{result.imported.mcpServers}</li>
            )}
          </ul>
          {result.errors.length > 0 && (
            <div className="mt-2 text-red-600">
              错误：{result.errors.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
