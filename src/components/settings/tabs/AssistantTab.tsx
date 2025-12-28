// @ts-nocheck
import { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { VoiceSettings } from '../VoiceSettings';
import { GrowthStageIndicator } from '../../pet/GrowthStageIndicator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AppConfig, LLMConfig, VoiceConfig } from '../../../types';

const LLM_PROVIDERS = [
  { value: 'openai', label: 'GPT（OpenAI）' },
  { value: 'anthropic', label: 'Claude（Anthropic）' },
  { value: 'ollama', label: '本地模型（Ollama）' },
] as const;

const DEFAULT_MODELS: Record<string, string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229'],
  ollama: ['llama2', 'mistral', 'codellama', 'neural-chat'],
};

interface AssistantTabProps {
  localConfig: AppConfig;
  setLocalConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  handleVoiceConfigChange?: (voice: VoiceConfig) => void;
  llmProviders?: any;
  availableModels?: any;
  onProviderChange?: any;
  onModelChange?: any;
  onApiKeyChange?: any;
  onBaseUrlChange?: any;
  onTemperatureChange?: any;
  onSystemPromptChange?: any;
  onVoiceConfigChange?: any;
  onFeedback?: (message: string, type?: any, duration?: number) => void;
}

export function AssistantTab({
  localConfig,
  setLocalConfig,
  handleVoiceConfigChange,
}: AssistantTabProps) {
  const handleProviderChange = useCallback((provider: LLMConfig['provider']) => {
    const defaultModel = DEFAULT_MODELS[provider]?.[0] ?? '';
    setLocalConfig((prev) => ({
      ...prev,
      llm: {
        ...prev.llm,
        provider,
        model: defaultModel,
        apiKey: provider === 'ollama' ? undefined : prev.llm.apiKey,
        baseUrl: provider === 'ollama' ? 'http://localhost:11434/api' : undefined,
      },
    }));
  }, []);

  const handleModelChange = useCallback((model: string) => {
    setLocalConfig((prev) => ({
      ...prev,
      llm: { ...prev.llm, model },
    }));
  }, []);

  const handleApiKeyChange = useCallback((apiKey: string) => {
    setLocalConfig((prev) => ({
      ...prev,
      llm: { ...prev.llm, apiKey },
    }));
  }, []);

  const handleBaseUrlChange = useCallback((baseUrl: string) => {
    setLocalConfig((prev) => ({
      ...prev,
      llm: { ...prev.llm, baseUrl: baseUrl || undefined },
    }));
  }, []);

  const handleTemperatureChange = useCallback((temperature: number) => {
    setLocalConfig((prev) => ({
      ...prev,
      llm: { ...prev.llm, temperature },
    }));
  }, []);

  const handleSystemPromptChange = useCallback((systemPrompt: string) => {
    setLocalConfig((prev) => ({
      ...prev,
      systemPrompt,
    }));
  }, []);

  const availableModels = DEFAULT_MODELS[localConfig.llm.provider] ?? [];

  return (
    <>
      <div className="settings-section">
        <div className="settings-section-title">AI模型选择</div>

        <div className="settings-row">
          <span className="settings-label">模型提供方</span>
          <Select
            value={localConfig.llm.provider}
            onValueChange={(value) => handleProviderChange(value as LLMConfig['provider'])}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LLM_PROVIDERS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="settings-row">
          <span className="settings-label">模型</span>
          <Select value={localConfig.llm.model} onValueChange={handleModelChange}>
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

        {localConfig.llm.provider !== 'ollama' && (
          <div className="settings-row">
            <span className="settings-label">API Key</span>
            <Input
              type="password"
              className="settings-input"
              value={localConfig.llm.apiKey ?? ''}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              placeholder="请输入 API Key..."
            />
          </div>
        )}

        {localConfig.llm.provider === 'ollama' && (
          <div className="settings-row">
            <span className="settings-label">Base URL</span>
            <Input
              type="text"
              className="settings-input"
              value={localConfig.llm.baseUrl ?? 'http://localhost:11434/api'}
              onChange={(e) => handleBaseUrlChange(e.target.value)}
              placeholder="http://localhost:11434/api"
            />
          </div>
        )}

        <div className="settings-row" style={{ borderBottom: 'none' }}>
          <span className="settings-label">Temperature</span>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={localConfig.llm.temperature ?? 0.7}
            onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
            style={{ width: '150px' }}
          />
          <span style={{ marginLeft: '8px', fontSize: '12px' }}>
            {localConfig.llm.temperature?.toFixed(1) ?? '0.7'}
          </span>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">快捷键设置</div>

        <div className="settings-row">
          <span className="settings-label">打开聊天</span>
          <Input
            type="text"
            className="settings-input"
            value={localConfig.assistant.shortcuts.openChat}
            onChange={(e) =>
              setLocalConfig((prev) => ({
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

        <div className="settings-row" style={{ borderBottom: 'none' }}>
          <span className="settings-label">打开设置</span>
          <Input
            type="text"
            className="settings-input"
            value={localConfig.assistant.shortcuts.openSettings}
            onChange={(e) =>
              setLocalConfig((prev) => ({
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

      <VoiceSettings config={localConfig.voice} onChange={handleVoiceConfigChange} />

      <div className="settings-section">
        <div className="settings-section-title">隐私设置（对话历史）</div>

        <div className="settings-row">
          <span className="settings-label">保存对话历史</span>
          <Checkbox
            checked={localConfig.assistant.privacy.saveChatHistory}
            onCheckedChange={(checked) =>
              setLocalConfig((prev) => ({
                ...prev,
                assistant: {
                  ...prev.assistant,
                  privacy: { ...prev.assistant.privacy, saveChatHistory: !!checked },
                },
              }))
            }
          />
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
          关闭后：新的对话不会写入本地数据库，但当前会话仍会在窗口内显示
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">成长阶段</div>
        <div style={{ marginTop: '12px' }}>
          <GrowthStageIndicator />
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">性格与角色</div>
        <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <span className="settings-label" style={{ marginBottom: '8px' }}>
            系统提示词
          </span>
          <Textarea
            className="settings-input"
            value={localConfig.systemPrompt}
            onChange={(e) => handleSystemPromptChange(e.target.value)}
            placeholder="请输入系统提示词..."
            rows={4}
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>
      </div>
    </>
  );
}
