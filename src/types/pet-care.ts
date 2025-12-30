/**
 * Pet Care Type Definitions (New Architecture)
 * 宠物养成类型定义（新架构）
 *
 * Linus准则: 简化数据结构，消除特殊情况
 * - 8个独立时间戳字段 → 1个Map
 * - 统一交互类型枚举
 *
 * Note: 这些类型将逐步替代 pet-status.ts 中的旧定义
 */

/**
 * 扩展的交互类型枚举（新版本）
 * 定义所有可能的宠物交互动作
 *
 * 兼容旧的 'pet' | 'feed' | 'play'，同时扩展新类型
 */
export type PetInteractionType =
  | 'feed'   // 喂食
  | 'play'   // 玩耍
  | 'pet'    // 抚摸
  | 'clean'  // 清洁
  | 'sleep'  // 睡觉
  | 'work'   // 工作
  | 'study'; // 学习

/**
 * 时间戳管理器类
 * 替代多个独立的 lastFeed, lastPlay 等字段
 */
export class InteractionTimestamps {
  private timestamps: Map<PetInteractionType, number>;

  constructor(data?: Record<string, number>) {
    this.timestamps = new Map();
    if (data) {
      // 支持从普通对象初始化
      Object.entries(data).forEach(([key, value]) => {
        if (this.isValidInteractionType(key)) {
          this.timestamps.set(key as PetInteractionType, value);
        }
      });
    }
  }

  /**
   * 获取指定交互类型的最后时间
   */
  getLastTime(type: PetInteractionType): number {
    return this.timestamps.get(type) || 0;
  }

  /**
   * 设置指定交互类型的最后时间
   */
  setLastTime(type: PetInteractionType, time: number): void {
    this.timestamps.set(type, time);
  }

  /**
   * 获取所有时间戳（用于序列化）
   */
  getAllTimestamps(): Record<string, number> {
    const result: Record<string, number> = {};
    this.timestamps.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * 序列化为JSON字符串（用于数据库存储）
   */
  toJSON(): string {
    return JSON.stringify(this.getAllTimestamps());
  }

  /**
   * 从JSON字符串反序列化
   */
  static fromJSON(json: string): InteractionTimestamps {
    try {
      const data = JSON.parse(json);
      return new InteractionTimestamps(data);
    } catch {
      return new InteractionTimestamps();
    }
  }

  /**
   * 类型守卫：检查是否为有效的交互类型
   */
  private isValidInteractionType(type: string): boolean {
    const validTypes: PetInteractionType[] = ['feed', 'play', 'pet', 'clean', 'sleep', 'work', 'study'];
    return validTypes.includes(type as PetInteractionType);
  }

  /**
   * 检查是否有任何记录
   */
  isEmpty(): boolean {
    return this.timestamps.size === 0;
  }

  /**
   * 清空所有时间戳
   */
  clear(): void {
    this.timestamps.clear();
  }
}

/**
 * 交互效果配置（新版本）
 * 定义每种交互对宠物状态的影响
 */
export interface PetInteractionEffect {
  /** 饱食度变化 */
  fullness?: number;
  /** 精力变化 */
  energy?: number;
  /** 心情变化 */
  mood?: number;
  /** 亲密度变化 */
  intimacy?: number;
  /** 冷却时间（秒） */
  cooldown: number;
  /** 动画名称 */
  animation?: string;
  /** 语音反馈 */
  voiceResponses?: string[];
}

/**
 * 护理状态接口（新版本，简化）
 * 替代原来分散在多处的状态定义
 */
export interface PetCareStatus {
  /** 饱食度 (0-100) */
  fullness: number;
  /** 精力 (0-100) */
  energy: number;
  /** 心情 (0-100) */
  mood: number;
  /** 亲密度 (0-100) */
  intimacy: number;
  /** 统一的交互时间戳管理器 */
  interactionTimestamps: InteractionTimestamps;
  /** 最后衰减应用时间 */
  lastDecayTime: number;
  /** 总交互次数 */
  totalInteractions: number;
  /** 创建时间 */
  createdAt: number;
}

/**
 * 衰减配置（新版本）
 * 定义各属性的衰减速率
 */
export interface PetDecayConfig {
  /** 饱食度衰减速率（每小时） */
  fullnessDecay: number;
  /** 精力衰减速率（每小时） */
  energyDecay: number;
  /** 心情衰减速率（每小时） */
  moodDecay: number;
  /** 最大单次饱食度衰减值 */
  maxFullnessDecay?: number;
  /** 最大单次精力衰减值 */
  maxEnergyDecay?: number;
  /** 最大单次心情衰减值 */
  maxMoodDecay?: number;
}

/**
 * 默认衰减配置
 */
export const DEFAULT_PET_DECAY_CONFIG: PetDecayConfig = {
  fullnessDecay: 5,   // 每小时减少5点
  energyDecay: 3,     // 每小时减少3点
  moodDecay: 2,       // 每小时减少2点
  maxFullnessDecay: 30,
  maxEnergyDecay: 20,
  maxMoodDecay: 15,
};

/**
 * 交互结果（新版本）
 * 统一的交互处理返回类型
 */
export interface PetInteractionResult {
  /** 是否成功 */
  success: boolean;
  /** 消息提示 */
  message?: string;
  /** 更新后的状态 */
  newStatus: PetCareStatus;
  /** 推荐的动画 */
  animation?: string;
  /** 推荐的语音反馈 */
  voice?: string;
  /** 冷却剩余时间（毫秒） */
  cooldownRemaining?: number;
}

/**
 * 冷却状态
 */
export interface CooldownStatus {
  /** 是否在冷却中 */
  onCooldown: boolean;
  /** 剩余冷却时间（毫秒） */
  remaining: number;
  /** 下次可用时间戳 */
  nextAvailableAt: number;
}

