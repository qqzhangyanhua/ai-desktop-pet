/**
 * 经济系统服务
 * Economy System Service
 *
 * 管理金币、经验值和等级系统
 */

import { execute, query } from '@/services/database';
import type {
  CoinSource,
  ExperienceSource,
  LevelConfig,
  LevelInfo,
} from '@/types/economy';

/**
 * 等级计算配置
 * Level 1: 0 exp
 * Level 2: 100 exp
 * Level 3: 300 exp (100 + 200)
 * Level 4: 600 exp (100 + 200 + 300)
 * ...
 */
const LEVEL_CONFIG: LevelConfig = {
  baseExp: 100,
  growthFactor: 1.5,
  maxLevel: 50,
};

/**
 * EconomyManager 单例类
 */
class EconomyManager {
  private static instance: EconomyManager;
  private cache: {
    coins: number | null;
    experience: number | null;
    levelInfo: LevelInfo | null;
    timestamp: number;
  } = {
    coins: null,
    experience: null,
    levelInfo: null,
    timestamp: 0,
  };

  private constructor() {}

  static getInstance(): EconomyManager {
    if (!EconomyManager.instance) {
      EconomyManager.instance = new EconomyManager();
    }
    return EconomyManager.instance;
  }

  /**
   * 获取当前金币数
   */
  async getCoins(): Promise<number> {
    const result = await query<{ coins: number }>(
      'SELECT coins FROM pet_status WHERE id = 1'
    );
    return result[0]?.coins ?? 0;
  }

  /**
   * 获取当前经验值
   */
  async getExperience(): Promise<number> {
    const result = await query<{ experience: number }>(
      'SELECT experience FROM pet_status WHERE id = 1'
    );
    return result[0]?.experience ?? 0;
  }

  /**
   * 添加金币
   * @param amount 金币数量（正数）
   * @param source 来源类型
   */
  async addCoins(amount: number, source: CoinSource): Promise<number> {
    if (amount <= 0) {
      console.warn('[EconomyManager] Coin amount must be positive');
      return await this.getCoins();
    }

    await execute(
      'UPDATE pet_status SET coins = coins + ?, updated_at = ? WHERE id = 1',
      [amount, Date.now()]
    );

    const newCoins = await this.getCoins();
    console.log(`[EconomyManager] Added ${amount} coins from ${source}, new total: ${newCoins}`);

    return newCoins;
  }

  /**
   * 扣除金币
   * @param amount 金币数量（正数）
   * @returns 是否成功（余额不足时返回 false）
   */
  async spendCoins(amount: number): Promise<boolean> {
    if (amount <= 0) {
      console.warn('[EconomyManager] Coin amount must be positive');
      return false;
    }

    const currentCoins = await this.getCoins();
    if (currentCoins < amount) {
      console.warn('[EconomyManager] Insufficient coins');
      return false;
    }

    await execute(
      'UPDATE pet_status SET coins = coins - ?, updated_at = ? WHERE id = 1',
      [amount, Date.now()]
    );

    const newCoins = await this.getCoins();
    console.log(`[EconomyManager] Spent ${amount} coins, new total: ${newCoins}`);

    return true;
  }

  /**
   * 添加经验值
   * @param amount 经验数量（正数）
   * @param source 来源类型
   * @returns 新的等级信息（如果升级了）
   */
  async addExperience(amount: number, source: ExperienceSource): Promise<LevelInfo | null> {
    if (amount <= 0) {
      console.warn('[EconomyManager] Experience amount must be positive');
      return null;
    }

    const oldLevel = await this.getLevel();

    await execute(
      'UPDATE pet_status SET experience = experience + ?, updated_at = ? WHERE id = 1',
      [amount, Date.now()]
    );

    const newLevelInfo = await this.getLevelInfo();
    console.log(
      `[EconomyManager] Added ${amount} exp from ${source}, level: ${oldLevel} -> ${newLevelInfo.level}`
    );

    // 如果升级了，返回新的等级信息
    if (newLevelInfo.level > oldLevel) {
      return newLevelInfo;
    }

    return null;
  }

  /**
   * 计算当前等级
   */
  async getLevel(): Promise<number> {
    const exp = await this.getExperience();
    return this.calculateLevel(exp);
  }

  /**
   * 获取完整等级信息
   */
  async getLevelInfo(): Promise<LevelInfo> {
    // 使用缓存（5秒有效期）
    const now = Date.now();
    if (this.cache.levelInfo && now - this.cache.timestamp < 5000) {
      return this.cache.levelInfo;
    }

    const exp = await this.getExperience();
    const level = this.calculateLevel(exp);
    const prevLevelRequiredExp = this.getRequiredExpForLevel(level - 1);
    const currentLevelExp = exp - prevLevelRequiredExp;
    const levelExpNeeded = this.getRequiredExpForLevel(level) - prevLevelRequiredExp;
    const progress = levelExpNeeded > 0 ? currentLevelExp / levelExpNeeded : 0;
    const isMaxLevel = level >= LEVEL_CONFIG.maxLevel;

    const levelInfo: LevelInfo = {
      level,
      currentExp: currentLevelExp,
      requiredExp: levelExpNeeded,
      progress: Math.min(1, Math.max(0, progress)),
      isMaxLevel,
    };

    this.cache.levelInfo = levelInfo;
    this.cache.timestamp = now;

    return levelInfo;
  }

  /**
   * 根据经验值计算等级
   * @param exp 总经验值
   * @returns 等级
   */
  private calculateLevel(exp: number): number {
    if (exp <= 0) return 1;

    let level = 1;

    while (level < LEVEL_CONFIG.maxLevel) {
      const nextLevelExp = this.getRequiredExpForLevel(level);
      if (exp < nextLevelExp) {
        break;
      }
      level++;
    }

    return Math.min(level, LEVEL_CONFIG.maxLevel);
  }

  /**
   * 计算达到指定等级所需的总经验
   * @param level 目标等级
   * @returns 所需总经验
   */
  private getRequiredExpForLevel(level: number): number {
    if (level <= 1) return 0;

    let totalExp = 0;
    for (let i = 1; i < level; i++) {
      totalExp += Math.floor(LEVEL_CONFIG.baseExp * Math.pow(LEVEL_CONFIG.growthFactor, i - 1));
    }

    return totalExp;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache = {
      coins: null,
      experience: null,
      levelInfo: null,
      timestamp: 0,
    };
  }
}

/**
 * 获取 EconomyManager 单例
 */
export function getEconomyManager(): EconomyManager {
  return EconomyManager.getInstance();
}

/**
 * 便捷函数：获取金币数
 */
export async function getCoins(): Promise<number> {
  return getEconomyManager().getCoins();
}

/**
 * 便捷函数：获取经验值
 */
export async function getExperience(): Promise<number> {
  return getEconomyManager().getExperience();
}

/**
 * 便捷函数：获取等级
 */
export async function getLevel(): Promise<number> {
  return getEconomyManager().getLevel();
}

/**
 * 便捷函数：获取等级信息
 */
export async function getLevelInfo(): Promise<LevelInfo> {
  return getEconomyManager().getLevelInfo();
}

/**
 * 便捷函数：添加金币
 */
export async function addCoins(amount: number, source: CoinSource): Promise<number> {
  return getEconomyManager().addCoins(amount, source);
}

/**
 * 便捷函数：花费金币
 */
export async function spendCoins(amount: number): Promise<boolean> {
  return getEconomyManager().spendCoins(amount);
}

/**
 * 便捷函数：添加经验
 */
export async function addExperience(
  amount: number,
  source: ExperienceSource
): Promise<LevelInfo | null> {
  return getEconomyManager().addExperience(amount, source);
}
