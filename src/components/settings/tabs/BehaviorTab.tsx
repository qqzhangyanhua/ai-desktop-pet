import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AppConfig } from '../../../types';

interface BehaviorTabProps {
  localConfig: AppConfig;
  setLocalConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  onFeedback?: (message: string, type?: any, duration?: number) => void;
}

export function BehaviorTab({ localConfig, setLocalConfig }: BehaviorTabProps) {
  return (
    <>
      <div className="settings-section">
        <div className="settings-section-title">属性衰减与互动</div>

        <div className="settings-row">
          <span className="settings-label">属性衰减速度</span>
          <Select
            value={localConfig.behavior.decaySpeed}
            onValueChange={(value: AppConfig['behavior']['decaySpeed']) =>
              setLocalConfig((prev) => ({
                ...prev,
                behavior: { ...prev.behavior, decaySpeed: value },
              }))
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="casual">休闲</SelectItem>
              <SelectItem value="standard">标准</SelectItem>
              <SelectItem value="hardcore">硬核</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="settings-row">
          <span className="settings-label">互动频率</span>
          <Select
            value={localConfig.behavior.interactionFrequency}
            onValueChange={(value: AppConfig['behavior']['interactionFrequency']) =>
              setLocalConfig((prev) => ({
                ...prev,
                behavior: {
                  ...prev.behavior,
                  interactionFrequency: value,
                },
              }))
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">低</SelectItem>
              <SelectItem value="standard">标准</SelectItem>
              <SelectItem value="high">高</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="settings-row">
          <span className="settings-label">自动打工</span>
          <Checkbox
            checked={localConfig.behavior.autoWork.enabled}
            onCheckedChange={(checked) =>
              setLocalConfig((prev) => ({
                ...prev,
                behavior: {
                  ...prev.behavior,
                  autoWork: { ...prev.behavior.autoWork, enabled: !!checked }
                },
              }))
            }
          />
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">通知提醒设置</div>

        <div className="settings-row">
          <span className="settings-label">气泡提示</span>
          <Checkbox
            checked={localConfig.behavior.notifications.bubbleEnabled}
            onCheckedChange={(checked) =>
              setLocalConfig((prev) => ({
                ...prev,
                behavior: {
                  ...prev.behavior,
                  notifications: { ...prev.behavior.notifications, bubbleEnabled: !!checked },
                },
              }))
            }
          />
        </div>

        <div className="settings-row settings-row-no-border">
          <span className="settings-label">Toast 提醒</span>
          <Checkbox
            checked={localConfig.behavior.notifications.toastEnabled}
            onCheckedChange={(checked) =>
              setLocalConfig((prev) => ({
                ...prev,
                behavior: {
                  ...prev.behavior,
                  notifications: { ...prev.behavior.notifications, toastEnabled: !!checked },
                },
              }))
            }
          />
        </div>
      </div>
    </>
  );
}
