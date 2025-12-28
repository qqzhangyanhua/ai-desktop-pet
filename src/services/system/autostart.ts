/**
 * 系统服务 - 自启动管理
 * System Services - Autostart Management
 *
 * 使用 Tauri autostart 插件管理开机自启动
 */

import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';
import type { AutostartStatus } from '@/types';

/**
 * AutostartManager 单例类
 */
class AutostartManager {
  private static instance: AutostartManager;

  private constructor() {}

  static getInstance(): AutostartManager {
    if (!AutostartManager.instance) {
      AutostartManager.instance = new AutostartManager();
    }
    return AutostartManager.instance;
  }

  /**
   * 设置自启动状态
   * @param enabled 是否启用自启动
   */
  async setAutostart(enabled: boolean): Promise<void> {
    try {
      if (enabled) {
        await enable();
        console.log('[AutostartManager] Autostart enabled');
      } else {
        await disable();
        console.log('[AutostartManager] Autostart disabled');
      }
    } catch (error) {
      console.error('[AutostartManager] Failed to set autostart:', error);
      throw error;
    }
  }

  /**
   * 获取自启动状态
   */
  async getStatus(): Promise<AutostartStatus> {
    try {
      const enabled = await isEnabled();
      return {
        enabled,
        platform: {
          supported: true,
        },
      };
    } catch (error) {
      console.error('[AutostartManager] Failed to get status:', error);
      return {
        enabled: false,
        platform: {
          supported: false,
        },
      };
    }
  }

  /**
   * 检查是否已启用自启动
   */
  async isEnabled(): Promise<boolean> {
    try {
      return await isEnabled();
    } catch {
      return false;
    }
  }
}

/**
 * 获取 AutostartManager 单例
 */
export function getAutostartManager(): AutostartManager {
  return AutostartManager.getInstance();
}

/**
 * 便捷函数：设置自启动
 */
export async function setAutostart(enabled: boolean): Promise<void> {
  return getAutostartManager().setAutostart(enabled);
}

/**
 * 便捷函数：检查是否启用
 */
export async function isAutostartEnabled(): Promise<boolean> {
  return getAutostartManager().isEnabled();
}
