/**
 * Behavior Analyzer
 * 行为模式分析引擎
 *
 * 分析用户行为数据，识别压力、专注度、疲劳等状态
 */

import type { BehaviorData, BehaviorPatternResult } from './types';

/**
 * 行为分析配置
 */
interface BehaviorAnalyzerConfig {
  /** 正常工作时长（小时） */
  normalWorkHours: number;

  /** 正常休息间隔（分钟） */
  normalBreakInterval: number;

  /** 正常打字速度（字符/分钟） */
  normalTypingSpeed: number;

  /** 高压阈值 */
  stressThresholds: {
    longWorkHours: number;      // 连续工作时长
    shortBreakInterval: number;  // 过短的休息间隔
    highTypingSpeed: number;     // 过快的打字速度
    highWindowSwitches: number;  // 频繁窗口切换
  };
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: BehaviorAnalyzerConfig = {
  normalWorkHours: 8,
  normalBreakInterval: 60,
  normalTypingSpeed: 200, // 字符/分钟
  stressThresholds: {
    longWorkHours: 10,      // 超过10小时算过长
    shortBreakInterval: 15,  // 少于15分钟算过短
    highTypingSpeed: 400,    // 超过400字符/分钟算过快
    highWindowSwitches: 60,  // 每小时超过60次算频繁
  },
};

/**
 * BehaviorAnalyzer 类
 */
export class BehaviorAnalyzer {
  private config: BehaviorAnalyzerConfig;

  constructor(config?: Partial<BehaviorAnalyzerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 分析行为模式
   */
  analyze(behavior: BehaviorData): BehaviorPatternResult {
    // 计算各项特征分数
    const stressLevel = this.calculateStressLevel(behavior);
    const focusLevel = this.calculateFocusLevel(behavior);
    const energyLevel = this.calculateEnergyLevel(behavior);
    const productivityLevel = this.calculateProductivityLevel(behavior);

    // 确定行为模式
    const pattern = this.determinePattern({
      stressLevel,
      focusLevel,
      energyLevel,
      productivityLevel,
    });

    // 生成建议
    const suggestions = this.generateSuggestions(pattern, behavior);

    // 生成警告
    const warnings = this.generateWarnings(behavior);

    return {
      pattern,
      confidence: this.calculateConfidence(stressLevel, focusLevel, energyLevel),
      suggestions,
      characteristics: {
        stressLevel,
        focusLevel,
        energyLevel,
        productivityLevel,
      },
      warnings,
    };
  }

  /**
   * 计算压力水平 (0-1)
   */
  private calculateStressLevel(behavior: BehaviorData): number {
    let stressScore = 0;

    // 工作时长过长
    const workHours = behavior.workDuration / 60;
    if (workHours > this.config.stressThresholds.longWorkHours) {
      const excess = workHours - this.config.stressThresholds.longWorkHours;
      stressScore += Math.min(excess * 0.1, 0.4);
    }

    // 休息间隔过短
    if (behavior.breakInterval < this.config.stressThresholds.shortBreakInterval) {
      const deficit = this.config.stressThresholds.shortBreakInterval - behavior.breakInterval;
      stressScore += Math.min(deficit * 0.02, 0.3);
    }

    // 打字速度过快（可能紧张）
    if (behavior.typingSpeed > this.config.stressThresholds.highTypingSpeed) {
      const excess = behavior.typingSpeed - this.config.stressThresholds.highTypingSpeed;
      stressScore += Math.min(excess * 0.001, 0.2);
    }

    // 频繁窗口切换（注意力分散）
    const switchesPerHour = behavior.windowSwitches / (behavior.workDuration / 60);
    if (switchesPerHour > this.config.stressThresholds.highWindowSwitches) {
      stressScore += 0.2;
    }

    // 鼠标移动过多（可能焦虑）
    if (behavior.mouseMovements > 1000) {
      stressScore += 0.1;
    }

    return Math.min(1, stressScore);
  }

  /**
   * 计算专注水平 (0-1)
   */
  private calculateFocusLevel(behavior: BehaviorData): number {
    let focusScore = 0.5; // 基础分数

    // 工作时长适中（专注）
    const workHours = behavior.workDuration / 60;
    if (workHours >= 1 && workHours <= 4) {
      focusScore += 0.3;
    }

    // 休息间隔合理
    if (behavior.breakInterval >= this.config.normalBreakInterval * 0.8 &&
        behavior.breakInterval <= this.config.normalBreakInterval * 1.5) {
      focusScore += 0.2;
    }

    // 窗口切换较少
    const switchesPerHour = behavior.windowSwitches / (behavior.workDuration / 60);
    if (switchesPerHour < 30) {
      focusScore += 0.2;
    }

    return Math.min(1, focusScore);
  }

  /**
   * 计算精力水平 (0-1)
   */
  private calculateEnergyLevel(behavior: BehaviorData): number {
    let energyScore = 0.5; // 基础分数

    const workHours = behavior.workDuration / 60;

    // 工作时间过长，精力下降
    if (workHours > this.config.normalWorkHours) {
      const excess = workHours - this.config.normalWorkHours;
      energyScore -= Math.min(excess * 0.05, 0.3);
    }

    // 打字速度下降（疲劳）
    if (behavior.typingSpeed < this.config.normalTypingSpeed * 0.5) {
      energyScore -= 0.2;
    }

    // 鼠标移动减少（疲劳）
    if (behavior.mouseMovements < 100) {
      energyScore -= 0.1;
    }

    return Math.max(0, energyScore);
  }

  /**
   * 计算生产力水平 (0-1)
   */
  private calculateProductivityLevel(behavior: BehaviorData): number {
    let productivityScore = 0.5; // 基础分数

    // 工作时长适中
    const workHours = behavior.workDuration / 60;
    if (workHours >= 4 && workHours <= 8) {
      productivityScore += 0.3;
    }

    // 打字速度正常
    if (behavior.typingSpeed >= this.config.normalTypingSpeed * 0.8 &&
        behavior.typingSpeed <= this.config.normalTypingSpeed * 1.5) {
      productivityScore += 0.2;
    }

    // 窗口切换适中
    const switchesPerHour = behavior.windowSwitches / (behavior.workDuration / 60);
    if (switchesPerHour >= 20 && switchesPerHour <= 40) {
      productivityScore += 0.2;
    }

    return Math.min(1, productivityScore);
  }

  /**
   * 确定行为模式
   */
  private determinePattern(characteristics: {
    stressLevel: number;
    focusLevel: number;
    energyLevel: number;
    productivityLevel: number;
  }): BehaviorPatternResult['pattern'] {
    const { stressLevel, focusLevel, energyLevel, productivityLevel } = characteristics;

    // 高压模式
    if (stressLevel > 0.7) {
      if (energyLevel < 0.3) {
        return 'overworked';
      }
      return 'stressed';
    }

    // 高专注模式
    if (focusLevel > 0.7 && stressLevel < 0.3) {
      if (productivityLevel > 0.7) {
        return 'productive';
      }
      return 'focused';
    }

    // 放松模式
    if (stressLevel < 0.3 && energyLevel > 0.7) {
      return 'relaxed';
    }

    // 无聊模式
    if (focusLevel < 0.3 && stressLevel < 0.3 && energyLevel > 0.5) {
      return 'bored';
    }

    // 默认：专注模式
    return 'focused';
  }

  /**
   * 生成建议
   */
  private generateSuggestions(
    pattern: BehaviorPatternResult['pattern'],
    behavior: BehaviorData
  ): string[] {
    const suggestions: string[] = [];

    switch (pattern) {
      case 'stressed':
        suggestions.push('建议休息一下，深呼吸放松');
        suggestions.push('可以尝试短暂的冥想或伸展运动');
        suggestions.push('考虑喝杯水，缓解紧张情绪');
        break;

      case 'overworked':
        suggestions.push('工作时间过长，请立即休息！');
        suggestions.push('建议休息至少15-30分钟');
        suggestions.push('可以听听音乐或看看远方放松眼睛');
        suggestions.push('长期过度工作会影响健康，请注意劳逸结合');
        break;

      case 'focused':
        suggestions.push('保持专注，但记得适时休息');
        suggestions.push('可以设置番茄钟提醒');
        break;

      case 'productive':
        suggestions.push('工作效率很高，继续保持！');
        suggestions.push('记录下这种状态，分析什么让你更高效');
        break;

      case 'relaxed':
        suggestions.push('状态很放松，适合做创意性工作');
        suggestions.push('或者享受休闲时光');
        break;

      case 'bored':
        suggestions.push('觉得无聊吗？试试换个任务');
        suggestions.push('或者起来活动一下，换个心情');
        break;
    }

    // 基于具体行为的建议
    const workHours = behavior.workDuration / 60;
    if (workHours > 8) {
      suggestions.push(`已连续工作${Math.floor(workHours)}小时，建议结束工作`);
    }

    if (behavior.breakInterval < 15) {
      suggestions.push('休息间隔太短，建议每次休息至少15分钟');
    }

    return suggestions;
  }

  /**
   * 生成警告
   */
  private generateWarnings(behavior: BehaviorData): string[] {
    const warnings: string[] = [];

    const workHours = behavior.workDuration / 60;

    // 工作时间警告
    if (workHours > 10) {
      warnings.push('警告：工作时间过长，可能影响健康！');
    } else if (workHours > 8) {
      warnings.push('已超过正常工作时长，建议尽快休息');
    }

    // 休息间隔警告
    if (behavior.breakInterval < 10) {
      warnings.push('休息间隔过短，可能导致疲劳累积');
    }

    // 打字速度警告
    if (behavior.typingSpeed > 500) {
      warnings.push('打字速度过快，可能处于紧张状态');
    }

    // 窗口切换警告
    const switchesPerHour = behavior.windowSwitches / (behavior.workDuration / 60);
    if (switchesPerHour > 80) {
      warnings.push('窗口切换过于频繁，注意力可能分散');
    }

    return warnings;
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(
    stressLevel: number,
    focusLevel: number,
    energyLevel: number
  ): number {
    // 如果各项指标差异很大，降低置信度
    const variance = [
      stressLevel,
      focusLevel,
      energyLevel,
    ].reduce((sum, val, _, arr) => {
      const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
      return sum + Math.pow(val - mean, 2);
    }, 0) / 3;

    return Math.max(0.5, 1 - variance);
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<BehaviorAnalyzerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取当前配置
   */
  getConfig(): BehaviorAnalyzerConfig {
    return { ...this.config };
  }
}

/**
 * 创建全局实例
 */
let analyzerInstance: BehaviorAnalyzer | null = null;

export function getBehaviorAnalyzer(): BehaviorAnalyzer {
  if (!analyzerInstance) {
    analyzerInstance = new BehaviorAnalyzer();
  }
  return analyzerInstance;
}
