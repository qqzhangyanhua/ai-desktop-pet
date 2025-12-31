// @ts-nocheck
/**
 * 时间表达式解析器
 * Datetime Parser
 *
 * 解析自然语言时间表达：
 * - 相对时间解析（明天/下周）
 * - 绝对时间解析（X月X日）
 * - 周期时间解析（每周一）
 * - 模糊时间处理（下午/晚上）
 */

/**
 * 解析结果
 */
export interface ParseResult {
  /** 是否成功解析 */
  success: boolean;
  /** 解析出的时间戳 */
  timestamp?: number;
  /** 原始文本 */
  originalText: string;
  /** 匹配的部分 */
  matchedText?: string;
  /** 是否为周期性 */
  isRecurring?: boolean;
  /** 周期类型 */
  recurringType?: 'daily' | 'weekly' | 'monthly';
  /** 置信度 (0-1) */
  confidence: number;
  /** 时间类型 */
  type?: 'relative' | 'absolute' | 'fuzzy';
}

/**
 * 时间解析规则
 */
interface ParseRule {
  pattern: RegExp;
  type: 'relative' | 'absolute' | 'fuzzy' | 'recurring';
  parser: (match: RegExpMatchArray, now: Date) => number;
  confidence: number;
}

/**
 * 星期映射
 */
const WEEKDAY_MAP: Record<string, number> = {
  日: 0, 天: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
};

/**
 * 时间段映射（小时范围）
 */
const TIME_PERIOD_MAP: Record<string, { start: number; default: number }> = {
  凌晨: { start: 0, default: 3 },
  早上: { start: 6, default: 8 },
  上午: { start: 8, default: 10 },
  中午: { start: 11, default: 12 },
  下午: { start: 13, default: 15 },
  傍晚: { start: 17, default: 18 },
  晚上: { start: 19, default: 20 },
  深夜: { start: 22, default: 23 },
};

/**
 * 解析规则列表
 */
const PARSE_RULES: ParseRule[] = [
  // ============================================================================
  // 相对时间
  // ============================================================================

  // X分钟后
  {
    pattern: /(\d{1,3})分钟后/,
    type: 'relative',
    parser: (match, now) => {
      const minutes = parseInt(match[1]);
      return now.getTime() + minutes * 60 * 1000;
    },
    confidence: 0.95,
  },

  // X小时后
  {
    pattern: /(\d{1,2})(?:个)?小时后/,
    type: 'relative',
    parser: (match, now) => {
      const hours = parseInt(match[1]);
      return now.getTime() + hours * 60 * 60 * 1000;
    },
    confidence: 0.95,
  },

  // X天后
  {
    pattern: /(\d{1,3})天后/,
    type: 'relative',
    parser: (match, now) => {
      const days = parseInt(match[1]);
      const date = new Date(now);
      date.setDate(date.getDate() + days);
      date.setHours(9, 0, 0, 0); // 默认上午 9 点
      return date.getTime();
    },
    confidence: 0.9,
  },

  // 今天 + 时间
  {
    pattern: /今天(?:(凌晨|早上|上午|中午|下午|傍晚|晚上|深夜))?(\d{1,2})(?:点|:)(\d{0,2})?/,
    type: 'relative',
    parser: (match, now) => {
      let hour = parseInt(match[2]);
      const minute = parseInt(match[3]) || 0;

      // 处理时间段
      if (match[1]) {
        const period = TIME_PERIOD_MAP[match[1]];
        if (period && hour < 12 && hour < period.start) {
          hour += 12;
        }
      }

      const date = new Date(now);
      date.setHours(hour, minute, 0, 0);
      return date.getTime();
    },
    confidence: 0.95,
  },

  // 明天/后天 + 时间
  {
    pattern: /(明天|后天|大后天)(?:(凌晨|早上|上午|中午|下午|傍晚|晚上|深夜))?(\d{1,2})?(?:点|:)?(\d{0,2})?/,
    type: 'relative',
    parser: (match, now) => {
      const dayOffset =
        match[1] === '明天' ? 1 : match[1] === '后天' ? 2 : 3;

      let hour = parseInt(match[3]) || 9;
      const minute = parseInt(match[4]) || 0;

      // 处理时间段
      if (match[2]) {
        const period = TIME_PERIOD_MAP[match[2]];
        if (period) {
          if (!match[3]) {
            hour = period.default;
          } else if (hour < 12 && hour < period.start) {
            hour += 12;
          }
        }
      }

      const date = new Date(now);
      date.setDate(date.getDate() + dayOffset);
      date.setHours(hour, minute, 0, 0);
      return date.getTime();
    },
    confidence: 0.95,
  },

  // 这周X / 本周X
  {
    pattern: /(?:这|本)(?:周|星期)([一二三四五六日天])(?:(凌晨|早上|上午|中午|下午|傍晚|晚上|深夜))?(\d{1,2})?(?:点|:)?(\d{0,2})?/,
    type: 'relative',
    parser: (match, now) => {
      const targetDay = WEEKDAY_MAP[match[1]];
      let hour = parseInt(match[3]) || 9;
      const minute = parseInt(match[4]) || 0;

      // 处理时间段
      if (match[2]) {
        const period = TIME_PERIOD_MAP[match[2]];
        if (period) {
          if (!match[3]) {
            hour = period.default;
          } else if (hour < 12 && hour < period.start) {
            hour += 12;
          }
        }
      }

      const date = new Date(now);
      const currentDay = date.getDay();
      let daysUntil = targetDay - currentDay;

      // 如果今天或已过，跳到下周
      if (daysUntil < 0) {
        daysUntil += 7;
      }

      date.setDate(date.getDate() + daysUntil);
      date.setHours(hour, minute, 0, 0);
      return date.getTime();
    },
    confidence: 0.9,
  },

  // 下周X
  {
    pattern: /下(?:周|星期)([一二三四五六日天])(?:(凌晨|早上|上午|中午|下午|傍晚|晚上|深夜))?(\d{1,2})?(?:点|:)?(\d{0,2})?/,
    type: 'relative',
    parser: (match, now) => {
      const targetDay = WEEKDAY_MAP[match[1]];
      let hour = parseInt(match[3]) || 9;
      const minute = parseInt(match[4]) || 0;

      // 处理时间段
      if (match[2]) {
        const period = TIME_PERIOD_MAP[match[2]];
        if (period) {
          if (!match[3]) {
            hour = period.default;
          } else if (hour < 12 && hour < period.start) {
            hour += 12;
          }
        }
      }

      const date = new Date(now);
      const currentDay = date.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      daysUntil += 7; // 下周

      date.setDate(date.getDate() + daysUntil);
      date.setHours(hour, minute, 0, 0);
      return date.getTime();
    },
    confidence: 0.95,
  },

  // ============================================================================
  // 绝对时间
  // ============================================================================

  // X月X日 + 时间
  {
    pattern: /(\d{1,2})月(\d{1,2})[日号]?(?:(凌晨|早上|上午|中午|下午|傍晚|晚上|深夜))?(\d{1,2})?(?:点|:)?(\d{0,2})?/,
    type: 'absolute',
    parser: (match, now) => {
      const month = parseInt(match[1]) - 1;
      const day = parseInt(match[2]);
      let hour = parseInt(match[4]) || 9;
      const minute = parseInt(match[5]) || 0;

      // 处理时间段
      if (match[3]) {
        const period = TIME_PERIOD_MAP[match[3]];
        if (period) {
          if (!match[4]) {
            hour = period.default;
          } else if (hour < 12 && hour < period.start) {
            hour += 12;
          }
        }
      }

      const date = new Date(now);
      date.setMonth(month, day);
      date.setHours(hour, minute, 0, 0);

      // 如果日期已过，设为明年
      if (date.getTime() < now.getTime()) {
        date.setFullYear(date.getFullYear() + 1);
      }

      return date.getTime();
    },
    confidence: 0.95,
  },

  // 年/月/日 格式
  {
    pattern: /(\d{4})[年./-](\d{1,2})[月./-](\d{1,2})[日号]?(?:\s+)?(\d{1,2})?(?:[:点])?(\d{0,2})?/,
    type: 'absolute',
    parser: (match, now) => {
      const year = parseInt(match[1]);
      const month = parseInt(match[2]) - 1;
      const day = parseInt(match[3]);
      const hour = parseInt(match[4]) || 9;
      const minute = parseInt(match[5]) || 0;

      const date = new Date(year, month, day, hour, minute, 0, 0);
      return date.getTime();
    },
    confidence: 0.98,
  },

  // ============================================================================
  // 模糊时间
  // ============================================================================

  // 仅时间段（今天）
  {
    pattern: /^(凌晨|早上|上午|中午|下午|傍晚|晚上|深夜)$/,
    type: 'fuzzy',
    parser: (match, now) => {
      const period = TIME_PERIOD_MAP[match[1]];
      const date = new Date(now);
      date.setHours(period.default, 0, 0, 0);

      // 如果时间已过，设为明天
      if (date.getTime() < now.getTime()) {
        date.setDate(date.getDate() + 1);
      }

      return date.getTime();
    },
    confidence: 0.7,
  },

  // 时间段 + 时间
  {
    pattern: /(凌晨|早上|上午|中午|下午|傍晚|晚上|深夜)(\d{1,2})(?:点|:)(\d{0,2})?/,
    type: 'fuzzy',
    parser: (match, now) => {
      let hour = parseInt(match[2]);
      const minute = parseInt(match[3]) || 0;

      const period = TIME_PERIOD_MAP[match[1]];
      if (period && hour < 12 && hour < period.start) {
        hour += 12;
      }

      const date = new Date(now);
      date.setHours(hour, minute, 0, 0);

      // 如果时间已过，设为明天
      if (date.getTime() < now.getTime()) {
        date.setDate(date.getDate() + 1);
      }

      return date.getTime();
    },
    confidence: 0.85,
  },
];

/**
 * 周期时间解析规则
 */
const RECURRING_RULES: Array<{
  pattern: RegExp;
  type: 'daily' | 'weekly' | 'monthly';
  parser: (match: RegExpMatchArray, now: Date) => number;
}> = [
  // 每天
  {
    pattern: /每天(?:(凌晨|早上|上午|中午|下午|傍晚|晚上|深夜))?(\d{1,2})?(?:点|:)?(\d{0,2})?/,
    type: 'daily',
    parser: (match, now) => {
      let hour = parseInt(match[2]) || 9;
      const minute = parseInt(match[3]) || 0;

      if (match[1]) {
        const period = TIME_PERIOD_MAP[match[1]];
        if (period && !match[2]) {
          hour = period.default;
        }
      }

      const date = new Date(now);
      date.setHours(hour, minute, 0, 0);

      if (date.getTime() < now.getTime()) {
        date.setDate(date.getDate() + 1);
      }

      return date.getTime();
    },
  },

  // 每周X
  {
    pattern: /每(?:周|星期)([一二三四五六日天])(?:(凌晨|早上|上午|中午|下午|傍晚|晚上|深夜))?(\d{1,2})?(?:点|:)?(\d{0,2})?/,
    type: 'weekly',
    parser: (match, now) => {
      const targetDay = WEEKDAY_MAP[match[1]];
      let hour = parseInt(match[3]) || 9;
      const minute = parseInt(match[4]) || 0;

      if (match[2]) {
        const period = TIME_PERIOD_MAP[match[2]];
        if (period && !match[3]) {
          hour = period.default;
        }
      }

      const date = new Date(now);
      const currentDay = date.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil < 0) daysUntil += 7;

      date.setDate(date.getDate() + daysUntil);
      date.setHours(hour, minute, 0, 0);

      if (date.getTime() < now.getTime()) {
        date.setDate(date.getDate() + 7);
      }

      return date.getTime();
    },
  },

  // 每月X号
  {
    pattern: /每月(\d{1,2})[日号]?(?:(凌晨|早上|上午|中午|下午|傍晚|晚上|深夜))?(\d{1,2})?(?:点|:)?(\d{0,2})?/,
    type: 'monthly',
    parser: (match, now) => {
      const day = parseInt(match[1]);
      let hour = parseInt(match[3]) || 9;
      const minute = parseInt(match[4]) || 0;

      if (match[2]) {
        const period = TIME_PERIOD_MAP[match[2]];
        if (period && !match[3]) {
          hour = period.default;
        }
      }

      const date = new Date(now);
      date.setDate(day);
      date.setHours(hour, minute, 0, 0);

      if (date.getTime() < now.getTime()) {
        date.setMonth(date.getMonth() + 1);
      }

      return date.getTime();
    },
  },
];

/**
 * 时间表达式解析器类
 */
class DatetimeParser {
  /**
   * 解析时间表达式
   */
  parse(text: string, baseTime?: Date): ParseResult {
    const now = baseTime || new Date();
    const trimmedText = text.trim();

    // 首先尝试周期时间解析
    for (const rule of RECURRING_RULES) {
      const match = trimmedText.match(rule.pattern);
      if (match) {
        try {
          const timestamp = rule.parser(match, now);
          return {
            success: true,
            timestamp,
            originalText: text,
            matchedText: match[0],
            isRecurring: true,
            recurringType: rule.type,
            confidence: 0.9,
            type: 'relative',
          };
        } catch {
          continue;
        }
      }
    }

    // 尝试普通时间解析
    for (const rule of PARSE_RULES) {
      const match = trimmedText.match(rule.pattern);
      if (match) {
        try {
          const timestamp = rule.parser(match, now);
          return {
            success: true,
            timestamp,
            originalText: text,
            matchedText: match[0],
            isRecurring: false,
            confidence: rule.confidence,
            type: rule.type,
          };
        } catch {
          continue;
        }
      }
    }

    // 解析失败
    return {
      success: false,
      originalText: text,
      confidence: 0,
    };
  }

  /**
   * 批量解析
   */
  parseAll(text: string, baseTime?: Date): ParseResult[] {
    const results: ParseResult[] = [];
    const now = baseTime || new Date();

    // 尝试所有规则
    const allRules = [...PARSE_RULES, ...RECURRING_RULES.map((r) => ({
      pattern: r.pattern,
      type: 'recurring' as const,
      parser: r.parser,
      confidence: 0.9,
    }))];

    for (const rule of allRules) {
      let match;
      const regex = new RegExp(rule.pattern.source, 'g');

      while ((match = regex.exec(text)) !== null) {
        try {
          const timestamp = rule.parser(match, now);
          results.push({
            success: true,
            timestamp,
            originalText: text,
            matchedText: match[0],
            confidence: rule.confidence,
            type: rule.type === 'recurring' ? 'relative' : rule.type,
          });
        } catch {
          continue;
        }
      }
    }

    // 按置信度排序
    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * 格式化时间
   */
  format(timestamp: number, format: 'full' | 'date' | 'time' | 'relative' = 'full'): string {
    const date = new Date(timestamp);
    const now = new Date();

    switch (format) {
      case 'date':
        return date.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'short',
        });

      case 'time':
        return date.toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
        });

      case 'relative':
        const diff = timestamp - now.getTime();
        const absDiff = Math.abs(diff);

        if (absDiff < 60 * 1000) {
          return diff >= 0 ? '马上' : '刚刚';
        }

        if (absDiff < 60 * 60 * 1000) {
          const minutes = Math.floor(absDiff / (60 * 1000));
          return diff >= 0 ? `${minutes}分钟后` : `${minutes}分钟前`;
        }

        if (absDiff < 24 * 60 * 60 * 1000) {
          const hours = Math.floor(absDiff / (60 * 60 * 1000));
          return diff >= 0 ? `${hours}小时后` : `${hours}小时前`;
        }

        const days = Math.floor(absDiff / (24 * 60 * 60 * 1000));
        return diff >= 0 ? `${days}天后` : `${days}天前`;

      case 'full':
      default:
        return date.toLocaleString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
    }
  }

  /**
   * 获取友好的时间描述
   */
  getFriendlyDescription(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();

    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow =
      date.getDate() === tomorrow.getDate() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getFullYear() === tomorrow.getFullYear();

    const timeStr = date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (isToday) {
      return `今天 ${timeStr}`;
    }

    if (isTomorrow) {
      return `明天 ${timeStr}`;
    }

    return this.format(timestamp, 'full');
  }
}

/**
 * 导出单例
 */
export const datetimeParser = new DatetimeParser();
