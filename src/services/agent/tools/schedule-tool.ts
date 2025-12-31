/**
 * 日程工具
 * Schedule Tool
 *
 * 提供日程管理能力：
 * - 日程创建/修改/删除
 * - 日程查询
 * - 提醒设置
 * - 冲突检测
 */

import type { AgentToolResult, SchedulePayload } from '@/types/agent-system';

/**
 * 日程条目
 */
export interface ScheduleEntry {
  id: string;
  title: string;
  description?: string;
  datetime: number;
  remindBefore?: number;
  recurring?: 'daily' | 'weekly' | 'monthly';
  category: 'work' | 'life' | 'health';
  completed: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * 日程存储
 */
const scheduleStore: Map<string, ScheduleEntry> = new Map();

/**
 * 生成日程 ID
 */
function generateScheduleId(): string {
  return `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 创建日程
 */
export async function createSchedule(
  payload: SchedulePayload
): Promise<AgentToolResult<ScheduleEntry>> {
  try {
    const entry: ScheduleEntry = {
      id: generateScheduleId(),
      title: payload.title,
      description: payload.description,
      datetime: payload.datetime,
      remindBefore: payload.remindBefore,
      recurring: payload.recurring,
      category: payload.category || 'life',
      completed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    scheduleStore.set(entry.id, entry);

    return {
      success: true,
      data: entry,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 获取日程
 */
export async function getSchedule(
  scheduleId: string
): Promise<AgentToolResult<ScheduleEntry>> {
  try {
    const entry = scheduleStore.get(scheduleId);

    if (!entry) {
      return {
        success: false,
        error: `日程不存在: ${scheduleId}`,
      };
    }

    return {
      success: true,
      data: entry,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 更新日程
 */
export async function updateSchedule(
  scheduleId: string,
  updates: Partial<SchedulePayload>
): Promise<AgentToolResult<ScheduleEntry>> {
  try {
    const entry = scheduleStore.get(scheduleId);

    if (!entry) {
      return {
        success: false,
        error: `日程不存在: ${scheduleId}`,
      };
    }

    // 更新字段
    if (updates.title !== undefined) entry.title = updates.title;
    if (updates.description !== undefined) entry.description = updates.description;
    if (updates.datetime !== undefined) entry.datetime = updates.datetime;
    if (updates.remindBefore !== undefined) entry.remindBefore = updates.remindBefore;
    if (updates.recurring !== undefined) entry.recurring = updates.recurring;
    if (updates.category !== undefined) entry.category = updates.category;

    entry.updatedAt = Date.now();

    return {
      success: true,
      data: entry,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 删除日程
 */
export async function deleteSchedule(
  scheduleId: string
): Promise<AgentToolResult<boolean>> {
  try {
    const deleted = scheduleStore.delete(scheduleId);

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
 * 完成日程
 */
export async function completeSchedule(
  scheduleId: string
): Promise<AgentToolResult<ScheduleEntry>> {
  try {
    const entry = scheduleStore.get(scheduleId);

    if (!entry) {
      return {
        success: false,
        error: `日程不存在: ${scheduleId}`,
      };
    }

    entry.completed = true;
    entry.updatedAt = Date.now();

    return {
      success: true,
      data: entry,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 查询今日日程
 */
export async function getTodaySchedules(): Promise<
  AgentToolResult<ScheduleEntry[]>
> {
  try {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    const entries = Array.from(scheduleStore.values())
      .filter(
        (e) =>
          e.datetime >= startOfDay &&
          e.datetime < endOfDay &&
          !e.completed
      )
      .sort((a, b) => a.datetime - b.datetime);

    return {
      success: true,
      data: entries,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 查询本周日程
 */
export async function getWeekSchedules(): Promise<
  AgentToolResult<ScheduleEntry[]>
> {
  try {
    const now = new Date();
    const startOfWeek = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - now.getDay()
    ).getTime();
    const endOfWeek = startOfWeek + 7 * 24 * 60 * 60 * 1000;

    const entries = Array.from(scheduleStore.values())
      .filter(
        (e) =>
          e.datetime >= startOfWeek &&
          e.datetime < endOfWeek &&
          !e.completed
      )
      .sort((a, b) => a.datetime - b.datetime);

    return {
      success: true,
      data: entries,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 查询即将到期的日程（需要提醒）
 */
export async function getUpcomingReminders(): Promise<
  AgentToolResult<ScheduleEntry[]>
> {
  try {
    const now = Date.now();

    const entries = Array.from(scheduleStore.values())
      .filter((e) => {
        if (e.completed) return false;
        if (!e.remindBefore) return false;

        const remindAt = e.datetime - e.remindBefore * 60 * 1000;
        // 在提醒时间前后 1 分钟内
        return Math.abs(now - remindAt) < 60 * 1000;
      })
      .sort((a, b) => a.datetime - b.datetime);

    return {
      success: true,
      data: entries,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 检测日程冲突
 */
export async function checkConflicts(
  datetime: number,
  durationMinutes: number = 60
): Promise<AgentToolResult<ScheduleEntry[]>> {
  try {
    const endTime = datetime + durationMinutes * 60 * 1000;

    const conflicts = Array.from(scheduleStore.values()).filter((e) => {
      if (e.completed) return false;

      // 假设每个日程持续 1 小时
      const entryEnd = e.datetime + 60 * 60 * 1000;

      // 检查时间重叠
      return datetime < entryEnd && endTime > e.datetime;
    });

    return {
      success: true,
      data: conflicts,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 按分类查询日程
 */
export async function getSchedulesByCategory(
  category: 'work' | 'life' | 'health'
): Promise<AgentToolResult<ScheduleEntry[]>> {
  try {
    const entries = Array.from(scheduleStore.values())
      .filter((e) => e.category === category && !e.completed)
      .sort((a, b) => a.datetime - b.datetime);

    return {
      success: true,
      data: entries,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 获取日程统计
 */
export async function getScheduleStats(): Promise<
  AgentToolResult<{
    total: number;
    completed: number;
    pending: number;
    byCategory: Record<string, number>;
    todayCount: number;
  }>
> {
  try {
    const entries = Array.from(scheduleStore.values());
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    const byCategory: Record<string, number> = {
      work: 0,
      life: 0,
      health: 0,
    };

    let completed = 0;
    let pending = 0;
    let todayCount = 0;

    entries.forEach((e) => {
      if (e.completed) {
        completed++;
      } else {
        pending++;
      }
      byCategory[e.category]++;

      if (e.datetime >= startOfDay && e.datetime < endOfDay) {
        todayCount++;
      }
    });

    return {
      success: true,
      data: {
        total: entries.length,
        completed,
        pending,
        byCategory,
        todayCount,
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
 * 日程工具导出
 */
export const scheduleTool = {
  create: createSchedule,
  get: getSchedule,
  update: updateSchedule,
  delete: deleteSchedule,
  complete: completeSchedule,
  getToday: getTodaySchedules,
  getWeek: getWeekSchedules,
  getUpcomingReminders: getUpcomingReminders,
  checkConflicts: checkConflicts,
  getByCategory: getSchedulesByCategory,
  getStats: getScheduleStats,
};
