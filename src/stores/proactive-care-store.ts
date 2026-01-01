/**
 * Proactive Care Store
 * 主动关怀状态管理
 * 
 * 遵循项目规范：使用Zustand管理状态，集中状态管理
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  UserState,
  CareOpportunity,
  CareMessage,
  ProactiveCareConfig,
  CareStatistics,
  CareHistoryItem,
  UserFeedback,
} from '@/services/proactive-care/types';
import { StatePerceptionService } from '@/services/proactive-care/state-perception/state-perception-service';
import { ProactiveCareEngine } from '@/services/proactive-care/care-engine/proactive-care-engine';

/**
 * 主动关怀Store接口
 */
interface ProactiveCareStore {
  // 状态数据
  isEnabled: boolean;
  isMonitoring: boolean;
  currentUserState: UserState | null;
  lastStateUpdate: number;
  
  // 关怀数据
  activeOpportunities: CareOpportunity[];
  pendingMessages: CareMessage[];
  careHistory: CareHistoryItem[];
  
  // 配置
  config: ProactiveCareConfig;
  
  // 统计数据
  statistics: CareStatistics;
  
  // 服务实例
  statePerception: StatePerceptionService;
  careEngine: ProactiveCareEngine;
  
  // 监控控制
  startMonitoring: () => void;
  stopMonitoring: () => void;
  
  // 状态更新
  updateUserState: () => Promise<void>;
  
  // 关怀管理
  detectCareOpportunities: () => Promise<void>;
  executeCare: (opportunityId: string) => Promise<void>;
  dismissCare: (opportunityId: string) => void;
  snoozeCare: (opportunityId: string, minutes: number) => void;
  
  // 反馈处理
  recordFeedback: (feedback: UserFeedback) => void;
  
  // 配置管理
  updateConfig: (newConfig: Partial<ProactiveCareConfig>) => void;
  resetConfig: () => void;
  
  // 数据管理
  clearHistory: () => void;
  exportData: () => string;
  
  // 统计获取
  refreshStatistics: () => void;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: ProactiveCareConfig = {
  enabled: true,
  minIntervalMinutes: 15,
  maxNotificationsPerHour: 3,
  
  quietHours: {
    enabled: true,
    start: 22,
    end: 7,
  },
  
  careTypes: {
    low_mood: { enabled: true, threshold: 0.6, priority: 8 },
    high_stress: { enabled: true, threshold: 0.7, priority: 9 },
    long_work: { enabled: true, threshold: 240, priority: 7 },
    low_energy: { enabled: true, threshold: 0.4, priority: 6 },
    break_reminder: { enabled: true, threshold: 45, priority: 5 },
    health_warning: { enabled: true, threshold: 0.8, priority: 10 },
    emotional_support: { enabled: true, threshold: 0.7, priority: 8 },
    achievement_celebration: { enabled: true, threshold: 0.8, priority: 4 },
    breathing_exercise: { enabled: true, threshold: 0.6, priority: 7 },
    bedtime_story: { enabled: true, threshold: 0.5, priority: 5 },
    meditation_suggestion: { enabled: true, threshold: 0.7, priority: 6 },
  },
  
  personalization: {
    enabled: true,
    learningRate: 0.1,
    adaptationSpeed: 'medium',
  },
  
  healthMonitoring: {
    eyeStrainEnabled: true,
    postureEnabled: true,
    hydrationEnabled: true,
    breakRemindersEnabled: true,
  },
};

/**
 * 默认统计数据
 */
const DEFAULT_STATISTICS: CareStatistics = {
  totalCares: 0,
  acceptedCares: 0,
  dismissedCares: 0,
  ignoredCares: 0,
  averageRating: 0,
  effectivenessScore: 0,
  caresByType: {} as any,
  dailyStats: [],
};

/**
 * 监控定时器
 */
let monitoringTimer: ReturnType<typeof setInterval> | null = null;
const MONITORING_INTERVAL = 30000; // 30秒检查一次

/**
 * 创建主动关怀Store
 */
export const useProactiveCareStore = create<ProactiveCareStore>()(
  subscribeWithSelector((set, get) => {
    // 初始化服务实例
    const statePerception = new StatePerceptionService();
    const careEngine = new ProactiveCareEngine(DEFAULT_CONFIG);
    
    return {
      // 初始状态
      isEnabled: true,
      isMonitoring: false,
      currentUserState: null,
      lastStateUpdate: 0,
      
      activeOpportunities: [],
      pendingMessages: [],
      careHistory: [],
      
      config: DEFAULT_CONFIG,
      statistics: DEFAULT_STATISTICS,
      
      statePerception,
      careEngine,
      
      // 监控控制
      startMonitoring: () => {
        const state = get();
        
        if (state.isMonitoring || !state.isEnabled) {
          return;
        }
        
        set({ isMonitoring: true });
        
        // 启动定时监控
        monitoringTimer = setInterval(async () => {
          try {
            await get().updateUserState();
            await get().detectCareOpportunities();
          } catch (error) {
            console.error('[ProactiveCareStore] Monitoring error:', error);
          }
        }, MONITORING_INTERVAL);
        
        console.log('[ProactiveCareStore] Monitoring started');
      },
      
      stopMonitoring: () => {
        if (monitoringTimer) {
          clearInterval(monitoringTimer);
          monitoringTimer = null;
        }
        
        set({ isMonitoring: false });
        console.log('[ProactiveCareStore] Monitoring stopped');
      },
      
      // 状态更新
      updateUserState: async () => {
        try {
          const { statePerception } = get();
          const userState = await statePerception.perceiveUserState();
          
          set({
            currentUserState: userState,
            lastStateUpdate: Date.now(),
          });
          
          console.log('[ProactiveCareStore] User state updated:', userState);
        } catch (error) {
          console.error('[ProactiveCareStore] Error updating user state:', error);
        }
      },
      
      // 关怀机会检测
      detectCareOpportunities: async () => {
        try {
          const { careEngine, currentUserState, config } = get();
          
          if (!currentUserState || !config.enabled) {
            return;
          }
          
          const opportunities = await careEngine.detectCareOpportunities(currentUserState);
          
          if (opportunities.length > 0) {
            set((state) => ({
              activeOpportunities: [...state.activeOpportunities, ...opportunities],
            }));
            
            console.log('[ProactiveCareStore] Care opportunities detected:', opportunities);
            
            // 自动执行最高优先级的关怀
            const highestPriority = opportunities.reduce((max, opp) => 
              opp.priority > max.priority ? opp : max
            );
            
            if (highestPriority.priority >= 8) {
              await get().executeCare(highestPriority.id);
            }
          }
        } catch (error) {
          console.error('[ProactiveCareStore] Error detecting care opportunities:', error);
        }
      },
      
      // 执行关怀
      executeCare: async (opportunityId: string) => {
        try {
          const { careEngine, activeOpportunities } = get();
          
          const opportunity = activeOpportunities.find(opp => opp.id === opportunityId);
          if (!opportunity) {
            console.warn('[ProactiveCareStore] Opportunity not found:', opportunityId);
            return;
          }
          
          const result = await careEngine.executeCare(opportunity);
          
          // 生成关怀消息
          const message = await careEngine.generateCareMessage(opportunity);
          
          set((state) => ({
            pendingMessages: [...state.pendingMessages, message],
            careHistory: [...state.careHistory, {
              id: result.messageId,
              opportunityId: result.opportunityId,
              careType: opportunity.type,
              title: message.title,
              message: message.content,
              response: result.response,
              rating: result.rating,
              responseTime: result.responseTime,
              createdAt: result.timestamp,
              respondedAt: result.responseTime > 0 ? result.timestamp + result.responseTime : undefined,
            }],
          }));
          
          // 移除已执行的机会
          get().dismissCare(opportunityId);
          
          console.log('[ProactiveCareStore] Care executed:', result);
        } catch (error) {
          console.error('[ProactiveCareStore] Error executing care:', error);
        }
      },
      
      // 忽略关怀
      dismissCare: (opportunityId: string) => {
        set((state) => ({
          activeOpportunities: state.activeOpportunities.filter(opp => opp.id !== opportunityId),
        }));
      },
      
      // 延迟关怀
      snoozeCare: (opportunityId: string, minutes: number) => {
        const opportunity = get().activeOpportunities.find(opp => opp.id === opportunityId);
        if (opportunity) {
          // 延迟过期时间
          opportunity.metadata.expiresAt = Date.now() + minutes * 60 * 1000;
          
          // 暂时移除，稍后会重新检测
          get().dismissCare(opportunityId);
          
          console.log(`[ProactiveCareStore] Care snoozed for ${minutes} minutes:`, opportunityId);
        }
      },
      
      // 记录反馈
      recordFeedback: (feedback: UserFeedback) => {
        try {
          const { careEngine } = get();
          
          careEngine.recordFeedback(
            feedback.careId,
            feedback.response,
            feedback.rating,
            feedback.comment
          );
          
          // 更新历史记录
          set((state) => ({
            careHistory: state.careHistory.map(item =>
              item.id === feedback.careId
                ? {
                    ...item,
                    response: feedback.response,
                    rating: feedback.rating,
                    respondedAt: feedback.timestamp,
                  }
                : item
            ),
          }));
          
          // 刷新统计
          get().refreshStatistics();
          
          console.log('[ProactiveCareStore] Feedback recorded:', feedback);
        } catch (error) {
          console.error('[ProactiveCareStore] Error recording feedback:', error);
        }
      },
      
      // 更新配置
      updateConfig: (newConfig: Partial<ProactiveCareConfig>) => {
        const updatedConfig = { ...get().config, ...newConfig };
        
        set({ config: updatedConfig });
        
        // 更新关怀引擎配置
        get().careEngine.updateConfig(updatedConfig);
        
        console.log('[ProactiveCareStore] Config updated:', updatedConfig);
      },
      
      // 重置配置
      resetConfig: () => {
        set({ config: DEFAULT_CONFIG });
        get().careEngine.updateConfig(DEFAULT_CONFIG);
        console.log('[ProactiveCareStore] Config reset to default');
      },
      
      // 清空历史
      clearHistory: () => {
        set({
          careHistory: [],
          statistics: DEFAULT_STATISTICS,
        });
        console.log('[ProactiveCareStore] History cleared');
      },
      
      // 导出数据
      exportData: () => {
        const { careHistory, statistics, config } = get();
        
        const exportData = {
          careHistory,
          statistics,
          config,
          exportedAt: new Date().toISOString(),
        };
        
        return JSON.stringify(exportData, null, 2);
      },
      
      // 刷新统计
      refreshStatistics: () => {
        try {
          const { careEngine } = get();
          const statistics = careEngine.getCareStatistics();
          
          set({ statistics });
          
          console.log('[ProactiveCareStore] Statistics refreshed:', statistics);
        } catch (error) {
          console.error('[ProactiveCareStore] Error refreshing statistics:', error);
        }
      },
    };
  })
);

// 订阅配置变化，自动重启监控
useProactiveCareStore.subscribe(
  (state) => state.config.enabled,
  (enabled, previousEnabled) => {
    if (enabled !== previousEnabled) {
      const store = useProactiveCareStore.getState();
      
      if (enabled && !store.isMonitoring) {
        store.startMonitoring();
      } else if (!enabled && store.isMonitoring) {
        store.stopMonitoring();
      }
    }
  }
);

// 清理函数
export const cleanupProactiveCareStore = () => {
  const store = useProactiveCareStore.getState();
  store.stopMonitoring();
  store.statePerception.clearCache();
};