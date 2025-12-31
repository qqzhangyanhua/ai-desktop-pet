// @ts-nocheck
/**
 * 记忆提取器
 * Memory Extractor
 *
 * 从对话中提取关键信息：
 * - 偏好提取（喜欢/不喜欢）
 * - 事件提取（日期/事件）
 * - 习惯提取（行为模式）
 * - 关系提取（人名/关系）
 */

import type { MemoryPayload } from '@/types/agent-system';

/**
 * 提取结果
 */
export interface ExtractionResult {
  /** 提取的记忆列表 */
  memories: MemoryPayload[];
  /** 提取的实体 */
  entities: ExtractedEntity[];
  /** 原始文本 */
  originalText: string;
  /** 置信度 */
  confidence: number;
}

/**
 * 提取的实体
 */
export interface ExtractedEntity {
  /** 实体类型 */
  type: 'person' | 'date' | 'location' | 'food' | 'activity' | 'thing';
  /** 实体值 */
  value: string;
  /** 在原文中的位置 */
  position: { start: number; end: number };
  /** 关联的情感 */
  sentiment?: 'positive' | 'negative' | 'neutral';
}

/**
 * 提取规则
 */
interface ExtractionRule {
  pattern: RegExp;
  type: MemoryPayload['type'];
  extractor: (match: RegExpMatchArray) => string;
  importance: number;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

/**
 * 提取规则列表
 */
const EXTRACTION_RULES: ExtractionRule[] = [
  // 偏好提取 - 正面
  {
    pattern: /我(?:很|特别|非常)?喜欢(.{2,30})/g,
    type: 'preference',
    extractor: (m) => `喜欢: ${m[1].trim()}`,
    importance: 7,
    sentiment: 'positive',
  },
  {
    pattern: /我爱(?:吃|玩|看|听)?(.{2,30})/g,
    type: 'preference',
    extractor: (m) => `喜欢: ${m[1].trim()}`,
    importance: 8,
    sentiment: 'positive',
  },
  {
    pattern: /我最(?:爱|喜欢)的是(.{2,30})/g,
    type: 'preference',
    extractor: (m) => `最爱: ${m[1].trim()}`,
    importance: 9,
    sentiment: 'positive',
  },
  {
    pattern: /(.{2,15})是我最(?:爱|喜欢)的/g,
    type: 'preference',
    extractor: (m) => `最爱: ${m[1].trim()}`,
    importance: 9,
    sentiment: 'positive',
  },

  // 偏好提取 - 负面
  {
    pattern: /我(?:很|特别|非常)?(?:不喜欢|讨厌|厌恶)(.{2,30})/g,
    type: 'preference',
    extractor: (m) => `不喜欢: ${m[1].trim()}`,
    importance: 7,
    sentiment: 'negative',
  },
  {
    pattern: /我不(?:想|要|爱)(.{2,30})/g,
    type: 'preference',
    extractor: (m) => `不喜欢: ${m[1].trim()}`,
    importance: 6,
    sentiment: 'negative',
  },

  // 事件提取 - 生日
  {
    pattern: /我的生日(?:是)?(\d{1,2}月\d{1,2}[日号]|\d{1,2}[./]\d{1,2})/g,
    type: 'event',
    extractor: (m) => `生日: ${m[1]}`,
    importance: 10,
  },
  {
    pattern: /(\d{1,2}月\d{1,2}[日号])是我(?:的)?生日/g,
    type: 'event',
    extractor: (m) => `生日: ${m[1]}`,
    importance: 10,
  },

  // 事件提取 - 纪念日
  {
    pattern: /(?:我们的)?纪念日(?:是)?(\d{1,2}月\d{1,2}[日号])/g,
    type: 'event',
    extractor: (m) => `纪念日: ${m[1]}`,
    importance: 9,
  },

  // 习惯提取
  {
    pattern: /我(?:通常|一般|经常|总是|每天)(.{2,30})/g,
    type: 'habit',
    extractor: (m) => `习惯: ${m[1].trim()}`,
    importance: 6,
  },
  {
    pattern: /我习惯(.{2,30})/g,
    type: 'habit',
    extractor: (m) => `习惯: ${m[1].trim()}`,
    importance: 7,
  },
  {
    pattern: /我每(?:天|周|月)(?:都)?(?:会)?(.{2,30})/g,
    type: 'habit',
    extractor: (m) => `习惯: ${m[1].trim()}`,
    importance: 6,
  },

  // 关系提取
  {
    pattern: /(.{2,10})是我的(.{2,10})/g,
    type: 'relationship' as MemoryPayload['type'],
    extractor: (m) => `关系: ${m[1].trim()} - ${m[2].trim()}`,
    importance: 8,
  },
  {
    pattern: /我的(.{2,10})(?:叫|是)(.{2,10})/g,
    type: 'relationship' as MemoryPayload['type'],
    extractor: (m) => `关系: ${m[2].trim()} - 我的${m[1].trim()}`,
    importance: 8,
  },
];

/**
 * 实体识别规则
 */
const ENTITY_PATTERNS = {
  date: /(\d{1,4}[年./-]\d{1,2}[月./-]\d{1,2}[日号]?|\d{1,2}月\d{1,2}[日号])/g,
  person: /(?:我的)?(?:爸爸|妈妈|爷爷|奶奶|哥哥|姐姐|弟弟|妹妹|老公|老婆|男朋友|女朋友|朋友|同事)(?:叫)?([^\s,，。！？]{2,6})?/g,
  food: /([\u4e00-\u9fa5]{2,8}(?:面|饭|菜|汤|肉|鱼|虾|蟹|粥|饼|包|糕|酒|茶|咖啡|奶茶|果汁))/g,
  activity: /(跑步|游泳|打球|健身|看书|看电影|听音乐|玩游戏|旅游|摄影|画画|写字|弹琴|唱歌)/g,
};

/**
 * 敏感词过滤
 */
const SENSITIVE_PATTERNS = [
  /密码/,
  /银行卡/,
  /身份证/,
  /手机号/,
  /账号/,
  /地址/,
  /\d{11}/, // 手机号
  /\d{16,19}/, // 银行卡号
  /\d{18}/, // 身份证号
];

/**
 * 记忆提取器类
 */
class MemoryExtractor {
  /**
   * 从文本中提取记忆
   */
  extract(text: string): ExtractionResult {
    // 检查敏感信息
    if (this.containsSensitiveInfo(text)) {
      return {
        memories: [],
        entities: [],
        originalText: text,
        confidence: 0,
      };
    }

    const memories: MemoryPayload[] = [];
    const entities: ExtractedEntity[] = [];

    // 应用提取规则
    for (const rule of EXTRACTION_RULES) {
      rule.pattern.lastIndex = 0;
      let match;

      while ((match = rule.pattern.exec(text)) !== null) {
        const content = rule.extractor(match);

        // 过滤太短或太长的内容
        if (content.length < 4 || content.length > 100) {
          continue;
        }

        // 检查重复
        if (!memories.some((m) => m.content === content)) {
          memories.push({
            type: rule.type,
            content,
            importance: rule.importance,
          });
        }
      }
    }

    // 提取实体
    for (const [type, pattern] of Object.entries(ENTITY_PATTERNS)) {
      pattern.lastIndex = 0;
      let match;

      while ((match = pattern.exec(text)) !== null) {
        const value = match[1] || match[0];

        if (value && value.length >= 2) {
          entities.push({
            type: type as ExtractedEntity['type'],
            value: value.trim(),
            position: {
              start: match.index,
              end: match.index + match[0].length,
            },
          });
        }
      }
    }

    // 计算置信度
    const confidence = this.calculateConfidence(text, memories, entities);

    return {
      memories,
      entities,
      originalText: text,
      confidence,
    };
  }

  /**
   * 检查敏感信息
   */
  private containsSensitiveInfo(text: string): boolean {
    return SENSITIVE_PATTERNS.some((pattern) => pattern.test(text));
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(
    text: string,
    memories: MemoryPayload[],
    entities: ExtractedEntity[]
  ): number {
    if (memories.length === 0 && entities.length === 0) {
      return 0;
    }

    // 基于提取数量和文本长度计算
    const extractCount = memories.length + entities.length;
    const textLength = text.length;

    // 提取密度
    const density = extractCount / (textLength / 50);

    // 限制在 0-1 之间
    return Math.min(1, Math.max(0, density * 0.5 + 0.3));
  }

  /**
   * 提取偏好
   */
  extractPreferences(text: string): MemoryPayload[] {
    const result = this.extract(text);
    return result.memories.filter((m) => m.type === 'preference');
  }

  /**
   * 提取事件
   */
  extractEvents(text: string): MemoryPayload[] {
    const result = this.extract(text);
    return result.memories.filter((m) => m.type === 'event');
  }

  /**
   * 提取习惯
   */
  extractHabits(text: string): MemoryPayload[] {
    const result = this.extract(text);
    return result.memories.filter((m) => m.type === 'habit');
  }

  /**
   * 提取人物关系
   */
  extractRelationships(text: string): MemoryPayload[] {
    const result = this.extract(text);
    return result.memories.filter((m) => m.type === 'relationship');
  }
}

/**
 * 导出单例
 */
export const memoryExtractor = new MemoryExtractor();
