/**
 * Meditation Sessions Content
 * 冥想引导内容
 *
 * 3个正念冥想引导，用于帮助用户放松减压
 */

import type { MeditationSession, MeditationSegment } from './types';

/**
 * 创建冥想段落
 */
function createSegment(
  type: MeditationSegment['type'],
  duration: number,
  content: string,
  instruction?: string
): MeditationSegment {
  return {
    type,
    duration,
    content,
    instruction,
  };
}

export const MEDITATION_SESSIONS: MeditationSession[] = [
  {
    id: 'body-scan',
    title: '身体扫描',
    duration: 5,
    type: 'body_scan',
    description: '从头到脚逐步放松身体各部位，释放累积的紧张',
    segments: [
      createSegment('intro', 30, '欢迎来到身体扫描冥想。找一个舒适的姿势，可以坐着或躺着。'),
      createSegment('breathing', 45, '先做三个深呼吸。吸气...呼气...让身体开始放松。'),
      createSegment('focus', 30, '现在，把注意力集中到头顶。感受头皮的触感，让那里的紧张慢慢释放。'),
      createSegment('focus', 30, '注意力移到额头和眉毛。如果有皱眉，轻轻放松它们。'),
      createSegment('focus', 30, '感受眼睛周围的肌肉。让眼睛轻轻闭上，放松眼眶周围的区域。'),
      createSegment('focus', 30, '注意力来到下巴和嘴巴。让下巴自然松开，嘴唇轻轻闭合。'),
      createSegment('focus', 30, '感受颈部和肩膀。这里常常积累很多紧张。让肩膀自然下沉，释放压力。'),
      createSegment('focus', 30, '注意力移到手臂和双手。感受从肩膀到指尖的放松感传递。'),
      createSegment('focus', 30, '现在关注胸部和背部。感受呼吸时胸腔的起伏，让后背贴着支撑面放松。'),
      createSegment('focus', 30, '注意力来到腹部。让腹部柔软，不需要收紧。'),
      createSegment('focus', 30, '感受腰部和臀部。让这个区域完全放松，感受身体的重量。'),
      createSegment('focus', 30, '注意力移到大腿和膝盖。让腿部肌肉松弛下来。'),
      createSegment('focus', 30, '感受小腿和脚踝。让紧张从腿部流走。'),
      createSegment('focus', 30, '最后，关注双脚。感受脚底的触感，每个脚趾都放松下来。'),
      createSegment('integration', 45, '现在，感受整个身体。从头到脚，一片温暖放松的感觉。'),
      createSegment('closing', 30, '慢慢开始动动手指和脚趾。当你准备好时，轻轻睁开眼睛。'),
    ],
  },
  {
    id: 'breath-focus',
    title: '呼吸专注',
    duration: 5,
    type: 'focused',
    description: '专注于呼吸，平息心绪，找回内心的平静',
    segments: [
      createSegment('intro', 30, '欢迎来到呼吸专注冥想。这是一个简单而强大的练习，帮助你回到当下。'),
      createSegment('breathing', 45, '首先，自然地呼吸几次。不需要改变呼吸的节奏，只是观察它。'),
      createSegment('focus', 60, '现在，注意呼吸进入身体时的感觉。空气从鼻子进入，带着微微的凉意。', '专注于吸气'),
      createSegment('focus', 60, '然后注意呼气时的感觉。温暖的气息从鼻子或嘴巴离开。', '专注于呼气'),
      createSegment('focus', 60, '感受胸腔随呼吸起伏。吸气时轻轻扩张，呼气时自然回落。'),
      createSegment('focus', 60, '也可以感受腹部的运动。吸气时腹部轻轻隆起，呼气时柔和收回。'),
      createSegment('guidance', 45, '如果发现思绪飘走了，没关系。这是正常的。轻轻把注意力带回呼吸。'),
      createSegment('focus', 60, '继续观察呼吸。每一次呼吸都是新的开始，每一次都带来平静。'),
      createSegment('focus', 60, '感受呼吸之间的短暂停顿。那个宁静的片刻。'),
      createSegment('integration', 45, '你做得很好。每次专注于呼吸的练习，都在增强你的专注力。'),
      createSegment('closing', 30, '慢慢扩大你的觉知。感受整个身体，感受周围的环境。当你准备好时，睁开眼睛。'),
    ],
  },
  {
    id: 'loving-kindness',
    title: '慈心冥想',
    duration: 5,
    type: 'loving_kindness',
    description: '培养对自己和他人的善意与慈悲',
    segments: [
      createSegment('intro', 30, '欢迎来到慈心冥想。这个练习帮助我们培养对自己和他人的善意。'),
      createSegment('breathing', 30, '先让身体放松，做几个深呼吸。'),
      createSegment('focus', 45, '首先，把注意力放在自己身上。想象一个温暖的光芒在心中升起。'),
      createSegment('affirmation', 45, '在心里默念：愿我平安。愿我快乐。愿我健康。愿我生活安宁。', '对自己的祝福'),
      createSegment('focus', 30, '感受这些祝福带来的温暖。你值得被善待，被爱护。'),
      createSegment('focus', 45, '现在，想一个你爱的人。可以是家人、朋友或伴侣。在心中看到他们的面容。'),
      createSegment('affirmation', 45, '把祝福送给他们：愿你平安。愿你快乐。愿你健康。愿你生活安宁。', '对爱人的祝福'),
      createSegment('focus', 45, '接下来，想一个普通的相识。可能是邻居、同事或常见的路人。'),
      createSegment('affirmation', 45, '也把祝福送给他们：愿你平安。愿你快乐。愿你健康。愿你生活安宁。', '对他人的祝福'),
      createSegment('focus', 45, '最后，把这份善意扩展到所有人。想象光芒从心中向四面八方扩散。'),
      createSegment('affirmation', 45, '愿所有人平安。愿所有人快乐。愿所有人健康。愿所有人生活安宁。', '对众生的祝福'),
      createSegment('integration', 30, '感受心中的温暖和开阔。善意没有边界，慈悲可以无限。'),
      createSegment('closing', 30, '带着这份善意，慢慢回到当下。睁开眼睛，把这份温暖带入生活。'),
    ],
  },
];

/**
 * 获取所有冥想课程
 */
export function getAllMeditations(): MeditationSession[] {
  return MEDITATION_SESSIONS;
}

/**
 * 根据ID获取冥想课程
 */
export function getMeditationById(id: string): MeditationSession | undefined {
  return MEDITATION_SESSIONS.find((m) => m.id === id);
}

/**
 * 根据类型获取冥想课程
 */
export function getMeditationsByType(type: MeditationSession['type']): MeditationSession[] {
  return MEDITATION_SESSIONS.filter((m) => m.type === type);
}
