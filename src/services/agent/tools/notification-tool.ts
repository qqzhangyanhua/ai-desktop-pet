/**
 * 通知工具
 * Notification Tool
 *
 * 提供多通道通知能力：
 * - 系统通知
 * - Toast 提示
 * - 宠物气泡
 * - 语音播报
 */

import type { AgentToolResult, NotificationPayload } from '@/types/agent-system';

/**
 * 通知类型
 */
export type NotificationType = 'system' | 'toast' | 'bubble' | 'voice';

/**
 * 通知配置
 */
export interface NotificationConfig extends NotificationPayload {
  type: NotificationType;
  priority?: 'low' | 'normal' | 'high';
}

/**
 * 通知历史记录
 */
interface NotificationRecord {
  id: string;
  config: NotificationConfig;
  sentAt: number;
  success: boolean;
}

/**
 * 通知历史存储
 */
const notificationHistory: NotificationRecord[] = [];

/**
 * 生成通知 ID
 */
function generateNotificationId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 发送系统通知
 */
async function sendSystemNotification(
  payload: NotificationPayload
): Promise<boolean> {
  try {
    // 检查通知权限
    if (!('Notification' in window)) {
      console.warn('[NotificationTool] 浏览器不支持通知');
      return false;
    }

    if (Notification.permission === 'denied') {
      console.warn('[NotificationTool] 通知权限被拒绝');
      return false;
    }

    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return false;
      }
    }

    // 发送通知
    new Notification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      silent: !payload.sound,
    });

    return true;
  } catch (error) {
    console.error('[NotificationTool] 系统通知发送失败', error);
    return false;
  }
}

/**
 * 发送 Toast 通知
 * 注意：需要配合 toastStore 使用
 */
async function sendToastNotification(
  payload: NotificationPayload
): Promise<boolean> {
  try {
    // 触发自定义事件，由 Toast 组件监听
    const event = new CustomEvent('agent-toast', {
      detail: {
        title: payload.title,
        description: payload.body,
        duration: payload.duration || 5000,
      },
    });
    window.dispatchEvent(event);

    return true;
  } catch (error) {
    console.error('[NotificationTool] Toast通知发送失败', error);
    return false;
  }
}

/**
 * 发送宠物气泡通知
 */
async function sendBubbleNotification(
  payload: NotificationPayload
): Promise<boolean> {
  try {
    // 触发自定义事件，由 PetContainer 监听
    const event = new CustomEvent('agent-bubble', {
      detail: {
        message: payload.body,
        duration: payload.duration || 5000,
      },
    });
    window.dispatchEvent(event);

    return true;
  } catch (error) {
    console.error('[NotificationTool] 气泡通知发送失败', error);
    return false;
  }
}

/**
 * 发送语音播报
 */
async function sendVoiceNotification(
  payload: NotificationPayload
): Promise<boolean> {
  try {
    // 触发自定义事件，由 Voice 服务监听
    const event = new CustomEvent('agent-speak', {
      detail: {
        text: payload.body,
      },
    });
    window.dispatchEvent(event);

    return true;
  } catch (error) {
    console.error('[NotificationTool] 语音播报失败', error);
    return false;
  }
}

/**
 * 发送通知
 */
export async function sendNotification(
  config: NotificationConfig
): Promise<AgentToolResult<{ id: string; sent: boolean }>> {
  const id = generateNotificationId();

  try {
    let success = false;

    switch (config.type) {
      case 'system':
        success = await sendSystemNotification(config);
        break;
      case 'toast':
        success = await sendToastNotification(config);
        break;
      case 'bubble':
        success = await sendBubbleNotification(config);
        break;
      case 'voice':
        success = await sendVoiceNotification(config);
        break;
    }

    // 记录历史
    notificationHistory.push({
      id,
      config,
      sentAt: Date.now(),
      success,
    });

    // 限制历史大小
    if (notificationHistory.length > 100) {
      notificationHistory.shift();
    }

    return {
      success: true,
      data: { id, sent: success },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 发送多通道通知
 */
export async function sendMultiChannelNotification(
  payload: NotificationPayload,
  channels: NotificationType[]
): Promise<AgentToolResult<{ results: Record<NotificationType, boolean> }>> {
  try {
    const results: Record<NotificationType, boolean> = {
      system: false,
      toast: false,
      bubble: false,
      voice: false,
    };

    await Promise.all(
      channels.map(async (channel) => {
        const result = await sendNotification({
          ...payload,
          type: channel,
        });
        results[channel] = result.success && result.data?.sent === true;
      })
    );

    return {
      success: true,
      data: { results },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 获取通知历史
 */
export async function getNotificationHistory(
  limit: number = 20
): Promise<AgentToolResult<NotificationRecord[]>> {
  try {
    const history = notificationHistory.slice(-limit).reverse();

    return {
      success: true,
      data: history,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 请求通知权限
 */
export async function requestNotificationPermission(): Promise<
  AgentToolResult<{ permission: NotificationPermission }>
> {
  try {
    if (!('Notification' in window)) {
      return {
        success: false,
        error: '浏览器不支持通知',
      };
    }

    const permission = await Notification.requestPermission();

    return {
      success: true,
      data: { permission },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 通知工具导出
 */
export const notificationTool = {
  send: sendNotification,
  sendMultiChannel: sendMultiChannelNotification,
  getHistory: getNotificationHistory,
  requestPermission: requestNotificationPermission,
};
