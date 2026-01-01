/**
 * Bookmark Service Entry Point
 * 书签服务入口
 */

export { bookmarkManager } from './manager';
export { parseChromeBookmarks, validateChromeBookmarkFile } from './parser';
export type * from '@/types/bookmark';
