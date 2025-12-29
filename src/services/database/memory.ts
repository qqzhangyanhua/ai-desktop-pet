/**
 * Long term memory database operations
 */

import { v4 as uuidv4 } from 'uuid';
import { query, execute } from './index';
import type { LongTermMemory, MemoryCategory } from '../../types';

interface MemoryRow {
  id: string;
  category: string;
  content: string;
  importance: number;
  last_accessed: number;
  access_count: number;
  created_at: number;
}

function rowToMemory(row: MemoryRow): LongTermMemory {
  return {
    id: row.id,
    category: row.category as MemoryCategory,
    content: row.content,
    importance: row.importance,
    lastAccessed: row.last_accessed,
    accessCount: row.access_count,
    createdAt: row.created_at,
  };
}

/**
 * Store a new memory
 */
export async function storeMemory(memory: Omit<LongTermMemory, 'id' | 'lastAccessed' | 'accessCount' | 'createdAt'>): Promise<LongTermMemory> {
  const id = uuidv4();
  const now = Date.now();

  await execute(
    `INSERT INTO long_term_memory (id, category, content, importance, last_accessed, access_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, memory.category, memory.content, memory.importance, now, 1, now]
  );

  return {
    id,
    category: memory.category,
    content: memory.content,
    importance: memory.importance,
    lastAccessed: now,
    accessCount: 1,
    createdAt: now,
  };
}

/**
 * Get recent memories by importance
 */
export async function getRecentMemories(limit: number = 10): Promise<LongTermMemory[]> {
  const rows = await query<MemoryRow>(
    `SELECT * FROM long_term_memory
     ORDER BY importance DESC, last_accessed DESC
     LIMIT ?`,
    [limit]
  );

  return rows.map(rowToMemory);
}

/**
 * Get memories by category
 */
export async function getMemoriesByCategory(category: MemoryCategory, limit: number = 50): Promise<LongTermMemory[]> {
  const rows = await query<MemoryRow>(
    `SELECT * FROM long_term_memory
     WHERE category = ?
     ORDER BY importance DESC, last_accessed DESC
     LIMIT ?`,
    [category, limit]
  );

  return rows.map(rowToMemory);
}

/**
 * Update memory access info (called when memory is retrieved)
 */
export async function updateMemoryAccess(id: string): Promise<void> {
  await execute(
    `UPDATE long_term_memory
     SET last_accessed = ?, access_count = access_count + 1
     WHERE id = ?`,
    [Date.now(), id]
  );
}

/**
 * Delete a memory
 */
export async function deleteMemory(id: string): Promise<void> {
  await execute(`DELETE FROM long_term_memory WHERE id = ?`, [id]);
}

/**
 * Clean up old memories (low importance + not accessed recently)
 */
export async function cleanupMemories(maxCount: number = 500, daysThreshold: number = 30): Promise<number> {
  // Count total memories
  const countResult = await query<{ count: number }>(
    `SELECT COUNT(*) as count FROM long_term_memory`
  );

  const totalCount = countResult[0]?.count ?? 0;
  if (totalCount <= maxCount) return 0;

  const threshold = Date.now() - daysThreshold * 24 * 60 * 60 * 1000;

  // Delete low importance memories not accessed recently
  const result = await execute(
    `DELETE FROM long_term_memory
     WHERE importance < 5 AND last_accessed < ?
     AND id NOT IN (
       SELECT id FROM long_term_memory
       ORDER BY importance DESC
       LIMIT ?
     )`,
    [threshold, maxCount]
  );

  return result;
}

/**
 * Get all memories (for management UI)
 */
export async function getAllMemories(limit: number = 100): Promise<LongTermMemory[]> {
  const rows = await query<MemoryRow>(
    `SELECT * FROM long_term_memory
     ORDER BY created_at DESC
     LIMIT ?`,
    [limit]
  );

  return rows.map(rowToMemory);
}
