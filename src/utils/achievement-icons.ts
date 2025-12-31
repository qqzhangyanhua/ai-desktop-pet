/**
 * Icon Mapping Utility
 * 图标映射工具 - 统一管理成就图标
 */

import {
  Hand,
  HandHeart,
  Medal,
  Utensils,
  Gamepad2,
  MessageSquare,
  Star,
  Trophy,
  Sprout,
  Leaf,
  TreeDeciduous,
  TreePine,
  Calendar,
  Heart,
  Snowflake,
  Users,
  HeartHandshake,
  Sparkles,
  MessagesSquare,
  Target,
  type LucideIcon,
} from 'lucide-react';

/**
 * 成就图标映射表
 * 将 icon 名称映射到实际的 Lucide icon 组件
 */
export const ACHIEVEMENT_ICON_MAP: Record<string, LucideIcon> = {
  Hand,
  HandHeart,
  Medal,
  Utensils,
  Gamepad2,
  MessageSquare,
  Star,
  Trophy,
  Sprout,
  Leaf,
  TreeDeciduous,
  TreePine,
  Calendar,
  Heart,
  Snowflake,
  Users,
  HeartHandshake,
  Sparkles,
  MessagesSquare,
  Target,
};

/**
 * 获取成就图标组件
 * @param iconName - Icon 名称
 * @returns Lucide Icon 组件或 null
 */
export function getAchievementIcon(iconName: string): LucideIcon | null {
  return ACHIEVEMENT_ICON_MAP[iconName] || null;
}
