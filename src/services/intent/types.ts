/**
 * Intent Detection Types
 * 意图识别类型定义
 */

/**
 * 支持的意图类型
 */
export type IntentType =
  | 'open_url'          // 打开网址
  | 'open_app'          // 打开应用
  | 'set_reminder'      // 设置提醒
  | 'query_schedule'    // 查询日程
  | 'weather'           // 天气查询
  | 'search'            // 网络搜索
  | 'clipboard_write'   // 写入剪贴板
  | 'clipboard_read'    // 读取剪贴板
  | 'bookmark_search'   // 书签搜索
  | 'health_advice'     // 健康建议
  | 'chat';             // 普通对话

/**
 * 意图识别结果
 */
export interface IntentResult {
  /** 意图类型 */
  intent: IntentType;
  /** 置信度 (0-1) */
  confidence: number;
  /** 提取的参数 */
  params: Record<string, unknown>;
  /** 匹配方式 */
  matchMethod: 'keyword' | 'llm';
  /** 原始消息 */
  originalMessage: string;
}

/**
 * 关键词配置
 */
export interface KeywordConfig {
  /** 意图类型 */
  intent: IntentType;
  /** 关键词列表 */
  keywords: string[];
  /** 参数提取器（可选） */
  extractor?: (message: string) => Record<string, unknown>;
  /** 优先级（数字越大优先级越高） */
  priority?: number;
}

/**
 * 工具执行结果
 */
export interface ExecutionResult {
  /** 是否成功 */
  success: boolean;
  /** 返回消息(展示给用户) */
  message: string;
  /** 工具调用记录 */
  toolCalls?: Array<{
    name: string;
    args: Record<string, unknown>;
    result: unknown;
  }>;
  /** 错误信息 */
  error?: string;
  /** 可点击的建议列表（用户可以直接点击发送） */
  suggestions?: string[];
}

/**
 * 意图执行上下文
 */
export interface IntentExecutionContext {
  /** 用户消息 */
  userMessage: string;
  /** 意图结果 */
  intent: IntentResult;
  /** 进度回调 */
  onProgress?: (message: string) => void;
}
