import type { AppConfig } from '../../../types';
import type { FeedbackType } from '../FeedbackAnimation';

interface PerformanceTabProps {
  config: AppConfig;
  onConfigChange: (updater: (prev: AppConfig) => AppConfig) => void;
  onFeedback?: (message: string, type?: FeedbackType) => void;
}

export function PerformanceTab({ config, onConfigChange, onFeedback }: PerformanceTabProps) {
  return (
    <>
      <div className="settings-section">
        <div className="settings-section-title">🖱️ 桌宠交互体验</div>

        <div className="settings-row">
          <span className="settings-label">👻 鼠标穿透（点到桌面）</span>
          <input
            type="checkbox"
            checked={config.interaction.clickThrough}
            onChange={(e) => {
              const enabled = e.target.checked;
              onConfigChange((prev) => ({
                ...prev,
                interaction: { ...prev.interaction, clickThrough: enabled },
              }));
              onFeedback?.(
                enabled ? '👻 宠物变成幽灵啦!' : '🐾 宠物回来了!',
                enabled ? 'warning' : 'success'
              );
            }}
            className="settings-checkbox"
          />
        </div>

        <div className="settings-row">
          <span className="settings-label">🧲 左右吸附</span>
          <input
            type="checkbox"
            checked={config.interaction.snapEnabled}
            onChange={(e) => {
              const enabled = e.target.checked;
              onConfigChange((prev) => ({
                ...prev,
                interaction: { ...prev.interaction, snapEnabled: enabled },
              }));
              onFeedback?.(
                enabled ? '🧲 吸附功能已开启!' : '🎈 宠物自由飞翔~',
                'info'
              );
            }}
            className="settings-checkbox"
          />
        </div>

        <div className="settings-row">
          <span className="settings-label">📏 吸附阈值</span>
          <div className="slider-container">
            <input
              type="range"
              className="slider"
              min="8"
              max="48"
              step="2"
              value={config.interaction.snapThreshold}
              onChange={(e) =>
                onConfigChange((prev) => ({
                  ...prev,
                  interaction: { ...prev.interaction, snapThreshold: parseInt(e.target.value, 10) },
                }))
              }
              disabled={!config.interaction.snapEnabled}
            />
            <span className="slider-value">
              {config.interaction.snapThreshold}px
            </span>
          </div>
        </div>

        <div className="settings-row">
          <span className="settings-label">💾 记忆窗口位置</span>
          <input
            type="checkbox"
            checked={config.interaction.rememberPosition}
            onChange={(e) =>
              onConfigChange((prev) => ({
                ...prev,
                interaction: { ...prev.interaction, rememberPosition: e.target.checked },
              }))
            }
            className="settings-checkbox"
          />
        </div>

        <div className="settings-row">
          <span className="settings-label">🫥 靠边自动隐藏</span>
          <input
            type="checkbox"
            checked={config.interaction.autoHideEnabled}
            onChange={(e) => {
              const enabled = e.target.checked;
              onConfigChange((prev) => ({
                ...prev,
                interaction: { ...prev.interaction, autoHideEnabled: enabled },
              }));
              onFeedback?.(
                enabled ? '🫥 宠物会自动躲猫猫了!' : '👀 宠物一直在你身边~',
                'info'
              );
            }}
            className="settings-checkbox"
          />
        </div>

        <div className="settings-row">
          <span className="settings-label">👀 隐藏露出</span>
          <div className="slider-container">
            <input
              type="range"
              className="slider"
              min="30"
              max="120"
              step="5"
              value={config.interaction.autoHideOffset}
              onChange={(e) =>
                onConfigChange((prev) => ({
                  ...prev,
                  interaction: { ...prev.interaction, autoHideOffset: parseInt(e.target.value, 10) },
                }))
              }
              disabled={!config.interaction.autoHideEnabled}
            />
            <span className="slider-value">
              {config.interaction.autoHideOffset}px
            </span>
          </div>
        </div>

        <div className="settings-row settings-hint-row">
          开启"鼠标穿透"后无法点击宠物与设置窗口,请通过菜单栏托盘关闭穿透。
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">⚡ 性能优化</div>

        <div className="settings-row">
          <span className="settings-label">🚀 开机自启动</span>
          <input
            type="checkbox"
            checked={config.performance.launchOnStartup}
            onChange={(e) =>
              onConfigChange((prev) => ({
                ...prev,
                performance: { ...prev.performance, launchOnStartup: e.target.checked },
              }))
            }
            className="settings-checkbox"
          />
        </div>

        <div className="settings-row">
          <span className="settings-label">🔋 后台运行模式</span>
          <select
            className="settings-select"
            value={config.performance.backgroundMode}
            onChange={(e) => {
              const mode = e.target.value as AppConfig['performance']['backgroundMode'];
              onConfigChange((prev) => ({
                ...prev,
                performance: { ...prev.performance, backgroundMode: mode },
              }));

              const modeMessages: Record<string, string> = {
                balanced: '⚖️ 已切换到均衡模式',
                battery: '🔋 省电模式启动!',
                performance: '🚀 性能全开!',
              };
              onFeedback?.(modeMessages[mode] || '', 'info');
            }}
          >
            <option value="balanced">均衡</option>
            <option value="battery">省电</option>
            <option value="performance">性能</option>
          </select>
        </div>

        <div className="settings-row">
          <span className="settings-label">🎞️ 动画帧率</span>
          <div className="slider-container">
            <input
              type="range"
              className="slider"
              min="15"
              max="60"
              step="5"
              value={config.performance.animationFps}
              onChange={(e) =>
                onConfigChange((prev) => ({
                  ...prev,
                  performance: { ...prev.performance, animationFps: parseInt(e.target.value, 10) },
                }))
              }
            />
            <span className="slider-value">
              {config.performance.animationFps} FPS
            </span>
          </div>
        </div>

        <div className="settings-row">
          <span className="settings-label">💻 资源占用限制</span>
          <select
            className="settings-select"
            value={config.performance.resourceLimit}
            onChange={(e) =>
              onConfigChange((prev) => ({
                ...prev,
                performance: { ...prev.performance, resourceLimit: e.target.value as AppConfig['performance']['resourceLimit'] },
              }))
            }
          >
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">🪟 窗口行为</div>
        <div className="settings-row">
          <span className="settings-label">📌 窗口置顶</span>
          <input
            type="checkbox"
            checked={config.alwaysOnTop}
            onChange={(e) => {
              const enabled = e.target.checked;
              onConfigChange((prev) => ({
                ...prev,
                alwaysOnTop: enabled,
              }));
              onFeedback?.(
                enabled ? '📌 宠物永远在最前面!' : '📋 窗口恢复正常层级',
                'info'
              );
            }}
            className="settings-checkbox"
          />
        </div>

        <div className="settings-row">
          <span className="settings-label">📦 启动最小化</span>
          <input
            type="checkbox"
            checked={config.startMinimized}
            onChange={(e) =>
              onConfigChange((prev) => ({
                ...prev,
                startMinimized: e.target.checked,
              }))
            }
            className="settings-checkbox"
          />
        </div>

        <div className="settings-row settings-hint-row">
          部分性能项当前仅保存配置，后续可接入原生插件实现真正的开机自启/后台策略。
        </div>
      </div>
    </>
  );
}
