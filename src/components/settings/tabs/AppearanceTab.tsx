import type { AppConfig } from '../../../types';
import type { FeedbackType } from '../FeedbackAnimation';
import { SkinSettings } from '../SkinSettings';
import { getSkinManager } from '../../../services/skin';

interface AppearanceTabProps {
  config: AppConfig;
  onConfigChange: (updater: (prev: AppConfig) => AppConfig) => void;
  onFeedback?: (message: string, type?: FeedbackType) => void;
}

export function AppearanceTab({ config, onConfigChange, onFeedback }: AppearanceTabProps) {
  return (
    <>
      <SkinSettings
        title="宠物形象选择"
        live2dEnabled={config.useLive2D}
        onLive2DEnabledChange={(enabled) => {
          onConfigChange((prev) => ({
            ...prev,
            useLive2D: enabled,
            live2d: { ...prev.live2d, useLive2D: enabled },
          }));
          onFeedback?.(
            enabled ? '✨ 宠物动起来啦!' : '宠物休息中~',
            'success'
          );
        }}
        scale={config.live2d.modelScale}
        onScaleChange={(scale) => {
          const prevScale = config.live2d.modelScale;
          onConfigChange((prev) => ({
            ...prev,
            live2d: { ...prev.live2d, modelScale: scale },
          }));
          if (Math.abs(scale - prevScale) > 0.1) {
            onFeedback?.(
              scale > prevScale ? '🐻 宠物长大啦!' : '🐁 宠物缩小啦!',
              'info'
            );
          }
        }}
        onSkinChange={(skinId) => {
          onConfigChange((prev) => ({
            ...prev,
            appearance: { ...prev.appearance, skinId },
          }));
          getSkinManager().switchSkin(skinId).then(() => {
            onFeedback?.('👗 宠物换上新衣服啦!', 'success');
          }).catch(() => {
            onFeedback?.('皮肤切换失败', 'warning');
          });
        }}
      />

      <div className="settings-section">
        <div className="settings-section-title">🏡 小窝背景</div>

        <div className="settings-row">
          <span className="settings-label">背景类型</span>
          <select
            className="settings-select"
            value={config.appearance.background.mode}
            onChange={(e) =>
              onConfigChange((prev) => ({
                ...prev,
                appearance: {
                  ...prev.appearance,
                  background: {
                    mode: e.target.value as AppConfig['appearance']['background']['mode'],
                    value: undefined,
                  },
                },
              }))
            }
          >
            <option value="none">透明</option>
            <option value="preset">预设渐变</option>
            <option value="color">纯色</option>
            <option value="image">图片 URL</option>
          </select>
        </div>

        {config.appearance.background.mode === 'preset' && (
          <div className="settings-row">
            <span className="settings-label">预设</span>
            <select
              className="settings-select"
              value={config.appearance.background.value ?? 'light'}
              onChange={(e) =>
                onConfigChange((prev) => ({
                  ...prev,
                  appearance: {
                    ...prev.appearance,
                    background: { mode: 'preset', value: e.target.value },
                  },
                }))
              }
            >
              <option value="light">清新浅色</option>
              <option value="dark">柔和深色</option>
              <option value="sunset">日落暖色</option>
            </select>
          </div>
        )}

        {config.appearance.background.mode === 'color' && (
          <div className="settings-row">
            <span className="settings-label">颜色</span>
            <input
              type="text"
              className="settings-input"
              value={config.appearance.background.value ?? 'rgba(255,255,255,0.75)'}
              onChange={(e) =>
                onConfigChange((prev) => ({
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

        {config.appearance.background.mode === 'image' && (
          <div className="settings-row">
            <span className="settings-label">图片 URL</span>
            <input
              type="text"
              className="settings-input"
              value={config.appearance.background.value ?? ''}
              onChange={(e) =>
                onConfigChange((prev) => ({
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
        <div className="settings-section-title">🎨 透明度与尺寸</div>

        <div className="settings-row">
          <span className="settings-label">小窝透明度</span>
          <div className="slider-container">
            <span className="slider-icon">🌫️</span>
            <input
              type="range"
              className="slider"
              min="0.2"
              max="1"
              step="0.05"
              value={config.appearance.opacity}
              onChange={(e) =>
                onConfigChange((prev) => ({
                  ...prev,
                  appearance: { ...prev.appearance, opacity: parseFloat(e.target.value) },
                }))
              }
            />
            <span className="slider-icon">🪟</span>
            <span className="slider-value">
              {Math.round(config.appearance.opacity * 100)}%
            </span>
          </div>
        </div>

        <div className="settings-row">
          <span className="settings-label">宠物大小</span>
          <div className="settings-size-inputs">
            <input
              type="number"
              className="settings-input settings-size-input"
              value={config.appearance.size.width}
              onChange={(e) =>
                onConfigChange((prev) => ({
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
            <span className="settings-size-separator">×</span>
            <input
              type="number"
              className="settings-input settings-size-input"
              value={config.appearance.size.height}
              onChange={(e) =>
                onConfigChange((prev) => ({
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
          <div className="size-presets">
            <button
              className="preset-btn"
              onClick={() =>
                onConfigChange((prev) => ({
                  ...prev,
                  appearance: { ...prev.appearance, size: { width: 260, height: 360 } },
                }))
              }
            >
              <div className="preset-icon">🐁</div>
              <div className="preset-label">小</div>
            </button>
            <button
              className="preset-btn"
              onClick={() =>
                onConfigChange((prev) => ({
                  ...prev,
                  appearance: { ...prev.appearance, size: { width: 300, height: 400 } },
                }))
              }
            >
              <div className="preset-icon">🐱</div>
              <div className="preset-label">标准</div>
            </button>
            <button
              className="preset-btn"
              onClick={() =>
                onConfigChange((prev) => ({
                  ...prev,
                  appearance: { ...prev.appearance, size: { width: 360, height: 480 } },
                }))
              }
            >
              <div className="preset-icon">🐻</div>
              <div className="preset-label">大</div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
