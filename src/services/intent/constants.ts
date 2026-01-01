/**
 * Intent System Constants
 * 意图系统常量配置
 */

/**
 * 书签搜索相关常量
 */
export const BOOKMARK_SEARCH_CONSTANTS = {
  /** 最大返回结果数 */
  MAX_RESULTS: 20,
  /** 最大建议数量 */
  MAX_SUGGESTIONS: 5,
  /** 默认查询限制 */
  DEFAULT_LIMIT: 10,
  /** 单个建议最大长度（字符） */
  MAX_SUGGESTION_LENGTH: 50,
  /** 建议最小长度（字符） */
  MIN_SUGGESTION_LENGTH: 2,
} as const;

/**
 * 通用建议配置
 */
export const SUGGESTIONS_CONFIG = {
  /** 全局最大建议数量 */
  MAX_COUNT: 5,
  /** 建议内容最大长度 */
  MAX_LENGTH: 50,
  /** 建议内容最小长度 */
  MIN_LENGTH: 2,
  /** 允许的字符集正则（中英文、数字、常用标点） */
  ALLOWED_CHARS_PATTERN: /^[\u4e00-\u9fa5a-zA-Z0-9\s\-_.,:;!?()（）""''、，。！？：；《》【】]+$/,
} as const;

/**
 * 验证建议是否符合规范
 */
export function validateSuggestion(suggestion: string): {
  valid: boolean;
  reason?: string;
} {
  // 去除首尾空格
  const trimmed = suggestion.trim();

  // 检查空字符串
  if (trimmed.length === 0) {
    return { valid: false, reason: '建议内容为空' };
  }

  // 检查最小长度
  if (trimmed.length < SUGGESTIONS_CONFIG.MIN_LENGTH) {
    return {
      valid: false,
      reason: `建议长度不足（最少${SUGGESTIONS_CONFIG.MIN_LENGTH}个字符）`
    };
  }

  // 检查最大长度
  if (trimmed.length > SUGGESTIONS_CONFIG.MAX_LENGTH) {
    return {
      valid: false,
      reason: `建议过长（最多${SUGGESTIONS_CONFIG.MAX_LENGTH}个字符）`
    };
  }

  // 检查字符集
  if (!SUGGESTIONS_CONFIG.ALLOWED_CHARS_PATTERN.test(trimmed)) {
    return {
      valid: false,
      reason: '建议包含不允许的字符'
    };
  }

  return { valid: true };
}

/**
 * 过滤并规范化建议列表
 * @param suggestions 原始建议列表
 * @param maxCount 最大数量（默认使用全局配置）
 * @returns 过滤后的建议列表
 */
export function normalizeSuggestions(
  suggestions: string[],
  maxCount: number = SUGGESTIONS_CONFIG.MAX_COUNT
): string[] {
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const suggestion of suggestions) {
    // 达到最大数量，停止
    if (normalized.length >= maxCount) {
      break;
    }

    const trimmed = suggestion.trim();

    // 验证建议
    const validation = validateSuggestion(trimmed);
    if (!validation.valid) {
      console.warn(`[Suggestions] Skipped invalid suggestion: "${trimmed}" - ${validation.reason}`);
      continue;
    }

    // 去重（忽略大小写）
    const lowerCase = trimmed.toLowerCase();
    if (seen.has(lowerCase)) {
      console.warn(`[Suggestions] Skipped duplicate suggestion: "${trimmed}"`);
      continue;
    }

    seen.add(lowerCase);
    normalized.push(trimmed);
  }

  return normalized;
}
