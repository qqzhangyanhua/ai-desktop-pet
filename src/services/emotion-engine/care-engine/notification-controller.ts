/**
 * Notification Controller
 * 通知控制器
 *
 * P1-5: Extracted from care-engine.ts (705 lines)
 * Linus原则: 单一职责 - 只负责通知频率控制和打扰度管理
 */

import type { CareConfig, CareOpportunity } from '../types';
import type { CareHistory } from './types';

/**
 * 通知控制器类
 */
export class NotificationController {
  private lastNotificationTime = 0;
  private notificationCountThisHour = 0;
  private lastHourReset = 0;
  private history: CareHistory[] = [];

  constructor(private config: CareConfig) {
    this.lastHourReset = Date.now();
  }

  /**
   * 检查是否可以通知
   */
  canNotify(): boolean {
    if (!this.config.enabled) {
      return false;
    }

    // 检查静音时间
    if (this.config.disturbanceControl.enabled) {
      const now = new Date();
      const hour = now.getHours();

      if (
        hour >= this.config.disturbanceControl.quietHours.start ||
        hour < this.config.disturbanceControl.quietHours.end
      ) {
        // 静音时间，只允许紧急关怀
        return false;
      }
    }

    // 检查最小间隔
    const now = Date.now();
    if (now - this.lastNotificationTime < this.config.minIntervalMinutes * 60 * 1000) {
      return false;
    }

    // 检查每小时通知数限制
    this.resetHourlyCountIfNeeded();
    if (
      this.notificationCountThisHour >= this.config.disturbanceControl.maxNotificationsPerHour
    ) {
      return false;
    }

    return true;
  }

  /**
   * 记录通知已发送
   */
  recordNotification(_opportunityId: string, _type: CareOpportunity['type']): void {
    this.lastNotificationTime = Date.now();
    this.notificationCountThisHour++;
  }

  /**
   * 记录用户反馈
   */
  recordFeedback(
    opportunityId: string,
    response: 'accepted' | 'dismissed' | 'ignored',
    rating?: number
  ): void {
    const history: CareHistory = {
      timestamp: Date.now(),
      _opportunityId: opportunityId,
      type: this.extractTypeFromId(opportunityId),
      response,
      userFeedback: rating,
    };

    this.history.push(history);

    // 清理旧历史
    if (this.history.length > 1000) {
      this.history = this.history.slice(-500);
    }
  }

  /**
   * 获取关怀统计
   */
  getStatistics(): {
    totalOpportunities: number;
    acceptedRate: number;
    dismissedRate: number;
    averageRating: number;
    topCareTypes: Array<{ type: string; count: number }>;
  } {
    const total = this.history.length;
    const accepted = this.history.filter((h) => h.response === 'accepted').length;
    const dismissed = this.history.filter((h) => h.response === 'dismissed').length;
    const rated = this.history.filter((h) => h.userFeedback !== undefined);
    const averageRating =
      rated.length > 0 ? rated.reduce((sum, h) => sum + (h.userFeedback || 0), 0) / rated.length : 0;

    const typeCounts = new Map<string, number>();
    this.history.forEach((h) => {
      typeCounts.set(h.type, (typeCounts.get(h.type) || 0) + 1);
    });
    const topCareTypes = Array.from(typeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    return {
      totalOpportunities: total,
      acceptedRate: total > 0 ? accepted / total : 0,
      dismissedRate: total > 0 ? dismissed / total : 0,
      averageRating,
      topCareTypes,
    };
  }

  /**
   * 获取历史记录
   */
  getHistory(): CareHistory[] {
    return [...this.history];
  }

  /**
   * 重置每小时计数（如果需要）
   */
  private resetHourlyCountIfNeeded(): void {
    const now = Date.now();
    const hourMs = 60 * 60 * 1000;

    if (now - this.lastHourReset > hourMs) {
      this.notificationCountThisHour = 0;
      this.lastHourReset = now;
    }
  }

  /**
   * 从ID提取关怀类型
   */
  private extractTypeFromId(opportunityId: string): CareOpportunity['type'] {
    // 简化：从ID中提取类型
    if (opportunityId.includes('low_mood')) return 'low_mood';
    if (opportunityId.includes('high_stress')) return 'high_stress';
    if (opportunityId.includes('long_work')) return 'long_work';
    if (opportunityId.includes('low_energy')) return 'low_energy';
    if (opportunityId.includes('break_reminder')) return 'break_reminder';
    if (opportunityId.includes('health_warning')) return 'health_warning';
    if (opportunityId.includes('emotional_support')) return 'emotional_support';
    if (opportunityId.includes('achievement')) return 'achievement_celebration';
    return 'break_reminder';
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<CareConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}
