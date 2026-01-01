/**
 * Proactive Care System Types
 * 主动关怀系统类型定义
 * 
 * 遵循项目规范：TypeScript严格模式，公共类型统一管理
 */

import type { EmotionType } from '@/types';

/**
 * 用户工作状态
 */
export interface WorkState {
  isWorking: boolean;
  workDuration: number; // 分钟
  lastBreakTime: number; // 时间戳
  focusLevel: number; // 0-1
  stressLevel: number; // 0-1
  productivityLevel: number; // 0-1
}

/**
 * 用户情绪状态
 */
export interface EmotionalState {
  currentEmotion: EmotionType;
  emotionIntensity: number; // 0-1
  moodTrend: 'improving' | 'stable' | 'declining';
  lastEmotionChange: number; // 时间戳
}

/**
 * 健康状态指标
 */
export interface HealthState {
  eyeStrainLevel: number; // 0-1
  postureScore: number; // 0-1
  hydrationLevel: number; // 0-1
  energyLevel: number; // 0-1
  lastHealthCheck: number; // 时间戳
}

/**
 * 环境上下文
 */
export interface EnvironmentContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  isWorkingHours: boolean;
  isWeekend: boolean;
  ambientLight: 'bright' | 'normal' | 'dim';
}

/**
 * 完整用户状态
 */
export interface UserState {
  workState: WorkState;
  emotionalState: EmotionalState;
  healthState: HealthState;
  environment: EnvironmentContext;
}

/**
 * 关怀类型枚举
 */
export type CareType = 
  | 'low_mood'
  | 'high_stress'
  | 'long_work'
  | 'low_energy'
  | 'break_reminder'
  | 'health_warning'
  | 'emotional_support'
  | 'achievement_celebration'
  | 'breathing_exercise'
  | 'bedtime_story'
  | 'meditation_suggestion';

/**
 * 关怀机会
 */
export interface CareOpportunity {
  id: string;
  type: CareType;
  priority: number; // 1-10
  urgency: 'low' | 'medium' | 'high' | 'critical';
  
  // 触发条件
  trigger: {
    condition: string;
    actualValue: number;
    threshold: number;
    confidence: number; // 0-1
  };
  
  // 关怀内容
  care: {
    title: string;
    message: string;
    actionType: 'notification' | 'suggestion' | 'intervention';
    tone: 'gentle' | 'urgent' | 'supportive' | 'celebratory';
    duration: number; // 预期持续时间（秒）
  };
  
  // 个性化信息
  personalization: {
    userPreference: number; // 0-1，用户对此类关怀的偏好
    historicalEffectiveness: number; // 0-1，历史效果
    adaptedContent: boolean; // 是否已个性化
  };
  
  // 元数据
  metadata: {
    detectedAt: number;
    expiresAt: number;
    relatedData: Record<string, any>;
  };
}

/**
 * 关怀消息
 */
export interface CareMessage {
  id: string;
  opportunityId: string;
  title: string;
  content: string;
  tone: 'gentle' | 'urgent' | 'supportive' | 'celebratory';
  actionButtons?: Array<{
    label: string;
    action: string;
    style: 'primary' | 'secondary' | 'danger';
  }>;
  displayDuration: number; // 显示时长（秒）
  createdAt: number;
}

/**
 * 关怀结果
 */
export interface CareResult {
  messageId: string;
  opportunityId: string;
  response: 'accepted' | 'dismissed' | 'ignored' | 'timeout';
  rating?: number; // 1-5
  responseTime: number; // 响应时间（毫秒）
  feedback?: string;
  timestamp: number;
}

/**
 * 用户反馈
 */
export interface UserFeedback {
  careId: string;
  careType: CareType;
  response: 'accepted' | 'dismissed' | 'ignored';
  rating?: number; // 1-5
  comment?: string;
  timestamp: number;
  context: {
    userState: UserState;
    timeOfDay: string;
    dayOfWeek: number;
  };
}

/**
 * 主动关怀配置
 */
export interface ProactiveCareConfig {
  enabled: boolean;
  
  // 频率控制
  minIntervalMinutes: number;
  maxNotificationsPerHour: number;
  
  // 安静时间
  quietHours: {
    enabled: boolean;
    start: number; // 0-23
    end: number; // 0-23
  };
  
  // 关怀类型配置
  careTypes: Record<CareType, {
    enabled: boolean;
    threshold: number;
    priority: number;
  }>;
  
  // 个性化设置
  personalization: {
    enabled: boolean;
    learningRate: number; // 0-1
    adaptationSpeed: 'slow' | 'medium' | 'fast';
  };
  
  // 健康监控
  healthMonitoring: {
    eyeStrainEnabled: boolean;
    postureEnabled: boolean;
    hydrationEnabled: boolean;
    breakRemindersEnabled: boolean;
  };
}

/**
 * 关怀统计数据
 */
export interface CareStatistics {
  totalCares: number;
  acceptedCares: number;
  dismissedCares: number;
  ignoredCares: number;
  averageRating: number;
  effectivenessScore: number;
  caresByType: Record<CareType, {
    count: number;
    acceptanceRate: number;
    averageRating: number;
  }>;
  dailyStats: Array<{
    date: string;
    caresCount: number;
    acceptanceRate: number;
  }>;
}

/**
 * 健康指标
 */
export interface HealthMetrics {
  eyeStrainLevel: number;
  postureScore: number;
  hydrationReminders: number;
  breakReminders: number;
  lastUpdate: number;
}

/**
 * 关怀历史记录
 */
export interface CareHistoryItem {
  id: string;
  opportunityId: string;
  careType: CareType;
  title: string;
  message: string;
  response: 'accepted' | 'dismissed' | 'ignored' | 'timeout';
  rating?: number;
  responseTime: number;
  effectivenessScore?: number;
  createdAt: number;
  respondedAt?: number;
}