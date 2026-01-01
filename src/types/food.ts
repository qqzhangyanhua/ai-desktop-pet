/**
 * Food System Type Definitions
 * 食物系统类型定义
 */

import type { EmotionType } from './pet';

/**
 * Food category - 食物分类
 */
export type FoodCategory = 'staple' | 'snack' | 'drink' | 'special';

/**
 * Food rarity - 食物稀有度
 */
export type FoodRarity = 'common' | 'rare' | 'epic';

/**
 * Food item definition - 食物项定义
 */
export interface FoodItem {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;

  /** Category */
  category: FoodCategory;

  /** Rarity (affects visual style) */
  rarity: FoodRarity;

  /** Effects on pet status */
  effects: {
    /** Satiety change (+20) */
    satiety: number;

    /** Mood change (+5) */
    mood: number;

    /** Boredom change (-5) */
    boredom: number;

    /** Optional: Energy change */
    energy?: number;

    /** Optional: Hygiene change */
    hygiene?: number;
  };

  /** Pet emotion after eating */
  emotion: EmotionType;

  /** Message displayed when fed */
  message: string;

  /** Optional: Cooldown in seconds (for special foods) */
  cooldown?: number;

  /** Optional: Icon path or emoji */
  icon?: string;

  /** Optional: Description */
  description?: string;
}

/**
 * Category display names - 分类显示名称
 */
export const FOOD_CATEGORY_NAMES: Record<FoodCategory, string> = {
  staple: '主食',
  snack: '零食',
  drink: '饮料',
  special: '特殊',
};

/**
 * Rarity display names - 稀有度显示名称
 */
export const FOOD_RARITY_NAMES: Record<FoodRarity, string> = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
};

/**
 * Rarity colors - 稀有度颜色
 */
export const FOOD_RARITY_COLORS: Record<FoodRarity, string> = {
  common: '#9ca3af', // gray-400
  rare: '#60a5fa', // blue-400
  epic: '#a78bfa', // purple-400
};
