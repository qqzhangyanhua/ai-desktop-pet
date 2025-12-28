/**
 * 快捷键管理服务
 * Keyboard Shortcut Management Service
 *
 * 使用 Tauri global-shortcut 插件注册全局快捷键
 * 处理跨平台键位映射（Mac: Cmd, Win/Linux: Ctrl）
 */

import { register, unregister, isRegistered } from '@tauri-apps/plugin-global-shortcut';
import type { ShortcutAction, ShortcutConfig, ShortcutConflict } from '@/types';

/**
 * 系统保留键列表（不允许注册）
 */
const SYSTEM_RESERVED_KEYS = [
  'Cmd+Q', // 退出应用
  'Cmd+W', // 关闭窗口
  'Ctrl+Q', // Windows 退出
  'Ctrl+W', // Windows 关闭窗口
  'Cmd+.', // 强制退出
  'Ctrl+Alt+Delete', // 任务管理器
];

/**
 * 快捷键字符串解析
 * 将 "Cmd+Shift+C" 解析为 { modifiers: ['cmd', 'shift'], key: 'c' }
 */
function parseShortcutString(shortcut: string): ShortcutConfig {
  const parts = shortcut.split('+').map((p) => p.trim().toLowerCase());
  const modifiers: string[] = [];
  let key = '';

  for (const part of parts) {
    if (['cmd', 'ctrl', 'shift', 'alt', 'meta'].includes(part)) {
      modifiers.push(part);
    } else {
      key = part;
    }
  }

  return {
    modifiers: modifiers as ShortcutConfig['modifiers'],
    key: key.toUpperCase(),
  };
}

/**
 * 将结构化配置转换为快捷键字符串
 * Tauri 需要的格式: "Cmd+Shift+C" 或 "Ctrl+Shift+C"
 */
function shortcutToString(config: ShortcutConfig): string {
  const modifiers = config.modifiers.map((m) => {
    // 跨平台适配：Mac 使用 Cmd，其他使用 Ctrl
    if (m === 'cmd' || m === 'meta') {
      return 'Cmd'; // Tauri 会自动处理平台差异
    }
    return m.charAt(0).toUpperCase() + m.slice(1);
  });

  return [...modifiers, config.key].join('+');
}

/**
 * 标准化快捷键字符串（跨平台）
 * 将用户的输入转换为当前平台合适的格式
 */
function normalizeShortcut(shortcut: string): string {
  const config = parseShortcutString(shortcut);

  // 标准化修饰键
  const normalizedModifiers = config.modifiers.map((m) => {
    if (m === 'meta') return 'cmd';
    return m;
  });

  return shortcutToString({ modifiers: normalizedModifiers, key: config.key });
}

/**
 * 检测快捷键冲突
 */
function checkConflict(shortcut: string): ShortcutConflict {
  const normalized = normalizeShortcut(shortcut);

  // 检查系统保留键
  for (const reserved of SYSTEM_RESERVED_KEYS) {
    if (normalized.toLowerCase() === reserved.toLowerCase()) {
      return {
        hasConflict: true,
        reason: `系统保留键: ${reserved}`,
      };
    }
  }

  return { hasConflict: false };
}

/**
 * ShortcutManager 单例类
 */
class ShortcutManager {
  private static instance: ShortcutManager;
  private registeredShortcuts: Map<ShortcutAction, string> = new Map();

  private constructor() {}

  static getInstance(): ShortcutManager {
    if (!ShortcutManager.instance) {
      ShortcutManager.instance = new ShortcutManager();
    }
    return ShortcutManager.instance;
  }

  /**
   * 注册所有快捷键
   * @param shortcuts 快捷键配置 { openChat: "Cmd+Shift+C", openSettings: "Cmd+Shift+S" }
   */
  async registerShortcuts(shortcuts: Record<ShortcutAction, string>): Promise<void> {
    console.log('[ShortcutManager] Registering shortcuts:', shortcuts);

    for (const [action, shortcut] of Object.entries(shortcuts)) {
      await this.registerShortcut(action as ShortcutAction, shortcut);
    }
  }

  /**
   * 注册单个快捷键
   */
  async registerShortcut(action: ShortcutAction, shortcut: string): Promise<void> {
    try {
      // 检查冲突
      const conflict = checkConflict(shortcut);
      if (conflict.hasConflict) {
        console.warn(`[ShortcutManager] Conflict detected: ${conflict.reason}`);
        return;
      }

      // 标准化快捷键
      const normalized = normalizeShortcut(shortcut);

      // 如果之前已注册，先注销
      if (this.registeredShortcuts.has(action)) {
        await this.unregisterShortcut(action);
      }

      // 注册快捷键
      await register(normalized, async () => {
        await this.handleShortcutTrigger(action);
      });

      this.registeredShortcuts.set(action, normalized);
      console.log(`[ShortcutManager] Registered: ${action} -> ${normalized}`);
    } catch (error) {
      console.error(`[ShortcutManager] Failed to register ${action}:`, error);
    }
  }

  /**
   * 注销快捷键
   */
  async unregisterShortcut(action: ShortcutAction): Promise<void> {
    const shortcut = this.registeredShortcuts.get(action);
    if (!shortcut) return;

    try {
      await unregister(shortcut);
      this.registeredShortcuts.delete(action);
      console.log(`[ShortcutManager] Unregistered: ${action}`);
    } catch (error) {
      console.error(`[ShortcutManager] Failed to unregister ${action}:`, error);
    }
  }

  /**
   * 注销所有快捷键
   */
  async unregisterAll(): Promise<void> {
    const actions = Array.from(this.registeredShortcuts.keys());
    for (const action of actions) {
      await this.unregisterShortcut(action);
    }
  }

  /**
   * 检查快捷键是否已注册
   */
  async isRegistered(action: ShortcutAction): Promise<boolean> {
    const shortcut = this.registeredShortcuts.get(action);
    if (!shortcut) return false;

    try {
      return await isRegistered(shortcut);
    } catch {
      return false;
    }
  }

  /**
   * 快捷键触发处理
   */
  async handleShortcutTrigger(action: ShortcutAction): Promise<void> {
    console.log(`[ShortcutManager] Triggered: ${action}`);

    try {
      switch (action) {
        case 'openChat':
          await this.openChatWindow();
          break;
        case 'openSettings':
          await this.openSettingsWindow();
          break;
      }
    } catch (error) {
      console.error(`[ShortcutManager] Failed to handle ${action}:`, error);
    }
  }

  /**
   * 打开聊天窗口
   */
  private async openChatWindow(): Promise<void> {
    // TODO: 实现打开聊天窗口的逻辑
    console.log('[ShortcutManager] Opening chat window...');
    // 需要使用 Tauri 的窗口 API 来显示或聚焦聊天窗口
  }

  /**
   * 打开设置窗口
   */
  private async openSettingsWindow(): Promise<void> {
    // TODO: 实现打开设置窗口的逻辑
    console.log('[ShortcutManager] Opening settings window...');
    // 需要使用 Tauri 的窗口 API 来显示或聚焦设置窗口
  }

  /**
   * 检测快捷键冲突（公开方法）
   */
  detectConflict(shortcut: string): ShortcutConflict {
    return checkConflict(shortcut);
  }

  /**
   * 获取已注册的快捷键列表
   */
  getRegisteredShortcuts(): Map<ShortcutAction, string> {
    return new Map(this.registeredShortcuts);
  }
}

/**
 * 获取 ShortcutManager 单例
 */
export function getShortcutManager(): ShortcutManager {
  return ShortcutManager.getInstance();
}

/**
 * 便捷函数：注册快捷键
 */
export async function registerShortcuts(
  shortcuts: Record<ShortcutAction, string>
): Promise<void> {
  return getShortcutManager().registerShortcuts(shortcuts);
}

/**
 * 便捷函数：检测冲突
 */
export function detectShortcutConflict(shortcut: string): ShortcutConflict {
  return getShortcutManager().detectConflict(shortcut);
}

/**
 * 便捷函数：标准化快捷键
 */
export function normalizeShortcutString(shortcut: string): string {
  return normalizeShortcut(shortcut);
}
