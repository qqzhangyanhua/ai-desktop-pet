// @ts-nocheck
/**
 * 日程管家智能体
 * Schedule Manager Agent
 *
 * 智能日程管理：
 * - 日程识别解析
 * - 日程 CRUD
 * - 智能提醒
 * - 冲突检测
 */

import { BaseAgent } from './base-agent';
import type {
  AgentMetadata,
  AgentContext,
  AgentResult,
  AgentTrigger,
  SchedulePayload,
} from '@/types/agent-system';
import { scheduleTool, type ScheduleEntry } from '../tools/schedule-tool';
import { notificationTool } from '../tools/notification-tool';

/**
 * 日程管家智能体元数据
 */
const SCHEDULE_MANAGER_METADATA: AgentMetadata = {
  id: 'agent-schedule-manager',
  name: '日程管家智能体',
  description: '智能管理日程，不再错过重要事项',
  version: '1.0.0',
  icon: '📅',
  category: 'productivity',
  priority: 'high',
  isSystem: false,
};

/**
 * 默认触发器
 */
const DEFAULT_TRIGGERS: AgentTrigger[] = [
  // 日程相关关键词
  {
    id: 'trigger-schedule-keywords',
    type: 'user_message',
    config: {
      keywords: [
        '提醒我', '帮我记', '明天', '后天', '下周',
        '点', '日程', '安排', '计划', '会议',
        '开会', '约会', '生日', '纪念日',
      ],
    },
    enabled: true,
    description: '检测到日程相关内容',
  },
  // 查询日程关键词
  {
    id: 'trigger-schedule-query',
    type: 'user_message',
    config: {
      keywords: [
        '今天有什么', '有什么安排', '日程是什么',
        '接下来', '什么计划', '什么任务',
      ],
    },
    enabled: true,
    description: '日程查询',
  },
  // 定时检查提醒
  {
    id: 'trigger-reminder-check',
    type: 'schedule',
    config: {
      intervalSeconds: 60, // 每分钟检查
    },
    enabled: true,
    description: '定时检查即将到期的提醒',
  },
];

/**
 * 时间模式匹配
 */
const TIME_PATTERNS = [
  // 明天/后天 + 时间
  {
    pattern: /(明天|后天|大后天)(?:上午|下午|晚上)?(\d{1,2})(?:点|:)(\d{0,2})?/,
    extractor: (match: RegExpMatchArray) => {
      const dayOffset =
        match[1] === '明天' ? 1 : match[1] === '后天' ? 2 : 3;
      const hour = parseInt(match[2]);
      const minute = parseInt(match[3]) || 0;

      const date = new Date();
      date.setDate(date.getDate() + dayOffset);
      date.setHours(hour, minute, 0, 0);

      return date.getTime();
    },
  },
  // 下周X
  {
    pattern: /下(?:周|星期)([一二三四五六日天])(?:上午|下午|晚上)?(\d{1,2})?(?:点|:)?(\d{0,2})?/,
    extractor: (match: RegExpMatchArray) => {
      const dayMap: Record<string, number> = {
        日: 0, 天: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6,
      };
      const targetDay = dayMap[match[1]];
      const hour = parseInt(match[2]) || 9;
      const minute = parseInt(match[3]) || 0;

      const date = new Date();
      const currentDay = date.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      daysUntil += 7; // 下周

      date.setDate(date.getDate() + daysUntil);
      date.setHours(hour, minute, 0, 0);

      return date.getTime();
    },
  },
  // X月X日
  {
    pattern: /(\d{1,2})月(\d{1,2})[日号]?(?:上午|下午|晚上)?(\d{1,2})?(?:点|:)?(\d{0,2})?/,
    extractor: (match: RegExpMatchArray) => {
      const month = parseInt(match[1]) - 1;
      const day = parseInt(match[2]);
      const hour = parseInt(match[3]) || 9;
      const minute = parseInt(match[4]) || 0;

      const date = new Date();
      date.setMonth(month, day);
      date.setHours(hour, minute, 0, 0);

      // 如果日期已过，设为明年
      if (date.getTime() < Date.now()) {
        date.setFullYear(date.getFullYear() + 1);
      }

      return date.getTime();
    },
  },
  // 今天 + 时间
  {
    pattern: /今天(?:上午|下午|晚上)?(\d{1,2})(?:点|:)(\d{0,2})?/,
    extractor: (match: RegExpMatchArray) => {
      const hour = parseInt(match[1]);
      const minute = parseInt(match[2]) || 0;

      const date = new Date();
      date.setHours(hour, minute, 0, 0);

      return date.getTime();
    },
  },
  // X小时后
  {
    pattern: /(\d{1,2})(?:个)?小时后/,
    extractor: (match: RegExpMatchArray) => {
      const hours = parseInt(match[1]);
      return Date.now() + hours * 60 * 60 * 1000;
    },
  },
  // X分钟后
  {
    pattern: /(\d{1,3})分钟后/,
    extractor: (match: RegExpMatchArray) => {
      const minutes = parseInt(match[1]);
      return Date.now() + minutes * 60 * 1000;
    },
  },
];

/**
 * 日程管家智能体
 */
export class ScheduleManagerAgent extends BaseAgent {
  readonly metadata = SCHEDULE_MANAGER_METADATA;

  /** 待确认的日程 */
  private pendingSchedule: SchedulePayload | null = null;

  constructor() {
    super({
      enabled: true,
      tools: [
        'schedule_create',
        'schedule_query_today',
        'schedule_query_week',
        'schedule_check_conflicts',
        'schedule_remind',
        'notify',
      ],
      maxSteps: 5,
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
    // 创建日程
    this.registerTool('schedule_create', async (args) => {
      return scheduleTool.create(args as SchedulePayload);
    });

    // 查询今日日程
    this.registerTool('schedule_query_today', async () => {
      return scheduleTool.getToday();
    });

    // 查询本周日程
    this.registerTool('schedule_query_week', async () => {
      return scheduleTool.getWeek();
    });

    // 检查冲突
    this.registerTool('schedule_check_conflicts', async (args) => {
      return scheduleTool.checkConflicts(
        args.datetime as number,
        args.durationMinutes as number | undefined
      );
    });

    // 获取即将到期的提醒
    this.registerTool('schedule_remind', async () => {
      return scheduleTool.getUpcomingReminders();
    });

    // 通知
    this.registerTool('notify', async (args) => {
      return notificationTool.send({
        type: 'bubble',
        title: args.title as string,
        body: args.message as string,
        sound: true,
      });
    });
  }

  /**
   * 检查是否应该触发
   */
  async shouldTrigger(context: AgentContext): Promise<boolean> {
    const { triggerId, userMessage } = context;

    // 定时提醒检查始终触发
    if (triggerId === 'trigger-reminder-check') {
      return true;
    }

    // 用户消息触发需要有消息
    return !!userMessage && userMessage.length > 0;
  }

  /**
   * 执行日程管理
   */
  protected async onExecute(context: AgentContext): Promise<AgentResult> {
    const { triggerId, userMessage } = context;

    // 定时提醒检查
    if (triggerId === 'trigger-reminder-check') {
      return this.handleReminderCheck();
    }

    // 日程查询
    if (triggerId === 'trigger-schedule-query' && userMessage) {
      return this.handleScheduleQuery(userMessage);
    }

    // 日程创建
    if (triggerId === 'trigger-schedule-keywords' && userMessage) {
      return this.handleScheduleCreate(userMessage);
    }

    // 默认：尝试解析日程
    if (userMessage) {
      return this.handleScheduleCreate(userMessage);
    }

    return this.createResult(false, '无法处理请求');
  }

  /**
   * 处理提醒检查
   */
  private async handleReminderCheck(): Promise<AgentResult> {
    const result = await this.callTool<ScheduleEntry[]>('schedule_remind', {});

    if (!result.success || !result.data || result.data.length === 0) {
      return this.createResult(true, undefined, undefined, {
        data: { remindersChecked: true, count: 0 },
      });
    }

    // 发送提醒
    for (const schedule of result.data) {
      const timeStr = new Date(schedule.datetime).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      });

      await this.callTool('notify', {
        title: '⏰ 日程提醒',
        message: `${timeStr} - ${schedule.title}`,
      });
    }

    return this.createResult(true, undefined, undefined, {
      data: { remindersChecked: true, count: result.data.length },
    });
  }

  /**
   * 处理日程查询
   */
  private async handleScheduleQuery(message: string): Promise<AgentResult> {
    // 判断查询类型
    const isWeekQuery =
      message.includes('本周') ||
      message.includes('这周') ||
      message.includes('一周');

    const result = isWeekQuery
      ? await this.callTool<ScheduleEntry[]>('schedule_query_week', {})
      : await this.callTool<ScheduleEntry[]>('schedule_query_today', {});

    if (!result.success) {
      return this.createResult(false, '查询日程失败', result.error);
    }

    const schedules = result.data || [];

    if (schedules.length === 0) {
      const emptyMessage = isWeekQuery
        ? '本周暂时没有安排哦~'
        : '今天暂时没有安排，轻松一天~';
      return this.createResult(true, emptyMessage, undefined, {
        data: { schedules: [] },
      });
    }

    // 格式化日程列表
    const formatSchedule = (s: ScheduleEntry) => {
      const time = new Date(s.datetime).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
      return `📌 ${time} ${s.title}`;
    };

    const scheduleList = schedules.map(formatSchedule).join('\n');
    const prefix = isWeekQuery ? '本周的安排：' : '今天的安排：';

    return this.createResult(true, `${prefix}\n${scheduleList}`, undefined, {
      data: { schedules },
    });
  }

  /**
   * 处理日程创建
   */
  private async handleScheduleCreate(message: string): Promise<AgentResult> {
    // 解析时间
    const datetime = this.parseDateTime(message);

    if (!datetime) {
      return this.createResult(true, undefined, undefined, {
        data: { parsed: false, reason: 'no_time_found' },
      });
    }

    // 提取事件内容
    const content = this.extractEventContent(message);

    if (!content) {
      return this.createResult(true, undefined, undefined, {
        data: { parsed: false, reason: 'no_content_found' },
      });
    }

    // 检查冲突
    const conflictResult = await this.callTool<ScheduleEntry[]>(
      'schedule_check_conflicts',
      { datetime }
    );

    let conflictWarning = '';
    if (conflictResult.data && conflictResult.data.length > 0) {
      const conflictTime = new Date(
        conflictResult.data[0].datetime
      ).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      });
      conflictWarning = `\n⚠️ 注意：这个时间和「${conflictResult.data[0].title}」(${conflictTime}) 有冲突`;
    }

    // 创建日程
    const schedule: SchedulePayload = {
      title: content,
      datetime,
      remindBefore: 30, // 提前 30 分钟提醒
      category: this.guessCategory(content),
    };

    const createResult = await this.callTool<ScheduleEntry>('schedule_create', schedule);

    if (!createResult.success) {
      return this.createResult(false, '创建日程失败', createResult.error);
    }

    // 格式化确认消息
    const timeStr = new Date(datetime).toLocaleString('zh-CN', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    const confirmMessage = `好的，已为你添加日程：\n📅 ${timeStr}\n📝 ${content}${conflictWarning}\n\n我会提前 30 分钟提醒你~`;

    return this.createResult(true, confirmMessage, undefined, {
      shouldSpeak: true,
      data: {
        created: true,
        schedule: createResult.data,
        hasConflict: conflictResult.data && conflictResult.data.length > 0,
      },
    });
  }

  /**
   * 解析时间
   */
  private parseDateTime(text: string): number | null {
    for (const { pattern, extractor } of TIME_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        try {
          return extractor(match);
        } catch {
          continue;
        }
      }
    }
    return null;
  }

  /**
   * 提取事件内容
   */
  private extractEventContent(text: string): string | null {
    // 移除时间表达式
    let content = text;

    for (const { pattern } of TIME_PATTERNS) {
      content = content.replace(pattern, '');
    }

    // 移除触发词
    const removePatterns = [
      /提醒我/g,
      /帮我记/g,
      /记一下/g,
      /添加日程/g,
      /安排/g,
    ];

    for (const p of removePatterns) {
      content = content.replace(p, '');
    }

    // 清理
    content = content.trim().replace(/^[,，:：]/, '').trim();

    return content.length > 0 ? content : null;
  }

  /**
   * 猜测分类
   */
  private guessCategory(content: string): ScheduleEntry['category'] {
    const workKeywords = ['会议', '开会', '汇报', '工作', '项目', '客户'];
    const healthKeywords = ['运动', '健身', '体检', '医院', '吃药'];

    if (workKeywords.some((k) => content.includes(k))) {
      return 'work';
    }

    if (healthKeywords.some((k) => content.includes(k))) {
      return 'health';
    }

    return 'life';
  }
}
