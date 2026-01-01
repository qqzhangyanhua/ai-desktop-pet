/**
 * Food Configuration
 * 食物配置数据
 *
 * 设计原则（Linus原则）：
 * 1. 配置数据写死在代码里（10条数据不值得用数据库）
 * 2. 简单数据结构消除if分支
 * 3. 易扩展（新增食物只需加一条配置）
 */

import type { FoodItem, FoodCategory } from '@/types/food';

/**
 * All available food items - 所有可用食物
 */
export const FOOD_ITEMS: FoodItem[] = [
  // ========== 主食 (Staple) ==========
  {
    id: 'apple',
    name: '苹果',
    category: 'staple',
    rarity: 'common',
    effects: {
      satiety: 20,
      mood: 5,
      boredom: -5,
    },
    emotion: 'happy',
    message: '吃了苹果，补充能量！',
    icon: '🍎',
    description: '新鲜多汁的红苹果',
  },
  {
    id: 'bread',
    name: '面包',
    category: 'staple',
    rarity: 'common',
    effects: {
      satiety: 30,
      mood: 3,
      boredom: -3,
    },
    emotion: 'neutral',
    message: '吃了面包，填饱肚子~',
    icon: '🍞',
    description: '松软的白面包',
  },
  {
    id: 'rice',
    name: '米饭',
    category: 'staple',
    rarity: 'common',
    effects: {
      satiety: 35,
      mood: 4,
      boredom: -2,
    },
    emotion: 'neutral',
    message: '吃了米饭，好饱！',
    icon: '🍚',
    description: '热腾腾的白米饭',
  },

  // ========== 零食 (Snack) ==========
  {
    id: 'cookie',
    name: '饼干',
    category: 'snack',
    rarity: 'common',
    effects: {
      satiety: 10,
      mood: 8,
      boredom: -8,
    },
    emotion: 'happy',
    message: '吃了饼干，好开心！',
    icon: '🍪',
    description: '香脆可口的曲奇饼干',
  },
  {
    id: 'chocolate',
    name: '巧克力',
    category: 'snack',
    rarity: 'rare',
    effects: {
      satiety: 15,
      mood: 12,
      boredom: -10,
      energy: 5,
    },
    emotion: 'excited',
    message: '吃了巧克力，心情大好！',
    icon: '🍫',
    description: '丝滑醇厚的黑巧克力',
  },
  {
    id: 'candy',
    name: '糖果',
    category: 'snack',
    rarity: 'common',
    effects: {
      satiety: 8,
      mood: 10,
      boredom: -6,
    },
    emotion: 'happy',
    message: '吃了糖果，甜甜的！',
    icon: '🍬',
    description: '五颜六色的水果糖',
  },

  // ========== 饮料 (Drink) ==========
  {
    id: 'water',
    name: '水',
    category: 'drink',
    rarity: 'common',
    effects: {
      satiety: 5,
      mood: 2,
      boredom: 0,
      energy: 10,
      hygiene: 2,
    },
    emotion: 'neutral',
    message: '喝了水，补充水分~',
    icon: '💧',
    description: '清凉的纯净水',
  },
  {
    id: 'milk',
    name: '牛奶',
    category: 'drink',
    rarity: 'common',
    effects: {
      satiety: 15,
      mood: 5,
      boredom: -3,
      energy: 15,
    },
    emotion: 'happy',
    message: '喝了牛奶，营养满满！',
    icon: '🥛',
    description: '新鲜的全脂牛奶',
  },
  {
    id: 'juice',
    name: '果汁',
    category: 'drink',
    rarity: 'common',
    effects: {
      satiety: 12,
      mood: 8,
      boredom: -5,
      energy: 12,
    },
    emotion: 'happy',
    message: '喝了果汁，真清爽！',
    icon: '🧃',
    description: '100%纯果汁',
  },

  // ========== 特殊 (Special) ==========
  {
    id: 'birthday_cake',
    name: '生日蛋糕',
    category: 'special',
    rarity: 'epic',
    effects: {
      satiety: 50,
      mood: 30,
      boredom: -20,
      energy: 10,
    },
    emotion: 'excited',
    message: '吃了生日蛋糕，太幸福了！',
    icon: '🎂',
    description: '甜蜜的庆祝时刻',
    cooldown: 86400, // 24小时冷却
  },
  {
    id: 'ice_cream',
    name: '冰淇淋',
    category: 'special',
    rarity: 'rare',
    effects: {
      satiety: 18,
      mood: 15,
      boredom: -12,
    },
    emotion: 'excited',
    message: '吃了冰淇淋，冰冰凉凉！',
    icon: '🍦',
    description: '香草口味冰淇淋',
    cooldown: 3600, // 1小时冷却
  },
];

/**
 * Get foods by category - 按分类获取食物
 */
export function getFoodsByCategory(category: FoodCategory): FoodItem[] {
  return FOOD_ITEMS.filter((food) => food.category === category);
}

/**
 * Get food by ID - 根据ID获取食物
 */
export function getFoodById(id: string): FoodItem | undefined {
  return FOOD_ITEMS.find((food) => food.id === id);
}

/**
 * Get all staple foods - 获取所有主食
 */
export function getStapleFoods(): FoodItem[] {
  return getFoodsByCategory('staple');
}

/**
 * Get all snacks - 获取所有零食
 */
export function getSnacks(): FoodItem[] {
  return getFoodsByCategory('snack');
}

/**
 * Get all drinks - 获取所有饮料
 */
export function getDrinks(): FoodItem[] {
  return getFoodsByCategory('drink');
}

/**
 * Get all special foods - 获取所有特殊食物
 */
export function getSpecialFoods(): FoodItem[] {
  return getFoodsByCategory('special');
}

/**
 * Get foods by rarity - 按稀有度获取食物
 */
export function getFoodsByRarity(rarity: 'common' | 'rare' | 'epic'): FoodItem[] {
  return FOOD_ITEMS.filter((food) => food.rarity === rarity);
}
