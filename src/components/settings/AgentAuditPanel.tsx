import { useEffect, useMemo, useState } from 'react';
import { ListChecks, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { confirmAction } from '@/lib/confirm';
import { clearAgentToolAuditLogs, listAgentToolAuditLogs, type AgentToolAuditLog } from '@/services/database/agent-audit';

function formatTime(ts: number): string {
  try {
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  } catch {
    return String(ts);
  }
}

function riskLabel(toolName: string): { label: string; level: 'low' | 'medium' | 'high' } {
  if (toolName === 'web_search' || toolName === 'weather') return { label: '低风险', level: 'low' };
  if (toolName === 'file_read' || toolName === 'file_exists' || toolName === 'clipboard_read') return { label: '低风险', level: 'low' };
  if (toolName === 'clipboard_write') return { label: '中风险', level: 'medium' };
  if (toolName === 'file_write' || toolName === 'open_url' || toolName === 'open_app') return { label: '高风险', level: 'high' };
  return { label: '未知', level: 'medium' };
}

export function AgentAuditPanel() {
  const [logs, setLogs] = useState<AgentToolAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const rows = await listAgentToolAuditLogs(80);
      setLogs(rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const statusColor = (status: AgentToolAuditLog['status']) => {
    switch (status) {
      case 'succeeded':
        return 'rgba(34, 197, 94, 0.9)';
      case 'failed':
        return 'rgba(239, 68, 68, 0.9)';
      case 'rejected':
        return 'rgba(245, 158, 11, 0.9)';
      case 'started':
      default:
        return 'rgba(59, 130, 246, 0.9)';
    }
  };

  const summary = useMemo(() => {
    const total = logs.length;
    const failed = logs.filter((l) => l.status === 'failed').length;
    const rejected = logs.filter((l) => l.status === 'rejected').length;
    return { total, failed, rejected };
  }, [logs]);

  const handleClear = async () => {
    const ok = await confirmAction('将清空全部工具审计记录（仅本地）。确认继续？', {
      title: '清空记录',
      kind: 'warning',
      okLabel: '清空',
      cancelLabel: '取消',
    });
    if (!ok) return;
    await clearAgentToolAuditLogs();
    await refresh();
  };

  return (
    <div className="settings-section">
      <div className="settings-section-title flex items-center gap-2">
        <ListChecks className="w-4 h-4" />
        智能体工具审计
      </div>

      <div className="settings-row">
        <span className="settings-label">
          近 80 条（失败 {summary.failed} / 拒绝 {summary.rejected}）
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-1" />
            刷新
          </Button>
          <Button variant="outline" size="sm" onClick={() => void handleClear()} disabled={loading || summary.total === 0}>
            <Trash2 className="w-4 h-4 mr-1" />
            清空
          </Button>
        </div>
      </div>

      <div className="settings-row settings-row-no-border" style={{ display: 'block' }}>
        {logs.length === 0 ? (
          <div className="text-slate-400 text-xs italic py-2">
            暂无记录。提示：当智能体调用工具（搜索/文件/打开应用等）时会写入这里。
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {logs.map((l) => {
              const risk = riskLabel(l.toolName);
              const expanded = expandedId === l.id;
              return (
                <div key={l.id} className="game-list-item">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : l.id)}
                    className="w-full text-left bg-transparent border-0 p-0 cursor-pointer"
                  >
                    <div className="flex justify-between gap-2">
                      <div className="flex gap-2 items-center min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: statusColor(l.status) }}
                        />
                        <span className="text-xs font-bold whitespace-nowrap text-amber-900">{l.toolName}</span>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{
                            background:
                              risk.level === 'high'
                                ? 'rgba(239, 68, 68, 0.10)'
                                : risk.level === 'medium'
                                  ? 'rgba(245, 158, 11, 0.10)'
                                  : 'rgba(34, 197, 94, 0.10)',
                            color:
                              risk.level === 'high'
                                ? 'rgba(185, 28, 28, 1)'
                                : risk.level === 'medium'
                                  ? 'rgba(180, 83, 9, 1)'
                                  : 'rgba(22, 101, 52, 1)',
                          }}
                        >
                          {risk.label}
                        </span>
                        <span className="text-[11px] text-amber-900/60 truncate">
                          {formatTime(l.startedAt)} · {l.source}
                          {typeof l.durationMs === 'number' ? ` · ${l.durationMs}ms` : ''}
                          {l.requiresConfirmation ? ' · 需确认' : ''}
                        </span>
                      </div>
                      <span className="text-[11px] text-amber-900/60">
                        {expanded ? '收起' : '展开'}
                      </span>
                    </div>
                  </button>

                  {expanded && (
                    <div className="mt-2 grid gap-2">
                      <div>
                        <div className="text-[11px] text-amber-900/60 mb-1">参数（脱敏/截断）</div>
                        <pre className="text-[11px] p-2 rounded-lg bg-amber-900/5 overflow-auto text-amber-900">
                          {l.argsJson ?? '(空)'}
                        </pre>
                      </div>
                      <div>
                        <div className="text-[11px] text-amber-900/60 mb-1">
                          结果 {l.error ? `（错误：${l.error}）` : ''}
                        </div>
                        <pre className="text-[11px] p-2 rounded-lg bg-amber-900/5 overflow-auto text-amber-900">
                          {l.resultJson ?? '(空)'}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

