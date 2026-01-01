/**
 * Bookmark Type Definitions
 * Chrome 书签类型定义
 */

/** Chrome书签节点类型 */
export type ChromeBookmarkNodeType = 'url' | 'folder';

/** Chrome书签原始节点（Chrome JSON格式） */
export interface ChromeBookmarkNode {
  id: string;
  name: string;
  type: ChromeBookmarkNodeType;
  url?: string; // type='url' 时存在
  date_added?: string;
  date_modified?: string;
  children?: ChromeBookmarkNode[]; // type='folder' 时存在
}

/** Chrome书签根结构 */
export interface ChromeBookmarksRoot {
  roots: {
    bookmark_bar: ChromeBookmarkNode;
    other: ChromeBookmarkNode;
    synced?: ChromeBookmarkNode;
  };
  version: number;
}

/** 扁平化的书签条目（用于搜索和显示） */
export interface FlatBookmark {
  id: string;
  title: string;
  url: string;
  path: string[]; // 父文件夹路径，如 ['书签栏', '工作', '开发']
  dateAdded: number; // Unix timestamp (ms)
  dateModified?: number;
}

/** 书签搜索参数 */
export interface BookmarkSearchParams {
  query?: string; // 搜索关键词（匹配标题或URL）
  limit?: number; // 返回数量限制（默认50）
  folder?: string; // 限定文件夹路径
}

/** 书签统计信息 */
export interface BookmarkStats {
  totalBookmarks: number;
  totalFolders: number;
  lastUpdated: number; // Unix timestamp
}
