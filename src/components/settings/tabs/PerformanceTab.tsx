import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AppConfig } from '../../../types';

interface PerformanceTabProps {
  localConfig: AppConfig;
  setLocalConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  onFeedback?: (message: string, type?: any, duration?: number) => void;
}

export function PerformanceTab({ localConfig, setLocalConfig }: PerformanceTabProps) {
  return (
    <>
      <div className="settings-section">
        <div className="settings-section-title">桌宠交互体验</div>

        <div className="settings-row">
          <span className="settings-label">鼠标穿透（点到桌面）</span>
          <Checkbox
            checked={localConfig.interaction.clickThrough}
            onCheckedChange={(checked) =>
              setLocalConfig((prev) => ({
                ...prev,
                interaction: { ...prev.interaction, clickThrough: !!checked },
              }))
            }
          />
        </div>

        <div className="settings-row">
          <span className="settings-label">左右吸附</span>
          <Checkbox
            checked={localConfig.interaction.snapEnabled}
            onCheckedChange={(checked) =>
              setLocalConfig((prev) => ({
                ...prev,
                interaction: { ...prev.interaction, snapEnabled: !!checked },
              }))
            }
          />
        </div>

        <div className="settings-row">
          <span className="settings-label">吸附阈值</span>
          <div className="slider-container">
            <input
              type="range"
              min="8"
              max="48"
              step="2"
              value={localConfig.interaction.snapThreshold}
              onChange={(e) =>
                setLocalConfig((prev) => ({
                  ...prev,
                  interaction: { ...prev.interaction, snapThreshold: parseInt(e.target.value, 10) },
                }))
              }
              className="game-slider"
              style={{ width: '150px' }}
              disabled={!localConfig.interaction.snapEnabled}
            />
            <span className="slider-value">
              {localConfig.interaction.snapThreshold}px
            </span>
          </div>
        </div>

        <div className="settings-row settings-row-no-border">
          <span className="settings-label">记忆窗口位置</span>
          <Checkbox
            checked={localConfig.interaction.rememberPosition}
            onCheckedChange={(checked) =>
              setLocalConfig((prev) => ({
                ...prev,
                interaction: { ...prev.interaction, rememberPosition: !!checked },
              }))
            }
          />
        </div>

        <div className="settings-row">
          <span className="settings-label">靠边自动隐藏</span>
          <Checkbox
            checked={localConfig.interaction.autoHideEnabled}
            onCheckedChange={(checked) =>
              setLocalConfig((prev) => ({
                ...prev,
                interaction: { ...prev.interaction, autoHideEnabled: !!checked },
              }))
            }
          />
        </div>

        <div className="settings-row">
          <span className="settings-label">隐藏露出</span>
          <div className="slider-container">
            <input
              type="range"
              min="30"
              max="120"
              step="5"
              value={localConfig.interaction.autoHideOffset}
              onChange={(e) =>
                setLocalConfig((prev) => ({
                  ...prev,
                  interaction: { ...prev.interaction, autoHideOffset: parseInt(e.target.value, 10) },
                }))
              }
              className="game-slider"
              style={{ width: '150px' }}
              disabled={!localConfig.interaction.autoHideEnabled}
            />
            <span className="slider-value">
              {localConfig.interaction.autoHideOffset}px
            </span>
          </div>
        </div>

        <div className="settings-row settings-row-no-border settings-hint-row">
          开启"鼠标穿透"后无法点击宠物与设置窗口，请通过菜单栏托盘关闭穿透。
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">性能优化</div>

        <div className="settings-row">
          <span className="settings-label">开机自启动</span>
          <Checkbox
            checked={localConfig.performance.launchOnStartup}
            onCheckedChange={(checked) =>
              setLocalConfig((prev) => ({
                ...prev,
                performance: { ...prev.performance, launchOnStartup: !!checked },
              }))
            }
          />
        </div>

        <div className="settings-row">
          <span className="settings-label">后台运行模式</span>
          <Select
            value={localConfig.performance.backgroundMode}
            onValueChange={(value: AppConfig['performance']['backgroundMode']) =>
              setLocalConfig((prev) => ({
                ...prev,
                performance: { ...prev.performance, backgroundMode: value },
              }))
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="balanced">均衡</SelectItem>
              <SelectItem value="battery">省电</SelectItem>
              <SelectItem value="performance">性能</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="settings-row">
          <span className="settings-label">动画帧率</span>
          <div className="slider-container">
            <input
              type="range"
              min="15"
              max="60"
              step="5"
              value={localConfig.performance.animationFps}
              onChange={(e) =>
                setLocalConfig((prev) => ({
                  ...prev,
                  performance: { ...prev.performance, animationFps: parseInt(e.target.value, 10) },
                }))
              }
              className="game-slider"
              style={{ width: '150px' }}
            />
            <span className="slider-value">
              {localConfig.performance.animationFps} FPS
            </span>
          </div>
        </div>

        <div className="settings-row settings-row-no-border">
          <span className="settings-label">资源占用限制</span>
          <Select
            value={localConfig.performance.resourceLimit}
            onValueChange={(value: AppConfig['performance']['resourceLimit']) =>
              setLocalConfig((prev) => ({
                ...prev,
                performance: { ...prev.performance, resourceLimit: value },
              }))
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">低</SelectItem>
              <SelectItem value="medium">中</SelectItem>
              <SelectItem value="high">高</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="settings-section settings-hint-row" style={{ marginBottom: 0 }}>
        部分性能项当前仅保存配置，后续可接入原生插件实现真正的开机自启/后台策略。
      </div>
    </>
  );
}
