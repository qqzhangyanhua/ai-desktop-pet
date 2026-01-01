import type { ReactNode } from 'react';
import type { AssistantSkill } from './assistant';
import type { PetActionType } from './pet';

export type MenuSelectHandler = () => void | Promise<void>;

/**
 * Menu section types - 菜单分组
 */
export type MenuSection = 'quick' | 'pet_fun' | 'pet_care' | 'assistant' | 'system';

/**
 * Menu item definition - 单个菜单项定义
 */
export interface MenuItem {
  id: string;
  section: MenuSection;
  label: string;
  keywords: string[];
  icon: ReactNode;
  danger?: boolean;
  onSelect: MenuSelectHandler;
}

/**
 * Pet action handler - 宠物动作处理器
 */
export type PetActionHandler = (action: PetActionType) => void | Promise<void>;

/**
 * Assistant skill handler - 助手技能处理器
 */
export type AssistantSkillHandler = (skill: AssistantSkill) => void | Promise<void>;

/**
 * System handlers - 系统操作处理器集合
 */
export interface SystemHandlers {
  openChat: MenuSelectHandler;
  openSettings: MenuSelectHandler;
  toggleStatusPanel: MenuSelectHandler;
  hide: MenuSelectHandler;
  quit: MenuSelectHandler;
}

/**
 * Relaxation handlers - 放松功能处理器（可选）
 */
export interface RelaxationHandlers {
  openPanel?: MenuSelectHandler; // New unified entry
  breathing?: MenuSelectHandler; // Legacy
  story?: MenuSelectHandler; // Legacy
  meditation?: MenuSelectHandler; // Legacy
}

/**
 * All menu handlers - 所有菜单处理器的集合
 */
export interface MenuHandlers {
  pet: PetActionHandler;
  assistant: AssistantSkillHandler;
  system: SystemHandlers;
  relaxation?: RelaxationHandlers;
}

/**
 * Menu state - 菜单状态
 */
export interface MenuState {
  statusPanelVisible: boolean;
}

/**
 * Menu configuration - 完整的菜单配置
 */
export interface MenuConfig {
  handlers: MenuHandlers;
  state: MenuState;
}
