/**
 * Keyword-based Intent Detector
 * 基于关键词的意图识别器
 */

import type { IntentResult, IntentType, KeywordConfig } from './types';

/**
 * 时间表达式正则
 */
const TIME_REGEX = /(明天|后天|下周|今天|今晚)\s*(\d{1,2})[点时:：](\d{1,2})?分?|(\d{1,2})[点时:：](\d{1,2})?分?/gi;

/**
 * 提取 URL
 */
function extractUrl(message: string): string | null {
  // 先尝试匹配完整 URL
  const fullUrlMatch = message.match(/https?:\/\/[^\s]+/i);
  if (fullUrlMatch) {
    return fullUrlMatch[0];
  }

  // 尝试匹配 www.xxx.com
  const wwwMatch = message.match(/www\.[^\s]+/i);
  if (wwwMatch) {
    return `https://${wwwMatch[0]}`;
  }

  // 尝试匹配域名（例如：baidu.com, github.com）
  const domainMatch = message.match(/([a-zA-Z0-9-]+\.(com|cn|net|org|io|dev|ai|app))/i);
  if (domainMatch) {
    return `https://${domainMatch[0]}`;
  }

  // 常见网站简称映射
  const siteMap: Record<string, string> = {
    '百度': 'https://baidu.com',
    '谷歌': 'https://google.com',
    'google': 'https://google.com',
    'github': 'https://github.com',
    'bilibili': 'https://bilibili.com',
    'b站': 'https://bilibili.com',
    '知乎': 'https://zhihu.com',
    '微博': 'https://weibo.com',
    'youtube': 'https://youtube.com',
  };

  for (const [key, url] of Object.entries(siteMap)) {
    if (message.includes(key)) {
      return url;
    }
  }

  return null;
}

/**
 * 提取时间和事项
 */
function extractReminder(message: string): Record<string, unknown> {
  const params: Record<string, unknown> = {
    title: '',
    datetime: 0,
  };

  // 提取时间表达式
  const timeMatch = message.match(TIME_REGEX);
  if (timeMatch) {
    // 简单解析（实际应使用专业时间解析库）
    const now = new Date();
    const timeStr = timeMatch[0];

    // 解析相对时间
    if (timeStr.includes('明天')) {
      now.setDate(now.getDate() + 1);
    } else if (timeStr.includes('后天')) {
      now.setDate(now.getDate() + 2);
    } else if (timeStr.includes('下周')) {
      now.setDate(now.getDate() + 7);
    }

    // 解析具体时间
    const hourMatch = timeStr.match(/(\d{1,2})[点时:：]/);
    if (hourMatch) {
      const hour = parseInt(hourMatch[1] ?? '0', 10);
      now.setHours(hour);
      now.setMinutes(0);
      now.setSeconds(0);
    }

    params.datetime = now.getTime();
  }

  // 提取事项（去除时间表达式后的内容）
  let title = message.replace(/提醒我|帮我记|帮我设置|设置|添加|创建/g, '');
  title = title.replace(TIME_REGEX, '').trim();
  params.title = title || '提醒';

  return params;
}

/**
 * 提取搜索关键词
 */
function extractSearchQuery(message: string): Record<string, unknown> {
  let query = message
    .replace(/搜索|查一下|查询|帮我查|帮我搜|找一下|找/g, '')
    .trim();

  return { query };
}

/**
 * 提取书签搜索查询词
 * 简化版：只做基本提取，复杂分析交给 executor 层的 LLM
 */
function extractBookmarkQuery(message: string): Record<string, unknown> {
  // 检测"列出全部"意图（没有具体关键词）
  const listAllPatterns = [
    /^(?:我有|有)(?:什么|哪些|多少)?书签[？?]?$/,
    /^(?:查看|看看|显示)(?:我的)?(?:全部)?书签[？?]?$/,
    /^书签列表[？?]?$/,
    /^所有书签[？?]?$/,
    /^我的书签[？?]?$/,
  ];

  for (const pattern of listAllPatterns) {
    if (pattern.test(message.trim())) {
      return { query: '', showAll: true };
    }
  }

  // 简单提取：只返回原始消息作为 query
  // 实际的关键词提取交给 executor 层（会根据复杂度决定是否用 LLM）
  // 这里只做一个占位，确保意图能被识别
  return { query: message };
}

/**
 * 提取天气位置
 */
function extractWeatherLocation(message: string): Record<string, unknown> {
  let location = message
    .replace(/天气|温度|怎么样|如何/g, '')
    .replace(/的|今天|明天|后天/g, '')
    .trim();

  // 如果没有指定位置，使用默认值
  if (!location || location.length < 2) {
    location = 'auto'; // 自动定位
  }

  return { location };
}

/**
 * 关键词配置表
 */
const KEYWORD_CONFIGS: KeywordConfig[] = [
  // 打开浏览器（优先级最高）
  {
    intent: 'open_url',
    keywords: ['打开', '访问', '浏览', '进入', '跳转', '去'],
    priority: 10,
    extractor: (msg) => {
      const url = extractUrl(msg);
      return url ? { url } : {};
    },
  },

  // 设置提醒
  {
    intent: 'set_reminder',
    keywords: ['提醒我', '提醒', '闹钟', '设置日程', '帮我记', '别忘了'],
    priority: 9,
    extractor: extractReminder,
  },

  // 查询日程
  {
    intent: 'query_schedule',
    keywords: ['今天有什么', '有什么安排', '日程', '计划是什么', '什么任务'],
    priority: 8,
  },

  // 书签搜索（优先级高于普通搜索）
  {
    intent: 'bookmark_search',
    keywords: [
      '书签',
      '收藏',
      'bookmark',
      '我收藏的',
      '找找书签',
      '收藏夹',
      '有什么书签',
      '有哪些书签',
      '谷歌书签',
      'GitHub书签',
    ],
    priority: 8,
    extractor: extractBookmarkQuery,
  },

  // 天气查询
  {
    intent: 'weather',
    keywords: ['天气', '温度', '下雨', '晴天', '多云', '气温'],
    priority: 7,
    extractor: extractWeatherLocation,
  },

  // 网络搜索
  {
    intent: 'search',
    keywords: ['搜索', '查一下', '查询', '帮我查', '帮我搜', '找一下'],
    priority: 6,
    extractor: extractSearchQuery,
  },

  // 剪贴板写入
  {
    intent: 'clipboard_write',
    keywords: ['复制', '帮我复制', '拷贝'],
    priority: 5,
    extractor: (msg) => {
      const content = msg.replace(/复制|帮我复制|拷贝/g, '').trim();
      return { content };
    },
  },

  // 剪贴板读取
  {
    intent: 'clipboard_read',
    keywords: ['剪贴板', '粘贴板', '复制的内容', '剪贴板里'],
    priority: 5,
  },
];

/**
 * 检测用户消息意图（基于关键词）
 */
export function detectIntentByKeywords(message: string): IntentResult | null {
  const normalizedMsg = message.toLowerCase().trim();

  // 按优先级排序
  const sortedConfigs = [...KEYWORD_CONFIGS].sort(
    (a, b) => (b.priority || 0) - (a.priority || 0)
  );

  for (const config of sortedConfigs) {
    // 检查是否包含任意关键词
    const matched = config.keywords.some((keyword) =>
      normalizedMsg.includes(keyword.toLowerCase())
    );

    if (matched) {
      // 提取参数
      const params = config.extractor ? config.extractor(message) : {};

      // 验证参数有效性（仅对需要特定参数的意图）
      if (config.intent === 'open_url' && !params.url) {
        continue; // URL 提取失败，继续尝试其他意图
      }

      if (config.intent === 'search' && !params.query) {
        continue; // 搜索词提取失败
      }

      // 注意：bookmark_search 不再验证 query
      // 因为 executor 层会根据复杂度决定如何提取关键词

      return {
        intent: config.intent,
        confidence: 0.9, // 关键词匹配置信度固定为 0.9
        params,
        matchMethod: 'keyword',
        originalMessage: message,
      };
    }
  }

  return null; // 未匹配到任何意图
}

/**
 * 获取所有支持的意图类型
 */
export function getSupportedIntents(): IntentType[] {
  return KEYWORD_CONFIGS.map((c) => c.intent);
}
