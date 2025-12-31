/**
 * 睡前故事智能体
 * Bedtime Story Agent
 *
 * 生成个性化睡前故事：
 * - 故事生成
 * - 故事播放
 * - 故事收藏
 * - 故事续写
 * - 入睡辅助
 */

import { BaseAgent } from './base-agent';
import type {
  AgentMetadata,
  AgentContext,
  AgentResult,
  AgentTrigger,
} from '@/types/agent-system';
import { notificationTool } from '../tools/notification-tool';

/**
 * 睡前故事智能体元数据
 */
const BEDTIME_STORY_METADATA: AgentMetadata = {
  id: 'agent-bedtime-story',
  name: '睡前故事智能体',
  description: '生成个性化睡前故事，陪伴用户入睡',
  version: '1.0.0',
  icon: '📖',
  category: 'entertainment',
  priority: 'normal',
  isSystem: false,
};

/**
 * 故事风格
 */
type StoryStyle = 'fairytale' | 'healing' | 'adventure' | 'scifi' | 'fantasy';

/**
 * 故事长度
 */
type StoryLength = 'short' | 'medium' | 'long';

/**
 * 故事数据
 */
interface Story {
  id: string;
  title: string;
  style: StoryStyle;
  content: string;
  length: StoryLength;
  createdAt: number;
  isFavorite: boolean;
}

/**
 * 默认触发器
 */
const DEFAULT_TRIGGERS: AgentTrigger[] = [
  // 故事关键词
  {
    id: 'trigger-story-keywords',
    type: 'user_message',
    config: {
      keywords: [
        '故事', '睡前故事', '讲故事', '听故事',
        '童话', '睡不着', '催眠', '入睡',
      ],
    },
    enabled: true,
    description: '故事相关请求',
  },
  // 夜间提醒
  {
    id: 'trigger-bedtime',
    type: 'condition',
    config: {
      expression: 'bedtime',
      checkIntervalMs: 30 * 60 * 1000,
      cooldownMs: 12 * 60 * 60 * 1000,
    },
    enabled: true,
    description: '睡前时间提醒听故事',
  },
];

/**
 * 故事模板
 */
const STORY_TEMPLATES: Record<StoryStyle, Array<{
  title: string;
  opening: string;
  middle: string[];
  ending: string;
}>> = {
  fairytale: [
    {
      title: '月亮上的小兔子',
      opening: '在很久很久以前，月亮上住着一只小白兔。小白兔有一对长长的耳朵，和一双亮晶晶的红眼睛。',
      middle: [
        '每天晚上，小白兔都会坐在月亮边上，看着地球上的小朋友们入睡。它最喜欢看着窗户里透出的温暖灯光，猜想着每个小朋友在做什么美梦。',
        '有一天，一颗流星从小白兔身边划过。"小白兔，小白兔，你为什么总是一个人待在月亮上呢？"流星问道。',
        '小白兔微微一笑："因为我要守护所有小朋友的梦呀。每当有小朋友做噩梦的时候，我就会跳下月亮，悄悄地给他们送去甜甜的梦。"',
        '流星被小白兔的善良感动了，它决定每天晚上都来陪小白兔说说话。从此以后，当你抬头看月亮的时候，说不定就能看到小白兔和流星在一起聊天呢。',
      ],
      ending: '所以，今晚也安心睡吧，小白兔正在月亮上守护着你的梦呢。晚安，好梦～',
    },
    {
      title: '云朵棉花糖',
      opening: '在天空最高最高的地方，有一片神奇的云彩王国。那里的云朵都是甜甜的棉花糖做的。',
      middle: [
        '云朵王国的小精灵每天都会飘到各家各户的窗前，偷偷地往小朋友的梦里撒一点点云朵棉花糖。',
        '吃了云朵棉花糖的梦，都会变得又甜又软，像躺在妈妈的怀抱里一样温暖。',
        '今晚，一只小精灵也来到了你的窗前。它轻轻地挥动翅膀，一片小小的云朵飘进了你的房间。',
        '云朵轻轻地落在你的枕头上，变成了最柔软的枕头垫。现在，你可以枕着云朵，安安心心地睡觉啦。',
      ],
      ending: '闭上眼睛，感受云朵的柔软，让美梦带着你飞上云端。晚安，明天见～',
    },
  ],
  healing: [
    {
      title: '小星星的旅行',
      opening: '在寂静的夜空中，有一颗特别的小星星。它不像其他星星那样安静地待在原地，而是喜欢到处旅行。',
      middle: [
        '今天晚上，小星星决定来看望你。它从遥远的银河系出发，一路上遇到了很多有趣的事情。',
        '它路过了一朵睡着的云，云在梦里轻轻打着呼噜；它飞过了一只夜行的猫头鹰，猫头鹰冲它眨了眨眼睛说"晚安"。',
        '小星星终于来到了你的窗前。它看到你今天可能有些累了，或者有些烦恼。小星星轻轻地闪烁着，仿佛在说："没关系的，一切都会好起来的。"',
        '"明天又是新的一天，会有新的阳光，新的希望。今晚，就让我陪着你慢慢入睡吧。"',
      ],
      ending: '小星星会一直在窗外守护你，直到你进入甜甜的梦乡。相信明天会更好。晚安～',
    },
  ],
  adventure: [
    {
      title: '梦境探险家',
      opening: '在梦的世界里，有一位了不起的探险家。他有一顶神奇的帽子，戴上它就能在不同的梦之间穿梭。',
      middle: [
        '今晚，探险家决定带你去一个特别的地方——糖果瀑布。那里的瀑布流淌的不是水，而是五颜六色的糖果。',
        '你们乘坐着云朵做的小船，顺着糖果河流前进。河岸两边长满了棒棒糖树和巧克力花。',
        '突然，一只可爱的糖果兔子跳了出来。"欢迎来到糖果世界！"它开心地说，"请收下这颗特别的梦想糖果。"',
        '你接过那颗闪闪发光的糖果，放进口袋里。探险家说："把它放在枕头下，就能做最甜美的梦。"',
      ],
      ending: '探险到此结束啦。现在，闭上眼睛，让糖果带你进入甜蜜的梦乡。晚安，小探险家～',
    },
  ],
  scifi: [
    {
      title: '星际宝宝',
      opening: '在遥远的外太空，有一艘专门运送好梦的飞船。飞船的船长是一只毛茸茸的外星小熊。',
      middle: [
        '小熊船长每天晚上都会驾驶飞船，给全宇宙的小朋友送去好梦。今晚，它来到了地球。',
        '飞船缓缓降落在你家的屋顶上，小熊船长踮起脚尖，从烟囱口偷偷往下看。',
        '"这个小朋友今天一定需要一个特别好的梦。"小熊船长打开了它的好梦百宝箱，挑选了一个最闪亮的梦。',
        '那是一个关于在星空中漫步的梦，你可以踩着星星跳舞，和月亮做朋友，还能在银河里游泳。',
      ],
      ending: '小熊船长已经把好梦放在了你的枕头边。现在，准备起飞，去星空中冒险吧！晚安～',
    },
  ],
  fantasy: [
    {
      title: '魔法森林的夜晚',
      opening: '在世界的某个角落，有一片会在夜晚发光的魔法森林。森林里住着各种神奇的小精灵。',
      middle: [
        '每当夜幕降临，蘑菇会变成小灯笼，萤火虫会排成一队，为森林里的小动物们照亮回家的路。',
        '今晚，森林里的睡眠精灵正在忙碌着。它们要给每一片树叶撒上睡眠粉，让整个森林都变得安静祥和。',
        '睡眠精灵轻轻地飞到你的窗前，它用羽毛一样轻柔的手，在你的额头上画了一个小小的星星。',
        '"这是送给你的安睡咒语，"精灵说，"它会让你的每一个梦都充满魔法和快乐。"',
      ],
      ending: '魔法已经生效，你的眼皮开始变得沉沉的。让魔法森林的精灵带你进入梦乡吧。晚安～',
    },
  ],
};

/**
 * 睡前故事智能体
 */
export class BedtimeStoryAgent extends BaseAgent {
  readonly metadata = BEDTIME_STORY_METADATA;

  /** 故事历史 */
  private storyHistory: Story[] = [];

  /** 收藏的故事 */
  private favorites: Story[] = [];

  /** 用户偏好风格 */
  private preferredStyle: StoryStyle = 'fairytale';

  /** 设置 */
  private settings = {
    bedtimeHour: 22, // 晚上 10 点
    enableBedtimeReminder: true,
    defaultLength: 'medium' as StoryLength,
    enableTTS: true,
  };

  constructor() {
    super({
      enabled: true,
      tools: ['notify', 'speak'],
      maxSteps: 3,
      timeoutMs: 30000,
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
        title: (args.title as string) || '📖 睡前故事',
        body: args.message as string,
      });
    });

    this.registerTool('speak', async (args) => {
      const event = new CustomEvent('agent-speak', {
        detail: { text: args.text, rate: 0.9 }, // 稍慢的语速
      });
      window.dispatchEvent(event);
      return { success: true };
    });
  }

  /**
   * 检查是否应该触发
   */
  async shouldTrigger(context: AgentContext): Promise<boolean> {
    const { triggerId, userMessage } = context;

    if (triggerId === 'trigger-bedtime') {
      return this.settings.enableBedtimeReminder && this.isBedtime();
    }

    return !!userMessage;
  }

  /**
   * 执行故事讲述
   */
  protected async onExecute(context: AgentContext): Promise<AgentResult> {
    const { triggerId, userMessage } = context;

    // 睡前提醒
    if (triggerId === 'trigger-bedtime') {
      return this.suggestBedtimeStory();
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

    // 查看收藏
    if (lowerMessage.includes('收藏') && lowerMessage.includes('看')) {
      return this.showFavorites();
    }

    // 收藏故事
    if (lowerMessage.includes('收藏')) {
      return this.favoriteLastStory();
    }

    // 选择风格
    if (lowerMessage.includes('童话') || lowerMessage.includes('公主')) {
      return this.tellStory('fairytale');
    }
    if (lowerMessage.includes('治愈') || lowerMessage.includes('温暖')) {
      return this.tellStory('healing');
    }
    if (lowerMessage.includes('冒险') || lowerMessage.includes('探险')) {
      return this.tellStory('adventure');
    }
    if (lowerMessage.includes('科幻') || lowerMessage.includes('太空')) {
      return this.tellStory('scifi');
    }
    if (lowerMessage.includes('魔法') || lowerMessage.includes('奇幻')) {
      return this.tellStory('fantasy');
    }

    // 默认：推荐故事或讲一个
    if (
      lowerMessage.includes('故事') ||
      lowerMessage.includes('睡不着') ||
      lowerMessage.includes('讲')
    ) {
      return this.tellStory(this.preferredStyle);
    }

    return this.showStoryMenu();
  }

  /**
   * 显示故事菜单
   */
  private showStoryMenu(): AgentResult {
    const message = `📖 睡前故事时间~

我可以给你讲不同风格的故事：
🧚 童话故事 - 充满梦幻和想象
💝 治愈故事 - 温暖人心的小故事
🗺️ 冒险故事 - 刺激有趣的探险
🚀 科幻故事 - 奇妙的宇宙冒险
✨ 奇幻故事 - 魔法世界的奇遇

想听什么类型的故事呢？`;

    return this.createResult(true, message, undefined, {
      data: { type: 'menu' },
    });
  }

  /**
   * 建议睡前故事
   */
  private suggestBedtimeStory(): AgentResult {
    const message = `🌙 夜深了，要不要听个故事再睡呢？

一个温馨的睡前故事，可以帮助你放松身心，更容易入睡哦~

直接说"讲个故事"就可以开始啦！`;

    return this.createResult(true, message, undefined, {
      shouldSpeak: true,
      data: { type: 'suggestion' },
    });
  }

  /**
   * 讲故事
   */
  private async tellStory(style: StoryStyle): Promise<AgentResult> {
    const templates = STORY_TEMPLATES[style];
    if (!templates || templates.length === 0) {
      return this.tellStory('fairytale'); // 降级到童话
    }

    const template = templates[Math.floor(Math.random() * templates.length)];

    // 组装故事
    const storyContent = [
      template.opening,
      ...template.middle,
      template.ending,
    ].join('\n\n');

    // 创建故事记录
    const story: Story = {
      id: `story_${Date.now()}`,
      title: template.title,
      style,
      content: storyContent,
      length: 'medium',
      createdAt: Date.now(),
      isFavorite: false,
    };

    this.storyHistory.push(story);

    // 限制历史数量
    if (this.storyHistory.length > 50) {
      this.storyHistory.shift();
    }

    // 更新偏好
    this.preferredStyle = style;

    const message = `📖 ${template.title}

${storyContent}

---

💭 故事讲完啦，希望你喜欢~
如果喜欢这个故事，可以说"收藏"保存起来哦`;

    // 如果启用TTS，朗读故事
    if (this.settings.enableTTS) {
      await this.callTool('speak', { text: storyContent });
    }

    return this.createResult(true, message, undefined, {
      shouldSpeak: false, // 故事已单独朗读
      emotion: 'calm',
      data: { type: 'story', story },
    });
  }

  /**
   * 收藏上一个故事
   */
  private favoriteLastStory(): AgentResult {
    if (this.storyHistory.length === 0) {
      return this.createResult(true, '还没有听过故事呢，先让我讲一个吧~');
    }

    const lastStory = this.storyHistory[this.storyHistory.length - 1];

    if (lastStory.isFavorite) {
      return this.createResult(true, '这个故事已经收藏过啦~');
    }

    lastStory.isFavorite = true;
    this.favorites.push(lastStory);

    return this.createResult(
      true,
      `⭐ 已收藏「${lastStory.title}」！现在你有 ${this.favorites.length} 个收藏的故事~`,
      undefined,
      { data: { type: 'favorite', story: lastStory } }
    );
  }

  /**
   * 显示收藏
   */
  private showFavorites(): AgentResult {
    if (this.favorites.length === 0) {
      return this.createResult(
        true,
        '还没有收藏的故事呢~听完故事后说"收藏"就可以保存喜欢的故事啦！'
      );
    }

    const list = this.favorites
      .slice(-5)
      .map((s, i) => `${i + 1}. ${s.title} (${this.getStyleName(s.style)})`)
      .join('\n');

    const message = `⭐ 你收藏的故事（最近 5 个）：

${list}

共收藏了 ${this.favorites.length} 个故事~`;

    return this.createResult(true, message, undefined, {
      data: { type: 'favorites', count: this.favorites.length },
    });
  }

  /**
   * 获取风格名称
   */
  private getStyleName(style: StoryStyle): string {
    const names: Record<StoryStyle, string> = {
      fairytale: '童话',
      healing: '治愈',
      adventure: '冒险',
      scifi: '科幻',
      fantasy: '奇幻',
    };
    return names[style];
  }

  /**
   * 判断是否是睡前时间
   */
  private isBedtime(): boolean {
    const hour = new Date().getHours();
    return hour >= this.settings.bedtimeHour || hour < 2;
  }

  /**
   * 更新设置
   */
  updateSettings(settings: Partial<typeof this.settings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * 获取故事历史
   */
  getStoryHistory(): Story[] {
    return [...this.storyHistory];
  }

  /**
   * 获取收藏
   */
  getFavorites(): Story[] {
    return [...this.favorites];
  }
}
