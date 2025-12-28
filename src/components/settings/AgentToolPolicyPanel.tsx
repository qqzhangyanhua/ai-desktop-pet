import { Shield, Search, Cloud, Clipboard, FileText, ExternalLink, AppWindow, Pencil, RotateCcw } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useConfigStore } from '@/stores';

type ToolLevel = 'low' | 'medium' | 'high';

interface ToolItem {
  name: string;
  label: string;
  level: ToolLevel;
  description: string;
  icon: React.ReactNode;
}

const TOOL_ITEMS: ToolItem[] = [
  {
    name: 'web_search',
    label: '网络搜索',
    level: 'low',
    description: '查询公开网页信息（会产生网络请求）',
    icon: <Search className="w-4 h-4" />,
  },
  {
    name: 'weather',
    label: '天气查询',
    level: 'low',
    description: '查询天气信息（会产生网络请求）',
    icon: <Cloud className="w-4 h-4" />,
  },
  {
    name: 'clipboard_read',
    label: '读取剪贴板',
    level: 'medium',
    description: '读取系统剪贴板内容（隐私风险）',
    icon: <Clipboard className="w-4 h-4" />,
  },
  {
    name: 'clipboard_write',
    label: '写入剪贴板',
    level: 'high',
    description: '覆盖系统剪贴板内容（可能影响工作流）',
    icon: <Pencil className="w-4 h-4" />,
  },
  {
    name: 'file_read',
    label: '读取文件',
    level: 'medium',
    description: '读取应用数据目录文件（仍建议谨慎）',
    icon: <FileText className="w-4 h-4" />,
  },
  {
    name: 'file_exists',
    label: '检查文件',
    level: 'low',
    description: '检查应用数据目录文件是否存在',
    icon: <FileText className="w-4 h-4" />,
  },
  {
    name: 'file_write',
    label: '写入文件',
    level: 'high',
    description: '写入应用数据目录文件（需要确认）',
    icon: <Pencil className="w-4 h-4" />,
  },
  {
    name: 'open_url',
    label: '打开网页',
    level: 'high',
    description: '在默认浏览器打开链接（需要确认）',
    icon: <ExternalLink className="w-4 h-4" />,
  },
  {
    name: 'open_app',
    label: '打开应用/文件',
    level: 'high',
    description: '调用系统默认方式打开文件或应用（需要确认）',
    icon: <AppWindow className="w-4 h-4" />,
  },
];

const SAFE_DEFAULT = ['web_search', 'weather', 'clipboard_read', 'file_read', 'file_exists'];

export function AgentToolPolicyPanel() {
  const enabledTools = useConfigStore((s) => s.config.assistant.agent.enabledTools);

  const setEnabled = (toolName: string, enabled: boolean) => {
    const { config, setConfig } = useConfigStore.getState();
    const prev = config.assistant.agent.enabledTools;
    const next = enabled
      ? Array.from(new Set([toolName, ...prev]))
      : prev.filter((t) => t !== toolName);
    setConfig({
      assistant: {
        ...config.assistant,
        agent: { ...config.assistant.agent, enabledTools: next },
      },
    });
  };

  const applySafeDefault = () => {
    const { config, setConfig } = useConfigStore.getState();
    setConfig({
      assistant: {
        ...config.assistant,
        agent: { ...config.assistant.agent, enabledTools: SAFE_DEFAULT },
      },
    });
  };

  const applyAll = () => {
    const { config, setConfig } = useConfigStore.getState();
    setConfig({
      assistant: {
        ...config.assistant,
        agent: { ...config.assistant.agent, enabledTools: TOOL_ITEMS.map((t) => t.name) },
      },
    });
  };

  const levelColor = (level: ToolLevel) => {
    if (level === 'high') return { bg: 'rgba(239, 68, 68, 0.10)', fg: 'rgba(185, 28, 28, 1)', label: '高风险' };
    if (level === 'medium') return { bg: 'rgba(245, 158, 11, 0.10)', fg: 'rgba(180, 83, 9, 1)', label: '中风险' };
    return { bg: 'rgba(34, 197, 94, 0.10)', fg: 'rgba(22, 101, 52, 1)', label: '低风险' };
  };

  return (
    <div className="settings-section">
      <div className="settings-section-title flex items-center gap-2">
        <Shield className="w-4 h-4" />
        智能体工具权限
      </div>

      <div className="settings-row">
        <span className="settings-label">全局白名单（对聊天/定时任务/工作流都生效）</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={applySafeDefault}>
            <RotateCcw className="w-4 h-4 mr-1" />
            安全默认
          </Button>
          <Button variant="outline" size="sm" onClick={applyAll}>
            全部开启
          </Button>
        </div>
      </div>

      <div className="settings-row settings-row-no-border" style={{ display: 'block' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {TOOL_ITEMS.map((t) => {
            const risk = levelColor(t.level);
            const checked = enabledTools.includes(t.name);
            return (
              <div
                key={t.name}
                className="game-list-item"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                  <span className="text-amber-900/60">{t.icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="text-xs font-bold text-amber-900">{t.label}</span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{
                          background: risk.bg,
                          color: risk.fg,
                        }}
                      >
                        {risk.label}
                      </span>
                      <span className="text-[11px] text-amber-900/40">{t.name}</span>
                    </div>
                    <div className="text-[11px] text-amber-900/60 mt-0.5 truncate">
                      {t.description}
                    </div>
                  </div>
                </div>
                <Checkbox checked={checked} onCheckedChange={(v) => setEnabled(t.name, !!v)} />
              </div>
            );
          })}
        </div>

        <div className="text-[11px] text-amber-900/60 mt-2.5 leading-relaxed italic">
          提示：高风险工具即使开启也会弹确认；若关闭，智能体将无法调用（工作流/定时任务也同样受限）。
        </div>
      </div>
    </div>
  );
}
