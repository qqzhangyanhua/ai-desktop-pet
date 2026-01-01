import React from 'react';
import {
  GlassWater,
  Gamepad2,
  Music,
  Sparkles,
  Wand2,
  Palette,
  Moon,
  Droplet,
  Brush,
  Armchair,
  Cloud,
  Clock,
  Bell,
  Lightbulb,
  Monitor,
  Star,
  MessageSquare,
  Settings,
  BarChart3,
  EyeOff,
  X,
  Wind,
  BookOpen,
  Brain,
} from 'lucide-react';
import type { MenuSection, MenuHandlers, MenuState } from '@/types/menu';
import type { AssistantSkill } from '@/types';
import type { PetActionType } from '@/types/pet';

/**
 * Base menu item configuration - 菜单项基础配置
 */
interface BaseMenuItemConfig {
  id: string;
  section: MenuSection;
  label: string | ((state: MenuState) => string);
  keywords: string[];
  icon: React.ReactNode;
  danger?: boolean;
}

/**
 * Pet action menu item - 宠物动作菜单项
 */
interface PetMenuItemConfig extends BaseMenuItemConfig {
  type: 'pet';
  action: PetActionType;
}

/**
 * Assistant skill menu item - 助手技能菜单项
 */
interface AssistantMenuItemConfig extends BaseMenuItemConfig {
  type: 'assistant';
  skill: AssistantSkill;
}

/**
 * System action menu item - 系统操作菜单项
 */
interface SystemMenuItemConfig extends BaseMenuItemConfig {
  type: 'system';
  systemAction: keyof MenuHandlers['system'];
}

/**
 * Relaxation action menu item - 放松功能菜单项（可选）
 */
interface RelaxationMenuItemConfig extends BaseMenuItemConfig {
  type: 'relaxation';
  relaxationAction: 'openPanel' | 'breathing' | 'story' | 'meditation';
}

/**
 * Union type for all menu item configs
 */
type MenuItemConfig =
  | PetMenuItemConfig
  | AssistantMenuItemConfig
  | SystemMenuItemConfig
  | RelaxationMenuItemConfig;

/**
 * Menu configuration registry - 菜单配置注册表
 *
 * 核心设计原则：
 * 1. 配置驱动 - 所有菜单项通过配置定义，不依赖运行时逻辑
 * 2. 类型安全 - 使用 discriminated union 确保每种类型的配置正确
 * 3. 单一数据源 - 菜单结构、图标、关键词都在这里定义
 */
export const MENU_REGISTRY: MenuItemConfig[] = [
  // ========== Pet Fun ==========
  {
    id: 'pet:feed',
    type: 'pet',
    section: 'pet_fun',
    action: 'feed',
    label: '喂食/吃苹果',
    keywords: ['喂食', '吃', '苹果', 'feed'],
    icon: <GlassWater className="w-4 h-4" />,
  },
  {
    id: 'pet:play',
    type: 'pet',
    section: 'pet_fun',
    action: 'play',
    label: '玩小游戏',
    keywords: ['玩', '游戏', 'play'],
    icon: <Gamepad2 className="w-4 h-4" />,
  },
  {
    id: 'pet:dance',
    type: 'pet',
    section: 'pet_fun',
    action: 'dance',
    label: '跳舞秀',
    keywords: ['跳舞', '舞蹈', 'dance'],
    icon: <Music className="w-4 h-4" />,
  },
  {
    id: 'pet:music',
    type: 'pet',
    section: 'pet_fun',
    action: 'music',
    label: '播放音乐',
    keywords: ['音乐', '播放', 'music'],
    icon: <Music className="w-4 h-4" />,
  },
  {
    id: 'pet:magic',
    type: 'pet',
    section: 'pet_fun',
    action: 'magic',
    label: '表演魔术',
    keywords: ['魔术', 'magic'],
    icon: <Wand2 className="w-4 h-4" />,
  },
  {
    id: 'pet:art',
    type: 'pet',
    section: 'pet_fun',
    action: 'art',
    label: '生成艺术作品',
    keywords: ['艺术', '画', 'art'],
    icon: <Palette className="w-4 h-4" />,
  },
  {
    id: 'pet:transform',
    type: 'pet',
    section: 'pet_fun',
    action: 'transform',
    label: '变身',
    keywords: ['变身', '换装', 'transform'],
    icon: <Sparkles className="w-4 h-4" />,
  },

  // ========== Pet Care ==========
  {
    id: 'pet:sleep',
    type: 'pet',
    section: 'pet_care',
    action: 'sleep',
    label: '睡觉/休息',
    keywords: ['睡觉', '休息', 'sleep'],
    icon: <Moon className="w-4 h-4" />,
  },
  {
    id: 'pet:clean',
    type: 'pet',
    section: 'pet_care',
    action: 'clean',
    label: '清洁',
    keywords: ['清洁', '洗', 'clean'],
    icon: <Droplet className="w-4 h-4" />,
  },
  {
    id: 'pet:brush',
    type: 'pet',
    section: 'pet_care',
    action: 'brush',
    label: '梳毛',
    keywords: ['梳', '梳毛', 'brush'],
    icon: <Brush className="w-4 h-4" />,
  },
  {
    id: 'pet:rest',
    type: 'pet',
    section: 'pet_care',
    action: 'rest',
    label: '休息',
    keywords: ['休息', 'rest'],
    icon: <Armchair className="w-4 h-4" />,
  },

  // ========== Relaxation (New Unified Entry) ==========
  {
    id: 'relaxation:panel',
    type: 'relaxation',
    section: 'pet_care',
    relaxationAction: 'openPanel',
    label: '放松时光',
    keywords: ['放松', '冥想', '呼吸', '故事', '减压', 'relax', 'meditation', 'breathing'],
    icon: <Cloud className="w-4 h-4" />,
  },

  // ========== Relaxation (Legacy Individual Items) ==========
  // These are kept for backward compatibility but hidden by default
  {
    id: 'relaxation:breathing',
    type: 'relaxation',
    section: 'pet_care',
    relaxationAction: 'breathing',
    label: '呼吸放松',
    keywords: ['呼吸', '放松', '减压', 'breathing', 'relax'],
    icon: <Wind className="w-4 h-4" />,
  },
  {
    id: 'relaxation:story',
    type: 'relaxation',
    section: 'pet_care',
    relaxationAction: 'story',
    label: '睡前故事',
    keywords: ['故事', '睡前', '催眠', 'story', 'bedtime'],
    icon: <BookOpen className="w-4 h-4" />,
  },
  {
    id: 'relaxation:meditation',
    type: 'relaxation',
    section: 'pet_care',
    relaxationAction: 'meditation',
    label: '正念冥想',
    keywords: ['冥想', '正念', '减压', 'meditation', 'mindfulness'],
    icon: <Brain className="w-4 h-4" />,
  },

  // ========== Assistant ==========
  {
    id: 'assistant:weather',
    type: 'assistant',
    section: 'assistant',
    skill: 'weather',
    label: '查询天气',
    keywords: ['天气', 'weather', '温度', '气温'],
    icon: <Cloud className="w-4 h-4" />,
  },
  {
    id: 'assistant:time',
    type: 'assistant',
    section: 'assistant',
    skill: 'time',
    label: '播报时间',
    keywords: ['时间', '几点', 'time'],
    icon: <Clock className="w-4 h-4" />,
  },
  {
    id: 'assistant:alarm',
    type: 'assistant',
    section: 'assistant',
    skill: 'alarm',
    label: '创建15分钟提醒',
    keywords: ['提醒', '闹钟', 'alarm'],
    icon: <Bell className="w-4 h-4" />,
  },
  {
    id: 'assistant:lights',
    type: 'assistant',
    section: 'assistant',
    skill: 'lights',
    label: '控制灯光/设备（模拟）',
    keywords: ['灯', '灯光', 'lights'],
    icon: <Lightbulb className="w-4 h-4" />,
  },
  {
    id: 'assistant:pc_action',
    type: 'assistant',
    section: 'assistant',
    skill: 'pc_action',
    label: '电脑操作帮助',
    keywords: ['电脑', '打开', 'pc', 'action', '帮助'],
    icon: <Monitor className="w-4 h-4" />,
  },
  {
    id: 'assistant:habit',
    type: 'assistant',
    section: 'assistant',
    skill: 'habit',
    label: '记住偏好/给出建议',
    keywords: ['偏好', '建议', '习惯', 'habit'],
    icon: <Star className="w-4 h-4" />,
  },

  // ========== System ==========
  {
    id: 'system:chat',
    type: 'system',
    section: 'system',
    systemAction: 'openChat',
    label: '聊天',
    keywords: ['chat', '聊天', '对话'],
    icon: <MessageSquare className="w-4 h-4" />,
  },
  {
    id: 'system:settings',
    type: 'system',
    section: 'system',
    systemAction: 'openSettings',
    label: '设置中心',
    keywords: ['设置', 'settings'],
    icon: <Settings className="w-4 h-4" />,
  },
  {
    id: 'system:status_panel',
    type: 'system',
    section: 'system',
    systemAction: 'toggleStatusPanel',
    label: (state) => (state.statusPanelVisible ? '隐藏状态面板' : '显示状态面板'),
    keywords: ['状态', '面板', '统计'],
    icon: <BarChart3 className="w-4 h-4" />,
  },
  {
    id: 'system:hide',
    type: 'system',
    section: 'system',
    systemAction: 'hide',
    label: '隐藏',
    keywords: ['隐藏', 'hide'],
    icon: <EyeOff className="w-4 h-4" />,
  },
  {
    id: 'system:quit',
    type: 'system',
    section: 'system',
    systemAction: 'quit',
    label: '退出',
    keywords: ['退出', 'quit'],
    icon: <X className="w-4 h-4" />,
    danger: true,
  },
];
