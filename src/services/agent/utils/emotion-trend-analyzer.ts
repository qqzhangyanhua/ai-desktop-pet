// @ts-nocheck
/**
 * 情绪趋势分析器
 * Emotion Trend Analyzer
 *
 * 分析情绪变化趋势：
 * - 日/周/月趋势计算
 * - 情绪规律识别
 * - 情绪低谷预测
 * - 趋势可视化数据
 */

import type { EmotionType, EmotionRecord, EmotionTrend } from '@/types/agent-system';

/**
 * 时间周期类型
 */
export type TrendPeriod = 'day' | 'week' | 'month';

/**
 * 情绪规律
 */
export interface EmotionPattern {
  /** 规律类型 */
  type: 'time_based' | 'weekday_based' | 'recurring';
  /** 描述 */
  description: string;
  /** 置信度 (0-1) */
  confidence: number;
  /** 相关情绪 */
  emotion: EmotionType;
  /** 触发时间/条件 */
  trigger: string;
}

/**
 * 情绪预测
 */
export interface EmotionPrediction {
  /** 预测时间 */
  predictedAt: number;
  /** 预测情绪 */
  emotion: EmotionType;
  /** 预测强度 */
  intensity: number;
  /** 置信度 */
  confidence: number;
  /** 基于的规律 */
  basedOn: string;
}

/**
 * 趋势可视化数据点
 */
export interface TrendDataPoint {
  /** 时间戳 */
  timestamp: number;
  /** 标签（日期/时间） */
  label: string;
  /** 情绪分布 */
  emotions: Record<EmotionType, number>;
  /** 平均强度 */
  avgIntensity: number;
  /** 主导情绪 */
  dominant: EmotionType;
}

/**
 * 情绪趋势分析器
 */
class EmotionTrendAnalyzer {
  /**
   * 计算指定周期的趋势
   */
  calculateTrend(
    records: EmotionRecord[],
    period: TrendPeriod
  ): EmotionTrend {
    const now = Date.now();
    let periodStart: number;

    switch (period) {
      case 'day':
        periodStart = now - 24 * 60 * 60 * 1000;
        break;
      case 'week':
        periodStart = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case 'month':
        periodStart = now - 30 * 24 * 60 * 60 * 1000;
        break;
    }

    // 过滤时间段内的记录
    const periodRecords = records.filter((r) => r.timestamp >= periodStart);

    if (periodRecords.length === 0) {
      return {
        periodStart,
        periodEnd: now,
        dominantEmotion: 'neutral',
        distribution: this.createEmptyDistribution(),
        averageIntensity: 5,
        volatility: 0,
      };
    }

    // 计算分布
    const distribution = this.calculateDistribution(periodRecords);

    // 找出主导情绪
    const dominantEmotion = this.findDominantEmotion(distribution);

    // 计算平均强度
    const avgIntensity =
      periodRecords.reduce((sum, r) => sum + r.intensity, 0) /
      periodRecords.length;

    // 计算波动度
    const volatility = this.calculateVolatility(
      periodRecords.map((r) => r.intensity)
    );

    return {
      periodStart,
      periodEnd: now,
      dominantEmotion,
      distribution,
      averageIntensity: avgIntensity,
      volatility,
    };
  }

  /**
   * 识别情绪规律
   */
  identifyPatterns(records: EmotionRecord[]): EmotionPattern[] {
    const patterns: EmotionPattern[] = [];

    if (records.length < 10) {
      return patterns; // 数据不足
    }

    // 1. 时间段规律（早上/下午/晚上）
    const timePatterns = this.identifyTimePatterns(records);
    patterns.push(...timePatterns);

    // 2. 星期规律（周一焦虑、周五开心等）
    const weekdayPatterns = this.identifyWeekdayPatterns(records);
    patterns.push(...weekdayPatterns);

    return patterns;
  }

  /**
   * 预测情绪低谷
   */
  predictLowPoints(
    records: EmotionRecord[],
    patterns: EmotionPattern[]
  ): EmotionPrediction[] {
    const predictions: EmotionPrediction[] = [];
    const now = Date.now();

    // 基于规律预测未来 24 小时内的低谷
    patterns
      .filter((p) => ['sad', 'anxious', 'angry'].includes(p.emotion))
      .forEach((pattern) => {
        if (pattern.confidence >= 0.6) {
          // 解析触发时间
          const predictedTime = this.parsePatternTriggerTime(pattern, now);

          if (predictedTime && predictedTime > now) {
            predictions.push({
              predictedAt: predictedTime,
              emotion: pattern.emotion,
              intensity: 6,
              confidence: pattern.confidence,
              basedOn: pattern.description,
            });
          }
        }
      });

    return predictions;
  }

  /**
   * 生成趋势可视化数据
   */
  generateTrendData(
    records: EmotionRecord[],
    period: TrendPeriod,
    points: number = 7
  ): TrendDataPoint[] {
    const now = Date.now();
    let periodMs: number;
    let formatLabel: (date: Date) => string;

    switch (period) {
      case 'day':
        periodMs = 24 * 60 * 60 * 1000;
        formatLabel = (d) => `${d.getHours()}:00`;
        break;
      case 'week':
        periodMs = 7 * 24 * 60 * 60 * 1000;
        formatLabel = (d) => ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
        break;
      case 'month':
        periodMs = 30 * 24 * 60 * 60 * 1000;
        formatLabel = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
        break;
    }

    const intervalMs = periodMs / points;
    const startTime = now - periodMs;
    const dataPoints: TrendDataPoint[] = [];

    for (let i = 0; i < points; i++) {
      const segmentStart = startTime + i * intervalMs;
      const segmentEnd = segmentStart + intervalMs;

      // 过滤该时间段的记录
      const segmentRecords = records.filter(
        (r) => r.timestamp >= segmentStart && r.timestamp < segmentEnd
      );

      const distribution = this.calculateDistribution(segmentRecords);
      const dominant = this.findDominantEmotion(distribution);
      const avgIntensity =
        segmentRecords.length > 0
          ? segmentRecords.reduce((sum, r) => sum + r.intensity, 0) /
            segmentRecords.length
          : 5;

      dataPoints.push({
        timestamp: segmentStart,
        label: formatLabel(new Date(segmentStart)),
        emotions: distribution,
        avgIntensity,
        dominant,
      });
    }

    return dataPoints;
  }

  // ============================================================================
  // 辅助方法
  // ============================================================================

  /**
   * 创建空情绪分布
   */
  private createEmptyDistribution(): Record<EmotionType, number> {
    return {
      happy: 0,
      sad: 0,
      anxious: 0,
      excited: 0,
      calm: 0,
      angry: 0,
      confused: 0,
      neutral: 1,
    };
  }

  /**
   * 计算情绪分布
   */
  private calculateDistribution(
    records: EmotionRecord[]
  ): Record<EmotionType, number> {
    const distribution = this.createEmptyDistribution();
    distribution.neutral = 0;

    if (records.length === 0) {
      distribution.neutral = 1;
      return distribution;
    }

    records.forEach((r) => {
      distribution[r.emotion]++;
    });

    // 归一化
    const total = records.length;
    (Object.keys(distribution) as EmotionType[]).forEach((key) => {
      distribution[key] = distribution[key] / total;
    });

    return distribution;
  }

  /**
   * 找出主导情绪
   */
  private findDominantEmotion(
    distribution: Record<EmotionType, number>
  ): EmotionType {
    let dominant: EmotionType = 'neutral';
    let maxValue = 0;

    (Object.entries(distribution) as Array<[EmotionType, number]>).forEach(
      ([emotion, value]) => {
        if (value > maxValue) {
          maxValue = value;
          dominant = emotion;
        }
      }
    );

    return dominant;
  }

  /**
   * 计算波动度（标准差）
   */
  private calculateVolatility(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;

    return Math.sqrt(variance);
  }

  /**
   * 识别时间段规律
   */
  private identifyTimePatterns(records: EmotionRecord[]): EmotionPattern[] {
    const patterns: EmotionPattern[] = [];
    const timeSlots = {
      morning: { start: 6, end: 12, records: [] as EmotionRecord[] },
      afternoon: { start: 12, end: 18, records: [] as EmotionRecord[] },
      evening: { start: 18, end: 24, records: [] as EmotionRecord[] },
    };

    // 按时间段分组
    records.forEach((r) => {
      const hour = new Date(r.timestamp).getHours();
      if (hour >= 6 && hour < 12) {
        timeSlots.morning.records.push(r);
      } else if (hour >= 12 && hour < 18) {
        timeSlots.afternoon.records.push(r);
      } else if (hour >= 18) {
        timeSlots.evening.records.push(r);
      }
    });

    // 分析每个时间段的主导情绪
    Object.entries(timeSlots).forEach(([slotName, slot]) => {
      if (slot.records.length >= 5) {
        const distribution = this.calculateDistribution(slot.records);
        const dominant = this.findDominantEmotion(distribution);
        const confidence = distribution[dominant];

        if (confidence >= 0.5 && dominant !== 'neutral') {
          patterns.push({
            type: 'time_based',
            description: `${slotName === 'morning' ? '早上' : slotName === 'afternoon' ? '下午' : '晚上'}常感到${this.emotionToText(dominant)}`,
            confidence,
            emotion: dominant,
            trigger: slotName,
          });
        }
      }
    });

    return patterns;
  }

  /**
   * 识别星期规律
   */
  private identifyWeekdayPatterns(records: EmotionRecord[]): EmotionPattern[] {
    const patterns: EmotionPattern[] = [];
    const weekdays: Record<number, EmotionRecord[]> = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
    };

    const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    // 按星期分组
    records.forEach((r) => {
      const day = new Date(r.timestamp).getDay();
      weekdays[day].push(r);
    });

    // 分析每天的主导情绪
    Object.entries(weekdays).forEach(([day, dayRecords]) => {
      if (dayRecords.length >= 3) {
        const distribution = this.calculateDistribution(dayRecords);
        const dominant = this.findDominantEmotion(distribution);
        const confidence = distribution[dominant];

        if (confidence >= 0.5 && dominant !== 'neutral') {
          patterns.push({
            type: 'weekday_based',
            description: `${weekdayNames[Number(day)]}常感到${this.emotionToText(dominant)}`,
            confidence,
            emotion: dominant,
            trigger: `weekday_${day}`,
          });
        }
      }
    });

    return patterns;
  }

  /**
   * 解析规律触发时间
   */
  private parsePatternTriggerTime(
    pattern: EmotionPattern,
    now: number
  ): number | null {
    const today = new Date(now);

    if (pattern.type === 'weekday_based') {
      const targetDay = parseInt(pattern.trigger.replace('weekday_', ''));
      const currentDay = today.getDay();
      let daysUntil = targetDay - currentDay;

      if (daysUntil <= 0) {
        daysUntil += 7;
      }

      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysUntil);
      targetDate.setHours(9, 0, 0, 0); // 默认上午 9 点

      return targetDate.getTime();
    }

    if (pattern.type === 'time_based') {
      const targetDate = new Date(today);

      switch (pattern.trigger) {
        case 'morning':
          targetDate.setHours(9, 0, 0, 0);
          break;
        case 'afternoon':
          targetDate.setHours(14, 0, 0, 0);
          break;
        case 'evening':
          targetDate.setHours(20, 0, 0, 0);
          break;
      }

      // 如果时间已过，加一天
      if (targetDate.getTime() <= now) {
        targetDate.setDate(targetDate.getDate() + 1);
      }

      return targetDate.getTime();
    }

    return null;
  }

  /**
   * 情绪转文字
   */
  private emotionToText(emotion: EmotionType): string {
    const map: Record<EmotionType, string> = {
      happy: '开心',
      sad: '难过',
      anxious: '焦虑',
      excited: '兴奋',
      calm: '平静',
      angry: '生气',
      confused: '困惑',
      neutral: '平静',
    };
    return map[emotion];
  }
}

/**
 * 导出单例
 */
export const emotionTrendAnalyzer = new EmotionTrendAnalyzer();
