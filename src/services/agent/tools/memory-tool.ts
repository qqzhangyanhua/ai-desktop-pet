/**
 * 记忆工具
 * Memory Tool
 *
 * 提供记忆读写能力：
 * - 用户偏好存储
 * - 事件记忆
 * - 习惯记录
 * - 记忆检索
 */

import type { AgentToolResult, MemoryPayload } from '@/types/agent-system';
import type { LongTermMemory, MemoryCategory } from '@/types/memory';

/**
 * 记忆存储（临时内存存储，后续接入数据库）
 */
const memoryStore: Map<string, LongTermMemory> = new Map();

/**
 * 生成记忆 ID
 */
function generateMemoryId(): string {
  return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 保存记忆
 */
export async function saveMemory(
  payload: MemoryPayload
): Promise<AgentToolResult<LongTermMemory>> {
  try {
    const memory: LongTermMemory = {
      id: generateMemoryId(),
      category: payload.type as MemoryCategory,
      content: payload.content,
      importance: payload.importance,
      lastAccessed: Date.now(),
      accessCount: 0,
      createdAt: Date.now(),
    };

    memoryStore.set(memory.id, memory);

    return {
      success: true,
      data: memory,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 获取记忆
 */
export async function getMemory(
  memoryId: string
): Promise<AgentToolResult<LongTermMemory>> {
  try {
    const memory = memoryStore.get(memoryId);

    if (!memory) {
      return {
        success: false,
        error: `记忆不存在: ${memoryId}`,
      };
    }

    // 更新访问信息
    memory.lastAccessed = Date.now();
    memory.accessCount++;

    return {
      success: true,
      data: memory,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 搜索记忆
 */
export async function searchMemories(params: {
  category?: MemoryCategory;
  keyword?: string;
  minImportance?: number;
  limit?: number;
}): Promise<AgentToolResult<LongTermMemory[]>> {
  try {
    let results = Array.from(memoryStore.values());

    // 按分类过滤
    if (params.category) {
      results = results.filter((m) => m.category === params.category);
    }

    // 按关键词过滤
    if (params.keyword) {
      const keyword = params.keyword.toLowerCase();
      results = results.filter((m) =>
        m.content.toLowerCase().includes(keyword)
      );
    }

    // 按重要度过滤
    if (params.minImportance !== undefined) {
      results = results.filter((m) => m.importance >= params.minImportance!);
    }

    // 按重要度和访问次数排序
    results.sort((a, b) => {
      const scoreA = a.importance * 0.7 + a.accessCount * 0.3;
      const scoreB = b.importance * 0.7 + b.accessCount * 0.3;
      return scoreB - scoreA;
    });

    // 限制数量
    if (params.limit) {
      results = results.slice(0, params.limit);
    }

    return {
      success: true,
      data: results,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 删除记忆
 */
export async function deleteMemory(
  memoryId: string
): Promise<AgentToolResult<boolean>> {
  try {
    const deleted = memoryStore.delete(memoryId);

    return {
      success: true,
      data: deleted,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 更新记忆重要度
 */
export async function updateMemoryImportance(
  memoryId: string,
  importance: number
): Promise<AgentToolResult<LongTermMemory>> {
  try {
    const memory = memoryStore.get(memoryId);

    if (!memory) {
      return {
        success: false,
        error: `记忆不存在: ${memoryId}`,
      };
    }

    memory.importance = Math.max(1, Math.min(10, importance));

    return {
      success: true,
      data: memory,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 获取所有记忆分类统计
 */
export async function getMemoryStats(): Promise<
  AgentToolResult<{
    total: number;
    byCategory: Record<MemoryCategory, number>;
    avgImportance: number;
  }>
> {
  try {
    const memories = Array.from(memoryStore.values());

    const byCategory: Record<MemoryCategory, number> = {
      preference: 0,
      event: 0,
      habit: 0,
    };

    let totalImportance = 0;

    memories.forEach((m) => {
      byCategory[m.category]++;
      totalImportance += m.importance;
    });

    return {
      success: true,
      data: {
        total: memories.length,
        byCategory,
        avgImportance: memories.length > 0 ? totalImportance / memories.length : 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 记忆工具导出
 */
export const memoryTool = {
  save: saveMemory,
  get: getMemory,
  search: searchMemories,
  delete: deleteMemory,
  updateImportance: updateMemoryImportance,
  getStats: getMemoryStats,
};
