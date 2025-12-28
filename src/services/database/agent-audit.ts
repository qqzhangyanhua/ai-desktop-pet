import { execute, query } from './index';

export type AgentToolAuditStatus = 'started' | 'succeeded' | 'failed' | 'rejected';

export interface AgentToolAuditLog {
  id: string;
  runId: string;
  toolCallId: string;
  toolName: string;
  source: string;
  argsJson: string | null;
  resultJson: string | null;
  status: AgentToolAuditStatus;
  error: string | null;
  requiresConfirmation: number;
  startedAt: number;
  completedAt: number | null;
  durationMs: number | null;
}

type AgentToolAuditRow = {
  id: string;
  run_id: string;
  tool_call_id: string;
  tool_name: string;
  source: string;
  args_json: string | null;
  result_json: string | null;
  status: AgentToolAuditStatus;
  error: string | null;
  requires_confirmation: number;
  started_at: number;
  completed_at: number | null;
  duration_ms: number | null;
};

function toDomain(row: AgentToolAuditRow): AgentToolAuditLog {
  return {
    id: row.id,
    runId: row.run_id,
    toolCallId: row.tool_call_id,
    toolName: row.tool_name,
    source: row.source,
    argsJson: row.args_json,
    resultJson: row.result_json,
    status: row.status,
    error: row.error,
    requiresConfirmation: row.requires_confirmation,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    durationMs: row.duration_ms,
  };
}

export async function insertAgentToolAuditLog(input: {
  id: string;
  runId: string;
  toolCallId: string;
  toolName: string;
  source: string;
  argsJson: string | null;
  requiresConfirmation: boolean;
  startedAt: number;
}): Promise<void> {
  await execute(
    `INSERT OR IGNORE INTO agent_tool_audit_logs
      (id, run_id, tool_call_id, tool_name, source, args_json, status, requires_confirmation, started_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.runId,
      input.toolCallId,
      input.toolName,
      input.source,
      input.argsJson,
      'started',
      input.requiresConfirmation ? 1 : 0,
      input.startedAt,
    ]
  );
}

export async function finalizeAgentToolAuditLog(input: {
  toolCallId: string;
  status: AgentToolAuditStatus;
  resultJson: string | null;
  error: string | null;
  completedAt: number;
  durationMs: number | null;
}): Promise<void> {
  await execute(
    `UPDATE agent_tool_audit_logs
     SET status = ?, result_json = ?, error = ?, completed_at = ?, duration_ms = ?
     WHERE tool_call_id = ?`,
    [
      input.status,
      input.resultJson,
      input.error,
      input.completedAt,
      input.durationMs,
      input.toolCallId,
    ]
  );
}

export async function listAgentToolAuditLogs(limit: number = 50): Promise<AgentToolAuditLog[]> {
  const rows = await query<AgentToolAuditRow>(
    `SELECT *
     FROM agent_tool_audit_logs
     ORDER BY started_at DESC
     LIMIT ?`,
    [Math.max(1, Math.min(500, limit))]
  );
  return rows.map(toDomain);
}

export async function clearAgentToolAuditLogs(): Promise<void> {
  await execute('DELETE FROM agent_tool_audit_logs');
}

