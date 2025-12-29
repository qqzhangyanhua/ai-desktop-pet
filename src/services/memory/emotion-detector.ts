/**
 * Emotion detection service
 * Uses keyword matching to detect user emotions in text
 */

import type { EmotionDetectionResult } from '../../types';

/**
 * Emotion keyword mappings
 */
const EMOTION_KEYWORDS: Record<string, string[]> = {
  happy: [
    '开心', '高兴', '太棒了', '成功', '喜欢', '爱', '兴奋', '激动', '期待',
    '棒', '赞', '优秀', '厉害', '不错', '满意', '舒服', '美好', '快乐',
    'happy', 'great', 'awesome', 'love', 'excited', 'good',
  ],
  sad: [
    '难过', '伤心', '失望', '郁闷', '不开心', '痛苦', '沮丧', '失落',
    '哭', '悲伤', '忧伤', '痛苦', '糟糕', '烦', '讨厌', '恨',
    'sad', 'disappointed', 'upset', 'bad', 'hate',
  ],
  anxious: [
    '焦虑', '担心', '紧张', '压力', '压力大', '失眠', '害怕', '恐惧',
    '不安', '忧虑', '慌', '急', '愁', '烦躁',
    'anxious', 'worried', 'nervous', 'stress', 'scared',
  ],
  excited: [
    '兴奋', '激动', '期待', '迫不及待', '热血', '沸腾', '澎湃',
    'excited', 'thrilled', 'pumped',
  ],
};

/**
 * Detect emotion from text
 */
export function detectEmotion(text: string): EmotionDetectionResult {
  const lowerText = text.toLowerCase();

  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    const matched = keywords.filter(kw => lowerText.includes(kw.toLowerCase()));

    if (matched.length > 0) {
      return {
        detected: true,
        emotion: emotion as EmotionDetectionResult['emotion'],
        confidence: Math.min(matched.length * 0.3 + 0.3, 1),
        keywords: matched,
      };
    }
  }

  return {
    detected: false,
    emotion: 'neutral',
    confidence: 0,
    keywords: [],
  };
}

/**
 * Get emotion response template
 */
export function getEmotionResponse(emotion: EmotionDetectionResult['emotion']): string {
  const responses: Record<EmotionDetectionResult['emotion'], string[]> = {
    happy: [
      '看到你这么开心，我也好开心呢！',
      '太好了，为你感到高兴！',
      '你开心的样子真可爱~',
    ],
    sad: [
      '不要难过，我会一直陪着你',
      '摸摸头，一切都会好起来的',
      '难过了就跟我说说吧',
    ],
    anxious: [
      '深呼吸，放松一点，没问题的',
      '别太担心，你已经做得很好了',
      '压力大吗？休息一下吧',
    ],
    excited: [
      '看你这么兴奋，我也被感染了！',
      '哇，这么激动，是什么好事？',
      '太棒了，为你感到高兴！',
    ],
    neutral: [
      '嗯嗯，我明白了',
      '原来是这样',
      '好的',
    ],
  };

  const templates = responses[emotion] || responses.neutral;
  const index = Math.floor(Math.random() * templates.length);
  const selected = templates[index];

  return selected ?? templates[0] ?? '好的';
}

/**
 * Get emotion type for pet
 */
export function getPetEmotion(userEmotion: EmotionDetectionResult['emotion']): 'happy' | 'sad' | 'confused' | 'excited' | 'neutral' {
  const mapping: Record<EmotionDetectionResult['emotion'], 'happy' | 'sad' | 'confused' | 'excited' | 'neutral'> = {
    happy: 'happy',
    sad: 'sad',
    anxious: 'confused',
    excited: 'excited',
    neutral: 'neutral',
  };

  return mapping[userEmotion] ?? 'neutral';
}
