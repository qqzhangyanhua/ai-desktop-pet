/**
 * 天气生活智能体
 * Weather & Life Agent
 *
 * 基于天气提供生活建议：
 * - 天气查询
 * - 穿衣建议
 * - 出行建议
 * - 早间播报
 * - 天气记忆
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
 * 天气生活智能体元数据
 */
const WEATHER_LIFE_METADATA: AgentMetadata = {
  id: 'agent-weather-life',
  name: '天气生活智能体',
  description: '基于天气提供生活建议，做用户的贴心助手',
  version: '1.0.0',
  icon: '🌤️',
  category: 'utility',
  priority: 'normal',
  isSystem: false,
};

/**
 * 天气数据接口
 */
interface WeatherData {
  city: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  condition: string;
  conditionCode: string;
  windSpeed: number;
  windDirection: string;
  uvIndex: number;
  airQuality: number;
  sunrise: string;
  sunset: string;
  forecast: Array<{
    date: string;
    high: number;
    low: number;
    condition: string;
  }>;
  updatedAt: number;
}

/**
 * 穿衣建议等级
 */
type DressLevel = 'hot' | 'warm' | 'mild' | 'cool' | 'cold' | 'freezing';

/**
 * 默认触发器
 */
const DEFAULT_TRIGGERS: AgentTrigger[] = [
  // 早间播报
  {
    id: 'trigger-morning-broadcast',
    type: 'condition',
    config: {
      expression: 'morning_broadcast',
      checkIntervalMs: 30 * 60 * 1000, // 30 分钟
      cooldownMs: 12 * 60 * 60 * 1000, // 冷却 12 小时
    },
    enabled: true,
    description: '早间天气播报',
  },
  // 天气关键词
  {
    id: 'trigger-weather-keywords',
    type: 'user_message',
    config: {
      keywords: [
        '天气', '气温', '温度', '下雨', '晴天',
        '穿什么', '穿衣', '出门', '带伞',
      ],
    },
    enabled: true,
    description: '天气相关查询',
  },
];

/**
 * 穿衣建议模板
 */
const DRESS_SUGGESTIONS: Record<DressLevel, string[]> = {
  hot: [
    '天气炎热，建议穿短袖、短裤，注意防晒补水~',
    '高温天气，穿轻薄透气的衣服，记得涂防晒霜！',
    '今天很热哦，穿凉快点，多喝水~',
  ],
  warm: [
    '气温温暖，穿件薄外套或长袖就够了~',
    '天气不错，穿着舒适轻便的衣服吧~',
    '温暖的天气，可以穿薄衫或轻便的衣服~',
  ],
  mild: [
    '气温适中，建议穿长袖衬衫或薄外套~',
    '天气凉爽，穿件外套刚刚好~',
    '舒适的天气，穿着随意一点也没关系~',
  ],
  cool: [
    '有点凉，建议穿夹克或薄毛衣~',
    '天气转凉，记得添件外套哦~',
    '微凉的天气，穿件保暖的外套吧~',
  ],
  cold: [
    '天气较冷，穿厚外套或羽绒服~',
    '注意保暖！穿件厚实的外套~',
    '冷天记得多穿点，别着凉~',
  ],
  freezing: [
    '天气严寒，穿羽绒服、围巾、手套全套装备！',
    '超级冷！一定要穿最厚的衣服出门~',
    '严寒天气，做好全面保暖~',
  ],
};

/**
 * 天气状况建议
 */
const CONDITION_TIPS: Record<string, string> = {
  sunny: '阳光明媚，适合户外活动，记得防晒~',
  cloudy: '多云天气，出门带把伞以防万一~',
  rainy: '下雨啦，记得带伞！尽量避免户外活动~',
  stormy: '雷雨天气，尽量待在室内，注意安全！',
  snowy: '下雪了！出门注意路滑，穿防滑鞋~',
  foggy: '有雾，开车出行要小心，保持车距~',
  windy: '大风天气，注意防风，别让东西被吹跑~',
};

/**
 * 天气生活智能体
 */
export class WeatherLifeAgent extends BaseAgent {
  readonly metadata = WEATHER_LIFE_METADATA;

  /** 缓存的天气数据 */
  private cachedWeather: WeatherData | null = null;

  /** 用户城市 */
  private userCity: string = '北京';

  /** 设置 */
  private settings = {
    morningBroadcastHour: 7, // 早晨 7 点播报
    enableMorningBroadcast: true,
    cacheExpiryMs: 30 * 60 * 1000, // 缓存 30 分钟
  };

  constructor() {
    super({
      enabled: true,
      tools: ['get_weather', 'notify'],
      maxSteps: 3,
      timeoutMs: 15000,
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
    // 获取天气（模拟）
    this.registerTool('get_weather', async (args) => {
      const city = (args.city as string) || this.userCity;
      return this.fetchWeather(city);
    });

    // 通知工具
    this.registerTool('notify', async (args) => {
      return notificationTool.send({
        type: 'bubble',
        title: (args.title as string) || '天气提醒',
        body: args.message as string,
      });
    });
  }

  /**
   * 获取天气数据（模拟）
   */
  private async fetchWeather(city: string): Promise<{
    success: boolean;
    data?: WeatherData;
    error?: string;
  }> {
    // 检查缓存
    if (
      this.cachedWeather &&
      this.cachedWeather.city === city &&
      Date.now() - this.cachedWeather.updatedAt < this.settings.cacheExpiryMs
    ) {
      return { success: true, data: this.cachedWeather };
    }

    // 模拟天气数据
    const conditions = ['晴', '多云', '阴', '小雨'];
    const conditionCodes = ['sunny', 'cloudy', 'cloudy', 'rainy'];
    const randomIndex = Math.floor(Math.random() * 4);
    
    const mockWeather: WeatherData = {
      city,
      temperature: 18 + Math.floor(Math.random() * 15),
      feelsLike: 17 + Math.floor(Math.random() * 15),
      humidity: 40 + Math.floor(Math.random() * 40),
      condition: conditions[randomIndex] || '晴',
      conditionCode: conditionCodes[randomIndex] || 'sunny',
      windSpeed: 2 + Math.floor(Math.random() * 8),
      windDirection: (['东', '南', '西', '北'] as const)[Math.floor(Math.random() * 4)] || '东',
      uvIndex: Math.floor(Math.random() * 11),
      airQuality: 20 + Math.floor(Math.random() * 100),
      sunrise: '06:30',
      sunset: '18:45',
      forecast: [
        {
          date: '明天',
          high: 20 + Math.floor(Math.random() * 10),
          low: 10 + Math.floor(Math.random() * 8),
          condition: '多云',
        },
        {
          date: '后天',
          high: 22 + Math.floor(Math.random() * 10),
          low: 12 + Math.floor(Math.random() * 8),
          condition: '晴',
        },
      ],
      updatedAt: Date.now(),
    };

    this.cachedWeather = mockWeather;
    this.userCity = city;

    return { success: true, data: mockWeather };
  }

  /**
   * 检查是否应该触发
   */
  async shouldTrigger(context: AgentContext): Promise<boolean> {
    const { triggerId, userMessage } = context;

    // 用户消息触发
    if (context.triggerSource === 'user_message' && userMessage) {
      return true;
    }

    // 早间播报检查
    if (triggerId === 'trigger-morning-broadcast') {
      return this.settings.enableMorningBroadcast && this.isMorningBroadcastTime();
    }

    return true;
  }

  /**
   * 执行天气查询
   */
  protected async onExecute(context: AgentContext): Promise<AgentResult> {
    const { triggerId, userMessage } = context;

    // 早间播报
    if (triggerId === 'trigger-morning-broadcast') {
      return this.handleMorningBroadcast();
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

    // 提取城市名（简单匹配）
    const cityMatch = message.match(
      /(北京|上海|广州|深圳|杭州|成都|武汉|西安|南京|重庆|天津|苏州)/
    );
    const city = cityMatch ? cityMatch[1] : this.userCity;

    // 获取天气
    const weatherResult = await this.callTool<WeatherData>('get_weather', {
      city,
    });

    if (!weatherResult.success || !weatherResult.data) {
      return this.createResult(false, '获取天气信息失败，请稍后再试~');
    }

    const weather = weatherResult.data;

    // 判断查询类型
    if (lowerMessage.includes('穿什么') || lowerMessage.includes('穿衣')) {
      return this.getDressSuggestion(weather);
    }

    if (lowerMessage.includes('出门') || lowerMessage.includes('出行')) {
      return this.getTravelAdvice(weather);
    }

    if (lowerMessage.includes('带伞')) {
      return this.getUmbrellaAdvice(weather);
    }

    // 默认返回天气概览
    return this.getWeatherOverview(weather);
  }

  /**
   * 早间播报
   */
  private async handleMorningBroadcast(): Promise<AgentResult> {
    const weatherResult = await this.callTool<WeatherData>('get_weather', {});

    if (!weatherResult.success || !weatherResult.data) {
      return this.createResult(false, '获取天气失败');
    }

    const weather = weatherResult.data;
    const dressLevel = this.getDressLevel(weather.temperature);
    const dressAdvice =
      DRESS_SUGGESTIONS[dressLevel][
        Math.floor(Math.random() * DRESS_SUGGESTIONS[dressLevel].length)
      ];

    const broadcast = `🌅 早上好！今日天气播报：

📍 ${weather.city}
🌡️ 温度：${weather.temperature}°C（体感 ${weather.feelsLike}°C）
☁️ 天气：${weather.condition}
💨 风速：${weather.windDirection}风 ${weather.windSpeed}级
💧 湿度：${weather.humidity}%

👔 穿衣建议：${dressAdvice}

祝你今天愉快！`;

    await this.callTool('notify', {
      title: '🌅 早间天气播报',
      message: broadcast,
    });

    return this.createResult(true, broadcast, undefined, {
      shouldSpeak: true,
      data: { type: 'morning_broadcast', weather },
    });
  }

  /**
   * 获取天气概览
   */
  private getWeatherOverview(weather: WeatherData): AgentResult {
    const overview = `📍 ${weather.city} 天气：

🌡️ 温度：${weather.temperature}°C（体感 ${weather.feelsLike}°C）
☁️ 天气：${weather.condition}
💨 风：${weather.windDirection}风 ${weather.windSpeed}级
💧 湿度：${weather.humidity}%
☀️ 紫外线指数：${weather.uvIndex}
🌬️ 空气质量：${this.getAirQualityText(weather.airQuality)}

🌅 日出：${weather.sunrise} | 🌇 日落：${weather.sunset}

📆 未来天气：
${weather.forecast.map((f) => `  ${f.date}：${f.low}~${f.high}°C ${f.condition}`).join('\n')}`;

    return this.createResult(true, overview, undefined, {
      data: { type: 'overview', weather },
    });
  }

  /**
   * 获取穿衣建议
   */
  private getDressSuggestion(weather: WeatherData): AgentResult {
    const level = this.getDressLevel(weather.temperature);
    const suggestions = DRESS_SUGGESTIONS[level];
    const suggestion =
      suggestions[Math.floor(Math.random() * suggestions.length)];

    let extra = '';
    if (weather.conditionCode === 'rainy') {
      extra = '\n\n☔ 记得带伞哦！';
    } else if (weather.uvIndex >= 6) {
      extra = '\n\n🧴 紫外线较强，注意防晒！';
    }

    const message = `📍 ${weather.city} 现在 ${weather.temperature}°C

👔 穿衣建议：${suggestion}${extra}`;

    return this.createResult(true, message, undefined, {
      shouldSpeak: true,
      data: { type: 'dress', weather, level },
    });
  }

  /**
   * 获取出行建议
   */
  private getTravelAdvice(weather: WeatherData): AgentResult {
    const advices: string[] = [];

    // 天气状况
    const conditionTip = CONDITION_TIPS[weather.conditionCode];
    if (conditionTip) {
      advices.push(conditionTip);
    }

    // 空气质量
    if (weather.airQuality > 100) {
      advices.push('空气质量不佳，建议佩戴口罩~');
    }

    // 紫外线
    if (weather.uvIndex >= 6) {
      advices.push('紫外线较强，注意防晒~');
    }

    // 风力
    if (weather.windSpeed >= 5) {
      advices.push('风力较大，骑车出行要小心~');
    }

    const message = `📍 ${weather.city} 出行建议：

${advices.join('\n\n')}

🚗 总体来说，${this.getOverallTravelAdvice(weather)}`;

    return this.createResult(true, message, undefined, {
      data: { type: 'travel', weather },
    });
  }

  /**
   * 获取是否需要带伞
   */
  private getUmbrellaAdvice(weather: WeatherData): AgentResult {
    const needUmbrella = ['rainy', 'stormy'].includes(weather.conditionCode);
    const mightRain = weather.condition.includes('云');

    let message: string;
    if (needUmbrella) {
      message = `☔ 今天 ${weather.city} ${weather.condition}，记得带伞！`;
    } else if (mightRain) {
      message = `🌂 今天可能会有阵雨，建议带把伞以防万一~`;
    } else {
      message = `☀️ 今天天气不错，不用带伞啦~`;
    }

    return this.createResult(true, message, undefined, {
      shouldSpeak: true,
      data: { type: 'umbrella', needUmbrella },
    });
  }

  /**
   * 获取穿衣等级
   */
  private getDressLevel(temperature: number): DressLevel {
    if (temperature >= 32) return 'hot';
    if (temperature >= 26) return 'warm';
    if (temperature >= 20) return 'mild';
    if (temperature >= 14) return 'cool';
    if (temperature >= 5) return 'cold';
    return 'freezing';
  }

  /**
   * 获取空气质量文本
   */
  private getAirQualityText(aqi: number): string {
    if (aqi <= 50) return `${aqi} 优`;
    if (aqi <= 100) return `${aqi} 良`;
    if (aqi <= 150) return `${aqi} 轻度污染`;
    if (aqi <= 200) return `${aqi} 中度污染`;
    return `${aqi} 重度污染`;
  }

  /**
   * 获取总体出行建议
   */
  private getOverallTravelAdvice(weather: WeatherData): string {
    if (['stormy', 'snowy'].includes(weather.conditionCode)) {
      return '今天不太适合外出，尽量待在室内吧~';
    }
    if (weather.conditionCode === 'rainy') {
      return '记得带伞，适合室内活动~';
    }
    if (weather.temperature < 5 || weather.temperature > 35) {
      return '气温比较极端，外出要做好防护~';
    }
    return '今天适合出门，祝你愉快！';
  }

  /**
   * 判断是否是早间播报时间
   */
  private isMorningBroadcastTime(): boolean {
    const hour = new Date().getHours();
    return hour === this.settings.morningBroadcastHour;
  }

  /**
   * 设置用户城市
   */
  setCity(city: string): void {
    this.userCity = city;
    this.cachedWeather = null; // 清除缓存
  }

  /**
   * 更新设置
   */
  updateSettings(settings: Partial<typeof this.settings>): void {
    this.settings = { ...this.settings, ...settings };
  }
}
