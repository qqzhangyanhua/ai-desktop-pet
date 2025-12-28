import type { AppConfig } from '../../../types';
import type { FeedbackType } from '../FeedbackAnimation';
import { Bone, Clock, Gamepad2, DollarSign, Bell, MessageSquare, Volume2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getAvailableExpressionPacks } from '@/services/pet/expression-pack';

interface BehaviorTabProps {
  config: AppConfig;
  onConfigChange: (updater: (prev: AppConfig) => AppConfig) => void;
  onFeedback?: (message: string, type?: FeedbackType) => void;
}

export function BehaviorTab({ config, onConfigChange, onFeedback }: BehaviorTabProps) {
  const packs = getAvailableExpressionPacks();

  return (
    <>
      <div className="settings-section">
        <div className="settings-section-title flex items-center gap-2">
          <Bone className="w-4 h-4" />
          宠物养成
        </div>

        <div className="settings-row">
          <span className="settings-label flex items-center gap-2">
            <Clock className="w-4 h-4" />
            饿得快慢
          </span>
          <Select
            value={config.behavior.decaySpeed}
            onValueChange={(newSpeed: AppConfig['behavior']['decaySpeed']) => {
              onConfigChange((prev) => ({
                ...prev,
                behavior: { ...prev.behavior, decaySpeed: newSpeed },
              }));

              if (newSpeed === 'hardcore') {
                onFeedback?.('宠物现在饿得更快了!', 'info');
              } else if (newSpeed === 'casual') {
                onFeedback?.('宠物进入悠闲模式~', 'success');
              } else {
                onFeedback?.('已恢复标准节奏', 'info');
              }
            }}
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
          <span className="settings-label flex items-center gap-2">
            <Gamepad2 className="w-4 h-4" />
            互动节奏
          </span>
          <Select
            value={config.behavior.interactionFrequency}
            onValueChange={(newFreq: AppConfig['behavior']['interactionFrequency']) => {
              onConfigChange((prev) => ({
                ...prev,
                behavior: {
                  ...prev.behavior,
                  interactionFrequency: newFreq,
                },
              }));

              if (newFreq === 'high') {
                onFeedback?.('宠物变得更活泼了!', 'success');
              } else if (newFreq === 'low') {
                onFeedback?.('宠物想要安静一下~', 'info');
              } else {
                onFeedback?.('已恢复标准节奏', 'info');
              }
            }}
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
          <span className="settings-label flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            台词风格
          </span>
          <Select
            value={config.behavior.expressionPackId}
            onValueChange={(id: string) => {
              onConfigChange((prev) => ({
                ...prev,
                behavior: { ...prev.behavior, expressionPackId: id },
              }));
              const name = packs.find((p) => p.id === id)?.name ?? id;
              onFeedback?.(`已切换：${name}`, 'success');
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {packs.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="settings-row">
          <span className="settings-label flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            自动打工
          </span>
          <Checkbox
            checked={config.behavior.autoWorkEnabled}
            onCheckedChange={(enabled) => {
              onConfigChange((prev) => ({
                ...prev,
                behavior: { ...prev.behavior, autoWorkEnabled: !!enabled },
              }));
              onFeedback?.(
                !!enabled ? '宠物会自己工作啦!' : '宠物要休息了~',
                'success'
              );
            }}
          />
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title flex items-center gap-2">
          <Bell className="w-4 h-4" />
          通知提醒
        </div>

        <div className="settings-row">
          <span className="settings-label flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            气泡提示
          </span>
          <Checkbox
            checked={config.behavior.notifications.bubbleEnabled}
            onCheckedChange={(enabled) => {
              onConfigChange((prev) => ({
                ...prev,
                behavior: {
                  ...prev.behavior,
                  notifications: { ...prev.behavior.notifications, bubbleEnabled: !!enabled },
                },
              }));
              onFeedback?.(
                !!enabled ? '气泡提示已开启!' : '气泡提示已关闭',
                'info'
              );
            }}
          />
        </div>

        <div className="settings-row settings-row-no-border">
          <span className="settings-label flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            Toast 提醒
          </span>
          <Checkbox
            checked={config.behavior.notifications.toastEnabled}
            onCheckedChange={(enabled) => {
              onConfigChange((prev) => ({
                ...prev,
                behavior: {
                  ...prev.behavior,
                  notifications: { ...prev.behavior.notifications, toastEnabled: !!enabled },
                },
              }));
              onFeedback?.(
                !!enabled ? 'Toast 提醒已开启!' : 'Toast 提醒已关闭',
                'info'
              );
            }}
          />
        </div>
      </div>
    </>
  );
}
