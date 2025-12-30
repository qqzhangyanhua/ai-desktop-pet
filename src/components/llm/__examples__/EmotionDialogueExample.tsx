// @ts-nocheck
/**
 * Emotion-Driven Dialogue Integration Example
 * 情绪驱动对话集成示例
 *
 * ⚠️ DEPRECATED (P2-1-F): This example uses old PetCoreService architecture.
 * For current implementation, see:
 * - src/services/llm/emotion-dialogue.ts (emotion-driven dialogue)
 * - src/hooks/useChatDialog.ts (chat integration)
 * - src/components/chat/ (production chat UI)
 *
 * 展示如何在React组件中使用情绪驱动对话引擎，
 * 整合LLM和情感引擎，实现智能情感对话
 */

import { useState, useCallback } from 'react';
import { generateEmotionDialogue, clearDialogueHistory } from '@/services/llm';
import { petCoreService } from '@/services/pet-core';
import { getEmotionEngine } from '@/services/emotion-engine';
import type { EmotionDialogueResult } from '@/services/llm/types';

export function EmotionDialogueExample() {
  const [userInput, setUserInput] = useState('');
  const [response, setResponse] = useState<EmotionDialogueResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [streamedText, setStreamedText] = useState('');

  /**
   * 处理用户输入
   */
  const handleSend = useCallback(async () => {
    if (!userInput.trim() || isLoading) {
      return;
    }

    setIsLoading(true);
    setStreamedText('');

    try {
      // 获取宠物状态
      const petState = petCoreService.getState();

      // 分析用户情绪
      const sentiment = getEmotionEngine().analyzeText(userInput);

      // 模拟行为数据（实际应该从系统监控获取）
      const behaviorData = {
        typingSpeed: 200 + Math.random() * 100,
        activeHours: [9, 10, 11, 14, 15],
        appUsage: [
          { name: 'VSCode', duration: 120, frequency: 50 },
          { name: 'Browser', duration: 30, frequency: 20 },
        ],
        breakInterval: 45,
        workDuration: 180,
        mouseMovements: 500,
        windowSwitches: 15,
      };

      // 分析行为模式
      const behaviorPattern = getEmotionEngine().analyzeBehavior(behaviorData);

      // 获取情感洞察
      const insights = getEmotionEngine().getEmotionalInsights();

      // 检测关怀机会
      const careOpportunities = getEmotionEngine().detectCareOpportunities(
        sentiment,
        behaviorData
      );

      // 构建对话上下文
      const context = {
        userInput,
        petState: {
          mood: petState.care.mood,
          energy: petState.care.energy,
          intimacy: petState.care.intimacy,
        },
        userSentiment: sentiment,
        behaviorPattern: behaviorPattern.pattern,
        environment: {
          timeOfDay: getTimeOfDay(),
          dayOfWeek: new Date().getDay(),
          isWeekend: isWeekend(),
          isWorkingHours: isWorkingHours(),
        },
        insights,
        careOpportunities,
      };

      // LLM配置（实际应该从配置中读取）
      const config = {
        provider: 'openai' as const,
        model: 'gpt-4',
        apiKey: 'your-api-key', // 实际使用时从配置读取
        temperature: 0.8,
        maxTokens: 500,
      };

      // 生成情绪驱动的对话回复
      const result = await generateEmotionDialogue({
        context,
        config,
        stream: false, // 可以设置为true启用流式输出
        onToken: (token) => {
          setStreamedText(prev => prev + token);
        },
        onComplete: (result) => {
          // 更新宠物情绪
          updatePetEmotion(result.petEmotion);

          // 如果有关怀建议，显示通知
          if (result.hasCareSuggestion) {
            showCareNotification(context.careOpportunities);
          }
        },
      });

      setResponse(result);
      setUserInput('');
    } catch (error) {
      console.error('对话生成失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userInput, isLoading]);

  /**
   * 更新宠物情绪
   */
  const updatePetEmotion = (emotion: string) => {
    // 实际实现中会调用宠物状态服务
    console.log('更新宠物情绪:', emotion);
  };

  /**
   * 显示关怀通知
   */
  const showCareNotification = (opportunities?: Array<{ type: string; priority: number }>) => {
    if (!opportunities || opportunities.length === 0) {
      return;
    }

    const highPriority = opportunities.filter(o => o.priority >= 8);
    if (highPriority.length > 0) {
      console.log('显示关怀通知:', highPriority);
    }
  };

  /**
   * 清空对话历史
   */
  const handleClearHistory = () => {
    clearDialogueHistory();
    setResponse(null);
    setStreamedText('');
  };

  return (
    <div style={{
      padding: '20px',
      maxWidth: '900px',
      margin: '0 auto',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <h1>情绪驱动对话示例</h1>

      {/* 输入区域 */}
      <div style={{
        marginBottom: '20px',
        padding: '15px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
      }}>
        <h2>对话输入</h2>
        <textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="在这里输入你的想法..."
          disabled={isLoading}
          style={{
            width: '100%',
            height: '100px',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            resize: 'vertical',
            marginBottom: '10px',
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleSend}
            disabled={isLoading || !userInput.trim()}
            style={{
              padding: '10px 20px',
              background: isLoading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? '生成中...' : '发送 (Enter)'}
          </button>
          <button
            onClick={handleClearHistory}
            style={{
              padding: '10px 20px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            清空历史
          </button>
        </div>
      </div>

      {/* 回复展示 */}
      {(response || streamedText) && (
        <div style={{
          marginBottom: '20px',
          padding: '15px',
          background: `linear-gradient(135deg, rgba(100, 200, 255, 0.1), rgba(100, 255, 200, 0.1))`,
          borderRadius: '8px',
          borderLeft: `4px solid ${getEmotionColor(response?.petEmotion || 'neutral')}`,
        }}>
          <h3>宠物回复</h3>
          <p style={{ fontSize: '16px', lineHeight: '1.6' }}>
            {streamedText || response?.text}
          </p>
          {response && (
            <div style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
              <div>情绪: <strong>{response.petEmotion}</strong></div>
              <div>语调: <strong>{getToneLabel(response.tone)}</strong></div>
              <div>模板: <strong>{response.systemPrompt}</strong></div>
              {response.usage && (
                <div>
                  Token使用: {response.usage.promptTokens} + {response.usage.completionTokens} = {response.usage.totalTokens}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 使用提示 */}
      <div style={{
        padding: '15px',
        background: 'rgba(0, 123, 255, 0.1)',
        borderRadius: '8px',
        fontSize: '14px',
      }}>
        <h3>使用提示</h3>
        <ul>
          <li>输入不同情绪的文本，观察宠物的情绪和语调变化</li>
          <li>系统会根据你的情绪、行为模式、时间等因素选择合适的回复风格</li>
          <li>支持7种系统提示模板：default、emotional-support、playful、focused-work等</li>
          <li>对话历史会被保留，实现多轮对话的上下文理解</li>
        </ul>
        <h4>示例输入:</h4>
        <ul>
          <li>"今天心情真好！" → 活泼/庆祝模式</li>
          <li>"工作压力好大..." → 情感支持模式</li>
          <li>"我在专注工作" → 专注工作模式</li>
          <li>"终于完成了这个任务！" → 庆祝模式</li>
        </ul>
      </div>
    </div>
  );
}

// ============ 辅助函数 ============

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

function isWeekend(): boolean {
  const day = new Date().getDay();
  return day === 0 || day === 6;
}

function isWorkingHours(): boolean {
  const hour = new Date().getHours();
  return hour >= 9 && hour < 18;
}

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
  return colors[emotion as keyof typeof colors] || colors["neutral"] ?? colors['neutral'];
}

function getToneLabel(tone: string): string {
  const labels: Record<string, string> = {
    friendly: '友好',
    caring: '关怀',
    playful: '活泼',
    concerned: '关切',
    excited: '兴奋',
    calm: '平静',
  };
  return labels[tone] || tone;
}
