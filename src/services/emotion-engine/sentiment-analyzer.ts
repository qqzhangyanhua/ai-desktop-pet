/**
 * Sentiment Analyzer
 * 情绪分析引擎
 *
 * 支持中英文情绪分析，基于词典和规则
 */

import type { SentimentResult, EmotionType } from './types';

/**
 * 中文情绪词典
 */
const CHINESE_SENTIMENT_DICT = {
  // 正面词汇
  positive: {
    strong: [
      '太棒了', '超级好', '非常开心', '特别棒', '太高兴了', '太棒啦',
      '完美', '优秀', '卓越', '精彩', '出色', '惊人', '震撼',
      '激动', '兴奋', '狂喜', '喜悦', '愉快', '欢乐',
    ],
    medium: [
      '不错', '很好', '挺好', '还不错', '可以', '行',
      '开心', '高兴', '快乐', '满意', '喜欢', '爱',
      '舒服', '轻松', '自在', '愉快', '开心', '乐观',
    ],
    weak: [
      '还行', '一般', '凑合', '可以接受', '还行吧',
      '还好', '不错嘛', '尚可', '还行吧',
    ],
  },
  // 负面词汇
  negative: {
    strong: [
      '非常生气', '超级生气', '愤怒', '暴怒', '恼火',
      '讨厌', '恨', '厌恶', '憎恨', '鄙视',
      '绝望', '崩溃', '痛苦', '煎熬', '折磨',
      '糟糕', '太差了', '极差', '不可接受',
    ],
    medium: [
      '生气', '不开心', '难过', '伤心', '悲伤',
      '失望', '沮丧', '郁闷', '烦躁', '焦虑',
      '担心', '害怕', '恐惧', '紧张', '不安',
    ],
    weak: [
      '有点累', '不太行', '不太好', '一般般',
      '稍微有点', '有点小', '还行吧',
      '没劲', '无聊', '累', '困',
    ],
  },
};

/**
 * 英文情绪词典
 */
const ENGLISH_SENTIMENT_DICT = {
  positive: {
    strong: [
      'amazing', 'awesome', 'excellent', 'perfect', 'outstanding',
      'incredible', 'fantastic', 'wonderful', 'brilliant', 'superb',
      'excited', 'thrilled', 'ecstatic', 'delighted', 'joyful',
    ],
    medium: [
      'good', 'great', 'nice', 'happy', 'pleased',
      'satisfied', 'content', 'comfortable', 'relaxed', 'optimistic',
      'enjoy', 'like', 'love', 'pleasant', 'positive',
    ],
    weak: [
      'okay', 'fine', 'acceptable', 'decent', 'alright',
      'not bad', 'so so', 'fair', 'reasonable',
    ],
  },
  negative: {
    strong: [
      'terrible', 'horrible', 'awful', 'disgusting', 'hate',
      'furious', 'enraged', 'desperate', 'devastated', 'miserable',
      'unacceptable', 'worst', 'disaster', 'catastrophe',
    ],
    medium: [
      'bad', 'sad', 'angry', 'upset', 'disappointed',
      'frustrated', 'depressed', 'anxious', 'worried', 'scared',
      'tired', 'bored', 'stressed', 'overwhelmed', 'annoyed',
    ],
    weak: [
      'tired', 'a bit', 'slightly', 'kind of', 'somewhat',
      'not great', 'okay-ish', 'meh', 'blah',
    ],
  },
};

/**
 * 情感关键词映射
 */
const EMOTION_KEYWORDS: Record<EmotionType, string[]> = {
  happy: ['开心', '高兴', '快乐', 'happy', 'joy', 'excited', 'great'],
  excited: ['激动', '兴奋', '惊喜', 'excited', 'thrilled', 'amazing'],
  thinking: ['思考', '想想', '考虑', 'think', 'consider', 'wonder'],
  confused: ['困惑', '不明白', '疑惑', 'confused', 'puzzled', 'unsure'],
  surprised: ['惊讶', '意外', '哇', 'surprised', 'shocked', 'wow'],
  neutral: ['还好', '一般', 'okay', 'fine', 'alright', 'normal'],
  sad: ['难过', '伤心', '悲伤', 'sad', 'upset', 'down'],
  angry: ['生气', '愤怒', '恼火', 'angry', 'mad', 'furious'],
};

/**
 * SentimentAnalyzer 类
 */
export class SentimentAnalyzer {
  /**
   * 分析文本情绪
   */
  analyze(text: string): SentimentResult {
    if (!text || text.trim().length === 0) {
      return this.neutralResult();
    }

    // 检测语言
    const isChinese = /[\u4e00-\u9fa5]/.test(text);

    // 计算情绪分数
    const score = this.calculateScore(text, isChinese);

    // 提取关键词
    const keywords = this.extractKeywords(text, isChinese);

    // 确定情绪类型
    const sentiment = this.determineSentiment(score);

    // 映射到具体情绪
    const emotion = this.mapToEmotion(score, keywords);

    // 计算置信度
    const confidence = this.calculateConfidence(score, keywords);

    return {
      sentiment,
      confidence,
      emotion,
      score,
      keywords,
      details: {
        lexicalScore: score,
        syntacticScore: this.calculateSyntacticScore(text),
        contextualScore: this.calculateContextualScore(text),
      },
    };
  }

  /**
   * 计算情绪分数
   */
  private calculateScore(text: string, isChinese: boolean): number {
    const dict = isChinese ? CHINESE_SENTIMENT_DICT : ENGLISH_SENTIMENT_DICT;
    const lowerText = text.toLowerCase();

    let score = 0;
    let matchedKeywords: string[] = [];

    // 计算正面词汇得分
    for (const word of dict.positive.strong) {
      if (lowerText.includes(word)) {
        score += 0.8;
        matchedKeywords.push(word);
      }
    }
    for (const word of dict.positive.medium) {
      if (lowerText.includes(word)) {
        score += 0.5;
        matchedKeywords.push(word);
      }
    }
    for (const word of dict.positive.weak) {
      if (lowerText.includes(word)) {
        score += 0.2;
        matchedKeywords.push(word);
      }
    }

    // 计算负面词汇得分
    for (const word of dict.negative.strong) {
      if (lowerText.includes(word)) {
        score -= 0.8;
        matchedKeywords.push(word);
      }
    }
    for (const word of dict.negative.medium) {
      if (lowerText.includes(word)) {
        score -= 0.5;
        matchedKeywords.push(word);
      }
    }
    for (const word of dict.negative.weak) {
      if (lowerText.includes(word)) {
        score -= 0.2;
        matchedKeywords.push(word);
      }
    }

    // 限制分数范围 [-1, 1]
    return Math.max(-1, Math.min(1, score));
  }

  /**
   * 提取关键词
   */
  private extractKeywords(text: string, isChinese: boolean): string[] {
    const dict = isChinese ? CHINESE_SENTIMENT_DICT : ENGLISH_SENTIMENT_DICT;
    const lowerText = text.toLowerCase();
    const keywords: string[] = [];

    // 提取所有匹配的情绪词
    const allWords = [
      ...dict.positive.strong,
      ...dict.positive.medium,
      ...dict.positive.weak,
      ...dict.negative.strong,
      ...dict.negative.medium,
      ...dict.negative.weak,
    ];

    for (const word of allWords) {
      if (lowerText.includes(word) && !keywords.includes(word)) {
        keywords.push(word);
      }
    }

    return keywords;
  }

  /**
   * 确定情绪类型
   */
  private determineSentiment(score: number): 'positive' | 'negative' | 'neutral' {
    if (score > 0.2) return 'positive';
    if (score < -0.2) return 'negative';
    return 'neutral';
  }

  /**
   * 映射到具体情绪
   */
  private mapToEmotion(score: number, keywords: string[]): EmotionType {
    // 基于关键词匹配
    for (const [emotion, emotionKeywords] of Object.entries(EMOTION_KEYWORDS)) {
      for (const keyword of emotionKeywords) {
        if (keywords.some(k => k.includes(keyword))) {
          return emotion as EmotionType;
        }
      }
    }

    // 基于分数映射
    if (score > 0.6) return 'excited';
    if (score > 0.2) return 'happy';
    if (score < -0.6) return 'sad';
    if (score < -0.2) return 'sad';
    return 'neutral';
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(score: number, keywords: string[]): number {
    // 如果有关键词，置信度更高
    const keywordBonus = Math.min(keywords.length * 0.1, 0.3);

    // 如果分数接近0，置信度降低（不确定）
    const scoreClarity = 1 - Math.abs(score);

    return Math.min(0.95, 0.5 + keywordBonus + scoreClarity * 0.2);
  }

  /**
   * 计算句法层面得分
   */
  private calculateSyntacticScore(text: string): number {
    let score = 0;

    // 标点符号分析
    if (text.includes('！') || text.includes('!')) {
      score += 0.2; // 感叹号表示情绪强烈
    }
    if (text.includes('？') || text.includes('?')) {
      score -= 0.1; // 问号可能表示困惑
    }

    // 重复字符（如"太好了！！!"）
    if (/([！！])\1{2,}/.test(text)) {
      score += 0.3;
    }

    return Math.max(-1, Math.min(1, score));
  }

  /**
   * 计算上下文得分
   */
  private calculateContextualScore(text: string): number {
    // 这里可以添加更多上下文分析规则
    // 例如：时间段、前文上下文等
    return 0;
  }

  /**
   * 返回中性结果
   */
  private neutralResult(): SentimentResult {
    return {
      sentiment: 'neutral',
      confidence: 0.5,
      emotion: 'neutral',
      score: 0,
      keywords: [],
    };
  }

  /**
   * 批量分析
   */
  batchAnalyze(texts: string[]): SentimentResult[] {
    return texts.map(text => this.analyze(text));
  }

  /**
   * 分析对话历史
   */
  analyzeConversationHistory(
    messages: Array<{ role: string; content: string }>
  ): {
    overall: SentimentResult;
    trend: 'improving' | 'declining' | 'stable';
    averageScore: number;
  } {
    const results = this.batchAnalyze(
      messages.map(m => m.content)
    );

    const averageScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

    // 计算趋势
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (results.length >= 2) {
      const firstHalf = results.slice(0, Math.floor(results.length / 2));
      const secondHalf = results.slice(Math.floor(results.length / 2));

      const firstAvg = firstHalf.reduce((sum, r) => sum + r.score, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, r) => sum + r.score, 0) / secondHalf.length;

      if (secondAvg - firstAvg > 0.2) trend = 'improving';
      else if (secondAvg - firstAvg < -0.2) trend = 'declining';
    }

    return {
      overall: this.neutralResult(),
      trend,
      averageScore,
    };
  }
}

/**
 * 创建全局实例
 */
let analyzerInstance: SentimentAnalyzer | null = null;

export function getSentimentAnalyzer(): SentimentAnalyzer {
  if (!analyzerInstance) {
    analyzerInstance = new SentimentAnalyzer();
  }
  return analyzerInstance;
}
