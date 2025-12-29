// Skin Settings Component

import { useState, useCallback } from 'react';
import type { SkinMeta } from '../../types';
import { useSkinStore } from '../../stores/skinStore';
import { getSkinManager, importSkinFromFolder, deleteImportedSkin } from '../../services/skin';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { confirmAction } from '@/lib/confirm';

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
        p-2 border-2 rounded-lg cursor-pointer relative transition-all duration-200 ease-out
        ${isSelected 
          ? 'border-amber-600 bg-amber-50 shadow-md transform scale-[1.02]' 
          : 'border-amber-200 bg-[#FFF8DC] hover:border-amber-400 hover:shadow-sm'
        }
      `}
    >
      {/* Preview image */}
      <div className="w-full aspect-square bg-amber-100/50 rounded mb-2 flex items-center justify-center overflow-hidden border border-amber-100">
        {skin.previewImage ? (
          <img
            src={skin.previewImage}
            alt={skin.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-2xl text-amber-300">?</span>
        )}
      </div>

      {/* Skin name */}
      <div
        className={`
          text-xs text-center whitespace-nowrap overflow-hidden text-ellipsis
          ${isSelected ? 'font-bold text-amber-800' : 'font-normal text-amber-700'}
        `}
      >
        {skin.name}
      </div>

      {/* Builtin badge */}
      {skin.isBuiltin && (
        <span className="absolute top-1 right-1 text-[9px] px-1 py-0.5 bg-amber-200/80 text-amber-800 rounded font-bold backdrop-blur-sm">
          官方
        </span>
      )}

      {/* Delete button for custom skins */}
      {!skin.isBuiltin && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-1 right-1 w-5 h-5 p-0 border-none rounded-full bg-red-100 text-red-600 hover:bg-red-200 cursor-pointer text-xs flex items-center justify-center transition-colors shadow-sm"
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
    const ok = await confirmAction(`确认删除形象「${skinName}」吗？`, {
      title: '删除形象',
      kind: 'warning',
      okLabel: '删除',
      cancelLabel: '取消',
    });
    if (!ok) return;

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
      <div className="grid grid-cols-3 gap-3 mb-4">
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
        className="w-full mb-4 preset-btn h-9 text-xs"
        variant="ghost"
      >
        {isImporting ? '导入中...' : '+ 导入自定义形象'}
      </Button>

      {error && (
        <div className="p-2 mb-3 text-[11px] bg-red-50 border border-red-200 rounded-md text-red-500">
          {error}
        </div>
      )}

      {/* Scale slider */}
      <div className="settings-row border-none">
        <span className="settings-label">模型缩放</span>
        <div className="slider-container">
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={scale}
            onChange={(e) => onScaleChange(parseFloat(e.target.value))}
            className="game-slider"
            style={{ width: '120px' }}
          />
          <span className="slider-value">
            {scale.toFixed(1)}x
          </span>
        </div>
      </div>

      <div className="settings-row border-none pt-0 text-[11px] text-slate-400 italic">
        支持导入 Live2D 模型（.model.json / .model3.json）来自定义宠物形象
      </div>
    </div>
  );
}
