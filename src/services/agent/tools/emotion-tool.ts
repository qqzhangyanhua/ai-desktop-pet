/**
 * 情绪工具
 * Emotion Tool
 *
 * 提供情绪分析与记录能力：
 * - 文本情绪分析
 * - 情绪记录存储
 * - 情绪趋势计算
 */

import type {
  AgentToolResult,
  EmotionType,
  EmotionRecord,
  EmotionTrend,
} from '@/types/agent-system';

/**
 * 情绪关键词映射
 */
const EMOTION_KEYWORDS: Record<EmotionType, string[]> = {
  happy: [
    '开心', '高兴', '快乐', '愉快', '幸福', '太棒了', '好开心',
    '哈哈', '嘻嘻', '真好', '好耶', '太好了', 'nice', 'great',
  ],
  sad: [
    '难过', '伤心', '悲伤', '失落', '沮丧', '郁闷', '不开心',
    '哭', '泪', '唉', '呜呜', '好惨', '心痛',
  ],
  anxious: [
    '焦虑', '担心', '紧张', '害怕', '恐惧', '不安', '慌',
    '压力', '崩溃', '烦躁', '着急', '急死了',
  ],
  excited: [
    '兴奋', '激动', '期待', '迫不及待', '超期待', '好激动',
    '太刺激了', '太嗨了', '冲冲冲',
  ],
  calm: [
    '平静', '放松', '安心', '舒适', '惬意', '安宁', '淡定',
    '还好', '一般', '正常',
  ],
  angry: [
    '生气', '愤怒', '恼火', '气死了', '烦死了', '讨厌', '可恶',
    '混蛋', '去死', '滚',
  ],
  confused: [
    '困惑', '迷茫', '不懂', '不理解', '懵', '奇怪', '纳闷',
    '为什么', '怎么回事', '搞不懂',
  ],
  neutral: [],
};

/**
 * 情绪记录存储
 */
const emotionRecords: EmotionRecord[] = [];

/**
 * 生成情绪记录 ID
 */
function generateEmotionId(): string {
  return `emo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 分析文本情绪
 */
export async function analyzeEmotion(
  text: string
): Promise<AgentToolResult<{
  emotion: EmotionType;
  intensity: number;
  keywords: string[];
}>> {
  try {
    const lowerText = text.toLowerCase();
    const matchedEmotions: Array<{
      emotion: EmotionType;
      keywords: string[];
      count: number;
    }> = [];

    // 匹配各种情绪关键词
    (Object.entries(EMOTION_KEYWORDS) as Array<[EmotionType, string[]]>).forEach(
      ([emotion, keywords]) => {
        const matched = keywords.filter((keyword) =>
          lowerText.includes(keyword.toLowerCase())
        );
        if (matched.length > 0) {
          matchedEmotions.push({
            emotion,
            keywords: matched,
            count: matched.length,
          });
        }
      }
    );

    // 如果没有匹配到，返回中性
    if (matchedEmotions.length === 0) {
      return {
        success: true,
        data: {
          emotion: 'neutral',
          intensity: 3,
          keywords: [],
        },
      };
    }

    // 选择匹配最多的情绪
    matchedEmotions.sort((a, b) => b.count - a.count);
    const bestMatch = matchedEmotions[0];

    // 计算强度（1-10）
    const intensity = Math.min(10, 3 + bestMatch.count * 2);

    return {
      success: true,
      data: {
        emotion: bestMatch.emotion,
        intensity,
        keywords: bestMatch.keywords,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 记录情绪
 */
export async function recordEmotion(params: {
  emotion: EmotionType;
  intensity: number;
  trigger?: string;
  conversationId?: string;
}): Promise<AgentToolResult<EmotionRecord>> {
  try {
    const record: EmotionRecord = {
      id: generateEmotionId(),
      emotion: params.emotion,
      intensity: Math.max(1, Math.min(10, params.intensity)),
      trigger: params.trigger,
      timestamp: Date.now(),
      conversationId: params.conversationId,
    };

    emotionRecords.push(record);

    // 限制存储大小
    if (emotionRecords.length > 1000) {
      emotionRecords.shift();
    }

    return {
      success: true,
      data: record,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 获取最近情绪记录
 */
export async function getRecentEmotions(
  limit: number = 10
): Promise<AgentToolResult<EmotionRecord[]>> {
  try {
    const recent = emotionRecords.slice(-limit).reverse();

    return {
      success: true,
      data: recent,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 计算情绪趋势
 */
export async function getEmotionTrend(params: {
  periodHours: number;
}): Promise<AgentToolResult<EmotionTrend>> {
  try {
    const now = Date.now();
    const periodStart = now - params.periodHours * 60 * 60 * 1000;

    // 过滤时间段内的记录
    const periodRecords = emotionRecords.filter(
      (r) => r.timestamp >= periodStart
    );

    if (periodRecords.length === 0) {
      return {
        success: true,
        data: {
          periodStart,
          periodEnd: now,
          dominantEmotion: 'neutral',
          distribution: {
            happy: 0,
            sad: 0,
            anxious: 0,
            excited: 0,
            calm: 0,
            angry: 0,
            confused: 0,
            neutral: 1,
          },
          averageIntensity: 5,
          volatility: 0,
        },
      };
    }

    // 计算情绪分布
    const distribution: Record<EmotionType, number> = {
      happy: 0,
      sad: 0,
      anxious: 0,
      excited: 0,
      calm: 0,
      angry: 0,
      confused: 0,
      neutral: 0,
    };

    let totalIntensity = 0;
    const intensities: number[] = [];

    periodRecords.forEach((r) => {
      distribution[r.emotion]++;
      totalIntensity += r.intensity;
      intensities.push(r.intensity);
    });

    // 归一化分布
    const total = periodRecords.length;
    (Object.keys(distribution) as EmotionType[]).forEach((key) => {
      distribution[key] = distribution[key] / total;
    });

    // 找出主导情绪
    let dominantEmotion: EmotionType = 'neutral';
    let maxCount = 0;
    (Object.entries(distribution) as Array<[EmotionType, number]>).forEach(
      ([emotion, count]) => {
        if (count > maxCount) {
          maxCount = count;
          dominantEmotion = emotion;
        }
      }
    );

    // 计算波动度（标准差）
    const avgIntensity = totalIntensity / total;
    const variance =
      intensities.reduce((sum, i) => sum + Math.pow(i - avgIntensity, 2), 0) /
      total;
    const volatility = Math.sqrt(variance);

    return {
      success: true,
      data: {
        periodStart,
        periodEnd: now,
        dominantEmotion,
        distribution,
        averageIntensity: avgIntensity,
        volatility,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 获取情绪建议
 */
export async function getEmotionSuggestion(
  emotion: EmotionType,
  intensity: number
): Promise<AgentToolResult<string>> {
  try {
    const suggestions: Record<EmotionType, string[]> = {
      happy: [
        '太好了！继续保持这份好心情吧~',
        '看到你开心我也很开心！',
        '分享快乐，快乐加倍！',
      ],
      sad: [
        '我陪着你，有什么想说的都可以告诉我',
        '难过的时候深呼吸，会好起来的',
        '要不要听一个治愈的故事？',
      ],
      anxious: [
        '深呼吸，慢慢来，我陪着你',
        '要不要试试呼吸训练？',
        '一切都会好起来的，别太担心',
      ],
      excited: [
        '哇！发生什么好事了？',
        '你的兴奋感染到我了！',
        '好期待听你分享！',
      ],
      calm: [
        '平静的状态很好，继续保持~',
        '心如止水，这很棒',
        '享受这份宁静吧',
      ],
      angry: [
        '我理解你的心情，想聊聊吗？',
        '深呼吸，让我们一起冷静下来',
        '有什么我能帮到你的吗？',
      ],
      confused: [
        '有什么困惑的地方？说出来我帮你分析',
        '没关系，慢慢理清思路',
        '一起想想办法吧',
      ],
      neutral: [
        '今天过得怎么样？',
        '有什么想聊的吗？',
        '我随时都在这里陪你',
      ],
    };

    const emotionSuggestions = suggestions[emotion];
    const randomIndex = Math.floor(Math.random() * emotionSuggestions.length);

    return {
      success: true,
      data: emotionSuggestions[randomIndex],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 情绪工具导出
 */
export const emotionTool = {
  analyze: analyzeEmotion,
  record: recordEmotion,
  getRecent: getRecentEmotions,
  getTrend: getEmotionTrend,
  getSuggestion: getEmotionSuggestion,
};
