import type { AppConfig } from '../../../types';
import type { FeedbackType } from '../FeedbackAnimation';
import { Mouse, Magnet, Ruler, HardDrive, EyeOff, Eye, Zap, Rocket, Battery, Film, Monitor, Pipette, Pin, Package } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PerformanceTabProps {
  config: AppConfig;
  onConfigChange: (updater: (prev: AppConfig) => AppConfig) => void;
  onFeedback?: (message: string, type?: FeedbackType) => void;
}

export function PerformanceTab({ config, onConfigChange, onFeedback }: PerformanceTabProps) {
  return (
    <>
      <div className="settings-section">
        <div className="settings-section-title flex items-center gap-2">
          <Mouse className="w-4 h-4" />
          桌宠交互体验
        </div>

        <div className="settings-row">
          <span className="settings-label flex items-center gap-2">
            <EyeOff className="w-4 h-4" />
            鼠标穿透（点到桌面）
          </span>
          <Checkbox
            checked={config.interaction.clickThrough}
            onCheckedChange={(enabled) => {
              onConfigChange((prev) => ({
                ...prev,
                interaction: { ...prev.interaction, clickThrough: !!enabled },
              }));
              onFeedback?.(
                !!enabled ? '宠物变成幽灵啦!' : '宠物回来了!',
                !!enabled ? 'warning' : 'success'
              );
            }}
          />
        </div>

        <div className="settings-row">
          <span className="settings-label flex items-center gap-2">
            <Magnet className="w-4 h-4" />
            左右吸附
          </span>
          <Checkbox
            checked={config.interaction.snapEnabled}
            onCheckedChange={(enabled) => {
              onConfigChange((prev) => ({
                ...prev,
                interaction: { ...prev.interaction, snapEnabled: !!enabled },
              }));
              onFeedback?.(
                !!enabled ? '吸附功能已开启!' : '宠物自由飞翔~',
                'info'
              );
            }}
          />
        </div>

        <div className="settings-row">
          <span className="settings-label flex items-center gap-2">
            <Ruler className="w-4 h-4" />
            吸附阈值
          </span>
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
          <span className="settings-label flex items-center gap-2">
            <HardDrive className="w-4 h-4" />
            记忆窗口位置
          </span>
          <Checkbox
            checked={config.interaction.rememberPosition}
            onCheckedChange={(checked) =>
              onConfigChange((prev) => ({
                ...prev,
                interaction: { ...prev.interaction, rememberPosition: !!checked },
              }))
            }
          />
        </div>

        <div className="settings-row">
          <span className="settings-label flex items-center gap-2">
            <EyeOff className="w-4 h-4" />
            靠边自动隐藏
          </span>
          <Checkbox
            checked={config.interaction.autoHideEnabled}
            onCheckedChange={(enabled) => {
              onConfigChange((prev) => ({
                ...prev,
                interaction: { ...prev.interaction, autoHideEnabled: !!enabled },
              }));
              onFeedback?.(
                !!enabled ? '宠物会自动躲猫猫了!' : '宠物一直在你身边~',
                'info'
              );
            }}
          />
        </div>

        <div className="settings-row">
          <span className="settings-label flex items-center gap-2">
            <Eye className="w-4 h-4" />
            隐藏露出
          </span>
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
        <div className="settings-section-title flex items-center gap-2">
          <Zap className="w-4 h-4" />
          性能优化
        </div>

        <div className="settings-row">
          <span className="settings-label flex items-center gap-2">
            <Rocket className="w-4 h-4" />
            开机自启动
          </span>
          <Checkbox
            checked={config.performance.launchOnStartup}
            onCheckedChange={(checked) =>
              onConfigChange((prev) => ({
                ...prev,
                performance: { ...prev.performance, launchOnStartup: !!checked },
              }))
            }
          />
        </div>

        <div className="settings-row">
          <span className="settings-label flex items-center gap-2">
            <Battery className="w-4 h-4" />
            后台运行模式
          </span>
          <Select
            value={config.performance.backgroundMode}
            onValueChange={(mode: AppConfig['performance']['backgroundMode']) => {
              onConfigChange((prev) => ({
                ...prev,
                performance: { ...prev.performance, backgroundMode: mode },
              }));

              const modeMessages: Record<string, string> = {
                balanced: '已切换到均衡模式',
                battery: '省电模式启动!',
                performance: '性能全开!',
              };
              onFeedback?.(modeMessages[mode] || '', 'info');
            }}
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
          <span className="settings-label flex items-center gap-2">
            <Film className="w-4 h-4" />
            动画帧率
          </span>
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
          <span className="settings-label flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            资源占用限制
          </span>
          <Select
            value={config.performance.resourceLimit}
            onValueChange={(value: AppConfig['performance']['resourceLimit']) =>
              onConfigChange((prev) => ({
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

      <div className="settings-section">
        <div className="settings-section-title flex items-center gap-2">
          <Pipette className="w-4 h-4" />
          窗口行为
        </div>
        <div className="settings-row">
          <span className="settings-label flex items-center gap-2">
            <Pin className="w-4 h-4" />
            窗口置顶
          </span>
          <Checkbox
            checked={config.alwaysOnTop}
            onCheckedChange={(enabled) => {
              onConfigChange((prev) => ({
                ...prev,
                alwaysOnTop: !!enabled,
              }));
              onFeedback?.(
                !!enabled ? '宠物永远在最前面!' : '窗口恢复正常层级',
                'info'
              );
            }}
          />
        </div>

        <div className="settings-row">
          <span className="settings-label flex items-center gap-2">
            <Package className="w-4 h-4" />
            启动最小化
          </span>
          <Checkbox
            checked={config.startMinimized}
            onCheckedChange={(checked) =>
              onConfigChange((prev) => ({
                ...prev,
                startMinimized: !!checked,
              }))
            }
          />
        </div>

        <div className="settings-row settings-hint-row">
          部分性能项当前仅保存配置，后续可接入原生插件实现真正的开机自启/后台策略。
        </div>
      </div>
    </>
  );
}
