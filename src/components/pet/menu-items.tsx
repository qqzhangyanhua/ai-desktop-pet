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
} from 'lucide-react';
import type { PetActionType } from '../../types';

export type MenuSection = 'quick' | 'pet_fun' | 'pet_care' | 'assistant' | 'system';

export interface MenuItem {
  id: string;
  section: MenuSection;
  label: string;
  keywords: string[];
  icon: React.ReactNode;
  danger?: boolean;
  onSelect: () => void;
}

export function createMenuItems(
  handlePetAction: (action: PetActionType) => void,
  handleAssistantAction: (skill: string) => void,
  handleOpenChat: () => void,
  handleOpenSettings: () => void,
  handleToggleStatusPanel: () => void,
  handleHide: () => void,
  handleQuit: () => void,
  statusPanelVisible: boolean
): MenuItem[] {
  return [
    // Pet fun
    {
      id: 'pet:feed',
      section: 'pet_fun',
      label: '喂食/吃苹果',
      keywords: ['喂食', '吃', '苹果', 'feed'],
      icon: <GlassWater className="w-4 h-4" />,
      onSelect: () => handlePetAction('feed'),
    },
    {
      id: 'pet:play',
      section: 'pet_fun',
      label: '玩小游戏',
      keywords: ['玩', '游戏', 'play'],
      icon: <Gamepad2 className="w-4 h-4" />,
      onSelect: () => handlePetAction('play'),
    },
    {
      id: 'pet:dance',
      section: 'pet_fun',
      label: '跳舞秀',
      keywords: ['跳舞', '舞蹈', 'dance'],
      icon: <Music className="w-4 h-4" />,
      onSelect: () => handlePetAction('dance'),
    },
    {
      id: 'pet:music',
      section: 'pet_fun',
      label: '播放音乐',
      keywords: ['音乐', '播放', 'music'],
      icon: <Music className="w-4 h-4" />,
      onSelect: () => handlePetAction('music'),
    },
    {
      id: 'pet:magic',
      section: 'pet_fun',
      label: '表演魔术',
      keywords: ['魔术', 'magic'],
      icon: <Wand2 className="w-4 h-4" />,
      onSelect: () => handlePetAction('magic'),
    },
    {
      id: 'pet:art',
      section: 'pet_fun',
      label: '生成艺术作品',
      keywords: ['艺术', '画', 'art'],
      icon: <Palette className="w-4 h-4" />,
      onSelect: () => handlePetAction('art'),
    },
    {
      id: 'pet:transform',
      section: 'pet_fun',
      label: '变身',
      keywords: ['变身', '换装', 'transform'],
      icon: <Sparkles className="w-4 h-4" />,
      onSelect: () => handlePetAction('transform'),
    },

    // Pet care
    {
      id: 'pet:sleep',
      section: 'pet_care',
      label: '睡觉/休息',
      keywords: ['睡觉', '休息', 'sleep'],
      icon: <Moon className="w-4 h-4" />,
      onSelect: () => handlePetAction('sleep'),
    },
    {
      id: 'pet:clean',
      section: 'pet_care',
      label: '清洁',
      keywords: ['清洁', '洗', 'clean'],
      icon: <Droplet className="w-4 h-4" />,
      onSelect: () => handlePetAction('clean'),
    },
    {
      id: 'pet:brush',
      section: 'pet_care',
      label: '梳毛',
      keywords: ['梳', '梳毛', 'brush'],
      icon: <Brush className="w-4 h-4" />,
      onSelect: () => handlePetAction('brush'),
    },
    {
      id: 'pet:rest',
      section: 'pet_care',
      label: '放松',
      keywords: ['放松', '冥想', 'rest'],
      icon: <Armchair className="w-4 h-4" />,
      onSelect: () => handlePetAction('rest'),
    },

    // Assistant
    {
      id: 'assistant:weather',
      section: 'assistant',
      label: '查询天气提示',
      keywords: ['天气', 'weather'],
      icon: <Cloud className="w-4 h-4" />,
      onSelect: () => handleAssistantAction('weather'),
    },
    {
      id: 'assistant:time',
      section: 'assistant',
      label: '播报时间',
      keywords: ['时间', '几点', 'time'],
      icon: <Clock className="w-4 h-4" />,
      onSelect: () => handleAssistantAction('time'),
    },
    {
      id: 'assistant:alarm',
      section: 'assistant',
      label: '创建15分钟提醒',
      keywords: ['提醒', '闹钟', 'alarm'],
      icon: <Bell className="w-4 h-4" />,
      onSelect: () => handleAssistantAction('alarm'),
    },
    {
      id: 'assistant:lights',
      section: 'assistant',
      label: '控制灯光/设备（模拟）',
      keywords: ['灯', '灯光', 'lights'],
      icon: <Lightbulb className="w-4 h-4" />,
      onSelect: () => handleAssistantAction('lights'),
    },
    {
      id: 'assistant:pc_action',
      section: 'assistant',
      label: '简单电脑操作',
      keywords: ['电脑', '打开', 'pc', 'action'],
      icon: <Monitor className="w-4 h-4" />,
      onSelect: () => handleAssistantAction('pc_action'),
    },
    {
      id: 'assistant:habit',
      section: 'assistant',
      label: '记住偏好/给出建议',
      keywords: ['偏好', '建议', '习惯', 'habit'],
      icon: <Star className="w-4 h-4" />,
      onSelect: () => handleAssistantAction('habit'),
    },

    // System
    {
      id: 'system:chat',
      section: 'system',
      label: '聊天',
      keywords: ['chat', '聊天', '对话'],
      icon: <MessageSquare className="w-4 h-4" />,
      onSelect: handleOpenChat,
    },
    {
      id: 'system:settings',
      section: 'system',
      label: '设置中心',
      keywords: ['设置', 'settings'],
      icon: <Settings className="w-4 h-4" />,
      onSelect: handleOpenSettings,
    },
    {
      id: 'system:status_panel',
      section: 'system',
      label: statusPanelVisible ? '隐藏状态面板' : '显示状态面板',
      keywords: ['状态', '面板', '统计'],
      icon: <BarChart3 className="w-4 h-4" />,
      onSelect: handleToggleStatusPanel,
    },
    {
      id: 'system:hide',
      section: 'system',
      label: '隐藏',
      keywords: ['隐藏', 'hide'],
      icon: <EyeOff className="w-4 h-4" />,
      onSelect: handleHide,
    },
    {
      id: 'system:quit',
      section: 'system',
      label: '退出',
      keywords: ['退出', 'quit'],
      icon: <X className="w-4 h-4" />,
      danger: true,
      onSelect: handleQuit,
    },
  ];
}
