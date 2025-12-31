/**
 * 冥想引导智能体
 * Meditation Guide Agent
 *
 * 提供专业的冥想引导：
 * - 呼吸训练
 * - 冥想场景
 * - 减压练习
 * - 冥想记录
 * - 智能推荐
 */

import { BaseAgent } from './base-agent';
import type {
  AgentMetadata,
  AgentContext,
  AgentResult,
  AgentTrigger,
  EmotionType,
} from '@/types/agent-system';
import { notificationTool } from '../tools/notification-tool';

/**
 * 冥想引导智能体元数据
 */
const MEDITATION_GUIDE_METADATA: AgentMetadata = {
  id: 'agent-meditation-guide',
  name: '冥想引导智能体',
  description: '提供专业的冥想引导，帮助用户放松身心',
  version: '1.0.0',
  icon: '🧘',
  category: 'wellness',
  priority: 'normal',
  isSystem: false,
};

/**
 * 冥想类型
 */
type MeditationType =
  | 'breathing' // 呼吸训练
  | 'body_scan' // 身体扫描
  | 'visualization' // 可视化冥想
  | 'mindfulness' // 正念冥想
  | 'relaxation'; // 放松练习

/**
 * 呼吸模式
 */
interface BreathingPattern {
  name: string;
  description: string;
  inhale: number; // 吸气秒数
  hold: number; // 屏息秒数
  exhale: number; // 呼气秒数
  holdAfter?: number; // 呼气后屏息
  cycles: number; // 循环次数
}

/**
 * 冥想场景
 */
interface MeditationScene {
  id: string;
  name: string;
  description: string;
  duration: number; // 分钟
  type: MeditationType;
  guidanceText: string[];
  backgroundSound?: string;
}

/**
 * 冥想记录
 */
interface MeditationRecord {
  id: string;
  type: MeditationType;
  sceneName: string;
  duration: number;
  completedAt: number;
  mood?: EmotionType;
}

/**
 * 默认触发器
 */
const DEFAULT_TRIGGERS: AgentTrigger[] = [
  // 冥想关键词
  {
    id: 'trigger-meditation-keywords',
    type: 'user_message',
    config: {
      keywords: [
        '冥想', '放松', '呼吸', '减压', '静心',
        '平静', '焦虑', '压力大', '深呼吸',
      ],
    },
    enabled: true,
    description: '冥想相关请求',
  },
  // 情绪触发
  {
    id: 'trigger-emotion',
    type: 'event',
    config: {
      eventName: 'emotion_detected',
      filter: { emotion: 'anxious' },
    },
    enabled: true,
    description: '检测到焦虑情绪时触发',
  },
];

/**
 * 呼吸模式列表
 */
const BREATHING_PATTERNS: BreathingPattern[] = [
  {
    name: '4-7-8 呼吸法',
    description: '经典的放松呼吸法，有助于减轻焦虑和帮助入睡',
    inhale: 4,
    hold: 7,
    exhale: 8,
    cycles: 4,
  },
  {
    name: '腹式呼吸',
    description: '深度腹式呼吸，激活副交感神经，快速放松',
    inhale: 4,
    hold: 2,
    exhale: 6,
    cycles: 6,
  },
  {
    name: '方形呼吸',
    description: '均衡呼吸法，提升专注力和平静感',
    inhale: 4,
    hold: 4,
    exhale: 4,
    holdAfter: 4,
    cycles: 4,
  },
  {
    name: '放松呼吸',
    description: '简单的放松呼吸，适合初学者',
    inhale: 3,
    hold: 0,
    exhale: 6,
    cycles: 5,
  },
];

/**
 * 冥想场景列表
 */
const MEDITATION_SCENES: MeditationScene[] = [
  {
    id: 'forest',
    name: '森林漫步',
    description: '想象自己漫步在宁静的森林中',
    duration: 5,
    type: 'visualization',
    guidanceText: [
      '闭上眼睛，深呼吸...',
      '想象你正走在一条林间小路上...',
      '阳光透过树叶，洒落斑驳的光影...',
      '你能听到鸟儿的歌唱，感受微风轻抚脸庞...',
      '每一步都让你更加放松...',
      '感受大自然的宁静与美好...',
      '慢慢地，压力正在远离你...',
      '你感到平静、安宁、充满能量...',
    ],
    backgroundSound: 'forest',
  },
  {
    id: 'ocean',
    name: '海边冥想',
    description: '聆听海浪的声音，感受海风的轻抚',
    duration: 5,
    type: 'visualization',
    guidanceText: [
      '闭上眼睛，让身体完全放松...',
      '想象你正坐在柔软的沙滩上...',
      '温暖的阳光洒在身上，暖洋洋的...',
      '听着海浪轻轻拍打沙滩的声音...',
      '一波又一波，像是自然的摇篮曲...',
      '随着每一次呼吸，你越来越放松...',
      '所有的烦恼都随着海浪远去...',
      '你感到自由、平静、无比轻松...',
    ],
    backgroundSound: 'ocean',
  },
  {
    id: 'body_scan',
    name: '身体扫描',
    description: '系统地放松身体的每个部位',
    duration: 10,
    type: 'body_scan',
    guidanceText: [
      '找一个舒适的姿势，闭上眼睛...',
      '首先，关注你的脚趾，感受它们...',
      '让脚趾完全放松，释放所有紧张...',
      '现在感受你的脚掌、脚踝...',
      '让放松的感觉慢慢向上蔓延...',
      '到小腿、膝盖、大腿...',
      '每个部位都变得越来越轻松...',
      '继续向上，到腹部、胸部...',
      '让呼吸自然流动...',
      '放松肩膀、手臂、双手...',
      '释放脖子和脸部的紧张...',
      '现在，整个身体都处于深度放松状态...',
    ],
  },
  {
    id: 'mindfulness',
    name: '正念呼吸',
    description: '专注于呼吸，活在当下',
    duration: 5,
    type: 'mindfulness',
    guidanceText: [
      '找一个舒适的坐姿...',
      '轻轻闭上眼睛，或者垂下眼帘...',
      '把注意力集中在呼吸上...',
      '不要控制呼吸，只是观察...',
      '感受空气进入鼻腔的感觉...',
      '感受胸腔和腹部的起伏...',
      '如果思绪飘走了，没关系...',
      '温柔地把注意力带回呼吸...',
      '就这样，保持当下的觉察...',
      '呼吸是你的锚，让你安住于此刻...',
    ],
  },
];

/**
 * 冥想引导智能体
 */
export class MeditationGuideAgent extends BaseAgent {
  readonly metadata = MEDITATION_GUIDE_METADATA;

  /** 冥想记录 */
  private records: MeditationRecord[] = [];

  /** 当前冥想状态 */
  private isInSession = false;

  /** 连续冥想天数 */
  private streakDays = 0;

  /** 上次冥想日期 */
  private lastMeditationDate: string | null = null;

  constructor() {
    super({
      enabled: true,
      tools: ['notify', 'play_sound'],
      maxSteps: 3,
      timeoutMs: 60000, // 冥想可能需要较长时间
    });

    this.triggers = [...DEFAULT_TRIGGERS];
  }

  /**
   * 初始化钩子
   */
  protected async onInitialize(): Promise<void> {
    this.registerBuiltinTools();
  }

  /**
   * 注册内置工具
   */
  protected registerBuiltinTools(): void {
    this.registerTool('notify', async (args) => {
      return notificationTool.send({
        type: 'bubble',
        title: (args.title as string) || '冥想引导',
        body: args.message as string,
      });
    });

    this.registerTool('play_sound', async (args) => {
      // 触发播放背景音乐事件
      const event = new CustomEvent('meditation-sound', {
        detail: { sound: args.sound },
      });
      window.dispatchEvent(event);
      return { success: true };
    });
  }

  /**
   * 检查是否应该触发
   */
  async shouldTrigger(context: AgentContext): Promise<boolean> {
    // 如果正在冥想中，不再触发
    if (this.isInSession) {
      return false;
    }

    return !!context.userMessage || context.triggerSource === 'event';
  }

  /**
   * 执行冥想引导
   */
  protected async onExecute(context: AgentContext): Promise<AgentResult> {
    const { userMessage, recentEmotions } = context;

    // 情绪触发
    if (context.triggerSource === 'event') {
      return this.suggestMeditation(recentEmotions);
    }

    // 用户消息处理
    if (userMessage) {
      return this.handleUserMessage(userMessage);
    }

    return this.createResult(false, '无法处理请求');
  }

  /**
   * 处理用户消息
   */
  private async handleUserMessage(message: string): Promise<AgentResult> {
    const lowerMessage = message.toLowerCase();

    // 查看冥想记录
    if (
      lowerMessage.includes('记录') ||
      lowerMessage.includes('统计') ||
      lowerMessage.includes('坚持')
    ) {
      return this.getMeditationStats();
    }

    // 呼吸训练
    if (lowerMessage.includes('呼吸')) {
      return this.startBreathingExercise();
    }

    // 身体扫描
    if (lowerMessage.includes('身体') || lowerMessage.includes('扫描')) {
      return this.startSceneGuidance('body_scan');
    }

    // 场景冥想
    if (lowerMessage.includes('森林')) {
      return this.startSceneGuidance('forest');
    }

    if (lowerMessage.includes('海') || lowerMessage.includes('海边')) {
      return this.startSceneGuidance('ocean');
    }

    // 默认：推荐冥想
    return this.recommendMeditation();
  }

  /**
   * 根据情绪推荐冥想
   */
  private suggestMeditation(
    recentEmotions: AgentContext['recentEmotions']
  ): AgentResult {
    const lastEmotion = recentEmotions[0];
    let suggestion: string;

    if (lastEmotion?.emotion === 'anxious') {
      suggestion =
        '我注意到你有些焦虑，要不要试试呼吸放松？只需要几分钟就能帮助你平静下来~';
    } else {
      suggestion =
        '感觉你需要放松一下，要不要一起来做个简短的冥想？';
    }

    return this.createResult(true, suggestion, undefined, {
      data: { type: 'suggestion' },
      actions: [
        {
          type: 'notification',
          payload: { title: '🧘 冥想建议', body: suggestion },
        },
      ],
    });
  }

  /**
   * 推荐冥想
   */
  private recommendMeditation(): AgentResult {
    const scenes = MEDITATION_SCENES.slice(0, 3)
      .map((s, i) => `${i + 1}. ${s.name} (${s.duration}分钟) - ${s.description}`)
      .join('\n');

    const message = `🧘 欢迎来到冥想空间~

我可以帮你：
• 呼吸训练 - 快速放松
• 身体扫描 - 深度放松
• 场景冥想 - 森林/海边

热门冥想场景：
${scenes}

想要开始哪种呢？`;

    return this.createResult(true, message, undefined, {
      data: { type: 'recommendation' },
    });
  }

  /**
   * 开始呼吸训练
   */
  private startBreathingExercise(
    patternName?: string
  ): AgentResult {
    const pattern =
      BREATHING_PATTERNS.find((p) => p.name === patternName) ||
      BREATHING_PATTERNS[0];

    const totalSeconds =
      (pattern.inhale + pattern.hold + pattern.exhale + (pattern.holdAfter || 0)) *
      pattern.cycles;
    const totalMinutes = Math.ceil(totalSeconds / 60);

    const instructions = this.generateBreathingInstructions(pattern);

    const message = `🌬️ ${pattern.name}

${pattern.description}

⏱️ 时长约 ${totalMinutes} 分钟，共 ${pattern.cycles} 个循环

准备好了吗？让我们开始：

${instructions}

完成后，慢慢睁开眼睛，感受身体的变化~`;

    // 记录冥想
    this.recordMeditation('breathing', pattern.name, totalMinutes);

    return this.createResult(true, message, undefined, {
      shouldSpeak: true,
      data: { type: 'breathing', pattern },
    });
  }

  /**
   * 生成呼吸指导
   */
  private generateBreathingInstructions(pattern: BreathingPattern): string {
    const steps: string[] = [];

    for (let i = 1; i <= pattern.cycles; i++) {
      steps.push(`第 ${i} 次循环：`);
      steps.push(`  吸气... ${pattern.inhale} 秒`);
      if (pattern.hold > 0) {
        steps.push(`  屏息... ${pattern.hold} 秒`);
      }
      steps.push(`  呼气... ${pattern.exhale} 秒`);
      if (pattern.holdAfter) {
        steps.push(`  屏息... ${pattern.holdAfter} 秒`);
      }
    }

    return steps.join('\n');
  }

  /**
   * 开始场景引导
   */
  private startSceneGuidance(sceneId: string): AgentResult {
    const scene = MEDITATION_SCENES.find((s) => s.id === sceneId);

    if (!scene) {
      return this.createResult(false, '未找到该冥想场景');
    }

    this.isInSession = true;

    const guidance = scene.guidanceText.join('\n\n');

    const message = `🧘 ${scene.name}

${scene.description}

⏱️ 预计时长：${scene.duration} 分钟

找一个舒适的位置，让我们开始...

---

${guidance}

---

🎉 冥想结束，感觉怎么样？

慢慢地回到当下，带着平静继续你的一天~`;

    // 记录冥想
    this.recordMeditation(scene.type, scene.name, scene.duration);
    this.isInSession = false;

    return this.createResult(true, message, undefined, {
      shouldSpeak: true,
      emotion: 'calm',
      data: { type: 'scene', scene },
    });
  }

  /**
   * 记录冥想
   */
  private recordMeditation(
    type: MeditationType,
    sceneName: string,
    duration: number
  ): void {
    const today = new Date().toDateString();

    // 更新连续天数
    if (this.lastMeditationDate) {
      const lastDate = new Date(this.lastMeditationDate);
      const todayDate = new Date(today);
      const diffDays = Math.floor(
        (todayDate.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000)
      );

      if (diffDays === 1) {
        this.streakDays++;
      } else if (diffDays > 1) {
        this.streakDays = 1;
      }
    } else {
      this.streakDays = 1;
    }

    this.lastMeditationDate = today;

    // 添加记录
    this.records.push({
      id: `med_${Date.now()}`,
      type,
      sceneName,
      duration,
      completedAt: Date.now(),
    });

    // 限制记录数量
    if (this.records.length > 100) {
      this.records.shift();
    }
  }

  /**
   * 获取冥想统计
   */
  private getMeditationStats(): AgentResult {
    const totalSessions = this.records.length;
    const totalMinutes = this.records.reduce((sum, r) => sum + r.duration, 0);

    // 最常用的类型
    const typeCounts: Record<string, number> = {};
    this.records.forEach((r) => {
      typeCounts[r.sceneName] = (typeCounts[r.sceneName] || 0) + 1;
    });

    let favoriteScene = '暂无';
    let maxCount = 0;
    Object.entries(typeCounts).forEach(([name, count]) => {
      if (count > maxCount) {
        maxCount = count;
        favoriteScene = name;
      }
    });

    const message = `🧘 你的冥想记录

📊 统计数据：
• 总冥想次数：${totalSessions} 次
• 总冥想时长：${totalMinutes} 分钟
• 连续坚持：${this.streakDays} 天
• 最爱场景：${favoriteScene}

${this.getStreakEncouragement()}`;

    return this.createResult(true, message, undefined, {
      data: {
        type: 'stats',
        totalSessions,
        totalMinutes,
        streakDays: this.streakDays,
      },
    });
  }

  /**
   * 获取连续天数鼓励语
   */
  private getStreakEncouragement(): string {
    if (this.streakDays === 0) {
      return '💡 开始你的第一次冥想吧！';
    }
    if (this.streakDays < 7) {
      return `🌱 继续保持，${7 - this.streakDays} 天后就能达成一周连续！`;
    }
    if (this.streakDays < 30) {
      return '🌿 太棒了！你正在培养一个好习惯！';
    }
    return '🌳 了不起！你已经是冥想达人了！';
  }

  /**
   * 获取可用场景
   */
  getAvailableScenes(): MeditationScene[] {
    return [...MEDITATION_SCENES];
  }

  /**
   * 获取呼吸模式
   */
  getBreathingPatterns(): BreathingPattern[] {
    return [...BREATHING_PATTERNS];
  }
}
