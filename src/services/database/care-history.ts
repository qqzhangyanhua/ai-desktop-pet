/**
 * Care history database operations
 */

import { query, execute } from './index';
import type { CareHistoryRecord } from '../../types';

interface CareHistoryRow {
  id: number;
  action_type: string;
  timestamp: number;
}

function rowToCareHistory(row: CareHistoryRow): CareHistoryRecord {
  return {
    id: row.id,
    actionType: row.action_type,
    timestamp: row.timestamp,
  };
}

/**
 * Record a care action
 */
export async function recordCareAction(actionType: string): Promise<CareHistoryRecord> {
  await execute(
    `INSERT INTO care_history (action_type, timestamp) VALUES (?, ?)`,
    [actionType, Date.now()]
  );

  // Get the inserted record
  const rows = await query<CareHistoryRow>(
    `SELECT * FROM care_history ORDER BY id DESC LIMIT 1`
  );

  const row = rows[0];
  if (!row) {
    throw new Error('Failed to retrieve inserted care history record');
  }

  return rowToCareHistory(row);
}

/**
 * Get recent care history
 */
export async function getRecentCareHistory(limit: number = 50): Promise<CareHistoryRecord[]> {
  const rows = await query<CareHistoryRow>(
    `SELECT * FROM care_history
     ORDER BY timestamp DESC
     LIMIT ?`,
    [limit]
  );

  return rows.map(rowToCareHistory);
}

/**
 * Get care history by action type
 */
export async function getCareHistoryByType(actionType: string, limit: number = 50): Promise<CareHistoryRecord[]> {
  const rows = await query<CareHistoryRow>(
    `SELECT * FROM care_history
     WHERE action_type = ?
     ORDER BY timestamp DESC
     LIMIT ?`,
    [actionType, limit]
  );

  return rows.map(rowToCareHistory);
}

/**
 * Get care history count by date (for statistics)
 */
export async function getCareHistoryCountByDate(date: string): Promise<number> {
  const startOfDay = new Date(date).setHours(0, 0, 0, 0);
  const endOfDay = new Date(date).setHours(23, 59, 59, 999);

  const result = await query<{ count: number }>(
    `SELECT COUNT(*) as count FROM care_history
     WHERE timestamp >= ? AND timestamp <= ?`,
    [startOfDay, endOfDay]
  );

  return result[0]?.count ?? 0;
}

/**
 * Get care action frequency (for pattern detection)
 */
export async function getCareActionFrequency(actionType: string, hoursBack: number = 24): Promise<number> {
  const threshold = Date.now() - hoursBack * 60 * 60 * 1000;

  const result = await query<{ count: number }>(
    `SELECT COUNT(*) as count FROM care_history
     WHERE action_type = ? AND timestamp >= ?`,
    [actionType, threshold]
  );

  return result[0]?.count ?? 0;
}
