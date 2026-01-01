/**
 * Bookmark Search Tool
 * 书签搜索工具 - 搜索 Chrome 浏览器书签
 */

import { BaseTool, createSuccessResult, createErrorResult, type ToolExecutionContext, type ToolResult } from '../base-tool';
import type { ToolSchema } from '../../../types';
import type { FlatBookmark } from '@/types/bookmark';
import { BOOKMARK_SEARCH_CONSTANTS } from '@/services/intent/constants';

interface BookmarkSearchResult {
  results: FlatBookmark[];
  query: string;
  count: number;
}

export class BookmarkSearchTool extends BaseTool {
  name = 'bookmark_search';
  description = '搜索Chrome浏览器书签。可以通过关键词搜索书签标题或URL。';

  schema: ToolSchema = {
    name: 'bookmark_search',
    description: this.description,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词，将在书签标题和URL中进行匹配',
        },
        limit: {
          type: 'number',
          description: '返回结果的最大数量（默认: 10）',
        },
      },
      required: ['query'],
    },
  };

  async execute(
    args: Record<string, unknown>,
    context?: ToolExecutionContext
  ): Promise<ToolResult<BookmarkSearchResult>> {
    this.validateArgs(args);

    const query = args.query as string;
    const limit = (args.limit as number) ?? BOOKMARK_SEARCH_CONSTANTS.DEFAULT_LIMIT;

    if (!query || query.trim().length === 0) {
      return createErrorResult('搜索关键词不能为空');
    }

    context?.onProgress?.(`正在搜索书签: ${query}`);

    try {
      // 动态导入 bookmarkManager
      const { bookmarkManager } = await import('@/services/bookmark');

      // 检查书签管理器状态
      let stats;
      try {
        stats = await bookmarkManager.getStats();
      } catch (error) {
        if (error instanceof Error && error.message === 'BookmarkManager not initialized') {
          return createErrorResult('书签管理器未初始化。请先在设置中导入 Chrome 书签文件。');
        }
        throw error;
      }

      // 检查是否有书签数据
      if (stats.totalBookmarks === 0) {
        return createErrorResult('书签库为空。请先在设置中导入 Chrome 书签文件。');
      }

      // 执行搜索
      const results = await bookmarkManager.search({ query, limit });

      if (results.length === 0) {
        return createSuccessResult({
          results: [],
          query,
          count: 0,
        });
      }

      return createSuccessResult({
        results,
        query,
        count: results.length,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return createErrorResult('书签搜索已取消');
      }
      return createErrorResult(
        error instanceof Error ? error.message : '书签搜索失败'
      );
    }
  }
}
