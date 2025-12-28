// @ts-nocheck
/**
 * 自动打工管理器
 * Auto Work Manager
 *
 * 实现宠物在闲置时自动打工赚取资源的机制
 */

import type { AutoWorkTask, WorkType, WorkDifficulty } from '@/types/auto-work';
import { useConfigStore, usePetStore } from '@/stores';
import { addCoins, addExperience } from '@/services/economy';
import { updatePetStatus, getPetStatus } from '@/services/database/pet-status';
import {
  saveWorkHistory,
  getTodayWorkHours,
  getRecentWorkHistory,
  getWorkStats,
} from '@/services/database/auto-work-history';
import { v4 as uuidv4 } from 'uuid';

/**
 * 工作难度配置
 */
const WORK_DIFFICULTIES: Record<WorkType, WorkDifficulty> = {
  easy: {
    type: 'easy',
    baseDurationHours: 0.5, // 30分钟
    baseCoins: 10,
    moodCost: 8,
    energyCost: 12,
    variance: 0.3, // ±30%
  },
  normal: {
    type: 'normal',
    baseDurationHours: 1, // 1小时
    baseCoins: 25,
    moodCost: 12,
    energyCost: 18,
    variance: 0.25, // ±25%
  },
  hard: {
    type: 'hard',
    baseDurationHours: 2, // 2小时
    baseCoins: 60,
    moodCost: 18,
    energyCost: 25,
    variance: 0.2, // ±20%
  },
};

/**
 * 打工任务状态
 */
type WorkTaskStatus = 'idle' | 'working' | 'completed';

/**
 * 自动打工管理器单例
 */
class AutoWorkManager {
  private static instance: AutoWorkManager;
  private currentTask: AutoWorkTask | null = null;
  private taskStatus: WorkTaskStatus = 'idle';

  private constructor() {}

  static getInstance(): AutoWorkManager {
    if (!AutoWorkManager.instance) {
      AutoWorkManager.instance = new AutoWorkManager();
    }
    return AutoWorkManager.instance;
  }

  /**
   * 检查是否应该开始打工
   */
  async checkShouldStartWork(): Promise<boolean> {
    // 如果已经在工作，不检查
    if (this.taskStatus === 'working' || this.currentTask) {
      return false;
    }

    // 检查功能是否启用
    const { config } = useConfigStore.getState();
    if (!config.behavior.autoWork.enabled) {
      return false;
    }

    // 获取宠物状态
    const status = await getPetStatus();
    if (!status) {
      return false;
    }

    // 检查是否闲置超过阈值
    const idleThreshold = config.behavior.autoWork.idleTriggerMinutes * 60 * 1000;
    const now = Date.now();
    const timeSinceLastInteraction = now - Math.max(
      status.lastInteraction || 0,
      status.lastFeed || 0,
      status.lastPlay || 0
    );

    if (timeSinceLastInteraction < idleThreshold) {
      return false;
    }

    // 检查心情和精力是否足够
    if (status.mood < 30 || status.energy < 30) {
      console.log('[AutoWorkManager] Mood or energy too low to work');
      return false;
    }

    // 检查今日工作时长是否超过上限
    const today = new Date().toISOString().split('T')[0];
    const todayWorkHours = Number((await getTodayWorkHours(today)) || 0) || 0;
    if (todayWorkHours >= config.behavior.autoWork.dailyMaxWorkHours) {
      console.log('[AutoWorkManager] Daily work limit reached');
      return false;
    }

    return true;
  }

  /**
   * 开始打工任务
   */
  async startWork(): Promise<boolean> {
    if (this.taskStatus === 'working' || this.currentTask) {
      console.log('[AutoWorkManager] Already working');
      return false;
    }

    if (!(await this.checkShouldStartWork())) {
      return false;
    }

    // 选择工作类型
    const workType = this.selectWorkType();

    // 创建任务
    const task = this.createWorkTask(workType);
    this.currentTask = task;
    this.taskStatus = 'working';

    console.log(`[AutoWorkManager] Started ${workType} work, will complete in ${task.endTime - task.startTime}ms`);

    // 设置定时器完成任务
    setTimeout(() => {
      void this.completeWork(task.id);
    }, task.endTime - task.startTime);

    // 显示打工状态
    const petStore = usePetStore.getState();
    petStore.setEmotion('neutral');
    petStore.showBubble(`开始工作了！预计${this.getWorkDuration(task.workType)}小时完成`, 4000);

    return true;
  }

  /**
   * 完成打工任务
   */
  async completeWork(taskId: string): Promise<void> {
    if (!this.currentTask || this.currentTask.id !== taskId) {
      console.warn('[AutoWorkManager] Task not found or already completed');
      return;
    }

    const task = this.currentTask;
    this.currentTask = null;
    this.taskStatus = 'completed';

    try {
      // 计算实际奖励（基于亲密度）
      const intimacyBonus = 1 + (task.reward.experience / 1000); // 亲密度越高奖励越多
      const actualCoins = Math.floor(task.reward.coins * intimacyBonus);
      const actualExperience = Math.floor(task.reward.experience * intimacyBonus);

      // 添加金币和经验
      await addCoins(actualCoins, 'auto_work');
      await addExperience(actualExperience, 'auto_work');

      // 获取当前状态
      const status = await getPetStatus();

      if (!status) {
        throw new Error('Failed to get pet status');
      }

      // 消耗心情和精力
      await updatePetStatus({
        mood: Math.max(0, status.mood - task.cost.mood),
        energy: Math.max(0, status.energy - task.cost.energy),
      });

      // 保存工作记录
      const history = {
        id: uuidv4(),
        workType: task.workType,
        startTime: task.startTime,
        endTime: Date.now(),
        durationHours: (Date.now() - task.startTime) / (1000 * 60 * 60),
        rewardCoins: actualCoins,
        rewardExperience: actualExperience,
        moodConsumed: task.cost.mood,
        energyConsumed: task.cost.energy,
        intimacyLevel: status.intimacy,
      };

      await saveWorkHistory(history);

      // 显示完成通知
      const petStore = usePetStore.getState();
      petStore.setEmotion('happy');
      petStore.showBubble(
        `工作完成！获得 ${actualCoins} 金币和 ${actualExperience} 经验\n但消耗了 ${task.cost.mood} 心情和 ${task.cost.energy} 精力`,
        6000
      );

      console.log(
        `[AutoWorkManager] Work completed: +${actualCoins} coins, +${actualExperience} exp, -${task.cost.mood} mood, -${task.cost.energy} energy`
      );

      // 触发成就检查
      // TODO: 触发成就系统
    } catch (error) {
      console.error('[AutoWorkManager] Failed to complete work:', error);
      const petStore = usePetStore.getState();
      petStore.setEmotion('confused');
      petStore.showBubble('打工出了点问题...', 3000);
    } finally {
      this.taskStatus = 'idle';
    }
  }

  /**
   * 选择工作类型
   */
  private selectWorkType(): WorkType {
    const rand = Math.random();
    if (rand < 0.5) return 'easy';
    if (rand < 0.85) return 'normal';
    return 'hard';
  }

  /**
   * 创建工作任务
   */
  private createWorkTask(workType: WorkType): AutoWorkTask {
    const difficulty = WORK_DIFFICULTIES[workType];
    const variance = (Math.random() - 0.5) * 2 * difficulty.variance; // -variance 到 +variance
    const duration = difficulty.baseDurationHours * (1 + variance);
    const startTime = Date.now();
    const endTime = startTime + duration * 60 * 60 * 1000;

    return {
      id: uuidv4(),
      workType,
      startTime,
      endTime,
      reward: {
        coins: difficulty.baseCoins,
        experience: Math.floor(difficulty.baseCoins * 0.6),
      },
      cost: {
        mood: difficulty.moodCost,
        energy: difficulty.energyCost,
      },
    };
  }

  /**
   * 获取工作时长
   */
  private getWorkDuration(workType: WorkType): number {
    return WORK_DIFFICULTIES[workType].baseDurationHours;
  }

  /**
   * 获取当前任务状态
   */
  getCurrentTask(): AutoWorkTask | null {
    return this.currentTask;
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(): WorkTaskStatus {
    return this.taskStatus;
  }

  /**
   * 强制结束当前任务
   */
  async cancelCurrentTask(): Promise<void> {
    if (this.currentTask) {
      console.log('[AutoWorkManager] Cancelling current task');
      this.currentTask = null;
      this.taskStatus = 'idle';
      const petStore = usePetStore.getState();
      petStore.setEmotion('neutral');
      petStore.showBubble('已停止工作', 2000);
    }
  }

  /**
   * 获取工作统计
   */
  async getWorkStatistics(): Promise<{
    isWorking: boolean;
    currentTask: AutoWorkTask | null;
    todayWorkHours: number;
    stats: {
      totalSessions: number;
      totalHours: number;
      totalCoins: number;
      totalExperience: number;
      averageSessionHours: number;
    };
  }> {
    const today = new Date().toISOString().split('T')[0];
    const todayWorkHours = Number((await getTodayWorkHours(today)) || 0) || 0;
    const stats = await getWorkStats();

    return {
      isWorking: this.taskStatus === 'working',
      currentTask: this.currentTask,
      todayWorkHours,
      stats,
    };
  }

  /**
   * 获取最近工作历史
   */
  async getRecentHistory(days: number = 7): Promise<ReturnType<typeof getRecentWorkHistory>> {
    return await getRecentWorkHistory(days);
  }
}

/**
 * 获取自动打工管理器实例
 */
export function getAutoWorkManager(): AutoWorkManager {
  return AutoWorkManager.getInstance();
}

/**
 * 便捷函数：检查并启动打工
 */
export async function checkAndStartWork(): Promise<boolean> {
  const manager = getAutoWorkManager();
  return await manager.startWork();
}
