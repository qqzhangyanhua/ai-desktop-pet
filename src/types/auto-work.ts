/**
 * 自动打工系统类型定义
 * Auto Work System Type Definitions
 */

/**
 * 工作类型
 */
export type WorkType = 'easy' | 'normal' | 'hard';

/**
 * 工作难度配置
 */
export interface WorkDifficulty {
  /** 工作类型 */
  type: WorkType;
  /** 基础时长（小时） */
  baseDurationHours: number;
  /** 基础金币奖励 */
  baseCoins: number;
  /** 心情消耗 */
  moodCost: number;
  /** 精力消耗 */
  energyCost: number;
  /** 随机波动范围 */
  variance: number;
}

/**
 * 自动打工任务
 */
export interface AutoWorkTask {
  /** 任务ID */
  id: string;
  /** 工作类型 */
  workType: WorkType;
  /** 开始时间 */
  startTime: number;
  /** 预计结束时间 */
  endTime: number;
  /** 奖励 */
  reward: {
    coins: number;
    experience: number;
  };
  /** 消耗 */
  cost: {
    mood: number;
    energy: number;
  };
}

/**
 * 自动打工历史记录
 */
export interface AutoWorkHistory {
  /** 记录ID */
  id: string;
  /** 工作类型 */
  workType: WorkType;
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime: number;
  /** 工作时长（小时） */
  durationHours: number;
  /** 金币奖励 */
  rewardCoins: number;
  /** 经验奖励 */
  rewardExperience: number;
  /** 心情消耗 */
  moodConsumed: number;
  /** 精力消耗 */
  energyConsumed: number;
  /** 亲密度等级 */
  intimacyLevel: number;
  /** 创建时间 */
  createdAt: number;
}

/**
 * 自动打工配置
 */
export interface AutoWorkConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 闲置触发时长（分钟） */
  idleTriggerMinutes: number;
  /** 最大工作时长（小时） */
  maxWorkHours: number;
  /** 每日最大工作时长（小时） */
  dailyMaxWorkHours: number;
}
