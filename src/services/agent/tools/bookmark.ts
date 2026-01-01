// Bookmark Search Tool - Using defineTool to eliminate boilerplate
// 书签搜索工具 - 搜索 Chrome 浏览器书签

import { defineTool } from '../define-tool';
import type { ToolExecutionContext } from '../base-tool';
import type { FlatBookmark } from '@/types/bookmark';
import { BOOKMARK_SEARCH_CONSTANTS } from '@/services/intent/constants';

// Type definitions for tool results
interface BookmarkSearchResult {
  results: FlatBookmark[];
  query: string;
  count: number;
}

/**
 * Search Chrome browser bookmarks by keyword
 * Searches both bookmark titles and URLs
 */
export const bookmarkSearchTool = defineTool<
  { query: string; limit?: number },
  BookmarkSearchResult
>({
  name: 'bookmark_search',
  description: '搜索Chrome浏览器书签。支持关键词搜索(匹配标题或URL)或留空列出所有书签。',
  parameters: {
    query: {
      type: 'string',
      description: '搜索关键词(留空返回所有书签)。将在书签标题和URL中进行匹配',
      required: false,
    },
    limit: {
      type: 'number',
      description: '返回结果的最大数量（默认: 10）',
      required: false,
    },
  },

  async execute({ query, limit = BOOKMARK_SEARCH_CONSTANTS.DEFAULT_LIMIT }, context) {
    // Allow empty query for listing all bookmarks
    const searchQuery = query?.trim() || '';

    if (searchQuery) {
      context.onProgress?.(`正在搜索书签: ${searchQuery}`);
    } else {
      context.onProgress?.('正在获取书签列表...');
    }

    // 动态导入 bookmarkManager
    const { bookmarkManager } = await import('@/services/bookmark');

    // 检查书签管理器状态
    let stats;
    try {
      stats = await bookmarkManager.getStats();
    } catch (error) {
      if (error instanceof Error && error.message === 'BookmarkManager not initialized') {
        throw new Error('书签管理器未初始化。请先在设置中导入 Chrome 书签文件。');
      }
      throw error;
    }

    // 检查是否有书签数据
    if (stats.totalBookmarks === 0) {
      throw new Error('书签库为空。请先在设置中导入 Chrome 书签文件。');
    }

    // 执行搜索 (empty query returns all bookmarks up to limit)
    const results = await bookmarkManager.search({ query: searchQuery, limit });

    return {
      results,
      query: searchQuery,
      count: results.length,
    };
  },
});

// Legacy class export for backward compatibility (deprecated)
export class BookmarkSearchTool {
  private static _instance = bookmarkSearchTool;

  get name() {
    return BookmarkSearchTool._instance.name;
  }
  get description() {
    return BookmarkSearchTool._instance.description;
  }
  get schema() {
    return BookmarkSearchTool._instance.schema;
  }
  get requiresConfirmation() {
    return BookmarkSearchTool._instance.requiresConfirmation;
  }

  async execute(args: Record<string, unknown>, context?: ToolExecutionContext) {
    return BookmarkSearchTool._instance.execute(args, context);
  }

  toJSON() {
    return BookmarkSearchTool._instance.toJSON();
  }
}
