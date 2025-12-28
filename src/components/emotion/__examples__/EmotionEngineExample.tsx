// @ts-nocheck
/**
 * Emotion Engine Integration Example
 * 情感引擎集成示例
 *
 * 展示如何在React组件中使用情感引擎进行情绪分析、行为分析和智能关怀
 */

import React, { useState, useEffect } from 'react';
import { getEmotionEngine } from '@/services/emotion-engine';
import { petCoreService } from '@/services/pet-core';
import type { BehaviorData, CareOpportunity } from '@/services/emotion-engine/types';

export function EmotionEngineExample() {
  const [userInput, setUserInput] = useState('');
  const [response, setResponse] = useState<string>('');
  const [currentEmotion, setCurrentEmotion] = useState<string>('neutral');
  const [careOpportunities, setCareOpportunities] = useState<CareOpportunity[]>([]);
  const [insights, setInsights] = useState<any>(null);

  useEffect(() => {
    // 定期清理过期记忆
    const cleanupInterval = setInterval(() => {
      const engine = getEmotionEngine();
      engine.cleanup();
    }, 60 * 60 * 1000); // 每小时

    return () => clearInterval(cleanupInterval);
  }, []);

  /**
   * 处理用户输入
   */
  const handleUserInput = async () => {
    if (!userInput.trim()) {
      return;
    }

    const engine = getEmotionEngine();
    const petState = petCoreService.getState();

    // 模拟行为数据（实际应该从系统监控获取）
    const behaviorData: BehaviorData = {
      typingSpeed: 200 + Math.random() * 100,
      activeHours: [9, 10, 11, 14, 15],
      appUsage: [
        { name: 'VSCode', duration: 120, frequency: 50 },
        { name: 'Browser', duration: 30, frequency: 20 },
      ],
      breakInterval: 45,
      workDuration: 180, // 3小时
      mouseMovements: 500,
      windowSwitches: 15,
    };

    // 生成回应
    const generatedResponse = engine.generateResponse({
      userInput,
      behaviorData: behaviorData,
      petState: petState.care,
      environment: {
        timeOfDay: 'afternoon',
        dayOfWeek: new Date().getDay(),
        isWeekend: false,
        isWorkingHours: true,
      },
    });

    setResponse(generatedResponse.text);
    setCurrentEmotion(generatedResponse.emotion);

    // 显示关怀机会
    if (generatedResponse.careOpportunities) {
      setCareOpportunities(generatedResponse.careOpportunities);
    }

    // 清空输入
    setUserInput('');
  };

  /**
   * 获取情感洞察
   */
  const handleGetInsights = () => {
    const engine = getEmotionEngine();
    const insights = engine.getEmotionalInsights();
    setInsights(insights);
  };

  /**
   * 处理关怀反馈
   */
  const handleCareResponse = (
    opportunityId: string,
    response: 'accepted' | 'dismissed' | 'ignored'
  ) => {
    const engine = getEmotionEngine();
    engine.recordCareFeedback(opportunityId, response);

    // 移除已处理的关怀机会
    setCareOpportunities(prev => prev.filter(o => o.id !== opportunityId));
  };

  return (
    <div style={{
      padding: '20px',
      maxWidth: '800px',
      margin: '0 auto',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <h1>情感引擎示例</h1>

      {/* 用户输入区域 */}
      <div style={{
        marginBottom: '20px',
        padding: '15px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
      }}>
        <h2>对话测试</h2>
        <textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="在这里输入你的想法..."
          style={{
            width: '100%',
            height: '100px',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            resize: 'vertical',
          }}
        />
        <button
          onClick={handleUserInput}
          style={{
            marginTop: '10px',
            padding: '10px 20px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          发送
        </button>
      </div>

      {/* AI回应 */}
      {response && (
        <div style={{
          marginBottom: '20px',
          padding: '15px',
          background: `linear-gradient(135deg, rgba(100, 200, 255, 0.1), rgba(100, 255, 200, 0.1))`,
          borderRadius: '8px',
          borderLeft: `4px solid ${getEmotionColor(currentEmotion)}`,
        }}>
          <h3>AI 回应</h3>
          <p style={{ fontSize: '16px', lineHeight: '1.6' }}>{response}</p>
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
            当前情绪: <strong>{currentEmotion}</strong>
          </div>
        </div>
      )}

      {/* 关怀机会 */}
      {careOpportunities.length > 0 && (
        <div style={{
          marginBottom: '20px',
          padding: '15px',
          background: 'rgba(255, 193, 7, 0.1)',
          borderRadius: '8px',
          border: '2px solid #ffc107',
        }}>
          <h2>关怀提醒</h2>
          {careOpportunities.map((opportunity) => (
            <div
              key={opportunity.id}
              style={{
                marginBottom: '15px',
                padding: '10px',
                background: 'rgba(255, 255, 255, 0.5)',
                borderRadius: '4px',
              }}
            >
              <h4 style={{ margin: '0 0 5px 0', color: '#d9534f' }}>
                {opportunity.suggestion.title}
              </h4>
              <p style={{ margin: '0 0 10px 0' }}>{opportunity.suggestion.message}</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleCareResponse(opportunity.id, 'accepted')}
                  style={{
                    padding: '5px 10px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  接受
                </button>
                <button
                  onClick={() => handleCareResponse(opportunity.id, 'dismissed')}
                  style={{
                    padding: '5px 10px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  忽略
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 情感洞察按钮 */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={handleGetInsights}
          style={{
            padding: '10px 20px',
            background: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          获取情感洞察
        </button>
      </div>

      {/* 情感洞察结果 */}
      {insights && (
        <div style={{
          padding: '15px',
          background: 'rgba(220, 53, 69, 0.1)',
          borderRadius: '8px',
          border: '2px solid #dc3545',
        }}>
          <h2>情感洞察</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <strong>主导情绪:</strong> {insights.dominantEmotion}
            </div>
            <div>
              <strong>情绪趋势:</strong> {insights.moodTrend === 'improving' ? '📈 上升' : insights.moodTrend === 'declining' ? '📉 下降' : '➡️ 稳定'}
            </div>
            <div>
              <strong>平均强度:</strong> {(insights.averageIntensity * 100).toFixed(1)}%
            </div>
            <div>
              <strong>热门关键词:</strong> {insights.topKeywords.join(', ') || '无'}
            </div>
          </div>
          <div style={{ marginTop: '15px' }}>
            <strong>推荐:</strong>
            <ul style={{ marginTop: '5px' }}>
              {insights.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 使用说明 */}
      <div style={{
        marginTop: '20px',
        padding: '15px',
        background: 'rgba(0, 123, 255, 0.1)',
        borderRadius: '8px',
        fontSize: '14px',
      }}>
        <h3>💡 使用提示</h3>
        <ul>
          <li>输入不同情绪的文本（开心、难过、困惑等）观察回应变化</li>
          <li>系统会自动记录情感历史并生成洞察</li>
          <li>当检测到需要关怀的情况时，会主动提醒</li>
          <li>点击"获取情感洞察"查看情感趋势和建议</li>
        </ul>
        <h4>示例输入:</h4>
        <ul>
          <li>"今天心情真好！"</li>
          <li>"工作压力好大..."</li>
          <li>"不知道该怎么办"</li>
          <li>"终于完成了这个任务！"</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * 根据情绪获取颜色
 */
function getEmotionColor(emotion: string): string {
  const colors: Record<string, string> = {
    happy: '#28a745',
    excited: '#ffc107',
    sad: '#6c757d',
    thinking: '#17a2b8',
    neutral: '#adb5bd',
    confused: '#fd7e14',
    surprised: '#6610f2',
  };

  return colors[emotion] || colors.neutral;
}
