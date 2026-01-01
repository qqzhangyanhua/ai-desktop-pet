/**
 * Proactive Care System - Main Entry Point
 * 主动关怀系统 - 主入口
 * 
 * 遵循项目规范：统一导出，便于模块管理
 */

// 核心服务导出
export { StatePerceptionService } from './state-perception/state-perception-service';
export { ProactiveCareEngine } from './care-engine/proactive-care-engine';
export { PersonalizationEngine } from './personalization/personalization-engine';
export { HealthMonitorService } from './health-monitor/health-monitor-service';
export { EmotionalSupportService } from './emotional-support/emotional-support-service';

// 类型定义导出
export type {
  UserState,
  WorkState,
  EmotionalState,
  HealthState,
  EnvironmentContext,
  CareOpportunity,
  CareMessage,
  CareResult,
  UserFeedback,
  ProactiveCareConfig,
  CareStatistics,
  HealthMetrics,
  CareHistoryItem,
  CareType,
} from './types';

// 工具函数导出
export { createCareOpportunity, validateCareConfig } from './utils';