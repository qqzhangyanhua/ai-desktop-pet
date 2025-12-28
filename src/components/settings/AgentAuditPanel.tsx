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
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', padding: '6px 0' }}>
            暂无记录。提示：当智能体调用工具（搜索/文件/打开应用等）时会写入这里。
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {logs.map((l) => {
              const risk = riskLabel(l.toolName);
              const expanded = expandedId === l.id;
              return (
                <div
                  key={l.id}
                  style={{
                    border: '1px solid rgba(0,0,0,0.08)',
                    borderRadius: 10,
                    padding: 10,
                    background: 'rgba(255,255,255,0.7)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : l.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 0,
                      padding: 0,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 999,
                            background: statusColor(l.status),
                            flex: '0 0 auto',
                          }}
                        />
                        <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{l.toolName}</span>
                        <span
                          style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 999,
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
                            flex: '0 0 auto',
                          }}
                        >
                          {risk.label}
                        </span>
                        <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.55)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {formatTime(l.startedAt)} · {l.source}
                          {typeof l.durationMs === 'number' ? ` · ${l.durationMs}ms` : ''}
                          {l.requiresConfirmation ? ' · 需确认' : ''}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.55)' }}>
                        {expanded ? '收起' : '展开'}
                      </span>
                    </div>
                  </button>

                  {expanded && (
                    <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.6)', marginBottom: 4 }}>参数（脱敏/截断）</div>
                        <pre style={{ fontSize: 11, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.04)', overflow: 'auto' }}>
                          {l.argsJson ?? '(空)'}
                        </pre>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.6)', marginBottom: 4 }}>
                          结果 {l.error ? `（错误：${l.error}）` : ''}
                        </div>
                        <pre style={{ fontSize: 11, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.04)', overflow: 'auto' }}>
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

