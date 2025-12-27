// Skin Settings Component

import { useState, useCallback } from 'react';
import type { SkinMeta } from '../../types';
import { useSkinStore } from '../../stores/skinStore';
import { getSkinManager, importSkinFromFolder, deleteImportedSkin } from '../../services/skin';

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
      style={{
        padding: '8px',
        border: isSelected ? '2px solid #6366f1' : '1px solid #e2e8f0',
        borderRadius: '8px',
        backgroundColor: isSelected ? '#eef2ff' : 'white',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Preview image */}
      <div
        style={{
          width: '100%',
          aspectRatio: '1',
          backgroundColor: '#f1f5f9',
          borderRadius: '4px',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {skin.previewImage ? (
          <img
            src={skin.previewImage}
            alt={skin.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: '24px', color: '#94a3b8' }}>?</span>
        )}
      </div>

      {/* Skin name */}
      <div
        style={{
          fontSize: '12px',
          fontWeight: isSelected ? 'bold' : 'normal',
          color: isSelected ? '#6366f1' : '#334155',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {skin.name}
      </div>

      {/* Builtin badge */}
      {skin.isBuiltin && (
        <span
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            fontSize: '9px',
            padding: '2px 4px',
            backgroundColor: '#dbeafe',
            color: '#2563eb',
            borderRadius: '2px',
          }}
        >
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
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '20px',
            height: '20px',
            padding: 0,
            border: 'none',
            borderRadius: '50%',
            backgroundColor: '#fef2f2',
            color: '#ef4444',
            cursor: 'pointer',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
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
          <input
            type="checkbox"
            checked={live2dEnabled}
            onChange={(e) => onLive2DEnabledChange(e.target.checked)}
            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
          />
        </div>
      )}

      {/* Skin grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
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
      <button
        onClick={handleImport}
        disabled={isImporting}
        style={{
          width: '100%',
          padding: '8px',
          marginBottom: '12px',
          fontSize: '12px',
          border: '1px dashed #e2e8f0',
          borderRadius: '6px',
          backgroundColor: 'white',
          cursor: isImporting ? 'not-allowed' : 'pointer',
          color: '#64748b',
          opacity: isImporting ? 0.7 : 1,
        }}
      >
        {isImporting ? '导入中...' : '+ 导入自定义形象'}
      </button>

      {error && (
        <div
          style={{
            padding: '8px',
            marginBottom: '12px',
            fontSize: '11px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            color: '#ef4444',
          }}
        >
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
          style={{ width: '120px' }}
        />
        <span style={{ marginLeft: '8px', fontSize: '12px' }}>
          {scale.toFixed(1)}x
        </span>
      </div>

      <div
        className="settings-row"
        style={{
          fontSize: '11px',
          color: '#888',
          borderBottom: 'none',
          paddingTop: '4px',
        }}
      >
        支持导入 Live2D 模型（.model.json / .model3.json）来自定义宠物形象
      </div>
    </div>
  );
}
