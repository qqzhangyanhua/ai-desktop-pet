import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Switch from '@radix-ui/react-switch';
import * as Slider from '@radix-ui/react-slider';
import * as Select from '@radix-ui/react-select';
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
  ChevronDown,
  Sparkles,
  History,
} from 'lucide-react';
import { useConfigStore, useChatStore } from '@/stores';
import type { LLMConfig } from '@/types';
import { confirmAction } from '@/lib/confirm';
import '../settings/game-ui.css';

interface ToastApi {
  success: (title: string, description?: string, duration?: number) => void;
  error: (title: string, description?: string, duration?: number) => void;
  info: (title: string, description?: string, duration?: number) => void;
  warning: (title: string, description?: string, duration?: number) => void;
}

interface ChatSettingsProps {
  toast: ToastApi;
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

export function ChatSettings({ toast, onClose }: ChatSettingsProps) {
  const { config, setConfig, saveConfig } = useConfigStore();
  const { messages, clearMessages } = useChatStore();

  // LLM 配置状态
  const [llmConfig, setLlmConfig] = useState<LLMConfig>(config.llm);
  const [systemPrompt, setSystemPrompt] = useState(config.systemPrompt || '');

  // 对话设置状态
  const [chatStreaming, setChatStreaming] = useState(config.chat?.streaming ?? true);
  const [chatMaxTokens, setChatMaxTokens] = useState(config.chat?.maxTokens ?? 2048);

  // 知识库导入状态
  const [knowledgeBase, setKnowledgeBase] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);

  // 获取当前 provider 的可用模型
  const availableModels = MODEL_PRESETS[llmConfig.provider] || [];

  // 保存 LLM 配置
  const handleSaveLLM = async () => {
    try {
      console.log('[ChatSettings] Saving LLM config:', { llmConfig, systemPrompt });
      setConfig({ llm: llmConfig, systemPrompt });
      await saveConfig();
      console.log('[ChatSettings] LLM config saved successfully');
      toast.success('LLM 配置已保存');
    } catch (error) {
      console.error('[ChatSettings] Failed to save LLM config:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      toast.error('保存失败', errorMessage);
    }
  };

  // 保存对话设置
  const handleSaveChatConfig = async () => {
    try {
      console.log('[ChatSettings] Saving chat config:', { chatStreaming, chatMaxTokens });
      setConfig({
        chat: {
          ...config.chat,
          streaming: chatStreaming,
          maxTokens: chatMaxTokens
        }
      });
      await saveConfig();
      console.log('[ChatSettings] Chat config saved successfully');
      toast.success('对话设置已保存');
    } catch (error) {
      console.error('[ChatSettings] Failed to save chat config:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      toast.error('保存失败', errorMessage);
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
      console.log('[ChatSettings] Importing knowledge base');
      const newSystemPrompt = systemPrompt + '\n\n# 知识库\n' + knowledgeBase;
      setSystemPrompt(newSystemPrompt);
      setConfig({ systemPrompt: newSystemPrompt });
      await saveConfig();

      setKnowledgeBase('');
      console.log('[ChatSettings] Knowledge base imported successfully');
      toast.success('知识库导入成功');
    } catch (error) {
      console.error('[ChatSettings] Failed to import knowledge:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      toast.error('导入失败', errorMessage);
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
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[1000] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="game-card w-full h-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#8B4513]/20 shrink-0">
          <div className="flex items-center gap-2 text-[#8B4513] font-bold">
            <Settings className="w-5 h-5" />
            <span>聊天设置</span>
          </div>
          <button
            onClick={onClose}
            className="game-btn game-btn-brown p-1 w-8 h-8 justify-center rounded-lg"
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs Container */}
        <Tabs.Root defaultValue="llm" className="flex-1 flex flex-col overflow-hidden">
          {/* Tab List */}
          <Tabs.List className="shrink-0 flex border-b border-[#8B4513]/20 bg-gradient-to-r from-[#FFF8DC] to-[#F5DEB3]">
            <Tabs.Trigger
              value="llm"
              className="flex-1 px-6 py-3 text-sm font-medium text-[#8B4513]/60 hover:text-[#8B4513] hover:bg-[#FFE4B5]/30 data-[state=active]:text-[#8B4513] data-[state=active]:bg-[#FFF8DC] data-[state=active]:border-b-2 data-[state=active]:border-[#FFB74D] transition-all flex items-center justify-center gap-2"
            >
              <Brain className="w-4 h-4" />
              LLM 配置
            </Tabs.Trigger>
            <Tabs.Trigger
              value="prompt"
              className="flex-1 px-6 py-3 text-sm font-medium text-[#8B4513]/60 hover:text-[#8B4513] hover:bg-[#FFE4B5]/30 data-[state=active]:text-[#8B4513] data-[state=active]:bg-[#FFF8DC] data-[state=active]:border-b-2 data-[state=active]:border-[#FFB74D] transition-all flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              系统提示词
            </Tabs.Trigger>
            <Tabs.Trigger
              value="chat"
              className="flex-1 px-6 py-3 text-sm font-medium text-[#8B4513]/60 hover:text-[#8B4513] hover:bg-[#FFE4B5]/30 data-[state=active]:text-[#8B4513] data-[state=active]:bg-[#FFF8DC] data-[state=active]:border-b-2 data-[state=active]:border-[#FFB74D] transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              对话设置
            </Tabs.Trigger>
            <Tabs.Trigger
              value="knowledge"
              className="flex-1 px-6 py-3 text-sm font-medium text-[#8B4513]/60 hover:text-[#8B4513] hover:bg-[#FFE4B5]/30 data-[state=active]:text-[#8B4513] data-[state=active]:bg-[#FFF8DC] data-[state=active]:border-b-2 data-[state=active]:border-[#FFB74D] transition-all flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              知识库
            </Tabs.Trigger>
            <Tabs.Trigger
              value="history"
              className="flex-1 px-6 py-3 text-sm font-medium text-[#8B4513]/60 hover:text-[#8B4513] hover:bg-[#FFE4B5]/30 data-[state=active]:text-[#8B4513] data-[state=active]:bg-[#FFF8DC] data-[state=active]:border-b-2 data-[state=active]:border-[#FFB74D] transition-all flex items-center justify-center gap-2"
            >
              <History className="w-4 h-4" />
              历史管理
            </Tabs.Trigger>
          </Tabs.List>

          {/* Tab Content - LLM 配置 */}
          <Tabs.Content value="llm" className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Provider */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#8B4513]">Provider</label>
                <Select.Root
                  value={llmConfig.provider}
                  onValueChange={(value) =>
                    setLlmConfig({ ...llmConfig, provider: value as LLMConfig['provider'] })
                  }
                >
                  <Select.Trigger className="w-full px-4 py-3 bg-white/80 border-2 border-[#8B4513]/30 rounded-xl focus:border-[#FFB74D] focus:outline-none flex items-center justify-between text-[#5D4037]">
                    <Select.Value />
                    <Select.Icon>
                      <ChevronDown className="w-4 h-4" />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className="bg-white border-2 border-[#8B4513]/30 rounded-xl shadow-lg overflow-hidden z-[2000]">
                      <Select.Viewport className="p-2">
                        {LLM_PROVIDERS.map((p) => (
                          <Select.Item
                            key={p.value}
                            value={p.value}
                            className="px-4 py-2 rounded-lg hover:bg-[#FFE4B5] cursor-pointer outline-none text-[#5D4037]"
                          >
                            <Select.ItemText>{p.label}</Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>

              {/* Model */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#8B4513]">Model</label>
                <input
                  type="text"
                  value={llmConfig.model}
                  onChange={(e) => setLlmConfig({ ...llmConfig, model: e.target.value })}
                  placeholder="gpt-4o-mini"
                  list="model-suggestions"
                  className="w-full px-4 py-3 bg-white/80 border-2 border-[#8B4513]/30 rounded-xl focus:border-[#FFB74D] focus:outline-none text-[#5D4037]"
                />
                <datalist id="model-suggestions">
                  {availableModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </datalist>
              </div>

              {/* API Key */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#8B4513] flex items-center gap-1">
                  <Key className="w-4 h-4" />
                  API Key
                </label>
                <input
                  type="password"
                  value={llmConfig.apiKey || ''}
                  onChange={(e) => setLlmConfig({ ...llmConfig, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full px-4 py-3 bg-white/80 border-2 border-[#8B4513]/30 rounded-xl focus:border-[#FFB74D] focus:outline-none text-[#5D4037]"
                />
              </div>

              {/* Base URL */}
              {llmConfig.provider !== 'anthropic' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#8B4513] flex items-center gap-1">
                    <Link className="w-4 h-4" />
                    Base URL
                  </label>
                  <input
                    type="text"
                    value={llmConfig.baseUrl || ''}
                    onChange={(e) => setLlmConfig({ ...llmConfig, baseUrl: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                    className="w-full px-4 py-3 bg-white/80 border-2 border-[#8B4513]/30 rounded-xl focus:border-[#FFB74D] focus:outline-none text-[#5D4037]"
                  />
                </div>
              )}

              {/* Temperature */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-[#8B4513]">Temperature</label>
                <div className="flex items-center gap-4">
                  <Slider.Root
                    className="relative flex items-center select-none touch-none flex-1 h-5"
                    value={[llmConfig.temperature || 0.7]}
                    onValueChange={(value) =>
                      setLlmConfig({ ...llmConfig, temperature: value[0] })
                    }
                    max={2}
                    step={0.1}
                    min={0}
                  >
                    <Slider.Track className="bg-[#D2B48C]/50 relative grow rounded-full h-2">
                      <Slider.Range className="absolute bg-gradient-to-r from-[#4FC3F7] to-[#0288D1] rounded-full h-full" />
                    </Slider.Track>
                    <Slider.Thumb className="block w-5 h-5 bg-white border-2 border-[#8B4513] rounded-full shadow-md hover:bg-[#FFE4B5] focus:outline-none focus:ring-2 focus:ring-[#FFB74D]" />
                  </Slider.Root>
                  <span className="text-sm text-[#8B4513] w-12 text-center font-mono font-bold">
                    {llmConfig.temperature || 0.7}
                  </span>
                </div>
              </div>

              {/* Save Button */}
              <button onClick={handleSaveLLM} className="game-btn game-btn-green w-full h-12">
                <Check className="w-4 h-4" />
                保存 LLM 配置
              </button>
            </div>
          </Tabs.Content>

          {/* Tab Content - 系统提示词 */}
          <Tabs.Content value="prompt" className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-4">
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="你是智能桌面宠物助手..."
                rows={16}
                className="w-full px-4 py-3 bg-white/80 border-2 border-[#8B4513]/30 rounded-xl focus:border-[#FFB74D] focus:outline-none resize-none text-[#5D4037]"
              />
              <button onClick={handleSaveLLM} className="game-btn game-btn-green w-full h-12">
                <Check className="w-4 h-4" />
                保存提示词
              </button>
            </div>
          </Tabs.Content>

          {/* Tab Content - 对话设置 */}
          <Tabs.Content value="chat" className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Streaming */}
              <div className="flex items-center justify-between p-4 bg-white/60 rounded-xl border-2 border-[#8B4513]/20">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-[#8B4513]">流式输出</div>
                  <div className="text-xs text-[#8B4513]/60">实时显示 AI 回复内容</div>
                </div>
                <Switch.Root
                  checked={chatStreaming}
                  onCheckedChange={setChatStreaming}
                  className="w-11 h-6 bg-[#D2B48C]/50 rounded-full relative data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-[#4FC3F7] data-[state=checked]:to-[#0288D1] transition-colors"
                >
                  <Switch.Thumb className="block w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px]" />
                </Switch.Root>
              </div>

              {/* Max Tokens */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-[#8B4513]">最大 Token 数</label>
                <div className="flex items-center gap-4">
                  <Slider.Root
                    className="relative flex items-center select-none touch-none flex-1 h-5"
                    value={[chatMaxTokens]}
                    onValueChange={(value) => setChatMaxTokens(value[0] as number)}
                    max={8192}
                    step={256}
                    min={512}
                  >
                    <Slider.Track className="bg-[#D2B48C]/50 relative grow rounded-full h-2">
                      <Slider.Range className="absolute bg-gradient-to-r from-[#4FC3F7] to-[#0288D1] rounded-full h-full" />
                    </Slider.Track>
                    <Slider.Thumb className="block w-5 h-5 bg-white border-2 border-[#8B4513] rounded-full shadow-md hover:bg-[#FFE4B5] focus:outline-none focus:ring-2 focus:ring-[#FFB74D]" />
                  </Slider.Root>
                  <span className="text-sm text-[#8B4513] w-20 text-center font-mono font-bold">
                    {chatMaxTokens}
                  </span>
                </div>
              </div>

              {/* Save Button */}
              <button onClick={handleSaveChatConfig} className="game-btn game-btn-green w-full h-12">
                <Check className="w-4 h-4" />
                保存对话设置
              </button>
            </div>
          </Tabs.Content>

          {/* Tab Content - 知识库 */}
          <Tabs.Content value="knowledge" className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="text-sm text-[#8B4513]/70 mb-4">
                粘贴知识库内容（文档、笔记、规则等），将追加到系统提示词
              </div>
              <textarea
                value={knowledgeBase}
                onChange={(e) => setKnowledgeBase(e.target.value)}
                placeholder="输入或粘贴知识库内容..."
                rows={14}
                className="w-full px-4 py-3 bg-white/80 border-2 border-[#8B4513]/30 rounded-xl focus:border-[#FFB74D] focus:outline-none resize-none text-[#5D4037]"
              />
              <button
                onClick={handleImportKnowledge}
                disabled={isImporting || !knowledgeBase.trim()}
                className="game-btn game-btn-blue w-full h-12 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                导入知识库
              </button>
            </div>
          </Tabs.Content>

          {/* Tab Content - 历史管理 */}
          <Tabs.Content value="history" className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-br from-[#E3F2FD] to-[#BBDEFB] rounded-xl border-2 border-[#2196F3]/30">
                  <div className="text-2xl font-bold text-[#1976D2]">{messages.length}</div>
                  <div className="text-sm text-[#1565C0]">总消息数</div>
                </div>
                <div className="p-4 bg-gradient-to-br from-[#F3E5F5] to-[#E1BEE7] rounded-xl border-2 border-[#9C27B0]/30">
                  <div className="text-2xl font-bold text-[#7B1FA2]">
                    {Math.ceil(messages.reduce((sum, m) => sum + m.content.length, 0) / 1000)}K
                  </div>
                  <div className="text-sm text-[#6A1B9A]">字符数</div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button onClick={handleExportChat} className="game-btn game-btn-orange w-full h-12">
                  <Download className="w-4 h-4" />
                  导出对话
                </button>
                <button onClick={handleImportChat} className="game-btn game-btn-blue w-full h-12">
                  <Upload className="w-4 h-4" />
                  导入对话
                </button>
                <button onClick={handleClearHistory} className="game-btn game-btn-red w-full h-12">
                  <Trash2 className="w-4 h-4" />
                  清除历史
                </button>
              </div>
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </div>
  );
}
