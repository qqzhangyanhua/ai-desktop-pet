/**
 * Chrome Bookmark Parser
 * Chrome 书签解析器
 */

import { readTextFile } from '@tauri-apps/plugin-fs';
import type {
  ChromeBookmarksRoot,
  ChromeBookmarkNode,
  FlatBookmark,
} from '@/types/bookmark';

/** 递归遍历书签树，扁平化为数组 */
function flattenBookmarkTree(
  node: ChromeBookmarkNode,
  parentPath: string[] = []
): FlatBookmark[] {
  const results: FlatBookmark[] = [];

  // 文件夹节点：递归处理children
  if (node.type === 'folder' && node.children) {
    const currentPath = [...parentPath, node.name];
    for (const child of node.children) {
      results.push(...flattenBookmarkTree(child, currentPath));
    }
  }

  // URL节点：添加到结果
  if (node.type === 'url' && node.url) {
    results.push({
      id: node.id,
      title: node.name,
      url: node.url,
      path: parentPath,
      dateAdded: node.date_added
        ? parseInt(node.date_added) / 1000 // Chrome用微秒，转毫秒
        : Date.now(),
      dateModified: node.date_modified
        ? parseInt(node.date_modified) / 1000
        : undefined,
    });
  }

  return results;
}

/** 解析Chrome书签文件 */
export async function parseChromeBookmarks(
  filePath: string
): Promise<FlatBookmark[]> {
  try {
    // 读取JSON文件
    console.log('[BookmarkParser] Reading file:', filePath);
    const content = await readTextFile(filePath);
    console.log('[BookmarkParser] File size:', content.length, 'bytes');

    const root: ChromeBookmarksRoot = JSON.parse(content);

    // 调试：打印根节点的实际结构
    console.log('[BookmarkParser] Root keys:', Object.keys(root));
    console.log('[BookmarkParser] Roots keys:', Object.keys(root.roots));
    console.log('[BookmarkParser] bookmark_bar keys:', root.roots.bookmark_bar ? Object.keys(root.roots.bookmark_bar) : 'N/A');
    console.log('[BookmarkParser] bookmark_bar sample:', JSON.stringify(root.roots.bookmark_bar).substring(0, 200));

    console.log('[BookmarkParser] Root structure:', {
      hasBookmarkBar: !!root.roots.bookmark_bar,
      hasOther: !!root.roots.other,
      hasSynced: !!root.roots.synced,
      bookmarkBarType: root.roots.bookmark_bar?.type,
      bookmarkBarChildren: root.roots.bookmark_bar?.children?.length,
    });

    // 提取所有根节点
    const allBookmarks: FlatBookmark[] = [];

    // 书签栏
    if (root.roots.bookmark_bar) {
      const bookmarks = flattenBookmarkTree(root.roots.bookmark_bar, ['书签栏']);
      console.log('[BookmarkParser] bookmark_bar yielded:', bookmarks.length);
      allBookmarks.push(...bookmarks);
    }

    // 其他书签
    if (root.roots.other) {
      const bookmarks = flattenBookmarkTree(root.roots.other, ['其他书签']);
      console.log('[BookmarkParser] other yielded:', bookmarks.length);
      allBookmarks.push(...bookmarks);
    }

    // 同步书签（如果存在）
    if (root.roots.synced) {
      const bookmarks = flattenBookmarkTree(root.roots.synced, ['同步书签']);
      console.log('[BookmarkParser] synced yielded:', bookmarks.length);
      allBookmarks.push(...bookmarks);
    }

    console.log(`[BookmarkParser] Parsed ${allBookmarks.length} bookmarks`);
    return allBookmarks;

  } catch (error) {
    console.error('[BookmarkParser] Parse failed:', error);
    throw new Error(
      `Failed to parse Chrome bookmarks: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/** 验证Chrome书签文件格式 */
export async function validateChromeBookmarkFile(
  filePath: string
): Promise<boolean> {
  try {
    const content = await readTextFile(filePath);
    const data = JSON.parse(content) as ChromeBookmarksRoot;

    return (
      typeof data === 'object' &&
      data.roots !== undefined &&
      typeof data.version === 'number'
    );
  } catch {
    return false;
  }
}
