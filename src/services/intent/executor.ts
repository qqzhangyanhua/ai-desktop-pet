/**
 * Intent Executor
 * 意图执行器 - 将意图转换为工具调用
 */

import type { ExecutionResult, IntentExecutionContext } from './types';
import { open } from '@tauri-apps/plugin-shell';
import { WebSearchTool, WeatherTool, ClipboardWriteTool, ClipboardReadTool, BookmarkSearchTool } from '../agent/tools';
import { BOOKMARK_SEARCH_CONSTANTS, normalizeSuggestions } from './constants';

/**
 * 打开 URL
 */
async function executeOpenUrl(params: Record<string, unknown>): Promise<ExecutionResult> {
  const url = params.url as string;

  if (!url) {
    return {
      success: false,
      message: '未找到要打开的网址',
      error: 'URL not found',
    };
  }

  try {
    await open(url);
    return {
      success: true,
      message: `已为你打开：${url}`,
      toolCalls: [{ name: 'open_url', args: { url }, result: { opened: true } }],
    };
  } catch (error) {
    return {
      success: false,
      message: '打开网址失败',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 设置提醒
 */
async function executeSetReminder(params: Record<string, unknown>): Promise<ExecutionResult> {
  const title = params.title as string;
  const datetime = params.datetime as number;

  if (!title) {
    return {
      success: false,
      message: '请告诉我要提醒什么事项',
      error: 'Missing reminder title',
    };
  }

  if (!datetime || datetime <= Date.now()) {
    return {
      success: false,
      message: '请指定一个未来的时间',
      error: 'Invalid datetime',
    };
  }

  try {
    // 调用 scheduler 创建任务
    const { getSchedulerManager } = await import('../scheduler');
    const scheduler = getSchedulerManager();

    const task = await scheduler.createTask({
      name: title,
      enabled: true,
      trigger: {
        type: 'cron',
        config: {
          type: 'cron',
          expression: getCronExpression(datetime),
        },
      },
      action: {
        type: 'notification',
        config: {
          type: 'notification',
          title: '提醒',
          body: title,
        },
      },
    });

    const timeStr = new Date(datetime).toLocaleString('zh-CN', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return {
      success: true,
      message: `已设置提醒：${timeStr} - ${title} ✅`,
      toolCalls: [{ name: 'set_reminder', args: { title, datetime }, result: { taskId: task } }],
    };
  } catch (error) {
    return {
      success: false,
      message: '设置提醒失败',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 将时间戳转换为 cron 表达式（一次性）
 */
function getCronExpression(timestamp: number): string {
  const date = new Date(timestamp);
  const minute = date.getMinutes();
  const hour = date.getHours();
  const day = date.getDate();
  const month = date.getMonth() + 1;

  // 格式: 分 时 日 月 星期
  return `${minute} ${hour} ${day} ${month} *`;
}

/**
 * 查询日程
 */
async function executeQuerySchedule(): Promise<ExecutionResult> {
  try {
    const { getSchedulerManager } = await import('../scheduler');
    const scheduler = getSchedulerManager();

    const tasks = await scheduler.getAllTasks();

    // 过滤今天的任务
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayTasks = tasks.filter((task: { enabled: boolean }) => {
      if (!task.enabled) return false;
      // 简化判断：只显示启用的任务
      return true;
    });

    if (todayTasks.length === 0) {
      return {
        success: true,
        message: '今天暂无安排，可以好好休息一下~',
      };
    }

    const taskList = todayTasks
      .slice(0, 5) // 最多显示 5 个
      .map((task: { name: string }, idx: number) => `${idx + 1}. ${task.name}`)
      .join('\n');

    return {
      success: true,
      message: `今天有 ${todayTasks.length} 个任务：\n${taskList}`,
      toolCalls: [{ name: 'query_schedule', args: {}, result: { count: todayTasks.length } }],
    };
  } catch (error) {
    return {
      success: false,
      message: '查询日程失败',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 天气查询
 */
async function executeWeather(params: Record<string, unknown>): Promise<ExecutionResult> {
  const location = (params.location as string) || 'auto';

  try {
    const weatherTool = new WeatherTool();
    const result = await weatherTool.execute({ location }) as { success: boolean; data?: Record<string, unknown>; error?: string };

    if (!result.success || !result.data) {
      return {
        success: false,
        message: '天气查询失败',
        error: result.error,
      };
    }

    const weather = result.data as Record<string, unknown>;
    const message = `${weather.location}天气：${weather.condition}，温度 ${weather.temperature}°C`;

    return {
      success: true,
      message,
      toolCalls: [{ name: 'weather', args: { location }, result: weather }],
    };
  } catch (error) {
    return {
      success: false,
      message: '天气查询失败',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 网络搜索
 */
async function executeSearch(params: Record<string, unknown>): Promise<ExecutionResult> {
  const query = params.query as string;

  if (!query) {
    return {
      success: false,
      message: '请告诉我要搜索什么',
      error: 'Missing search query',
    };
  }

  try {
    const searchTool = new WebSearchTool();
    const result = await searchTool.execute({ query }) as { success: boolean; data?: Record<string, unknown>; error?: string };

    if (!result.success || !result.data) {
      return {
        success: false,
        message: '搜索失败',
        error: result.error,
      };
    }

    const searchResult = result.data as { results: Array<{ title: string; snippet: string }> };
    const topResults = searchResult.results.slice(0, 3);
    const message = `搜索"${query}"的结果：\n\n${topResults
      .map((r: { title: string; snippet: string }, i: number) => `${i + 1}. ${r.title}\n${r.snippet}`)
      .join('\n\n')}`;

    return {
      success: true,
      message,
      toolCalls: [{ name: 'search', args: { query }, result: searchResult }],
    };
  } catch (error) {
    return {
      success: false,
      message: '搜索失败',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 写入剪贴板
 */
async function executeClipboardWrite(params: Record<string, unknown>): Promise<ExecutionResult> {
  const content = params.content as string;

  if (!content) {
    return {
      success: false,
      message: '请告诉我要复制什么内容',
      error: 'Missing content',
    };
  }

  try {
    const clipboardTool = new ClipboardWriteTool();
    const result = await clipboardTool.execute({ content }) as { success: boolean; error?: string; data?: { written: boolean; content: string } };

    if (!result.success) {
      return {
        success: false,
        message: '复制失败',
        error: result.error,
      };
    }

    return {
      success: true,
      message: `已复制到剪贴板 ✅`,
      toolCalls: [{ name: 'clipboard_write', args: { content }, result: { written: true } }],
    };
  } catch (error) {
    return {
      success: false,
      message: '复制失败',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 读取剪贴板
 */
async function executeClipboardRead(): Promise<ExecutionResult> {
  try {
    const clipboardTool = new ClipboardReadTool();
    const result = await clipboardTool.execute({}) as { success: boolean; error?: string; data?: { content: string } };

    if (!result.success || !result.data) {
      return {
        success: false,
        message: '读取剪贴板失败',
        error: result.error,
      };
    }

    const content = result.data.content;
    const preview = content.length > 100 ? content.slice(0, 100) + '...' : content;

    return {
      success: true,
      message: `剪贴板内容：\n${preview}`,
      toolCalls: [{ name: 'clipboard_read', args: {}, result: { content } }],
    };
  } catch (error) {
    return {
      success: false,
      message: '读取剪贴板失败',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 书签搜索
 */
async function executeBookmarkSearch(params: Record<string, unknown>): Promise<ExecutionResult> {
  let query = (params.query as string) || '';
  const showAll = params.showAll as boolean;
  const userMessage = params.userMessage as string; // 保存原始输入

  try {
    const bookmarkTool = new BookmarkSearchTool();

    // 🎯 智能分层：根据复杂度决定是否使用LLM
    if (userMessage && !showAll) {
      const {
        isComplexBookmarkQuery,
        extractSimpleKeyword,
        analyzeBookmarkQuery
      } = await import('@/services/bookmark/query-optimizer');

      const isComplex = isComplexBookmarkQuery(userMessage);

      if (isComplex) {
        // 复杂查询：调用LLM分析
        console.log('[BookmarkSearch] Complex query, using LLM:', userMessage);
        const analysis = await analyzeBookmarkQuery(userMessage);

        console.log('[BookmarkSearch] LLM analysis:', {
          original: query,
          analyzed: analysis.keywords,
          intentType: analysis.intentType
        });

        // 如果 LLM 识别为 list_all 意图
        if (analysis.intentType === 'list_all' || analysis.showAll) {
          return executeBookmarkSearch({
            query: '',
            showAll: true,
            userMessage
          });
        }

        // 使用 LLM 提取的关键词
        if (analysis.keywords.length > 0 && analysis.keywords[0]) {
          query = analysis.keywords[0];
        }
      } else {
        // 简单查询：直接用正则提取（快速路径）
        console.log('[BookmarkSearch] Simple query, fast path:', userMessage);
        const simpleKeyword = extractSimpleKeyword(userMessage);
        if (simpleKeyword) {
          query = simpleKeyword;
        }
      }
    }

    // 如果是"列出全部"意图（query为空且showAll为true）
    if (showAll && !query) {
      const result = await bookmarkTool.execute({ query: '', limit: 50 }) as { success: boolean; data?: Record<string, unknown>; error?: string };

      if (!result.success || !result.data) {
        // 提供更清晰的错误消息
        const errorMsg = result.error || '获取书签列表失败';
        return {
          success: false,
          message: errorMsg,
          error: result.error,
        };
      }

      const { results, count } = result.data as { results: Array<{ url: string; title: string }>; count: number };

      if (count === 0) {
        return {
          success: true,
          message: '您还没有同步任何书签哦！\n\n💡 小贴士：\n1. 打开设置 → 书签管理\n2. 选择Chrome书签文件并同步\n3. 然后就可以在聊天中快速搜索了',
          toolCalls: [{ name: 'bookmark_search', args: { query: '', showAll: true }, result: { count: 0 } }],
        };
      }

      // 分析书签，提供智能建议
      const domains = new Map<string, number>();
      results.forEach((r: { url: string; title: string }) => {
        try {
          const url = new URL(r.url);
          const domain = url.hostname.replace(/^www\./, '');
          domains.set(domain, (domains.get(domain) || 0) + 1);
        } catch {
          // 忽略无效URL
        }
      });

      // 找出前5个最常见的域名
      const topDomains = Array.from(domains.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([domain, count]) => ({ domain, count }));

      // 使用LLM生成智能建议
      let suggestions: string[] = [];
      if (userMessage) {
        const { generateSmartSuggestions } = await import('@/services/bookmark/query-optimizer');
        suggestions = await generateSmartSuggestions(userMessage, topDomains);
      }

      const topDomainsText = topDomains.map(d => `  • ${d.domain} (${d.count}个)`).join('\n');
      const suggestionsText = suggestions.length > 0
        ? `\n\n💡 试试这样问我：\n${suggestions.map(s => `  • "${s}"`).join('\n')}`
        : '';

      const message = `📚 您共有 ${count} 个书签！\n\n🔍 热门网站分类：\n${topDomainsText}${suggestionsText}`;

      return {
        success: true,
        message,
        toolCalls: [{ name: 'bookmark_search', args: { query: '', showAll: true }, result: { count, topDomains } }],
      };
    }

    // 正常搜索流程
    if (!query) {
      return {
        success: false,
        message: '请告诉我要搜索什么书签',
        error: 'Missing bookmark search query',
      };
    }

    const result = await bookmarkTool.execute({ query }) as { success: boolean; data?: Record<string, unknown>; error?: string };

    if (!result.success || !result.data) {
      // 提供更清晰的错误消息
      const errorMsg = result.error || '书签搜索失败';
      return {
        success: false,
        message: errorMsg,
        error: result.error,
      };
    }

    const { results, count } = result.data as { results: Array<{ url: string; title: string }>; count: number };

    if (count === 0) {
      // 使用LLM优化查询
      let optimizedMessage = `没有找到包含"${query}"的书签`;
      let clickableSuggestions: string[] = [];

      if (userMessage) {
        const { optimizeFailedQuery } = await import('@/services/bookmark/query-optimizer');
        const rawSuggestions = await optimizeFailedQuery(query, userMessage);

        if (rawSuggestions.length > 0) {
          // ✅ 过滤、验证、限制数量
          clickableSuggestions = normalizeSuggestions(
            rawSuggestions,
            BOOKMARK_SEARCH_CONSTANTS.MAX_SUGGESTIONS
          );

          if (clickableSuggestions.length > 0) {
            optimizedMessage += `\n\n🤔 要不试试这些：`;
          } else {
            // 所有建议都被过滤掉了，显示默认提示
            optimizedMessage += '\n\n💡 试试这样：\n  • 使用更简短的关键词\n  • 检查拼写是否正确\n  • 尝试搜索网站名称（如"GitHub"、"Google"）';
          }
        } else {
          optimizedMessage += '\n\n💡 试试这样：\n  • 使用更简短的关键词\n  • 检查拼写是否正确\n  • 尝试搜索网站名称（如"GitHub"、"Google"）';
        }
      }

      return {
        success: true,
        message: optimizedMessage,
        toolCalls: [{ name: 'bookmark_search', args: { query }, result: { count: 0 } }],
        suggestions: clickableSuggestions.length > 0 ? clickableSuggestions : undefined,
      };
    }

    // 默认显示全部结果（最多20个）
    const displayLimit = Math.min(count, BOOKMARK_SEARCH_CONSTANTS.MAX_RESULTS);
    const displayResults = results.slice(0, displayLimit);
    const hasMore = count > displayLimit;

    const message = `找到 ${count} 个相关书签：\n\n${displayResults
      .map((r: { title: string; url: string }, i: number) => `${i + 1}. ${r.title}\n${r.url}`)
      .join('\n\n')}${hasMore ? `\n\n还有 ${count - displayLimit} 个结果未显示` : ''}`;

    return {
      success: true,
      message,
      toolCalls: [{ name: 'bookmark_search', args: { query }, result: { count, results, displayLimit } }],
    };
  } catch (error) {
    return {
      success: false,
      message: '书签搜索失败',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 执行意图
 */
export async function executeIntent(
  context: IntentExecutionContext
): Promise<ExecutionResult> {
  const { intent, onProgress, userMessage } = context;

  onProgress?.(`正在执行：${intent.intent}...`);

  try {
    switch (intent.intent) {
      case 'open_url':
        return await executeOpenUrl(intent.params);

      case 'set_reminder':
        return await executeSetReminder(intent.params);

      case 'query_schedule':
        return await executeQuerySchedule();

      case 'weather':
        return await executeWeather(intent.params);

      case 'search':
        return await executeSearch(intent.params);

      case 'clipboard_write':
        return await executeClipboardWrite(intent.params);

      case 'clipboard_read':
        return await executeClipboardRead();

      case 'bookmark_search':
        // 传递原始用户消息给书签搜索
        return await executeBookmarkSearch({ ...intent.params, userMessage });

      case 'chat':
      default:
        return {
          success: false,
          message: '该功能暂未实现',
          error: `Unsupported intent: ${intent.intent}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      message: '执行失败',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
