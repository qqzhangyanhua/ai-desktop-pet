/**
 * Food Menu Component
 * 食物菜单组件
 *
 * 显示食物选择界面，按分类展示，支持冷却倒计时
 */

import React, { useState, useEffect } from 'react';
import type { FoodItem, FoodCategory } from '@/types/food';
import { FOOD_ITEMS, getFoodsByCategory } from '@/config/foods';
import { FOOD_CATEGORY_NAMES } from '@/types/food';
import { useCareStore } from '@/stores';
import './FoodMenu.css';

interface FoodMenuProps {
  onSelectFood: (foodId: string) => void;
  onClose: () => void;
}

/**
 * Format cooldown time to readable string
 * 格式化冷却时间为可读字符串
 */
function formatCooldown(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}秒`;
  } else if (seconds < 3600) {
    const minutes = Math.ceil(seconds / 60);
    return `${minutes}分钟`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.ceil((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}小时${minutes}分钟` : `${hours}小时`;
  }
}

export const FoodMenu: React.FC<FoodMenuProps> = ({ onSelectFood, onClose }) => {
  const getCooldownRemaining = useCareStore((s) => s.getCooldownRemaining);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [eatingFoodId, setEatingFoodId] = useState<string | null>(null);

  const categories: FoodCategory[] = ['staple', 'snack', 'drink', 'special'];

  // Update cooldowns every second
  useEffect(() => {
    const updateCooldowns = () => {
      const newCooldowns: Record<string, number> = {};
      FOOD_ITEMS.forEach((food) => {
        const remaining = getCooldownRemaining(food.id);
        if (remaining > 0) {
          newCooldowns[food.id] = remaining;
        }
      });
      setCooldowns(newCooldowns);
    };

    updateCooldowns();
    const timer = setInterval(updateCooldowns, 1000);

    return () => clearInterval(timer);
  }, [getCooldownRemaining]);

  const handleFoodClick = (food: FoodItem) => {
    const cooldownRemaining = cooldowns[food.id] || 0;
    if (cooldownRemaining > 0 || eatingFoodId) {
      return; // Disabled or animation in progress
    }

    // Trigger eating animation
    setEatingFoodId(food.id);

    // Wait for animation to complete before calling onSelectFood
    setTimeout(() => {
      onSelectFood(food.id);

      // Wait for bubble/toast messages to be visible before closing
      setTimeout(() => {
        setEatingFoodId(null);
        onClose(); // This will close both FoodMenu and ContextMenu
      }, 600); // Wait for bubble/toast to be visible: 600ms
    }, 400); // Match animation peak (600ms total animation)
  };

  return (
    <div className="food-menu">
      <div className="food-menu-header">
        <h2>选择食物</h2>
        <button type="button" className="food-menu-close" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="food-menu-content">
        {categories.map((category) => {
          const foods = getFoodsByCategory(category);
          if (foods.length === 0) return null;

          return (
            <div key={category} className="food-category">
              <h3 className="food-category-title">{FOOD_CATEGORY_NAMES[category]}</h3>
              <div className="food-grid">
                {foods.map((food) => {
                  const cooldownRemaining = cooldowns[food.id] || 0;
                  const isOnCooldown = cooldownRemaining > 0;
                  const isEating = eatingFoodId === food.id;

                  return (
                    <button
                      key={food.id}
                      type="button"
                      className={`food-item rarity-${food.rarity} ${isOnCooldown ? 'disabled' : ''} ${isEating ? 'eating' : ''}`}
                      disabled={isOnCooldown || isEating}
                      onClick={() => handleFoodClick(food)}
                      title={food.description}
                    >
                      <div className="food-icon">{food.icon || '🍎'}</div>
                      <div className="food-name">{food.name}</div>
                      {isOnCooldown && (
                        <div className="food-cooldown">
                          {formatCooldown(cooldownRemaining)}
                        </div>
                      )}
                      {!isOnCooldown && (
                        <div className="food-effects">
                          {food.effects.satiety > 0 && <span>🍽️ +{food.effects.satiety}</span>}
                          {food.effects.mood > 0 && <span>😊 +{food.effects.mood}</span>}
                          {food.effects.energy && food.effects.energy > 0 && (
                            <span>⚡ +{food.effects.energy}</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FoodMenu;
