import type { ReactNode } from 'react';
import type { PetActionType } from './pet';

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
  onSelect: () => void;
}

/**
 * Pet action handler - 宠物动作处理器
 */
export type PetActionHandler = (action: PetActionType) => void;

/**
 * Assistant skill handler - 助手技能处理器
 */
export type AssistantSkillHandler = (skill: string) => void;

/**
 * System handlers - 系统操作处理器集合
 */
export interface SystemHandlers {
  openChat: () => void;
  openSettings: () => void;
  toggleStatusPanel: () => void;
  hide: () => void;
  quit: () => void;
}

/**
 * Relaxation handlers - 放松功能处理器（可选）
 */
export interface RelaxationHandlers {
  breathing?: () => void;
  story?: () => void;
  meditation?: () => void;
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
