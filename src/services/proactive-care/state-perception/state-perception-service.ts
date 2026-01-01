/**
 * State Perception Service
 * 状态感知服务
 * 
 * 负责检测和分析用户的工作状态、情绪状态、健康状态和环境上下文
 * 遵循项目规范：服务层统一封装，避免组件直接调用原生接口
 */

import { getBehaviorAnalyzer } from '@/services/emotion-engine/behavior-analyzer';
import { getSentimentAnalyzer } from '@/services/emotion-engine/sentiment-analyzer';
import type { BehaviorData } from '@/services/emotion-engine/types';
import type { EmotionType } from '@/types';
import type {
  UserState,
  WorkState,
  EmotionalState,
  HealthState,
  EnvironmentContext,
} from '../types';
import { getTimeOfDay, isWorkingHours } from '../utils';

/**
 * 系统活动数据接口
 */
interface SystemActivityData {
  typingSpeed: number; // 字符/分钟
  mouseMovements: number; // 鼠标移动次数
  windowSwitches: number; // 窗口切换次数
  activeApplications: Array<{
    name: string;
    duration: number; // 使用时长（分钟）
  }>;
  idleTime: number; // 空闲时间（分钟）
  screenTime: number; // 屏幕使用时间（分钟）
}

/**
 * 状态感知服务类
 */
export class StatePerceptionService {
  private behaviorAnalyzer = getBehaviorAnalyzer();
  private sentimentAnalyzer = getSentimentAnalyzer();
  
  // 缓存机制
  private stateCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 30000; // 30秒缓存
  
  /**
   * 感知完整用户状态
   */
  async perceiveUserState(): Promise<UserState> {
    try {
      // 检查缓存
      const cached = this.getCachedState('userState');
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }
      
      // 并行获取各项状态
      const [workState, emotionalState, healthState, environment] = await Promise.all([
        this.detectWorkState(),
        this.analyzeEmotionalState(),
        this.assessHealthState(),
        this.perceiveEnvironment(),
      ]);
      
      const userState: UserState = {
        workState,
        emotionalState,
        healthState,
        environment,
      };
      
      // 更新缓存
      this.updateStateCache('userState', userState);
      
      return userState;
    } catch (error) {
      console.error('[StatePerceptionService] Error perceiving user state:', error);
      return this.getDefaultUserState();
    }
  }
  
  /**
   * 检测工作状态
   */
  async detectWorkState(): Promise<WorkState> {
    try {
      // 获取系统活动数据
      const activityData = await this.getSystemActivityData();
      
      // 转换为行为分析数据格式
      const behaviorData: BehaviorData = {
        typingSpeed: activityData.typingSpeed,
        activeHours: this.calculateActiveHours(),
        appUsage: activityData.activeApplications.map((app: any) => ({
          name: app.name,
          duration: app.duration,
          frequency: 1, // 简化处理
        })),
        breakInterval: activityData.idleTime,
        workDuration: activityData.screenTime,
        mouseMovements: activityData.mouseMovements,
        windowSwitches: activityData.windowSwitches,
      };
      
      // 分析行为模式
      const behaviorPattern = this.behaviorAnalyzer.analyze(behaviorData);
      
      // 计算工作状态指标
      const workState: WorkState = {
        isWorking: this.isCurrentlyWorking(activityData),
        workDuration: activityData.screenTime,
        lastBreakTime: this.calculateLastBreakTime(activityData),
        focusLevel: behaviorPattern.characteristics.focusLevel,
        stressLevel: behaviorPattern.characteristics.stressLevel,
        productivityLevel: behaviorPattern.characteristics.productivityLevel,
      };
      
      return workState;
    } catch (error) {
      console.error('[StatePerceptionService] Error detecting work state:', error);
      return this.getDefaultWorkState();
    }
  }
  
  /**
   * 分析情绪状态
   */
  async analyzeEmotionalState(): Promise<EmotionalState> {
    try {
      // 获取最近的对话记录
      const recentConversations = await this.getRecentConversations();
      
      // 分析当前情绪
      let currentEmotion: EmotionType = 'neutral';
      let emotionIntensity = 0.5;
      
      if (recentConversations.length > 0) {
        const latestMessage = recentConversations[0];
        if (latestMessage) {
          const sentiment = this.sentimentAnalyzer.analyze(latestMessage.content);
          currentEmotion = sentiment.emotion;
          emotionIntensity = sentiment.confidence;
        }
      }
      
      // 分析情绪趋势
      const moodTrend = await this.analyzeEmotionTrend(recentConversations);
      
      const emotionalState: EmotionalState = {
        currentEmotion,
        emotionIntensity,
        moodTrend,
        lastEmotionChange: Date.now(),
      };
      
      return emotionalState;
    } catch (error) {
      console.error('[StatePerceptionService] Error analyzing emotional state:', error);
      return this.getDefaultEmotionalState();
    }
  }
  
  /**
   * 评估健康状态
   */
  async assessHealthState(): Promise<HealthState> {
    try {
      const activityData = await this.getSystemActivityData();
      
      // 计算健康指标
      const eyeStrainLevel = this.calculateEyeStrainLevel(activityData);
      const postureScore = this.calculatePostureScore(activityData);
      const hydrationLevel = this.calculateHydrationLevel();
      const energyLevel = this.calculateEnergyLevel(activityData);
      
      const healthState: HealthState = {
        eyeStrainLevel,
        postureScore,
        hydrationLevel,
        energyLevel,
        lastHealthCheck: Date.now(),
      };
      
      return healthState;
    } catch (error) {
      console.error('[StatePerceptionService] Error assessing health state:', error);
      return this.getDefaultHealthState();
    }
  }
  
  /**
   * 感知环境上下文
   */
  async perceiveEnvironment(): Promise<EnvironmentContext> {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    
    const environment: EnvironmentContext = {
      timeOfDay: getTimeOfDay(hour),
      isWorkingHours: isWorkingHours(hour, dayOfWeek),
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      ambientLight: await this.detectAmbientLight(),
    };
    
    return environment;
  }
  
  // 私有方法
  
  /**
   * 获取系统活动数据
   * 注意：这里需要通过Tauri调用系统API，当前为模拟实现
   */
  private async getSystemActivityData(): Promise<SystemActivityData> {
    // TODO: 实现Tauri系统API调用
    // 当前返回模拟数据
    return {
      typingSpeed: Math.random() * 300 + 100, // 100-400字符/分钟
      mouseMovements: Math.random() * 1000 + 200, // 200-1200次
      windowSwitches: Math.random() * 50 + 10, // 10-60次
      activeApplications: [
        { name: 'VSCode', duration: 120 },
        { name: 'Chrome', duration: 60 },
        { name: 'Terminal', duration: 30 },
      ],
      idleTime: Math.random() * 30 + 5, // 5-35分钟
      screenTime: Math.random() * 240 + 60, // 60-300分钟
    };
  }
  
  /**
   * 判断当前是否在工作
   */
  private isCurrentlyWorking(activityData: SystemActivityData): boolean {
    // 如果最近有活动且不是长时间空闲，认为在工作
    return activityData.idleTime < 15 && activityData.typingSpeed > 50;
  }
  
  /**
   * 计算活跃小时数
   */
  private calculateActiveHours(): number[] {
    const now = new Date();
    const currentHour = now.getHours();
    
    // 简化实现：返回当前小时
    return [currentHour];
  }
  
  /**
   * 计算最后休息时间
   */
  private calculateLastBreakTime(activityData: SystemActivityData): number {
    // 简化实现：根据空闲时间估算
    return Date.now() - (activityData.idleTime * 60 * 1000);
  }
  
  /**
   * 计算用眼疲劳程度
   */
  private calculateEyeStrainLevel(activityData: SystemActivityData): number {
    // 基于屏幕使用时间计算
    const screenHours = activityData.screenTime / 60;
    
    if (screenHours < 2) return 0.1;
    if (screenHours < 4) return 0.3;
    if (screenHours < 6) return 0.5;
    if (screenHours < 8) return 0.7;
    return 0.9;
  }
  
  /**
   * 计算姿势评分
   */
  private calculatePostureScore(activityData: SystemActivityData): number {
    // 基于连续工作时间和活动频率计算
    const workHours = activityData.screenTime / 60;
    const activityLevel = activityData.mouseMovements / 1000;
    
    let score = 1.0;
    
    // 长时间工作降低评分
    if (workHours > 4) score -= 0.3;
    if (workHours > 6) score -= 0.2;
    
    // 活动频率低降低评分
    if (activityLevel < 0.5) score -= 0.2;
    
    return Math.max(0, Math.min(1, score));
  }
  
  /**
   * 计算水分补充水平
   */
  private calculateHydrationLevel(): number {
    // 简化实现：基于时间推算
    const hour = new Date().getHours();
    
    // 假设早上水分充足，下午逐渐降低
    if (hour < 10) return 0.9;
    if (hour < 14) return 0.7;
    if (hour < 18) return 0.5;
    return 0.3;
  }
  
  /**
   * 计算精力水平
   */
  private calculateEnergyLevel(activityData: SystemActivityData): number {
    const workHours = activityData.screenTime / 60;
    const hour = new Date().getHours();
    
    let energy = 0.8; // 基础精力
    
    // 工作时间影响
    if (workHours > 6) energy -= 0.3;
    if (workHours > 8) energy -= 0.2;
    
    // 时间段影响
    if (hour < 9 || hour > 22) energy -= 0.2;
    if (hour >= 14 && hour <= 16) energy -= 0.1; // 下午低潮
    
    return Math.max(0.1, Math.min(1, energy));
  }
  
  /**
   * 检测环境光线
   */
  private async detectAmbientLight(): Promise<'bright' | 'normal' | 'dim'> {
    // TODO: 实现光线检测（可选功能）
    const hour = new Date().getHours();
    
    if (hour >= 6 && hour < 18) return 'bright';
    if (hour >= 18 && hour < 22) return 'normal';
    return 'dim';
  }
  
  /**
   * 获取最近对话记录
   */
  private async getRecentConversations(): Promise<Array<{
    content: string;
    timestamp: number;
    role: 'user' | 'assistant';
  }>> {
    // TODO: 从对话历史中获取最近的记录
    return [];
  }
  
  /**
   * 分析情绪趋势
   */
  private async analyzeEmotionTrend(
    conversations: Array<{ content: string; timestamp: number }>
  ): Promise<'improving' | 'stable' | 'declining'> {
    if (conversations.length < 2) return 'stable';
    
    // 简化实现：比较最近两次对话的情绪
    const recent = conversations.slice(0, 2);
    const scores = recent.map(conv => {
      const sentiment = this.sentimentAnalyzer.analyze(conv.content);
      return sentiment.score;
    });
    
    if (scores[0] !== undefined && scores[1] !== undefined) {
      const diff = scores[0] - scores[1];
      
      if (diff > 0.2) return 'improving';
      if (diff < -0.2) return 'declining';
    }
    
    return 'stable';
  }
  
  /**
   * 缓存相关方法
   */
  private getCachedState(key: string): { data: any; timestamp: number } | null {
    return this.stateCache.get(key) || null;
  }
  
  private updateStateCache(key: string, data: any): void {
    this.stateCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }
  
  /**
   * 默认状态生成
   */
  private getDefaultUserState(): UserState {
    return {
      workState: this.getDefaultWorkState(),
      emotionalState: this.getDefaultEmotionalState(),
      healthState: this.getDefaultHealthState(),
      environment: {
        timeOfDay: getTimeOfDay(new Date().getHours()),
        isWorkingHours: isWorkingHours(new Date().getHours(), new Date().getDay()),
        isWeekend: [0, 6].includes(new Date().getDay()),
        ambientLight: 'normal',
      },
    };
  }
  
  private getDefaultWorkState(): WorkState {
    return {
      isWorking: false,
      workDuration: 0,
      lastBreakTime: Date.now(),
      focusLevel: 0.5,
      stressLevel: 0.3,
      productivityLevel: 0.5,
    };
  }
  
  private getDefaultEmotionalState(): EmotionalState {
    return {
      currentEmotion: 'neutral',
      emotionIntensity: 0.5,
      moodTrend: 'stable',
      lastEmotionChange: Date.now(),
    };
  }
  
  private getDefaultHealthState(): HealthState {
    return {
      eyeStrainLevel: 0.3,
      postureScore: 0.7,
      hydrationLevel: 0.6,
      energyLevel: 0.7,
      lastHealthCheck: Date.now(),
    };
  }
  
  /**
   * 清理缓存
   */
  public clearCache(): void {
    this.stateCache.clear();
  }
  
  /**
   * 获取缓存统计
   */
  public getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.stateCache.size,
      keys: Array.from(this.stateCache.keys()),
    };
  }
}