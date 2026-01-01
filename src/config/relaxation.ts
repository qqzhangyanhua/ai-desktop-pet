/**
 * Relaxation Activity Configuration
 * 放松活动配置数据
 *
 * 三大活动：呼吸放松（4-7-8呼吸法）、睡前故事、正念冥想
 */

import type { RelaxationActivity, RelaxationActivityId } from '@/types/relaxation';

/**
 * All available relaxation activities - 所有可用放松活动
 */
export const RELAXATION_ACTIVITIES: RelaxationActivity[] = [
  // ========== 呼吸放松 (Breathing Exercise) ==========
  {
    id: 'breathing',
    name: '呼吸放松',
    duration: 240, // 4分钟
    animation: 'idle', // 使用idle动画
    icon: '🌬️',
    description: '4-7-8呼吸法，帮助你快速放松',
    steps: [
      {
        time: 0,
        instruction: '准备好了吗？找个舒服的姿势坐下...',
      },
      {
        time: 10,
        instruction: '闭上眼睛，感受身体的重量...',
      },
      {
        time: 20,
        instruction: '开始：用鼻子深吸气，数4秒\n1...2...3...4',
      },
      {
        time: 30,
        instruction: '屏住呼吸，数7秒\n1...2...3...4...5...6...7',
      },
      {
        time: 40,
        instruction: '慢慢呼气，数8秒\n1...2...3...4...5...6...7...8',
      },
      {
        time: 60,
        instruction: '很好！再来一次\n深吸气...1...2...3...4',
      },
      {
        time: 70,
        instruction: '屏住...1...2...3...4...5...6...7',
      },
      {
        time: 80,
        instruction: '呼气...1...2...3...4...5...6...7...8',
      },
      {
        time: 100,
        instruction: '继续这个节奏\n吸气4秒，屏息7秒，呼气8秒',
      },
      {
        time: 120,
        instruction: '感受气息在身体里流动...',
      },
      {
        time: 150,
        instruction: '放松肩膀，放松面部肌肉...',
      },
      {
        time: 180,
        instruction: '最后一次深呼吸\n吸...屏...呼...',
      },
      {
        time: 210,
        instruction: '慢慢睁开眼睛...',
      },
      {
        time: 230,
        instruction: '完成！感觉如何？',
      },
    ],
    effects: {
      mood: 15,
      energy: 10,
      boredom: -10,
    },
  },

  // ========== 睡前故事 (Bedtime Story) ==========
  {
    id: 'story',
    name: '睡前故事',
    duration: 300, // 5分钟
    animation: 'sleep',
    icon: '📖',
    description: '听一个温馨的小故事，帮助入眠',
    steps: [
      {
        time: 0,
        instruction: '今天要讲一个关于星星的故事...',
      },
      {
        time: 30,
        instruction: '很久很久以前，天上有一颗小星星...',
      },
      {
        time: 60,
        instruction: '小星星每天都在夜空中闪烁，\n为迷路的人指引方向。',
      },
      {
        time: 100,
        instruction: '有一天，小星星遇到了一只小兔子，\n小兔子迷路了，找不到回家的路。',
      },
      {
        time: 140,
        instruction: '小星星决定帮助小兔子。\n它降落到地面，变成了一盏小灯笼。',
      },
      {
        time: 180,
        instruction: '小灯笼照亮了森林的小路，\n小兔子终于找到了回家的方向。',
      },
      {
        time: 220,
        instruction: '小兔子感激地向小星星道谢。\n小星星笑着说："这是我应该做的。"',
      },
      {
        time: 260,
        instruction: '从那以后，小星星和小兔子成了好朋友。\n每天晚上，它们都会互相问候。',
      },
      {
        time: 290,
        instruction: '故事讲完了。\n就像小星星守护小兔子一样，\n我也会一直陪伴着你。晚安~',
      },
    ],
    effects: {
      mood: 20,
      energy: 15,
      boredom: -15,
    },
  },

  // ========== 正念冥想 (Meditation) ==========
  {
    id: 'meditation',
    name: '正念冥想',
    duration: 360, // 6分钟
    animation: 'idle',
    icon: '🧘',
    description: '专注当下，放空思绪',
    steps: [
      {
        time: 0,
        instruction: '找一个安静的地方坐下...',
      },
      {
        time: 20,
        instruction: '轻轻闭上眼睛，\n将注意力集中在呼吸上。',
      },
      {
        time: 50,
        instruction: '感受空气进入鼻腔，\n充满胸腔，再慢慢呼出。',
      },
      {
        time: 80,
        instruction: '如果思绪飘走了，\n不要强迫，温柔地把它带回来。',
      },
      {
        time: 120,
        instruction: '继续关注呼吸...\n吸气...呼气...',
      },
      {
        time: 160,
        instruction: '观察身体的感觉，\n哪里紧张？哪里放松？',
      },
      {
        time: 200,
        instruction: '不评判，不分析，\n只是觉察。',
      },
      {
        time: 240,
        instruction: '感受此刻的宁静...',
      },
      {
        time: 280,
        instruction: '慢慢将注意力带回身体，\n感受坐着的椅子，双脚的重量。',
      },
      {
        time: 320,
        instruction: '当你准备好时，\n慢慢睁开眼睛。',
      },
      {
        time: 350,
        instruction: '冥想结束。\n你做得很好！',
      },
    ],
    effects: {
      mood: 25,
      energy: 5,
      boredom: -20,
    },
  },
];

/**
 * Get activity by ID - 根据ID获取活动
 */
export function getRelaxationActivityById(
  id: RelaxationActivityId
): RelaxationActivity | undefined {
  return RELAXATION_ACTIVITIES.find((activity) => activity.id === id);
}

/**
 * Get all activity IDs - 获取所有活动ID
 */
export function getAllRelaxationActivityIds(): RelaxationActivityId[] {
  return RELAXATION_ACTIVITIES.map((activity) => activity.id);
}

/**
 * Get activity by duration range - 根据时长范围获取活动
 */
export function getActivitiesByDuration(
  minSeconds: number,
  maxSeconds: number
): RelaxationActivity[] {
  return RELAXATION_ACTIVITIES.filter(
    (activity) => activity.duration >= minSeconds && activity.duration <= maxSeconds
  );
}
