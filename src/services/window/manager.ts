/**
 * Window Manager Service
 * 窗口管理服务
 *
 * 统一管理应用内所有 Tauri WebviewWindow 的创建、聚焦、关闭
 * 消除 ContextMenu 和 ShortcutManager 中的重复代码
 *
 * Linus 原则：
 * - 数据结构优先：窗口配置和状态集中管理
 * - 消除特殊情况：统一的窗口打开模式
 * - 简单实用：复用现有逻辑，不过度设计
 */

import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

/**
 * 窗口配置类型
 */
interface WindowConfig {
  label: string;
  title: string;
  url: string;
  width: number;
  height: number;
  resizable?: boolean;
  center?: boolean;
  decorations?: boolean;
  alwaysOnTop?: boolean;
  skipTaskbar?: boolean;
}

/**
 * WindowManager 单例类
 */
class WindowManager {
  private static instance: WindowManager;

  private constructor() {}

  static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager();
    }
    return WindowManager.instance;
  }

  /**
   * 获取窗口 URL（开发模式 vs 生产模式）
   */
  private getWindowUrl(htmlFile: string): string {
    const isDev = window.location.hostname === 'localhost';
    return isDev ? `http://localhost:1420/${htmlFile}` : htmlFile;
  }

  /**
   * 通用窗口打开方法
   * 如果窗口已存在则聚焦，否则创建新窗口
   */
  private async openWindow(config: WindowConfig): Promise<void> {
    try {
      // 检查窗口是否已存在
      const existingWindow = await WebviewWindow.getByLabel(config.label);

      if (existingWindow) {
        // 窗口已存在，聚焦
        await existingWindow.setFocus();
        console.log(`[WindowManager] Focused existing window: ${config.label}`);
        return;
      }

      // 窗口不存在，创建新窗口
      new WebviewWindow(config.label, {
        url: config.url,
        title: config.title,
        width: config.width,
        height: config.height,
        resizable: config.resizable ?? true,
        center: config.center ?? true,
        decorations: config.decorations ?? true,
        alwaysOnTop: config.alwaysOnTop ?? false,
        skipTaskbar: config.skipTaskbar ?? false,
      });

      console.log(`[WindowManager] Created new window: ${config.label}`);
    } catch (error) {
      console.error(`[WindowManager] Failed to open window ${config.label}:`, error);
      throw error;
    }
  }

  /**
   * 打开聊天窗口
   */
  async openChatWindow(): Promise<void> {
    return this.openWindow({
      label: 'chat',
      title: '聊天窗口',
      url: this.getWindowUrl('chat.html'),
      width: 800,
      height: 600,
      resizable: true,
      center: true,
      decorations: true,
      alwaysOnTop: false,
      skipTaskbar: false,
    });
  }

  /**
   * 打开设置窗口
   */
  async openSettingsWindow(): Promise<void> {
    return this.openWindow({
      label: 'settings',
      title: '设置中心',
      url: this.getWindowUrl('settings.html'),
      width: 1000,
      height: 600,
      resizable: true,
      center: true,
      decorations: true,
      alwaysOnTop: false,
      skipTaskbar: false,
    });
  }

  /**
   * 关闭指定窗口
   */
  async closeWindow(label: string): Promise<void> {
    try {
      const window = await WebviewWindow.getByLabel(label);
      if (window) {
        await window.close();
        console.log(`[WindowManager] Closed window: ${label}`);
      }
    } catch (error) {
      console.error(`[WindowManager] Failed to close window ${label}:`, error);
    }
  }

  /**
   * 检查窗口是否存在
   */
  async isWindowOpen(label: string): Promise<boolean> {
    try {
      const window = await WebviewWindow.getByLabel(label);
      return window !== null;
    } catch {
      return false;
    }
  }
}

/**
 * 获取 WindowManager 单例
 */
export function getWindowManager(): WindowManager {
  return WindowManager.getInstance();
}
