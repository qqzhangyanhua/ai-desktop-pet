/**
 * Pet Emotion Mapping Service
 * 宠物情绪映射服务
 *
 * 将宠物状态（mood/energy）映射到情绪类型（EmotionType）
 */

import type { EmotionType } from '@/types';

/**
 * Emotion priority levels for update filtering
 * 情绪优先级（用于更新过滤）
 *
 * Higher priority emotions should override lower ones
 */
const EMOTION_PRIORITY: Record<EmotionType, number> = {
  excited: 5, // 兴奋（最高优先级）
  confused: 5, // 困惑（需要关注）
  happy: 4, // 开心
  sad: 4, // 伤心
  surprised: 3, // 惊讶
  thinking: 2, // 思考
  neutral: 1, // 中性（最低优先级）
};

/**
 * Map pet mood and energy to emotion type
 * 将宠物心情和精力映射到情绪类型
 *
 * @param mood - Mood value (0-100)
 * @param energy - Energy value (0-100)
 * @returns Corresponding emotion type
 *
 * @example
 * getMoodEmotion(85, 75) // => 'excited' (开心且充满活力)
 * getMoodEmotion(25, 20) // => 'confused' (沮丧且疲惫)
 * getMoodEmotion(75, 30) // => 'happy' (开心但疲惫)
 */
export function getMoodEmotion(mood: number, energy: number): EmotionType {
  // 优先级 1: 极端复合状态
  if (mood >= 80 && energy >= 70) {
    return 'excited'; // 心情高 + 精力高 = 兴奋
  }

  if (mood <= 20 && energy <= 30) {
    return 'confused'; // 心情低 + 精力低 = 困惑/沮丧
  }

  // 优先级 2: 心情主导
  if (mood >= 70) {
    return 'happy'; // 心情好 = 开心
  }

  if (mood <= 30) {
    return 'sad'; // 心情差 = 伤心
  }

  // 优先级 3: 精力影响中性状态
  if (energy <= 40) {
    return 'thinking'; // 疲惫时陷入思考
  }

  // 默认: 中性状态
  return 'neutral';
}

/**
 * Determine if emotion should be updated
 * 判断是否应该更新情绪
 *
 * Prevents unnecessary updates for same emotions or lower-priority changes
 * 防止相同情绪或低优先级变化的不必要更新
 *
 * @param currentEmotion - Current emotion state
 * @param newEmotion - Newly calculated emotion
 * @returns True if emotion should be updated
 *
 * @example
 * shouldUpdateEmotion('neutral', 'happy') // => true (优先级提升)
 * shouldUpdateEmotion('happy', 'happy') // => false (相同情绪)
 * shouldUpdateEmotion('excited', 'thinking') // => false (优先级降低)
 */
export function shouldUpdateEmotion(
  currentEmotion: EmotionType,
  newEmotion: EmotionType
): boolean {
  // 相同情绪不更新
  if (currentEmotion === newEmotion) {
    return false;
  }

  // 只有更高或相同优先级的情绪才更新
  const currentPriority = EMOTION_PRIORITY[currentEmotion];
  const newPriority = EMOTION_PRIORITY[newEmotion];

  return newPriority >= currentPriority;
}

/**
 * Get emotion level category
 * 获取情绪强度等级
 *
 * @param emotion - Emotion type
 * @returns Emotion intensity level
 */
export function getEmotionIntensity(
  emotion: EmotionType
): 'high' | 'medium' | 'low' {
  switch (emotion) {
    case 'excited':
    case 'confused':
      return 'high'; // 强烈情绪

    case 'happy':
    case 'sad':
    case 'surprised':
      return 'medium'; // 中等情绪

    case 'thinking':
    case 'neutral':
      return 'low'; // 平静状态

    default:
      return 'low';
  }
}

/**
 * Get recommended interaction based on emotion
 * 根据情绪推荐互动方式
 *
 * @param emotion - Current emotion
 * @returns Recommended interaction types
 */
export function getRecommendedInteractionByEmotion(
  emotion: EmotionType
): Array<'pet' | 'feed' | 'play'> {
  switch (emotion) {
    case 'sad':
    case 'confused':
      // 心情差时需要安抚和喂食
      return ['pet', 'feed'];

    case 'thinking':
      // 疲惫时需要喂食恢复精力
      return ['feed', 'pet'];

    case 'neutral':
      // 中性状态可以玩耍
      return ['play', 'pet'];

    case 'happy':
      // 开心时最适合玩耍
      return ['play', 'feed'];

    case 'excited':
      // 兴奋时只需保持状态
      return ['pet', 'play'];

    case 'surprised':
      // 惊讶时需要安抚
      return ['pet'];

    default:
      return ['pet', 'feed', 'play'];
  }
}

/**
 * Calculate emotion from full pet status (including intimacy)
 * 从完整宠物状态计算情绪（包含亲密度）
 *
 * This extends getMoodEmotion to consider intimacy for 'surprised' state
 * 扩展 getMoodEmotion 以考虑亲密度对"惊讶"状态的影响
 *
 * @param mood - Mood value (0-100)
 * @param energy - Energy value (0-100)
 * @param intimacy - Intimacy value (0-100)
 * @param previousIntimacy - Previous intimacy value for comparison
 * @returns Emotion type with intimacy consideration
 */
export function getEmotionWithIntimacy(
  mood: number,
  energy: number,
  intimacy: number,
  previousIntimacy?: number
): EmotionType {
  // 检查亲密度是否有显著提升（触发惊讶）
  if (previousIntimacy !== undefined) {
    const intimacyGain = intimacy - previousIntimacy;

    // 亲密度提升超过5点 = 惊讶
    if (intimacyGain >= 5 && intimacy >= 20) {
      return 'surprised';
    }
  }

  // 其他情况使用标准映射
  return getMoodEmotion(mood, energy);
}
