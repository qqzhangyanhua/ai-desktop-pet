/**
 * Proactive Care Engine
 * 主动关怀引擎
 * 
 * 核心关怀逻辑，负责检测关怀机会、生成个性化关怀消息、执行关怀并评估效果
 * 遵循项目规范：服务层封装，状态管理通过Zustand
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  UserState,
  CareOpportunity,
  CareMessage,
  CareResult,
  CareType,
  ProactiveCareConfig,
  CareStatistics,
} from '../types';
import {
  createCareOpportunity,
  isQuietHours,
  formatCareMessage,
  calculateEffectivenessScore,
} from '../utils';

/**
 * 关怀规则接口
 */
interface CareRule {
  type: CareType;
  condition: (state: UserState) => boolean;
  threshold: number;
  priority: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  messageTemplate: {
    title: string;
    content: string;
    tone: 'gentle' | 'urgent' | 'supportive' | 'celebratory';
  };
}

/**
 * 主动关怀引擎类
 */
export class ProactiveCareEngine {
  private config: ProactiveCareConfig;
  private careHistory: CareResult[] = [];
  private lastCareTime = 0;
  private careCount = 0;
  
  // 关怀规则定义
  private readonly careRules: CareRule[] = [
    // 高压力关怀
    {
      type: 'high_stress',
      condition: (state) => state.workState.stressLevel > 0.7,
      threshold: 0.7,
      priority: 9,
      urgency: 'high',
      messageTemplate: {
        title: '压力有点大呢',
        content: '我注意到你可能有些紧张，要不要暂停一下，深呼吸放松一下？',
        tone: 'supportive',
      },
    },
    
    // 长时间工作关怀
    {
      type: 'long_work',
      condition: (state) => state.workState.workDuration > 240, // 4小时
      threshold: 240,
      priority: 7,
      urgency: 'medium',
      messageTemplate: {
        title: '该休息一下了',
        content: '你已经连续工作{{workHours}}小时了，起来活动活动吧～',
        tone: 'gentle',
      },
    },
    
    // 休息提醒
    {
      type: 'break_reminder',
      condition: (state) => {
        const timeSinceBreak = Date.now() - state.workState.lastBreakTime;
        return timeSinceBreak > 45 * 60 * 1000; // 45分钟
      },
      threshold: 45,
      priority: 5,
      urgency: 'medium',
      messageTemplate: {
        title: '休息时间到',
        content: '已经专注工作45分钟了，让眼睛休息一下吧！',
        tone: 'gentle',
      },
    },
    
    // 用眼健康关怀
    {
      type: 'health_warning',
      condition: (state) => state.healthState.eyeStrainLevel > 0.8,
      threshold: 0.8,
      priority: 8,
      urgency: 'high',
      messageTemplate: {
        title: '保护眼睛很重要',
        content: '长时间用眼容易疲劳，建议看看远方或做做眼保健操～',
        tone: 'supportive',
      },
    },
    
    // 情绪低落支持
    {
      type: 'low_mood',
      condition: (state) => 
        state.emotionalState.currentEmotion === 'sad' && 
        state.emotionalState.emotionIntensity > 0.6,
      threshold: 0.6,
      priority: 8,
      urgency: 'medium',
      messageTemplate: {
        title: '我在这里陪着你',
        content: '感觉有些难过吗？想聊聊发生了什么吗？我会一直陪着你的。',
        tone: 'supportive',
      },
    },
    
    // 精力不足关怀
    {
      type: 'low_energy',
      condition: (state) => state.healthState.energyLevel < 0.3,
      threshold: 0.3,
      priority: 6,
      urgency: 'medium',
      messageTemplate: {
        title: '感觉有点累了',
        content: '精力有些不足呢，要不要小憩一会儿或者喝杯水？',
        tone: 'gentle',
      },
    },
    
    // 呼吸练习建议
    {
      type: 'breathing_exercise',
      condition: (state) => state.workState.stressLevel > 0.6,
      threshold: 0.6,
      priority: 6,
      urgency: 'low',
      messageTemplate: {
        title: '一起做个深呼吸',
        content: '感觉有些紧张？来做几个深呼吸，让身心都放松下来吧～',
        tone: 'gentle',
      },
    },
    
    // 成就庆祝
    {
      type: 'achievement_celebration',
      condition: (state) => 
        state.workState.productivityLevel > 0.8 && 
        state.workState.focusLevel > 0.7,
      threshold: 0.8,
      priority: 4,
      urgency: 'low',
      messageTemplate: {
        title: '你真棒！',
        content: '今天的工作效率很高呢！为自己的努力鼓掌吧👏',
        tone: 'celebratory',
      },
    },
  ];
  
  constructor(config: ProactiveCareConfig) {
    this.config = config;
  }
  
  /**
   * 主循环：检测并生成关怀机会
   */
  async detectCareOpportunities(userState: UserState): Promise<CareOpportunity[]> {
    try {
      // 检查是否启用
      if (!this.config.enabled) {
        return [];
      }
      
      // 检查频率限制
      if (!this.canSendCare()) {
        return [];
      }
      
      // 检查安静时间
      if (isQuietHours(this.config.quietHours)) {
        return [];
      }
      
      const opportunities: CareOpportunity[] = [];
      
      // 遍历关怀规则
      for (const rule of this.careRules) {
        // 检查规则是否启用
        const ruleConfig = this.config.careTypes[rule.type];
        if (!ruleConfig?.enabled) {
          continue;
        }
        
        // 检查触发条件
        if (rule.condition(userState)) {
          const opportunity = this.createCareOpportunityFromRule(rule, userState);
          opportunities.push(opportunity);
        }
      }
      
      // 排序和筛选
      return this.prioritizeOpportunities(opportunities);
    } catch (error) {
      console.error('[ProactiveCareEngine] Error detecting care opportunities:', error);
      return [];
    }
  }
  
  /**
   * 生成关怀消息
   */
  async generateCareMessage(opportunity: CareOpportunity): Promise<CareMessage> {
    try {
      // 获取消息模板
      const template = this.getMessageTemplate(opportunity.type);
      
      // 准备变量替换
      const variables = this.prepareMessageVariables(opportunity);
      
      // 格式化消息内容
      const content = formatCareMessage(template.content, variables);
      
      const message: CareMessage = {
        id: uuidv4(),
        opportunityId: opportunity.id,
        title: template.title,
        content,
        tone: template.tone,
        actionButtons: this.generateActionButtons(opportunity.type),
        displayDuration: opportunity.care.duration,
        createdAt: Date.now(),
      };
      
      return message;
    } catch (error) {
      console.error('[ProactiveCareEngine] Error generating care message:', error);
      return this.getDefaultCareMessage(opportunity);
    }
  }
  
  /**
   * 执行关怀
   */
  async executeCare(opportunity: CareOpportunity): Promise<CareResult> {
    try {
      // 生成关怀消息
      const message = await this.generateCareMessage(opportunity);
      
      // 显示关怀消息（这里需要与UI层集成）
      const result = await this.displayCareMessage(message);
      
      // 记录关怀历史
      this.recordCareExecution(opportunity, result);
      
      // 更新统计
      this.updateCareStatistics(result);
      
      return result;
    } catch (error) {
      console.error('[ProactiveCareEngine] Error executing care:', error);
      return this.getDefaultCareResult(opportunity);
    }
  }
  
  /**
   * 记录用户反馈
   */
  recordFeedback(
    careId: string,
    response: 'accepted' | 'dismissed' | 'ignored',
    rating?: number,
    comment?: string
  ): void {
    try {
      // 查找对应的关怀记录
      const careResult = this.careHistory.find(c => c.messageId === careId);
      if (!careResult) {
        console.warn('[ProactiveCareEngine] Care result not found for feedback:', careId);
        return;
      }
      
      // 更新反馈信息
      careResult.response = response;
      careResult.rating = rating;
      careResult.feedback = comment;
      careResult.responseTime = Date.now() - careResult.timestamp;
      
      // 计算效果评分
      const effectivenessScore = calculateEffectivenessScore(
        response,
        rating,
        careResult.responseTime
      );
      
      // 更新学习数据（这里需要与个性化引擎集成）
      this.updateLearningData(careResult, effectivenessScore);
      
      console.log('[ProactiveCareEngine] Feedback recorded:', {
        careId,
        response,
        rating,
        effectivenessScore,
      });
    } catch (error) {
      console.error('[ProactiveCareEngine] Error recording feedback:', error);
    }
  }
  
  /**
   * 获取关怀统计
   */
  getCareStatistics(): CareStatistics {
    const totalCares = this.careHistory.length;
    const acceptedCares = this.careHistory.filter(c => c.response === 'accepted').length;
    const dismissedCares = this.careHistory.filter(c => c.response === 'dismissed').length;
    const ignoredCares = this.careHistory.filter(c => c.response === 'ignored').length;
    
    const ratings = this.careHistory
      .filter(c => c.rating !== undefined)
      .map(c => c.rating!);
    
    const averageRating = ratings.length > 0 
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
      : 0;
    
    const effectivenessScore = totalCares > 0 
      ? acceptedCares / totalCares 
      : 0;
    
    // 按类型统计
    const caresByType: Record<CareType, any> = {} as any;
    this.careRules.forEach(rule => {
      const typeCares = this.careHistory.filter(c => c.opportunityId.includes(rule.type));
      const typeAccepted = typeCares.filter(c => c.response === 'accepted').length;
      const typeRatings = typeCares
        .filter(c => c.rating !== undefined)
        .map(c => c.rating!);
      
      caresByType[rule.type] = {
        count: typeCares.length,
        acceptanceRate: typeCares.length > 0 ? typeAccepted / typeCares.length : 0,
        averageRating: typeRatings.length > 0 
          ? typeRatings.reduce((sum, r) => sum + r, 0) / typeRatings.length 
          : 0,
      };
    });
    
    return {
      totalCares,
      acceptedCares,
      dismissedCares,
      ignoredCares,
      averageRating,
      effectivenessScore,
      caresByType,
      dailyStats: [], // TODO: 实现每日统计
    };
  }
  
  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<ProactiveCareConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
  
  // 私有方法
  
  /**
   * 检查是否可以发送关怀
   */
  private canSendCare(): boolean {
    const now = Date.now();
    
    // 检查最小间隔
    if (now - this.lastCareTime < this.config.minIntervalMinutes * 60 * 1000) {
      return false;
    }
    
    // 检查每小时最大数量
    const oneHourAgo = now - 60 * 60 * 1000;
    const recentCares = this.careHistory.filter(c => c.timestamp > oneHourAgo);
    
    if (recentCares.length >= this.config.maxNotificationsPerHour) {
      return false;
    }
    
    return true;
  }
  
  /**
   * 从规则创建关怀机会
   */
  private createCareOpportunityFromRule(rule: CareRule, userState: UserState): CareOpportunity {
    const actualValue = this.getActualValueForRule(rule, userState);
    
    return createCareOpportunity(
      rule.type,
      {
        condition: rule.type,
        actualValue,
        threshold: rule.threshold,
        confidence: 0.8, // 基础置信度
      },
      {
        title: rule.messageTemplate.title,
        message: rule.messageTemplate.content,
        actionType: 'notification',
        tone: rule.messageTemplate.tone,
      },
      {
        priority: rule.priority,
        urgency: rule.urgency,
      }
    );
  }
  
  /**
   * 获取规则的实际值
   */
  private getActualValueForRule(rule: CareRule, userState: UserState): number {
    switch (rule.type) {
      case 'high_stress':
        return userState.workState.stressLevel;
      case 'long_work':
        return userState.workState.workDuration;
      case 'low_energy':
        return userState.healthState.energyLevel;
      case 'health_warning':
        return userState.healthState.eyeStrainLevel;
      case 'low_mood':
        return userState.emotionalState.emotionIntensity;
      default:
        return 0.5;
    }
  }
  
  /**
   * 优先级排序
   */
  private prioritizeOpportunities(opportunities: CareOpportunity[]): CareOpportunity[] {
    return opportunities
      .sort((a, b) => {
        // 先按紧急程度排序
        const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const urgencyDiff = urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
        if (urgencyDiff !== 0) return urgencyDiff;
        
        // 再按优先级排序
        return b.priority - a.priority;
      })
      .slice(0, 3); // 最多返回3个机会
  }
  
  /**
   * 获取消息模板
   */
  private getMessageTemplate(careType: CareType): {
    title: string;
    content: string;
    tone: 'gentle' | 'urgent' | 'supportive' | 'celebratory';
  } {
    const rule = this.careRules.find(r => r.type === careType);
    return rule?.messageTemplate || {
      title: '关怀提醒',
      content: '我在关心你哦～',
      tone: 'gentle',
    };
  }
  
  /**
   * 准备消息变量
   */
  private prepareMessageVariables(opportunity: CareOpportunity): Record<string, string | number> {
    const variables: Record<string, string | number> = {};
    
    // 根据关怀类型准备不同的变量
    switch (opportunity.type) {
      case 'long_work':
        variables.workHours = Math.round(opportunity.trigger.actualValue / 60 * 10) / 10;
        break;
      case 'break_reminder':
        variables.breakMinutes = Math.round(opportunity.trigger.actualValue);
        break;
      // 可以添加更多变量
    }
    
    return variables;
  }
  
  /**
   * 生成操作按钮
   */
  private generateActionButtons(careType: CareType): Array<{
    label: string;
    action: string;
    style: 'primary' | 'secondary' | 'danger';
  }> {
    const commonButtons = [
      { label: '好的', action: 'accept', style: 'primary' as const },
      { label: '稍后提醒', action: 'snooze', style: 'secondary' as const },
      { label: '忽略', action: 'dismiss', style: 'secondary' as const },
    ];
    
    // 根据关怀类型定制按钮
    switch (careType) {
      case 'breathing_exercise':
        return [
          { label: '开始呼吸练习', action: 'start_breathing', style: 'primary' },
          ...commonButtons.slice(1),
        ];
      case 'break_reminder':
        return [
          { label: '休息一下', action: 'take_break', style: 'primary' },
          ...commonButtons.slice(1),
        ];
      default:
        return commonButtons;
    }
  }
  
  /**
   * 显示关怀消息（需要与UI层集成）
   */
  private async displayCareMessage(message: CareMessage): Promise<CareResult> {
    // TODO: 与UI层集成，显示关怀消息
    // 这里返回模拟结果
    return {
      messageId: message.id,
      opportunityId: message.opportunityId,
      response: 'accepted', // 模拟用户接受
      responseTime: 2000, // 模拟2秒响应时间
      timestamp: Date.now(),
    };
  }
  
  /**
   * 记录关怀执行
   */
  private recordCareExecution(_opportunity: CareOpportunity, result: CareResult): void {
    this.careHistory.push(result);
    this.lastCareTime = Date.now();
    this.careCount++;
    
    // 限制历史记录数量
    if (this.careHistory.length > 1000) {
      this.careHistory = this.careHistory.slice(-500);
    }
  }
  
  /**
   * 更新关怀统计
   */
  private updateCareStatistics(result: CareResult): void {
    // TODO: 更新详细统计数据
    console.log('[ProactiveCareEngine] Care statistics updated:', result);
  }
  
  /**
   * 更新学习数据
   */
  private updateLearningData(careResult: CareResult, effectivenessScore: number): void {
    // TODO: 与个性化引擎集成，更新学习数据
    console.log('[ProactiveCareEngine] Learning data updated:', {
      careResult,
      effectivenessScore,
    });
  }
  
  /**
   * 获取默认关怀消息
   */
  private getDefaultCareMessage(opportunity: CareOpportunity): CareMessage {
    return {
      id: uuidv4(),
      opportunityId: opportunity.id,
      title: '关怀提醒',
      content: '我在关心你哦～',
      tone: 'gentle',
      displayDuration: 5000,
      createdAt: Date.now(),
    };
  }
  
  /**
   * 获取默认关怀结果
   */
  private getDefaultCareResult(opportunity: CareOpportunity): CareResult {
    return {
      messageId: uuidv4(),
      opportunityId: opportunity.id,
      response: 'ignored',
      responseTime: 0,
      timestamp: Date.now(),
    };
  }
}