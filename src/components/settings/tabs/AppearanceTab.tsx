import { SkinSettings } from '../SkinSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AppConfig } from '../../../types';

interface AppearanceTabProps {
  localConfig: AppConfig;
  setLocalConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  onFeedback?: (message: string, type?: any, duration?: number) => void;
}

export function AppearanceTab({ localConfig, setLocalConfig }: AppearanceTabProps) {
  return (
    <>
      <SkinSettings
        title="宠物形象选择"
        live2dEnabled={localConfig.useLive2D}
        onLive2DEnabledChange={(enabled) =>
          setLocalConfig((prev) => ({
            ...prev,
            useLive2D: enabled,
            live2d: { ...prev.live2d, useLive2D: enabled },
          }))
        }
        scale={localConfig.live2d.modelScale}
        onScaleChange={(scale) =>
          setLocalConfig((prev) => ({
            ...prev,
            live2d: { ...prev.live2d, modelScale: scale },
          }))
        }
        onSkinChange={(skinId) =>
          setLocalConfig((prev) => ({
            ...prev,
            appearance: { ...prev.appearance, skinId },
          }))
        }
      />

      <div className="settings-section">
        <div className="settings-section-title">场景背景</div>

        <div className="settings-row">
          <span className="settings-label">背景类型</span>
          <Select
            value={localConfig.appearance.background.mode}
            onValueChange={(mode: AppConfig['appearance']['background']['mode']) =>
              setLocalConfig((prev) => ({
                ...prev,
                appearance: {
                  ...prev.appearance,
                  background: {
                    mode,
                    value: undefined,
                  },
                },
              }))
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">透明</SelectItem>
              <SelectItem value="preset">预设渐变</SelectItem>
              <SelectItem value="color">纯色</SelectItem>
              <SelectItem value="image">图片 URL</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {localConfig.appearance.background.mode === 'preset' && (
          <div className="settings-row">
            <span className="settings-label">预设</span>
            <Select
              value={localConfig.appearance.background.value ?? 'light'}
              onValueChange={(value) =>
                setLocalConfig((prev) => ({
                  ...prev,
                  appearance: {
                    ...prev.appearance,
                    background: { mode: 'preset', value },
                  },
                }))
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">清新浅色</SelectItem>
                <SelectItem value="dark">柔和深色</SelectItem>
                <SelectItem value="sunset">日落暖色</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {localConfig.appearance.background.mode === 'color' && (
          <div className="settings-row">
            <span className="settings-label">颜色</span>
            <Input
              type="text"
              className="settings-input"
              value={localConfig.appearance.background.value ?? 'rgba(255,255,255,0.75)'}
              onChange={(e) =>
                setLocalConfig((prev) => ({
                  ...prev,
                  appearance: {
                    ...prev.appearance,
                    background: { mode: 'color', value: e.target.value },
                  },
                }))
              }
              placeholder="例如：rgba(255,255,255,0.75)"
            />
          </div>
        )}

        {localConfig.appearance.background.mode === 'image' && (
          <div className="settings-row">
            <span className="settings-label">图片 URL</span>
            <Input
              type="text"
              className="settings-input"
              value={localConfig.appearance.background.value ?? ''}
              onChange={(e) =>
                setLocalConfig((prev) => ({
                  ...prev,
                  appearance: {
                    ...prev.appearance,
                    background: { mode: 'image', value: e.target.value },
                  },
                }))
              }
              placeholder="https://..."
            />
          </div>
        )}
      </div>

      <div className="settings-section">
        <div className="settings-section-title">透明度与尺寸</div>

        <div className="settings-row">
          <span className="settings-label">透明度</span>
          <div className="slider-container">
            <input
              type="range"
              min="0.2"
              max="1"
              step="0.05"
              value={localConfig.appearance.opacity}
              onChange={(e) =>
                setLocalConfig((prev) => ({
                  ...prev,
                  appearance: { ...prev.appearance, opacity: parseFloat(e.target.value) },
                }))
              }
              className="game-slider"
              style={{ width: '150px' }}
            />
            <span className="slider-value">
              {Math.round(localConfig.appearance.opacity * 100)}%
            </span>
          </div>
        </div>

        <div className="settings-row">
          <span className="settings-label">显示尺寸</span>
          <div className="game-flex-row">
            <Input
              type="number"
              className="game-input-sm"
              value={localConfig.appearance.size.width}
              onChange={(e) =>
                setLocalConfig((prev) => ({
                  ...prev,
                  appearance: {
                    ...prev.appearance,
                    size: {
                      ...prev.appearance.size,
                      width: Math.max(200, Math.min(900, parseInt(e.target.value || '0', 10))),
                    },
                  },
                }))
              }
            />
            <span style={{ fontSize: '12px', color: '#5D4037' }}>×</span>
            <Input
              type="number"
              className="game-input-sm"
              value={localConfig.appearance.size.height}
              onChange={(e) =>
                setLocalConfig((prev) => ({
                  ...prev,
                  appearance: {
                    ...prev.appearance,
                    size: {
                      ...prev.appearance.size,
                      height: Math.max(240, Math.min(1200, parseInt(e.target.value || '0', 10))),
                    },
                  },
                }))
              }
            />
          </div>
        </div>

        <div className="settings-row settings-row-no-border">
          <span className="settings-label">快速预设</span>
          <div className="game-flex-row">
            <Button
              onClick={() =>
                setLocalConfig((prev) => ({
                  ...prev,
                  appearance: { ...prev.appearance, size: { width: 260, height: 360 } },
                }))
              }
              className="preset-btn"
              size="sm"
            >
              小
            </Button>
            <Button
              onClick={() =>
                setLocalConfig((prev) => ({
                  ...prev,
                  appearance: { ...prev.appearance, size: { width: 300, height: 400 } },
                }))
              }
              className="preset-btn"
              size="sm"
            >
              标准
            </Button>
            <Button
              onClick={() =>
                setLocalConfig((prev) => ({
                  ...prev,
                  appearance: { ...prev.appearance, size: { width: 360, height: 480 } },
                }))
              }
              className="preset-btn"
              size="sm"
            >
              大
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
