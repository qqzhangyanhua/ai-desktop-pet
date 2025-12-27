import type { AppConfig, LLMConfig } from '../../../types';
import type { FeedbackType } from '../FeedbackAnimation';
import { VoiceSettings } from '../VoiceSettings';
import { Bot, Building2, Brain, Thermometer, Keyboard, MessageSquare, Settings2, Lock, HardDrive, FileText, User } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AssistantTabProps {
  config: AppConfig;
  onConfigChange: (updater: (prev: AppConfig) => AppConfig) => void;
  llmProviders: ReadonlyArray<{ value: string; label: string }>;
  availableModels: string[];
  onProviderChange: (provider: LLMConfig['provider']) => void;
  onModelChange: (model: string) => void;
  onApiKeyChange: (apiKey: string) => void;
  onBaseUrlChange: (baseUrl: string) => void;
  onTemperatureChange: (temperature: number) => void;
  onSystemPromptChange: (systemPrompt: string) => void;
  onVoiceConfigChange: (voice: AppConfig['voice']) => void;
  onFeedback?: (message: string, type?: FeedbackType) => void;
}

export function AssistantTab({
  config,
  onConfigChange,
  llmProviders,
  availableModels,
  onProviderChange,
  onModelChange,
  onApiKeyChange,
  onBaseUrlChange,
  onTemperatureChange,
  onSystemPromptChange,
  onVoiceConfigChange,
  onFeedback,
}: AssistantTabProps) {
  return (
    <>
      <div className="settings-section">
        <div className="settings-section-title flex items-center gap-2">
          <Bot className="w-4 h-4" />
          AI模型选择
        </div>

        <div className="settings-row">
          <span className="settings-label flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            模型提供方
          </span>
          <Select
            value={config.llm.provider}
            onValueChange={(value) => onProviderChange(value as LLMConfig['provider'])}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {llmProviders.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="settings-row">
          <span className="settings-label flex items-center gap-2">
            <Brain className="w-4 h-4" />
            模型
          </span>
          <Select value={config.llm.model} onValueChange={onModelChange}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {config.llm.provider !== 'ollama' && (
          <div className="settings-row">
            <span className="settings-label">API Key</span>
            <Input
              type="password"
              className="settings-input"
              value={config.llm.apiKey ?? ''}
              onChange={(e) => onApiKeyChange(e.target.value)}
              placeholder="请输入 API Key..."
            />
          </div>
        )}

        {config.llm.provider === 'ollama' && (
          <div className="settings-row">
            <span className="settings-label">Base URL</span>
            <Input
              type="text"
              className="settings-input"
              value={config.llm.baseUrl ?? 'http://localhost:11434/api'}
              onChange={(e) => onBaseUrlChange(e.target.value)}
              placeholder="http://localhost:11434/api"
            />
          </div>
        )}

        <div className="settings-row">
          <span className="settings-label flex items-center gap-2">
            <Thermometer className="w-4 h-4" />
            Temperature
          </span>
          <div className="slider-container">
            <input
              type="range"
              className="slider"
              min="0"
              max="2"
              step="0.1"
              value={config.llm.temperature ?? 0.7}
              onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
            />
            <span className="slider-value">
              {config.llm.temperature?.toFixed(1) ?? '0.7'}
            </span>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title flex items-center gap-2">
          <Keyboard className="w-4 h-4" />
          快捷键设置
        </div>

        <div className="settings-row">
          <span className="settings-label flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            打开聊天
          </span>
          <Input
            type="text"
            className="settings-input"
            value={config.assistant.shortcuts.openChat}
            onChange={(e) =>
              onConfigChange((prev) => ({
                ...prev,
                assistant: {
                  ...prev.assistant,
                  shortcuts: { ...prev.assistant.shortcuts, openChat: e.target.value },
                },
              }))
            }
            placeholder="例如：CmdOrCtrl+Shift+C"
          />
        </div>

        <div className="settings-row">
          <span className="settings-label flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            打开设置
          </span>
          <Input
            type="text"
            className="settings-input"
            value={config.assistant.shortcuts.openSettings}
            onChange={(e) =>
              onConfigChange((prev) => ({
                ...prev,
                assistant: {
                  ...prev.assistant,
                  shortcuts: { ...prev.assistant.shortcuts, openSettings: e.target.value },
                },
              }))
            }
            placeholder="例如：CmdOrCtrl+Shift+S"
          />
        </div>
      </div>

      <VoiceSettings config={config.voice} onChange={onVoiceConfigChange} />

      <div className="settings-section">
        <div className="settings-section-title flex items-center gap-2">
          <Lock className="w-4 h-4" />
          隐私设置（对话历史）
        </div>

        <div className="settings-row">
          <span className="settings-label flex items-center gap-2">
            <HardDrive className="w-4 h-4" />
            保存对话历史
          </span>
          <Checkbox
            checked={config.assistant.privacy.saveChatHistory}
            onCheckedChange={(enabled) => {
              onConfigChange((prev) => ({
                ...prev,
                assistant: {
                  ...prev.assistant,
                  privacy: { ...prev.assistant.privacy, saveChatHistory: !!enabled },
                },
              }));
              onFeedback?.(
                !!enabled ? '对话历史记录已开启!' : '对话历史记录已关闭',
                'info'
              );
            }}
          />
        </div>

        <div className="settings-row settings-hint-row">
          关闭后：新的对话不会写入本地数据库,但当前会话仍会在窗口内显示
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title flex items-center gap-2">
          <User className="w-4 h-4" />
          性格与角色
        </div>
        <div className="settings-row settings-row-column">
          <span className="settings-label settings-label-with-margin flex items-center gap-2">
            <FileText className="w-4 h-4" />
            系统提示词
          </span>
          <Textarea
            className="settings-input settings-textarea"
            value={config.systemPrompt}
            onChange={(e) => onSystemPromptChange(e.target.value)}
            placeholder="请输入系统提示词..."
            rows={4}
          />
        </div>
      </div>
    </>
  );
}
