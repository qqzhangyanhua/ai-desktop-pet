/**
 * Long term memory service
 */

import {
  storeMemory as dbStoreMemory,
  getRecentMemories as dbGetRecentMemories,
  getMemoriesByCategory as dbGetMemoriesByCategory,
  updateMemoryAccess as dbUpdateMemoryAccess,
  deleteMemory as dbDeleteMemory,
  cleanupMemories as dbCleanupMemories,
  getAllMemories as dbGetAllMemories,
} from '../database/memory';
import type { LongTermMemory, MemoryCategory, ExtractedMemory } from '../../types';

/**
 * Store a new memory
 */
export async function storeMemory(memory: Omit<LongTermMemory, 'id' | 'lastAccessed' | 'accessCount' | 'createdAt'>): Promise<LongTermMemory> {
  return dbStoreMemory(memory);
}

/**
 * Extract and store memories from conversation
 */
export async function extractAndStoreMemories(memories: ExtractedMemory[]): Promise<LongTermMemory[]> {
  const stored: LongTermMemory[] = [];

  for (const memory of memories) {
    if (memory.importance >= 5) {
      const storedMemory = await storeMemory(memory);
      stored.push(storedMemory);
    }
  }

  return stored;
}

/**
 * Get recent memories with access tracking
 */
export async function getRecentMemories(limit: number = 10): Promise<LongTermMemory[]> {
  const memories = await dbGetRecentMemories(limit);

  // Update access for retrieved memories
  for (const memory of memories) {
    await dbUpdateMemoryAccess(memory.id).catch(() => {
      // Ignore errors in access tracking
    });
  }

  return memories;
}

/**
 * Get memories by category
 */
export async function getMemoriesByCategory(category: MemoryCategory, limit: number = 50): Promise<LongTermMemory[]> {
  return dbGetMemoriesByCategory(category, limit);
}

/**
 * Get memory summary for context injection
 */
export async function getMemorySummary(limit: number = 5): Promise<string> {
  const memories = await getRecentMemories(limit);

  if (memories.length === 0) {
    return '暂无重要记忆';
  }

  return memories
    .map(m => `${m.category === 'preference' ? '偏好' : m.category === 'event' ? '事件' : '习惯'}: ${m.content}`)
    .join('\n');
}

/**
 * Delete a memory
 */
export async function deleteMemory(id: string): Promise<void> {
  await dbDeleteMemory(id);
}

/**
 * Clean up old memories
 */
export async function cleanupMemories(): Promise<number> {
  return dbCleanupMemories(500, 30);
}

/**
 * Get all memories for management UI
 */
export async function getAllMemories(limit: number = 100): Promise<LongTermMemory[]> {
  return dbGetAllMemories(limit);
}
