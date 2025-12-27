// Skin Settings Component

import { useState, useCallback } from 'react';
import type { SkinMeta } from '../../types';
import { useSkinStore } from '../../stores/skinStore';
import { getSkinManager, importSkinFromFolder, deleteImportedSkin } from '../../services/skin';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface SkinSettingsProps {
  title?: string;
  live2dEnabled?: boolean;
  onLive2DEnabledChange?: (enabled: boolean) => void;
  scale: number;
  onScaleChange: (scale: number) => void;
  onSkinChange?: (skinId: string) => void;
}

function SkinCard({
  skin,
  isSelected,
  onSelect,
  onDelete,
}: {
  skin: SkinMeta;
  isSelected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`
        p-2 border rounded-lg cursor-pointer relative transition-all duration-200 ease-out
        ${isSelected 
          ? 'border-indigo-500 bg-indigo-50' 
          : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm'
        }
      `}
    >
      {/* Preview image */}
      <div className="w-full aspect-square bg-slate-100 rounded mb-2 flex items-center justify-center overflow-hidden">
        {skin.previewImage ? (
          <img
            src={skin.previewImage}
            alt={skin.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-2xl text-slate-400">?</span>
        )}
      </div>

      {/* Skin name */}
      <div
        className={`
          text-xs text-center whitespace-nowrap overflow-hidden text-ellipsis
          ${isSelected ? 'font-bold text-indigo-500' : 'font-normal text-slate-700'}
        `}
      >
        {skin.name}
      </div>

      {/* Builtin badge */}
      {skin.isBuiltin && (
        <span className="absolute top-1 right-1 text-[9px] px-1 py-0.5 bg-blue-100 text-blue-600 rounded">
          Built-in
        </span>
      )}

      {/* Delete button for custom skins */}
      {!skin.isBuiltin && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-1 right-1 w-5 h-5 p-0 border-none rounded-full bg-red-50 text-red-500 hover:bg-red-100 cursor-pointer text-xs flex items-center justify-center transition-colors"
        >
          x
        </button>
      )}
    </div>
  );
}

export function SkinSettings({
  title = '宠物形象',
  live2dEnabled,
  onLive2DEnabledChange,
  scale,
  onScaleChange,
  onSkinChange,
}: SkinSettingsProps) {
  const { skins, currentSkinId } = useSkinStore();
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectSkin = useCallback(async (skinId: string) => {
    const manager = getSkinManager();
    const ok = await manager.switchSkin(skinId);
    if (ok) {
      onSkinChange?.(skinId);
    }
  }, [onSkinChange]);

  const handleImport = useCallback(async () => {
    setIsImporting(true);
    setError(null);

    try {
      const result = await importSkinFromFolder();
      if (!result.success) {
        setError(result.error ?? 'Import failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  }, []);

  const handleDelete = useCallback(async (skinId: string, skinName: string) => {
    if (!window.confirm(`确认删除形象「${skinName}」吗？`)) {
      return;
    }

    const success = await deleteImportedSkin(skinId);
    if (!success) {
      setError('删除失败');
    }
  }, []);

  return (
    <div className="settings-section">
      <div className="settings-section-title">{title}</div>

      {typeof live2dEnabled === 'boolean' && onLive2DEnabledChange && (
        <div className="settings-row">
          <span className="settings-label">启用 Live2D</span>
          <Checkbox
            checked={live2dEnabled}
            onCheckedChange={(checked) => onLive2DEnabledChange(!!checked)}
          />
        </div>
      )}

      {/* Skin grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {skins.map((skin) => (
          <SkinCard
            key={skin.id}
            skin={skin}
            isSelected={skin.id === currentSkinId}
            onSelect={() => handleSelectSkin(skin.id)}
            onDelete={
              skin.isBuiltin
                ? undefined
                : () => handleDelete(skin.id, skin.name)
            }
          />
        ))}
      </div>

      {/* Import button */}
      <Button
        onClick={handleImport}
        disabled={isImporting}
        variant="outline"
        className="w-full p-2 mb-3 text-xs border-dashed"
      >
        {isImporting ? '导入中...' : '+ 导入自定义形象'}
      </Button>

      {error && (
        <div className="p-2 mb-3 text-[11px] bg-red-50 border border-red-200 rounded-md text-red-500">
          {error}
        </div>
      )}

      {/* Scale slider */}
      <div className="settings-row">
        <span className="settings-label">模型缩放</span>
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={scale}
          onChange={(e) => onScaleChange(parseFloat(e.target.value))}
          className="w-[120px] accent-indigo-500"
        />
        <span className="ml-2 text-xs text-slate-600 font-medium">
          {scale.toFixed(1)}x
        </span>
      </div>

      <div className="settings-row border-none pt-1 text-[11px] text-slate-400">
        支持导入 Live2D 模型（.model.json / .model3.json）来自定义宠物形象
      </div>
    </div>
  );
}
