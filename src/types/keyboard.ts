/**
 * 键盘快捷键类型定义
 * Keyboard Shortcut Type Definitions
 */

/**
 * 快捷键动作类型
 */
export type ShortcutAction = 'openChat' | 'openSettings';

/**
 * 修饰键类型
 */
export type ModifierKey = 'cmd' | 'ctrl' | 'shift' | 'alt' | 'meta';

/**
 * 结构化快捷键配置
 * 使用结构化配置而不是字符串，避免跨平台兼容性问题
 */
export interface ShortcutConfig {
  /** 修饰键列表 */
  modifiers: ModifierKey[];
  /** 主键 */
  key: string;
}

/**
 * 快捷键配置映射
 */
export interface ShortcutConfigMap {
  openChat: ShortcutConfig;
  openSettings: ShortcutConfig;
}

/**
 * 快捷键冲突信息
 */
export interface ShortcutConflict {
  /** 是否存在冲突 */
  hasConflict: boolean;
  /** 冲突原因 */
  reason?: string;
}

/**
 * 快捷键注册状态
 */
export interface ShortcutRegistration {
  /** 动作 */
  action: ShortcutAction;
  /** 是否已注册 */
  isRegistered: boolean;
  /** 快捷键字符串（用于显示） */
  shortcutString: string;
}
