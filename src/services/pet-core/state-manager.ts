/**
 * PetCore StateManager
 * 宠物状态管理器 - 状态机模式
 *
 * Linus 准则:
 * 1. 消除特殊情况 - 所有状态转换都有明确规则
 * 2. 单一职责 - 只管理状态转换
 * 3. 不信任输入 - 严格验证所有状态变更
 */

import type {
  PetCoreState,
  StateTransitionEvent,
  StateChangeListener,
  InteractionEvent,
  DecayConfig,
  DEFAULT_DECAY_CONFIG,
} from './types';

/**
 * 状态机实现
 * 使用有限状态机模式管理Pet状态转换
 */
export class StateManager {
  private state: PetCoreState;
  private listeners: Set<StateChangeListener> = new Set();
  private decayConfig: DecayConfig;

  constructor(initialState: PetCoreState, config: DecayConfig = DEFAULT_DECAY_CONFIG) {
    this.state = this.validateState(initialState);
    this.decayConfig = config;
  }

  /**
   * 获取当前状态快照
   */
  getState(): PetCoreState {
    // 返回深拷贝防止外部修改
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * 订阅状态变更
   */
  subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 处理状态转换事件
   */
  dispatch(event: StateTransitionEvent): void {
    const oldState = this.getState();
    const newState = this.transition(oldState, event);

    if (newState !== oldState) {
      this.state = newState;
      this.notifyListeners(oldState, newState, event);
    }
  }

  /**
   * 状态转换逻辑
   * 核心：每个事件都有明确的转换规则
   */
  private transition(state: PetCoreState, event: StateTransitionEvent): PetCoreState {
    switch (event.type) {
      case 'INTERACTION':
        return this.handleInteraction(state, event.payload.type);

      case 'DECAY_APPLY':
        return this.applyDecay(state);

      case 'EMOTION_UPDATE':
        return {
          ...state,
          visual: {
            ...state.visual,
            emotion: event.payload.emotion,
          },
        };

      case 'INTIMACY_UPDATE':
        return this.updateIntimacy(state, event.payload.intimacy);

      case 'STAGE_UPGRADE':
        console.log(`[StateManager] Stage upgrade: ${event.payload.fromStage} → ${event.payload.toStage}`);
        return state;

      default:
        // 特殊情况：未处理的事件类型
        console.warn('[StateManager] Unhandled event type:', event);
        return state;
    }
  }

  /**
   * 处理互动事件
   */
  private handleInteraction(state: PetCoreState, type: 'pet' | 'feed' | 'play'): PetCoreState {
    const now = Date.now();

    // 计算新的状态值
    const config = this.getInteractionConfig(type);
    const newMood = this.clamp(state.care.mood + config.effects.mood, 0, 100);
    const newEnergy = this.clamp(state.care.energy + config.effects.energy, 0, 100);
    const newIntimacy = this.clamp(state.care.intimacy + config.effects.intimacy, 0, 100);

    return {
      ...state,
      care: {
        ...state.care,
        mood: newMood,
        energy: newEnergy,
        intimacy: newIntimacy,
        totalInteractions: state.care.totalInteractions + 1,
      },
      timestamps: {
        ...state.timestamps,
        lastInteraction: now,
      },
    };
  }

  /**
   * 应用属性衰减
   */
  private applyDecay(state: PetCoreState): PetCoreState {
    const now = Date.now();
    const hoursPassed = (now - state.timestamps.lastDecayApplied) / (1000 * 60 * 60);

    // 只有时间超过阈值才应用衰减
    if (hoursPassed < 0.1) {
      return state;
    }

    const moodDecay = -Math.min(hoursPassed * this.decayConfig.moodPerHour, this.decayConfig.maxMoodDecay);
    const energyDecay = -Math.min(hoursPassed * this.decayConfig.energyPerHour, this.decayConfig.maxEnergyDecay);

    const newMood = this.clamp(state.care.mood + moodDecay, 0, 100);
    const newEnergy = this.clamp(state.care.energy + energyDecay, 0, 100);

    return {
      ...state,
      care: {
        ...state.care,
        mood: newMood,
        energy: newEnergy,
      },
      timestamps: {
        ...state.timestamps,
        lastDecayApplied: now,
      },
    };
  }

  /**
   * 更新亲密度
   */
  private updateIntimacy(state: PetCoreState, newIntimacy: number): PetCoreState {
    return {
      ...state,
      care: {
        ...state.care,
        intimacy: this.clamp(newIntimacy, 0, 100),
      },
    };
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(oldState: PetCoreState, newState: PetCoreState, event: StateTransitionEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(oldState, newState, event);
      } catch (error) {
        console.error('[StateManager] Listener error:', error);
      }
    });
  }

  /**
   * 验证状态完整性
   * 防止无效状态
   */
  private validateState(state: PetCoreState): PetCoreState {
    // 确保所有数值在有效范围内
    return {
      ...state,
      care: {
        ...state.care,
        mood: this.clamp(state.care.mood, 0, 100),
        energy: this.clamp(state.care.energy, 0, 100),
        intimacy: this.clamp(state.care.intimacy, 0, 100),
      },
    };
  }

  /**
   * 数值范围限制
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * 获取互动配置
   */
  private getInteractionConfig(type: 'pet' | 'feed' | 'play') {
    const configs = {
      pet: {
        cooldown: 60,
        effects: { mood: 10, energy: 0, intimacy: 2 },
        animation: 'tap_head',
        voiceResponses: ['好舒服~', '嗯嗯~', '再摸摸我~'],
      },
      feed: {
        cooldown: 120,
        effects: { mood: 8, energy: 15, intimacy: 1 },
        animation: 'eat',
        voiceResponses: ['好好吃!', '谢谢~', '还要~'],
      },
      play: {
        cooldown: 90,
        effects: { mood: 12, energy: -5, intimacy: 3 },
        animation: 'happy',
        voiceResponses: ['好开心!', '哈哈~', '再来!'],
      },
    };

    return configs[type];
  }
}

/**
 * 创建初始状态
 */
export function createInitialState(): PetCoreState {
  const now = Date.now();
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
      mood: 100,
      energy: 100,
      intimacy: 20,
      coins: 0,
      experience: 0,
      totalInteractions: 0,
      createdAt: now,
    },
    timestamps: {
      lastInteraction: now,
      lastDecayApplied: now,
      createdAt: now,
    },
  };
}
