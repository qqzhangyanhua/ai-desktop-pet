import { create } from 'zustand';
import type {
  CareEffect,
  CareStatusReport,
  PetActionType,
  PetCareStats,
  EmotionType,
} from '../types';
import { useConfigStore } from './configStore';
import { getCareStatus, updateCareStatus } from '@/services/database/pet-status';

/**
 * P2-1-B: 数据库持久化防抖计时器（2秒）
 */
let dbSaveTimer: ReturnType<typeof setTimeout> | null = null;
const DB_SAVE_DEBOUNCE_MS = 2000;

const clamp = (value: number, min = 0, max = 100) => Math.min(Math.max(value, min), max);

const getDecayMultiplier = (): number => {
  const preset = useConfigStore.getState().config.behavior.decaySpeed;
  switch (preset) {
    case 'casual':
      return 0.65;
    case 'hardcore':
      return 1.5;
    case 'standard':
    default:
      return 1.0;
  }
};

const initialCareStats: PetCareStats = {
  satiety: 78,
  energy: 80,
  hygiene: 76,
  mood: 82,
  boredom: 25,
  isSick: false,
  lastAction: null,
};

const ACTION_EFFECTS: Record<PetActionType, CareEffect> = {
  feed: {
    message: '吃了苹果，补充能量！',
    emotion: 'happy',
    stats: { satiety: 22, mood: 6, boredom: -6 },
  },
  play: {
    message: '一起玩小游戏，超开心！',
    emotion: 'excited',
    stats: { mood: 12, boredom: -22, energy: -6 },
  },
  sleep: {
    message: '小憩一下，恢复体力~',
    emotion: 'neutral',
    stats: { energy: 26, mood: 6, boredom: -6 },
  },
  work: {
    message: '我去打工啦，努力赚点小钱~',
    emotion: 'thinking',
    stats: { energy: -10, satiety: -8, hygiene: -4, mood: 2, boredom: 12 },
  },
  transform: {
    message: '变身完成，感觉焕然一新！',
    emotion: 'surprised',
    stats: { mood: 10, boredom: -10, hygiene: 4 },
  },
  music: {
    message: '播放喜欢的歌，一起律动！',
    emotion: 'happy',
    stats: { mood: 10, boredom: -14, energy: -3 },
  },
  dance: {
    message: '开场跳舞，气氛直接拉满！',
    emotion: 'excited',
    stats: { mood: 14, boredom: -18, energy: -8 },
  },
  magic: {
    message: '表演小魔术，惊喜不断！',
    emotion: 'surprised',
    stats: { mood: 11, boredom: -12 },
  },
  art: {
    message: '生成一幅艺术小作品~',
    emotion: 'thinking',
    stats: { mood: 9, boredom: -15 },
  },
  clean: {
    message: '清洁完毕，闪闪发亮！',
    emotion: 'happy',
    stats: { hygiene: 24, mood: 6 },
  },
  brush: {
    message: '梳理毛发，软乎乎的~',
    emotion: 'happy',
    stats: { hygiene: 15, mood: 8, boredom: -6 },
  },
  rest: {
    message: '放松一下，缓解疲劳。',
    emotion: 'neutral',
    stats: { energy: 14, mood: 5, boredom: -8 },
  },
};

const computeSick = (stats: PetCareStats): boolean => {
  const lowSatiety = stats.satiety < 18;
  const lowHygiene = stats.hygiene < 24;
  const lowEnergy = stats.energy < 16;
  const highBoredom = stats.boredom > 82;
  return lowSatiety || lowHygiene || lowEnergy || highBoredom;
};

const applyDelta = (stats: PetCareStats, delta: Partial<PetCareStats>): PetCareStats => {
  return {
    ...stats,
    satiety: clamp(stats.satiety + (delta.satiety ?? 0)),
    energy: clamp(stats.energy + (delta.energy ?? 0)),
    hygiene: clamp(stats.hygiene + (delta.hygiene ?? 0)),
    mood: clamp(stats.mood + (delta.mood ?? 0)),
    boredom: clamp(stats.boredom + (delta.boredom ?? 0)),
    isSick: delta.isSick ?? stats.isSick,
    lastAction: delta.lastAction ?? stats.lastAction,
  };
};

export interface CareStore extends PetCareStats {
  applyDecay: () => PetCareStats;
  applyAction: (action: PetActionType) => CareEffect & { stats: PetCareStats };
  getStatusReport: () => CareStatusReport;
  resetCare: () => void;
  loadFromDatabase: () => Promise<void>;
  saveToDatabase: () => Promise<void>;
}

export const useCareStore = create<CareStore>((set, get) => ({
  ...initialCareStats,

  applyDecay: () => {
    let updated: PetCareStats = initialCareStats;
    set((state) => {
      const multiplier = getDecayMultiplier();
      const decayed = applyDelta(state, {
        satiety: -1.6 * multiplier,
        energy: -1.2 * multiplier,
        hygiene: -0.9 * multiplier,
        mood: -0.6 * multiplier,
        boredom: 1.2 * multiplier,
      });

      updated = {
        ...decayed,
        isSick: computeSick(decayed),
      };
      return updated;
    });

    // P2-1-B: Auto-save to database (debounced)
    get().saveToDatabase();
    return updated;
  },

  applyAction: (action) => {
    const effect = ACTION_EFFECTS[action];
    let updated: PetCareStats = initialCareStats;

    set((state) => {
      const merged = applyDelta(state, {
        ...effect.stats,
        lastAction: action,
      });

      updated = {
        ...merged,
        isSick: computeSick(merged),
      };
      return updated;
    });

    // P2-1-B: Auto-save to database (debounced)
    get().saveToDatabase();

    return {
      ...effect,
      stats: updated,
    };
  },

  getStatusReport: () => {
    const stats = get();
    const warnings: string[] = [];
    let emotion: EmotionType = 'happy';

    if (stats.satiety < 35) warnings.push('肚子有点饿，来点零食吧');
    if (stats.hygiene < 40) warnings.push('需要清洁或梳理一下');
    if (stats.energy < 35) warnings.push('有点困，需要休息');
    if (stats.boredom > 70) warnings.push('有点无聊，陪我玩会儿');

    if (warnings.length >= 2) {
      emotion = 'sad';
    } else if (warnings.length === 1) {
      emotion = 'confused';
    } else if (stats.isSick) {
      emotion = 'sad';
    }

    const summary = `状态：饱腹${Math.round(stats.satiety)} | 体力${Math.round(stats.energy)} | 清洁${Math.round(stats.hygiene)} | 心情${Math.round(stats.mood)} | 无聊${Math.round(stats.boredom)}`;

    return {
      summary,
      warnings,
      emotion,
    };
  },

  resetCare: () => set(initialCareStats),

  /**
   * P2-1-B: 从数据库加载Care状态
   */
  loadFromDatabase: async () => {
    try {
      const dbStats = await getCareStatus();
      if (dbStats) {
        set({
          satiety: dbStats.satiety,
          energy: dbStats.energy,
          hygiene: dbStats.hygiene,
          mood: dbStats.mood,
          boredom: dbStats.boredom,
          isSick: dbStats.isSick,
          lastAction: dbStats.lastAction,
        });
        console.log('[CareStore] Loaded care status from database');
      } else {
        console.log('[CareStore] No existing care status, using defaults');
      }
    } catch (error) {
      console.error('[CareStore] Failed to load from database:', error);
    }
  },

  /**
   * P2-1-B: 保存Care状态到数据库（带2秒防抖）
   */
  saveToDatabase: async () => {
    if (dbSaveTimer) {
      clearTimeout(dbSaveTimer);
    }

    dbSaveTimer = setTimeout(async () => {
      try {
        const state = get();
        await updateCareStatus({
          satiety: state.satiety,
          energy: state.energy,
          hygiene: state.hygiene,
          mood: state.mood,
          boredom: state.boredom,
          isSick: state.isSick,
          lastAction: state.lastAction,
        });
        console.log('[CareStore] Saved care status to database');
      } catch (error) {
        console.error('[CareStore] Failed to save to database:', error);
      }
    }, DB_SAVE_DEBOUNCE_MS);
  },
}));
