/**
 * Care Engine Internal Types
 * 关怀引擎内部类型定义
 *
 * P1-1: Extracted from care-engine.ts (705 lines)
 */

import type { CareOpportunity } from '../types';

/**
 * 关怀历史记录
 */
export interface CareHistory {
  timestamp: number;
  _opportunityId: string;
  type: CareOpportunity['type'];
  response: 'accepted' | 'dismissed' | 'ignored';
  userFeedback?: number; // 1-5评分
}

/**
 * 消息模板
 */
export interface MessageTemplate {
  title: string;
  message: string;
  action?: string;
  tone: 'gentle' | 'urgent' | 'celebratory' | 'supportive';
  contextRelevance?: number; // 0-1, for template selection
}

/**
 * 生成的关怀消息
 */
export interface GeneratedCareMessage {
  title: string;
  message: string;
  action?: string;
  tone: 'gentle' | 'urgent' | 'celebratory' | 'supportive';
}
