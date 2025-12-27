/**
 * 成长阶段类型定义
 * Growth Stage Type Definitions
 *
 * 根据 PRD Phase 2 - 3.1 节定义
 * 宠物与用户的关系会随着亲密度提升而进化
 */

/**
 * 成长阶段枚举
 * - STRANGER: 陌生期 (0-30 intimacy)
 * - FRIEND: 友好期 (31-70 intimacy)
 * - SOULMATE: 亲密期 (71-100 intimacy)
 */
export enum GrowthStage {
  STRANGER = 'stranger',
  FRIEND = 'friend',
  SOULMATE = 'soulmate',
}

/**
 * 阶段配置接口
 * 定义每个阶段的特征和解锁内容
 */
export interface StageConfig {
  /** 阶段标识 */
  stage: GrowthStage;

  /** 阶段显示名称 */
  name: string;

  /** 阶段描述 */
  description: string;

  /** 亲密度范围 [最小值, 最大值] */
  intimacyRange: [number, number];

  /** AI 人格配置 */
  personality: {
    /** 动态注入的 System Prompt 片段 */
    systemPrompt: string;

    /** 回复风格描述 */
    responseStyle: string;

    /** 主动性 (0-1)，影响主动提醒频率 */
    proactivity: number;
  };

  /** 解锁功能列表 */
  unlocks: string[];

  /** 升级到下一阶段的条件描述 */
  upgradeCondition?: string;
}

/**
 * 阶段升级事件
 * 当宠物升级到新阶段时触发
 */
export interface StageUpgradeEvent {
  /** 之前的阶段 */
  fromStage: GrowthStage;

  /** 新的阶段 */
  toStage: GrowthStage;

  /** 当前亲密度 */
  currentIntimacy: number;

  /** 升级时间戳 */
  timestamp: number;

  /** 升级庆祝消息 */
  celebrationMessage: string;
}

/**
 * 阶段进度信息
 * 用于 UI 展示
 */
export interface StageProgress {
  /** 当前阶段 */
  currentStage: GrowthStage;

  /** 当前阶段配置 */
  config: StageConfig;

  /** 当前亲密度 */
  intimacy: number;

  /** 当前阶段进度百分比 (0-100) */
  progressPercent: number;

  /** 距离下一阶段还需要的亲密度 */
  intimacyToNext: number | null;

  /** 下一阶段配置 (如果有) */
  nextStage: StageConfig | null;
}
