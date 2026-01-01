/**
 * Proactive Care System Utilities
 * 主动关怀系统工具函数
 * 
 * 遵循项目规范：工具函数统一管理，便于复用
 */

import { v4 as uuidv4 } from 'uuid';
import type { CareOpportunity, CareType, ProactiveCareConfig } from './types';

/**
 * 创建关怀机会
 */
export function createCareOpportunity(
  type: CareType,
  trigger: {
    condition: string;
    actualValue: number;
    threshold: number;
    confidence: number;
  },
  care: {
    title: string;
    message: string;
    actionType: 'notification' | 'suggestion' | 'intervention';
    tone: 'gentle' | 'urgent' | 'supportive' | 'celebratory';
    duration?: number;
  },
  options: {
    priority?: number;
    urgency?: 'low' | 'medium' | 'high' | 'critical';
    expiresIn?: number; // 过期时间（毫秒）
  } = {}
): CareOpportunity {
  const now = Date.now();
  
  return {
    id: uuidv4(),
    type,
    priority: options.priority ?? 5,
    urgency: options.urgency ?? 'medium',
    trigger,
    care: {
      ...care,
      duration: care.duration ?? 5000, // 默认5秒
    },
    personalization: {
      userPreference: 0.5, // 默认中性偏好
      historicalEffectiveness: 0.5, // 默认中性效果
      adaptedContent: false,
    },
    metadata: {
      detectedAt: now,
      expiresAt: now + (options.expiresIn ?? 300000), // 默认5分钟过期
      relatedData: {},
    },
  };
}

/**
 * 验证关怀配置
 */
export function validateCareConfig(config: ProactiveCareConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // 验证基础配置
  if (config.minIntervalMinutes < 1) {
    errors.push('最小间隔时间不能少于1分钟');
  }
  
  if (config.maxNotificationsPerHour < 1 || config.maxNotificationsPerHour > 10) {
    errors.push('每小时最大通知数应在1-10之间');
  }
  
  // 验证安静时间
  if (config.quietHours.enabled) {
    const { start, end } = config.quietHours;
    if (start < 0 || start > 23 || end < 0 || end > 23) {
      errors.push('安静时间设置无效，应在0-23之间');
    }
  }
  
  // 验证关怀类型配置
  Object.entries(config.careTypes).forEach(([type, typeConfig]) => {
    if (typeConfig.threshold < 0 || typeConfig.threshold > 1) {
      errors.push(`关怀类型 ${type} 的阈值应在0-1之间`);
    }
    
    if (typeConfig.priority < 1 || typeConfig.priority > 10) {
      errors.push(`关怀类型 ${type} 的优先级应在1-10之间`);
    }
  });
  
  // 验证个性化设置
  if (config.personalization.learningRate < 0 || config.personalization.learningRate > 1) {
    errors.push('学习率应在0-1之间');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 计算时间段
 */
export function getTimeOfDay(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

/**
 * 判断是否为工作时间
 */
export function isWorkingHours(hour: number, dayOfWeek: number): boolean {
  // 周末不算工作时间
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;
  
  // 工作日9-18点算工作时间
  return hour >= 9 && hour < 18;
}

/**
 * 计算关怀优先级
 */
export function calculateCarePriority(
  baseScore: number,
  urgency: 'low' | 'medium' | 'high' | 'critical',
  userPreference: number,
  historicalEffectiveness: number
): number {
  let priority = baseScore;
  
  // 紧急程度调整
  switch (urgency) {
    case 'critical':
      priority += 3;
      break;
    case 'high':
      priority += 2;
      break;
    case 'medium':
      priority += 1;
      break;
    case 'low':
      priority += 0;
      break;
  }
  
  // 用户偏好调整
  priority += (userPreference - 0.5) * 2;
  
  // 历史效果调整
  priority += (historicalEffectiveness - 0.5) * 1.5;
  
  // 确保在1-10范围内
  return Math.max(1, Math.min(10, Math.round(priority)));
}

/**
 * 检查是否在安静时间
 */
export function isQuietHours(
  quietHours: { enabled: boolean; start: number; end: number },
  currentHour: number = new Date().getHours()
): boolean {
  if (!quietHours.enabled) return false;
  
  const { start, end } = quietHours;
  
  // 处理跨天的情况（如22:00-07:00）
  if (start > end) {
    return currentHour >= start || currentHour < end;
  }
  
  // 正常情况（如22:00-23:00）
  return currentHour >= start && currentHour < end;
}

/**
 * 格式化关怀消息
 */
export function formatCareMessage(
  template: string,
  variables: Record<string, string | number>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key]?.toString() ?? match;
  });
}

/**
 * 计算效果评分
 */
export function calculateEffectivenessScore(
  response: 'accepted' | 'dismissed' | 'ignored' | 'timeout',
  rating?: number,
  responseTime?: number
): number {
  let score = 0;
  
  // 基础响应评分
  switch (response) {
    case 'accepted':
      score = 0.8;
      break;
    case 'dismissed':
      score = 0.3;
      break;
    case 'ignored':
      score = 0.1;
      break;
    case 'timeout':
      score = 0.05;
      break;
  }
  
  // 评分调整
  if (rating && response === 'accepted') {
    score = score * 0.5 + (rating / 5) * 0.5;
  }
  
  // 响应时间调整（快速响应加分）
  if (responseTime && responseTime < 5000) {
    score += 0.1;
  }
  
  return Math.max(0, Math.min(1, score));
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let lastTime = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastTime >= wait) {
      lastTime = now;
      func(...args);
    }
  };
}