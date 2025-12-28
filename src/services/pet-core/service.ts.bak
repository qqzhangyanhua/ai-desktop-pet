/**
 * PetCore Service
 * 宠物核心服务 - 统一入口
 *
 * Linus 准则: 一个入口，统一管理，消除分散的状态逻辑
 */

import { StateManager, createInitialState } from './state-manager';
import type {
  PetCoreState,
  InteractionResult,
  StateChangeListener,
  InteractionEvent,
} from './types';
import { getDatabase } from '@/services/database';
import { v4 as uuidv4 } from 'uuid';

/**
 * PetCore Service 主类
 * 单例模式，确保全局唯一实例
 */
class PetCoreService {
  private stateManager: StateManager;
  private initialized = false;

  private constructor() {
    const initialState = createInitialState();
    this.stateManager = new StateManager(initialState);
  }

  /**
   * 获取单例实例
   */
  static getInstance(): PetCoreService {
    if (!PetCoreService.instance) {
      PetCoreService.instance = new PetCoreService();
    }
    return PetCoreService.instance;
  }

  /**
   * 初始化服务
   * 从数据库加载状态
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const db = await getDatabase();
      const rows = await db.select<any[]>('SELECT * FROM pet_status WHERE id = 1');

      if (rows.length > 0 && rows[0]) {
        const row = rows[0];
        const state = this.mapDatabaseToState(row);
        this.stateManager = new StateManager(state);
      }

      this.initialized = true;
      console.log('[PetCore] Service initialized');
    } catch (error) {
      console.error('[PetCore] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * 获取当前状态
   */
  getState(): PetCoreState {
    return this.stateManager.getState();
  }

  /**
   * 订阅状态变更
   */
  subscribe(listener: StateChangeListener): () => void {
    return this.stateManager.subscribe(listener);
  }

  /**
   * 处理互动
   * 核心方法：处理所有类型的用户互动
   */
  async handleInteraction(type: 'pet' | 'feed' | 'play'): Promise<InteractionResult> {
    // 检查冷却时间
    const cooldown = this.checkCooldown(type);
    if (cooldown.onCooldown) {
      return {
        success: false,
        message: `冷却中，还需等待 ${cooldown.remaining} 秒`,
        newState: this.stateManager.getState(),
      };
    }

    // 执行状态转换
    this.stateManager.dispatch({
      type: 'INTERACTION',
      payload: { type },
    });

    const newState = this.stateManager.getState();

    // 记录互动历史到数据库
    await this.recordInteraction({
      id: uuidv4(),
      type,
      timestamp: Date.now(),
      intensity: this.getInteractionIntensity(type),
      moodChange: this.getMoodChange(type),
      energyChange: this.getEnergyChange(type),
      intimacyChange: this.getIntimacyChange(type),
    });

    // 异步保存到数据库
    this.persistState(newState).catch((error) => {
      console.error('[PetCore] Failed to persist state:', error);
    });

    return {
      success: true,
      message: this.getInteractionMessage(type),
      newState,
      animation: this.getAnimation(type),
      voice: this.getVoiceResponse(type),
      effects: {
        mood: this.getMoodChange(type),
        energy: this.getEnergyChange(type),
        intimacy: this.getIntimacyChange(type),
      },
    };
  }

  /**
   * 应用属性衰减
   * 定时调用或按需调用
   */
  async applyDecay(): Promise<void> {
    this.stateManager.dispatch({ type: 'DECAY_APPLY' });
    const newState = this.stateManager.getState();

    // 异步保存
    this.persistState(newState).catch((error) => {
      console.error('[PetCore] Failed to persist decay:', error);
    });
  }

  /**
   * 更新表情
   */
  updateEmotion(emotion: PetCoreState['visual']['emotion']): void {
    this.stateManager.dispatch({
      type: 'EMOTION_UPDATE',
      payload: { emotion },
    });
  }

  /**
   * 检查冷却时间
   */
  checkCooldown(type: 'pet' | 'feed' | 'play'): { onCooldown: boolean; remaining: number } {
    const state = this.stateManager.getState();
    const cooldownMap = {
      pet: 60,
      feed: 120,
      play: 90,
    };

    const cooldown = cooldownMap[type];
    const lastInteraction = state.timestamps.lastInteraction;
    const elapsed = (Date.now() - lastInteraction) / 1000;
    const remaining = Math.max(0, cooldown - elapsed);

    return {
      onCooldown: remaining > 0,
      remaining: Math.ceil(remaining),
    };
  }

  /**
   * 记录互动历史
   * 替代分散的 lastFeed、lastPlay 字段
   */
  private async recordInteraction(event: InteractionEvent): Promise<void> {
    try {
      const db = await getDatabase();
      await db.execute(
        `INSERT INTO interaction_history
         (id, type, timestamp, intensity, mood_change, energy_change, intimacy_change, context)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          event.id,
          event.type,
          event.timestamp,
          event.intensity,
          event.moodChange,
          event.energyChange,
          event.intimacyChange,
          event.context ? JSON.stringify(event.context) : null,
        ]
      );
    } catch (error) {
      console.error('[PetCore] Failed to record interaction:', error);
    }
  }

  /**
   * 保存状态到数据库
   */
  private async persistState(state: PetCoreState): Promise<void> {
    try {
      const db = await getDatabase();
      const now = Date.now();

      await db.execute(
        `UPDATE pet_status
         SET mood = ?, energy = ?, intimacy = ?,
             total_interactions = ?, coins = ?, experience = ?,
             last_interaction = ?, updated_at = ?
         WHERE id = 1`,
        [
          state.care.mood,
          state.care.energy,
          state.care.intimacy,
          state.care.totalInteractions,
          state.care.coins,
          state.care.experience,
          state.timestamps.lastInteraction,
          now,
        ]
      );
    } catch (error) {
      console.error('[PetCore] Failed to persist state:', error);
      throw error;
    }
  }

  /**
   * 数据库行映射到状态对象
   */
  private mapDatabaseToState(row: any): PetCoreState {
    return {
      visual: {
        emotion: 'neutral',
        isVisible: true,
        currentSkinId: 'default',
        isListening: false,
        isSpeaking: false,
        bubbleText: null,
        position: { x: 100, y: 100 },
        scale: 1.0,
      },
      care: {
        mood: row.mood ?? 100,
        energy: row.energy ?? 100,
        intimacy: row.intimacy ?? 20,
        coins: row.coins ?? 0,
        experience: row.experience ?? 0,
        totalInteractions: row.total_interactions ?? 0,
        createdAt: row.created_at ?? Date.now(),
      },
      timestamps: {
        lastInteraction: row.last_interaction ?? Date.now(),
        lastDecayApplied: Date.now(),
        createdAt: row.created_at ?? Date.now(),
      },
    };
  }

  // 辅助方法：获取互动相关数据
  private getInteractionIntensity(type: 'pet' | 'feed' | 'play'): number {
    const intensityMap = { pet: 3, feed: 5, play: 7 };
    return intensityMap[type];
  }

  private getMoodChange(type: 'pet' | 'feed' | 'play'): number {
    const moodMap = { pet: 10, feed: 8, play: 12 };
    return moodMap[type];
  }

  private getEnergyChange(type: 'pet' | 'feed' | 'play'): number {
    const energyMap = { pet: 0, feed: 15, play: -5 };
    return energyMap[type];
  }

  private getIntimacyChange(type: 'pet' | 'feed' | 'play'): number {
    const intimacyMap = { pet: 2, feed: 1, play: 3 };
    return intimacyMap[type];
  }

  private getAnimation(type: 'pet' | 'feed' | 'play'): string {
    const animationMap = { pet: 'tap_head', feed: 'eat', play: 'happy' };
    return animationMap[type];
  }

  private getVoiceResponse(type: 'pet' | 'feed' | 'play'): string {
    const responseMap = {
      pet: ['好舒服~', '嗯嗯~', '再摸摸我~'],
      feed: ['好好吃!', '谢谢~', '还要~'],
      play: ['好开心!', '哈哈~', '再来!'],
    };
    const responses = responseMap[type];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private getInteractionMessage(type: 'pet' | 'feed' | 'play'): string {
    const messageMap = {
      pet: '被抚摸得很舒服呢~',
      feed: '吃饱了，谢谢主人！',
      play: '玩耍真开心！',
    };
    return messageMap[type];
  }

  private static instance: PetCoreService | null = null;
}

// 导出单例实例的便捷访问方法
export const petCoreService = PetCoreService.getInstance();
export default petCoreService;
