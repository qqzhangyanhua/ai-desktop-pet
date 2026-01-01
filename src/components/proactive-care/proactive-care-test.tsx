/**
 * Proactive Care Test Component
 * 主动关怀系统测试组件
 * 
 * 用于测试和演示主动关怀功能
 * 遵循项目规范：React函数组件，TypeScript严格模式
 */

import React, { useEffect } from 'react';
import { useProactiveCareStore } from '@/stores/proactive-care-store';
import { CareNotificationContainer } from './care-notification-panel';
import type { CareType } from '@/services/proactive-care/types';

/**
 * 主动关怀测试组件
 */
export const ProactiveCareTest: React.FC = () => {
  const {
    isEnabled,
    isMonitoring,
    currentUserState,
    activeOpportunities,
    statistics,
    startMonitoring,
    stopMonitoring,
    updateUserState,
    detectCareOpportunities,
    updateConfig,
    refreshStatistics,
  } = useProactiveCareStore();
  
  // 组件挂载时启动监控
  useEffect(() => {
    if (isEnabled && !isMonitoring) {
      startMonitoring();
    }
    
    return () => {
      if (isMonitoring) {
        stopMonitoring();
      }
    };
  }, [isEnabled, isMonitoring, startMonitoring, stopMonitoring]);
  
  /**
   * 手动触发状态更新
   */
  const handleUpdateState = async () => {
    await updateUserState();
    console.log('[ProactiveCareTest] User state updated');
  };
  
  /**
   * 手动检测关怀机会
   */
  const handleDetectCare = async () => {
    await detectCareOpportunities();
    console.log('[ProactiveCareTest] Care opportunities detected');
  };
  
  /**
   * 模拟特定关怀场景
   */
  const simulateCareScenario = (scenario: CareType) => {
    // 更新配置以降低阈值，便于触发
    const newConfig = {
      careTypes: {
        ...useProactiveCareStore.getState().config.careTypes,
        [scenario]: {
          enabled: true,
          threshold: 0.1, // 降低阈值
          priority: 9,
        },
      },
    };
    
    updateConfig(newConfig);
    
    // 延迟检测关怀机会
    setTimeout(() => {
      handleDetectCare();
    }, 1000);
    
    console.log(`[ProactiveCareTest] Simulating scenario: ${scenario}`);
  };
  
  /**
   * 切换监控状态
   */
  const toggleMonitoring = () => {
    if (isMonitoring) {
      stopMonitoring();
    } else {
      startMonitoring();
    }
  };
  
  /**
   * 切换启用状态
   */
  const toggleEnabled = () => {
    updateConfig({ enabled: !isEnabled });
  };
  
  return (
    <div className="proactive-care-test">
      {/* 关怀通知容器 */}
      <CareNotificationContainer />
      
      {/* 测试控制面板 */}
      <div className="test-control-panel">
        <div className="panel-header">
          <h2>主动关怀系统测试</h2>
          <div className="status-indicators">
            <span className={`status-dot ${isEnabled ? 'enabled' : 'disabled'}`}>
              {isEnabled ? '已启用' : '已禁用'}
            </span>
            <span className={`status-dot ${isMonitoring ? 'monitoring' : 'idle'}`}>
              {isMonitoring ? '监控中' : '空闲'}
            </span>
          </div>
        </div>
        
        {/* 基础控制 */}
        <div className="control-section">
          <h3>基础控制</h3>
          <div className="control-buttons">
            <button onClick={toggleEnabled} className="control-btn primary">
              {isEnabled ? '禁用系统' : '启用系统'}
            </button>
            <button onClick={toggleMonitoring} className="control-btn secondary">
              {isMonitoring ? '停止监控' : '开始监控'}
            </button>
            <button onClick={handleUpdateState} className="control-btn secondary">
              更新状态
            </button>
            <button onClick={handleDetectCare} className="control-btn secondary">
              检测关怀
            </button>
            <button onClick={refreshStatistics} className="control-btn secondary">
              刷新统计
            </button>
          </div>
        </div>
        
        {/* 场景模拟 */}
        <div className="control-section">
          <h3>场景模拟</h3>
          <div className="scenario-buttons">
            <button 
              onClick={() => simulateCareScenario('high_stress')}
              className="scenario-btn stress"
            >
              高压力场景
            </button>
            <button 
              onClick={() => simulateCareScenario('long_work')}
              className="scenario-btn work"
            >
              长时间工作
            </button>
            <button 
              onClick={() => simulateCareScenario('break_reminder')}
              className="scenario-btn break"
            >
              休息提醒
            </button>
            <button 
              onClick={() => simulateCareScenario('health_warning')}
              className="scenario-btn health"
            >
              健康警告
            </button>
            <button 
              onClick={() => simulateCareScenario('low_mood')}
              className="scenario-btn mood"
            >
              情绪低落
            </button>
            <button 
              onClick={() => simulateCareScenario('achievement_celebration')}
              className="scenario-btn celebration"
            >
              成就庆祝
            </button>
          </div>
        </div>
        
        {/* 当前状态显示 */}
        <div className="control-section">
          <h3>当前状态</h3>
          {currentUserState ? (
            <div className="state-display">
              <div className="state-group">
                <h4>工作状态</h4>
                <div className="state-item">
                  <span>工作中:</span>
                  <span>{currentUserState.workState.isWorking ? '是' : '否'}</span>
                </div>
                <div className="state-item">
                  <span>工作时长:</span>
                  <span>{Math.round(currentUserState.workState.workDuration)}分钟</span>
                </div>
                <div className="state-item">
                  <span>专注度:</span>
                  <span>{Math.round(currentUserState.workState.focusLevel * 100)}%</span>
                </div>
                <div className="state-item">
                  <span>压力水平:</span>
                  <span>{Math.round(currentUserState.workState.stressLevel * 100)}%</span>
                </div>
              </div>
              
              <div className="state-group">
                <h4>情绪状态</h4>
                <div className="state-item">
                  <span>当前情绪:</span>
                  <span>{currentUserState.emotionalState.currentEmotion}</span>
                </div>
                <div className="state-item">
                  <span>情绪强度:</span>
                  <span>{Math.round(currentUserState.emotionalState.emotionIntensity * 100)}%</span>
                </div>
                <div className="state-item">
                  <span>情绪趋势:</span>
                  <span>{currentUserState.emotionalState.moodTrend}</span>
                </div>
              </div>
              
              <div className="state-group">
                <h4>健康状态</h4>
                <div className="state-item">
                  <span>用眼疲劳:</span>
                  <span>{Math.round(currentUserState.healthState.eyeStrainLevel * 100)}%</span>
                </div>
                <div className="state-item">
                  <span>姿势评分:</span>
                  <span>{Math.round(currentUserState.healthState.postureScore * 100)}%</span>
                </div>
                <div className="state-item">
                  <span>精力水平:</span>
                  <span>{Math.round(currentUserState.healthState.energyLevel * 100)}%</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-state">暂无状态数据</div>
          )}
        </div>
        
        {/* 活跃关怀机会 */}
        <div className="control-section">
          <h3>活跃关怀机会 ({activeOpportunities.length})</h3>
          {activeOpportunities.length > 0 ? (
            <div className="opportunities-list">
              {activeOpportunities.map((opportunity) => (
                <div key={opportunity.id} className="opportunity-item">
                  <div className="opportunity-header">
                    <span className="opportunity-type">{opportunity.type}</span>
                    <span className={`opportunity-urgency ${opportunity.urgency}`}>
                      {opportunity.urgency}
                    </span>
                    <span className="opportunity-priority">P{opportunity.priority}</span>
                  </div>
                  <div className="opportunity-title">{opportunity.care.title}</div>
                  <div className="opportunity-message">{opportunity.care.message}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-opportunities">暂无活跃的关怀机会</div>
          )}
        </div>
        
        {/* 统计信息 */}
        <div className="control-section">
          <h3>统计信息</h3>
          <div className="statistics-display">
            <div className="stat-item">
              <span>总关怀次数:</span>
              <span>{statistics.totalCares}</span>
            </div>
            <div className="stat-item">
              <span>接受次数:</span>
              <span>{statistics.acceptedCares}</span>
            </div>
            <div className="stat-item">
              <span>忽略次数:</span>
              <span>{statistics.dismissedCares}</span>
            </div>
            <div className="stat-item">
              <span>平均评分:</span>
              <span>{statistics.averageRating.toFixed(1)}</span>
            </div>
            <div className="stat-item">
              <span>效果评分:</span>
              <span>{Math.round(statistics.effectivenessScore * 100)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 测试页面样式
 */
const testStyles = `
.proactive-care-test {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.test-control-panel {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  margin-top: 20px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.panel-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #333;
}

.status-indicators {
  display: flex;
  gap: 12px;
}

.status-dot {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-dot.enabled {
  background: #d4edda;
  color: #155724;
}

.status-dot.disabled {
  background: #f8d7da;
  color: #721c24;
}

.status-dot.monitoring {
  background: #cce5ff;
  color: #004085;
}

.status-dot.idle {
  background: #e2e3e5;
  color: #383d41;
}

.control-section {
  margin-bottom: 24px;
}

.control-section h3 {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 600;
  color: #444;
}

.control-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.control-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-btn.primary {
  background: #007bff;
  color: white;
}

.control-btn.primary:hover {
  background: #0056b3;
}

.control-btn.secondary {
  background: #6c757d;
  color: white;
}

.control-btn.secondary:hover {
  background: #545b62;
}

.scenario-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.scenario-btn {
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  color: white;
}

.scenario-btn.stress {
  background: #dc3545;
}

.scenario-btn.work {
  background: #fd7e14;
}

.scenario-btn.break {
  background: #20c997;
}

.scenario-btn.health {
  background: #e83e8c;
}

.scenario-btn.mood {
  background: #6f42c1;
}

.scenario-btn.celebration {
  background: #ffc107;
  color: #333;
}

.scenario-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.state-display {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.state-group {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
}

.state-group h4 {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: #495057;
}

.state-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.state-item span:first-child {
  color: #6c757d;
}

.state-item span:last-child {
  font-weight: 500;
  color: #495057;
}

.no-state,
.no-opportunities {
  text-align: center;
  color: #6c757d;
  font-style: italic;
  padding: 20px;
}

.opportunities-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.opportunity-item {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid #007bff;
}

.opportunity-header {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.opportunity-type {
  background: #007bff;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.opportunity-urgency {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.opportunity-urgency.low {
  background: #d4edda;
  color: #155724;
}

.opportunity-urgency.medium {
  background: #fff3cd;
  color: #856404;
}

.opportunity-urgency.high {
  background: #f8d7da;
  color: #721c24;
}

.opportunity-urgency.critical {
  background: #721c24;
  color: white;
}

.opportunity-priority {
  background: #e9ecef;
  color: #495057;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.opportunity-title {
  font-weight: 600;
  margin-bottom: 4px;
  color: #495057;
}

.opportunity-message {
  font-size: 14px;
  color: #6c757d;
}

.statistics-display {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-item span:first-child {
  color: #6c757d;
}

.stat-item span:last-child {
  font-weight: 600;
  color: #495057;
}
`;

// 注入样式
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = testStyles;
  document.head.appendChild(styleElement);
}