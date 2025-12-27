import type { AppConfig } from '../../../types';
import type { FeedbackType } from '../FeedbackAnimation';

interface BehaviorTabProps {
  config: AppConfig;
  onConfigChange: (updater: (prev: AppConfig) => AppConfig) => void;
  onFeedback?: (message: string, type?: FeedbackType) => void;
}

export function BehaviorTab({ config, onConfigChange, onFeedback }: BehaviorTabProps) {
  return (
    <>
      <div className="settings-section">
        <div className="settings-section-title">🦴 宠物养成</div>

        <div className="settings-row">
          <span className="settings-label">⏰ 饿得快慢</span>
          <select
            className="settings-select"
            value={config.behavior.decaySpeed}
            onChange={(e) => {
              const newSpeed = e.target.value as AppConfig['behavior']['decaySpeed'];
              onConfigChange((prev) => ({
                ...prev,
                behavior: { ...prev.behavior, decaySpeed: newSpeed },
              }));

              if (newSpeed === 'hardcore') {
                onFeedback?.('⏰ 宠物现在饿得更快了!', 'info');
              } else if (newSpeed === 'casual') {
                onFeedback?.('🌙 宠物进入悠闲模式~', 'success');
              } else {
                onFeedback?.('📊 已恢复标准节奏', 'info');
              }
            }}
          >
            <option value="casual">休闲</option>
            <option value="standard">标准</option>
            <option value="hardcore">硬核</option>
          </select>
        </div>

        <div className="settings-row">
          <span className="settings-label">🎮 互动节奏</span>
          <select
            className="settings-select"
            value={config.behavior.interactionFrequency}
            onChange={(e) => {
              const newFreq = e.target.value as AppConfig['behavior']['interactionFrequency'];
              onConfigChange((prev) => ({
                ...prev,
                behavior: {
                  ...prev.behavior,
                  interactionFrequency: newFreq,
                },
              }));

              if (newFreq === 'high') {
                onFeedback?.('🎮 宠物变得更活泼了!', 'success');
              } else if (newFreq === 'low') {
                onFeedback?.('😴 宠物想要安静一下~', 'info');
              } else {
                onFeedback?.('📊 已恢复标准节奏', 'info');
              }
            }}
          >
            <option value="low">低</option>
            <option value="standard">标准</option>
            <option value="high">高</option>
          </select>
        </div>

        <div className="settings-row">
          <span className="settings-label">💰 自动打工</span>
          <input
            type="checkbox"
            checked={config.behavior.autoWorkEnabled}
            onChange={(e) => {
              const enabled = e.target.checked;
              onConfigChange((prev) => ({
                ...prev,
                behavior: { ...prev.behavior, autoWorkEnabled: enabled },
              }));
              onFeedback?.(
                enabled ? '🤖 宠物会自己工作啦!' : '😴 宠物要休息了~',
                'success'
              );
            }}
            className="settings-checkbox"
          />
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">🔔 通知提醒</div>

        <div className="settings-row">
          <span className="settings-label">💬 气泡提示</span>
          <input
            type="checkbox"
            checked={config.behavior.notifications.bubbleEnabled}
            onChange={(e) => {
              const enabled = e.target.checked;
              onConfigChange((prev) => ({
                ...prev,
                behavior: {
                  ...prev.behavior,
                  notifications: { ...prev.behavior.notifications, bubbleEnabled: enabled },
                },
              }));
              onFeedback?.(
                enabled ? '💬 气泡提示已开启!' : '🔇 气泡提示已关闭',
                'info'
              );
            }}
            className="settings-checkbox"
          />
        </div>

        <div className="settings-row settings-row-no-border">
          <span className="settings-label">🔊 Toast 提醒</span>
          <input
            type="checkbox"
            checked={config.behavior.notifications.toastEnabled}
            onChange={(e) => {
              const enabled = e.target.checked;
              onConfigChange((prev) => ({
                ...prev,
                behavior: {
                  ...prev.behavior,
                  notifications: { ...prev.behavior.notifications, toastEnabled: enabled },
                },
              }));
              onFeedback?.(
                enabled ? '🔔 Toast 提醒已开启!' : '🔇 Toast 提醒已关闭',
                'info'
              );
            }}
            className="settings-checkbox"
          />
        </div>
      </div>
    </>
  );
}
