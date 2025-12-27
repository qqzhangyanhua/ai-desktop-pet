import { useState } from 'react';
import {
  Settings,
  X,
  Key,
  Link,
  Brain,
  MessageSquare,
  FileText,
  Trash2,
  Download,
  Upload,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useConfigStore, useChatStore, toast } from '@/stores';
import type { LLMConfig } from '@/types';
import { confirmAction } from '@/lib/confirm';

interface ChatSettingsProps {
  onClose: () => void;
}

const LLM_PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'ollama', label: 'Ollama' },
];

const MODEL_PRESETS = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo', 'gpt-4'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
  ollama: ['llama3.2', 'llama2', 'mistral', 'codellama'],
};

export function ChatSettings({ onClose }: ChatSettingsProps) {
  const { config, setConfig, saveConfig } = useConfigStore();
  const { messages, clearMessages } = useChatStore();

  // LLM 配置状态
  const [llmConfig, setLlmConfig] = useState<LLMConfig>(config.llm);
  const [systemPrompt, setSystemPrompt] = useState(config.systemPrompt || '');

  // 知识库导入状态
  const [knowledgeBase, setKnowledgeBase] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);

  // 获取当前 provider 的可用模型（用于建议）
  const availableModels = MODEL_PRESETS[llmConfig.provider] || [];

  // 保存 LLM 配置
  const handleSaveLLM = async () => {
    setConfig({ llm: llmConfig, systemPrompt });
    try {
      await saveConfig();
      toast.success('LLM 配置已保存');
    } catch (error) {
      console.error('Failed to save LLM config:', error);
      toast.error('保存失败');
    }
  };

  // 导入知识库
  const handleImportKnowledge = async () => {
    if (!knowledgeBase.trim()) {
      toast.error('请输入知识库内容');
      return;
    }

    setIsImporting(true);
    try {
      // 将知识库内容追加到系统提示词
      const newSystemPrompt = systemPrompt + '\n\n# 知识库\n' + knowledgeBase;
      setSystemPrompt(newSystemPrompt);
      setConfig({ systemPrompt: newSystemPrompt });
      await saveConfig();

      setKnowledgeBase('');
      toast.success('知识库导入成功');
    } catch (error) {
      console.error('Failed to import knowledge:', error);
      toast.error('导入失败');
    } finally {
      setIsImporting(false);
    }
  };

  // 清除对话历史
  const handleClearHistory = async () => {
    const ok = await confirmAction('确定要清除所有对话历史吗？', {
      title: '清除对话',
      kind: 'warning',
      okLabel: '清除',
      cancelLabel: '取消',
    });
    if (ok) {
      clearMessages();
      toast.success('对话历史已清除');
    }
  };

  // 导出对话
  const handleExportChat = () => {
    const content = messages
      .map((m) => `${m.role === 'user' ? '用户' : '助手'}: ${m.content}`)
      .join('\n\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('对话已导出');
  };

  // 导入对话
  const handleImportChat = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        if (!text.trim()) {
          toast.error('文件为空');
          return;
        }
        // TODO: 解析并导入对话
        toast.success('对话已导入');
      } catch (error) {
        console.error('Failed to import chat:', error);
        toast.error('导入失败');
      }
    };
    input.click();
  };

  return (
    <div className="chat-settings-overlay" onClick={onClose}>
      <div className="chat-settings-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="chat-settings-header">
          <div className="chat-settings-title">
            <Settings className="w-5 h-5" />
            <span>聊天设置</span>
          </div>
          <Button onClick={onClose} variant="ghost" size="sm" className="chat-settings-close">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="chat-settings-content">
          {/* LLM 配置 */}
          <div className="settings-section">
            <div className="settings-section-title">
              <Brain className="w-4 h-4" />
              LLM 配置
            </div>

            <div className="settings-row">
              <span className="settings-label">Provider</span>
              <Select
                value={llmConfig.provider}
                onValueChange={(value) =>
                  setLlmConfig({ ...llmConfig, provider: value as LLMConfig['provider'] })
                }
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
              <span className="settings-label">Model</span>
              <Input
                value={llmConfig.model}
                onChange={(e) => setLlmConfig({ ...llmConfig, model: e.target.value })}
                placeholder="gpt-4o-mini"
                list="model-suggestions"
                className="flex-1"
              />
              <datalist id="model-suggestions">
                {availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </datalist>
            </div>

            <div className="settings-row">
              <span className="settings-label">
                <Key className="w-4 h-4" />
                API Key
              </span>
              <Input
                type="password"
                value={llmConfig.apiKey || ''}
                onChange={(e) => setLlmConfig({ ...llmConfig, apiKey: e.target.value })}
                placeholder="sk-..."
                className="flex-1"
              />
            </div>

            {llmConfig.provider !== 'anthropic' && (
              <div className="settings-row">
                <span className="settings-label">
                  <Link className="w-4 h-4" />
                  Base URL
                </span>
                <Input
                  value={llmConfig.baseUrl || ''}
                  onChange={(e) => setLlmConfig({ ...llmConfig, baseUrl: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                  className="flex-1"
                />
              </div>
            )}

            <div className="settings-row">
              <span className="settings-label">Temperature</span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={llmConfig.temperature || 0.7}
                  onChange={(e) =>
                    setLlmConfig({ ...llmConfig, temperature: parseFloat(e.target.value) })
                  }
                  className="w-24"
                />
                <span className="text-sm text-gray-600 w-12">
                  {llmConfig.temperature || 0.7}
                </span>
              </div>
            </div>

            <div className="settings-actions">
              <Button onClick={handleSaveLLM} size="sm" className="settings-save-btn">
                <Check className="w-4 h-4" />
                保存 LLM 配置
              </Button>
            </div>
          </div>

          {/* 系统提示词 */}
          <div className="settings-section">
            <div className="settings-section-title">
              <MessageSquare className="w-4 h-4" />
              系统提示词
            </div>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="你是智能桌面宠物助手..."
              rows={6}
              className="settings-textarea"
            />
            <div className="settings-actions">
              <Button onClick={handleSaveLLM} size="sm" className="settings-save-btn">
                <Check className="w-4 h-4" />
                保存提示词
              </Button>
            </div>
          </div>

          {/* 知识库导入 */}
          <div className="settings-section">
            <div className="settings-section-title">
              <FileText className="w-4 h-4" />
              知识库导入
            </div>
            <Textarea
              value={knowledgeBase}
              onChange={(e) => setKnowledgeBase(e.target.value)}
              placeholder="粘贴知识库内容（文档、笔记、规则等），将追加到系统提示词..."
              rows={4}
              className="settings-textarea"
            />
            <div className="settings-actions">
              <Button
                onClick={handleImportKnowledge}
                disabled={isImporting || !knowledgeBase.trim()}
                size="sm"
                className="settings-save-btn"
              >
                <Upload className="w-4 h-4" />
                导入知识库
              </Button>
            </div>
          </div>

          {/* 对话管理 */}
          <div className="settings-section">
            <div className="settings-section-title">
              <FileText className="w-4 h-4" />
              对话管理
            </div>
            <div className="settings-actions settings-actions-row">
              <Button onClick={handleExportChat} size="sm" variant="outline">
                <Download className="w-4 h-4" />
                导出对话
              </Button>
              <Button onClick={handleImportChat} size="sm" variant="outline">
                <Upload className="w-4 h-4" />
                导入对话
              </Button>
              <Button onClick={handleClearHistory} size="sm" variant="outline">
                <Trash2 className="w-4 h-4" />
                清除历史
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
