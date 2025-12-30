/**
 * Menu Logic Module
 * 菜单逻辑处理模块
 *
 * P1-D-5: Extracted from ContextMenu.tsx (530 lines)
 * Linus原则: 单一职责 - 只负责菜单项的过滤、推荐、分组逻辑
 */

import type { MenuItem, MenuSection } from './menu-items';
import type { PetCareStats } from '@/types';

/**
 * 菜单项过滤结果
 */
export interface MenuItemsFiltered {
  /** 收藏项 */
  favoriteItems: MenuItem[];
  /** 最近使用项（已去除收藏重复） */
  recentItems: MenuItem[];
  /** 推荐项（已去除收藏和最近重复） */
  recommendedItems: MenuItem[];
  /** 娱乐分类项（已去除顶部区域重复） */
  petFunItems: MenuItem[];
  /** 护理分类项（已去除顶部区域重复） */
  petCareItems: MenuItem[];
  /** 助手分类项（已去除顶部区域重复） */
  assistantItems: MenuItem[];
  /** 系统分类项（已去除顶部区域重复） */
  systemItems: MenuItem[];
  /** 搜索结果（如果有搜索关键词） */
  filteredItems: MenuItem[];
  /** 标准化的搜索关键词 */
  normalizedQuery: string;
  /** 顶部区域已展示的ID集合（用于去重） */
  allTopIds: Set<string>;
}

/**
 * 获取推荐菜单项ID列表
 *
 * 策略：
 * - 根据宠物状态推荐对应操作（饥饿→喂食，困倦→睡觉等）
 * - 默认包含常用入口（聊天、设置）
 * - 限制6个推荐项
 *
 * @param care - 宠物护理状态
 * @returns 推荐菜单项ID数组
 */
export function getRecommendedIds(care: PetCareStats): string[] {
  const ids: string[] = [];

  // 根据状态推荐
  if (care.satiety < 35) ids.push('pet:feed');
  if (care.energy < 35) ids.push('pet:sleep');
  if (care.boredom > 70) ids.push('pet:play');
  if (care.hygiene < 40) ids.push('pet:clean', 'pet:brush');

  // 默认给一点"好用入口"，减少用户上下滑
  ids.push('system:chat', 'system:settings');

  // 去重
  const deduped: string[] = [];
  for (const id of ids) {
    if (!deduped.includes(id)) deduped.push(id);
  }

  return deduped.slice(0, 6);
}

/**
 * 过滤菜单项（搜索功能）
 *
 * @param allItems - 所有菜单项
 * @param query - 搜索关键词
 * @returns 过滤后的菜单项
 */
export function filterMenuItems(
  allItems: MenuItem[],
  query: string
): MenuItem[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return allItems;
  }

  return allItems.filter((item) => {
    const haystack = `${item.label} ${item.keywords.join(' ')}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

/**
 * 获取指定分类的菜单项
 *
 * @param filteredItems - 已过滤的菜单项
 * @param section - 菜单分类
 * @returns 该分类的菜单项
 */
export function getSectionItems(
  filteredItems: MenuItem[],
  section: MenuSection
): MenuItem[] {
  return filteredItems.filter((i) => i.section === section);
}

/**
 * 去除重复项（基于ID集合）
 *
 * @param items - 菜单项数组
 * @param excludeIds - 要排除的ID集合
 * @returns 去重后的菜单项
 */
export function deduplicateItems(
  items: MenuItem[],
  excludeIds: Set<string>
): MenuItem[] {
  return items.filter((item) => !excludeIds.has(item.id));
}

/**
 * 处理菜单项过滤与分组逻辑
 *
 * 该函数是整个菜单逻辑的核心，负责：
 * 1. 搜索过滤
 * 2. 收藏/最近/推荐分组
 * 3. 分类分组
 * 4. 去重处理
 *
 * @param allItems - 所有菜单项
 * @param favorites - 收藏ID列表
 * @param recent - 最近使用ID列表
 * @param care - 宠物护理状态
 * @param query - 搜索关键词
 * @returns 过滤和分组后的菜单项
 */
export function processMenuItems(
  allItems: MenuItem[],
  favorites: string[],
  recent: string[],
  care: PetCareStats,
  query: string
): MenuItemsFiltered {
  const itemById = new Map(allItems.map((i) => [i.id, i]));

  // 1. 获取所有收藏项
  const favoriteItems = favorites
    .map((id) => itemById.get(id))
    .filter(Boolean) as MenuItem[];
  const favoriteIds = new Set(favoriteItems.map((i) => i.id));

  // 2. 获取最近使用项，并过滤掉已在收藏中的
  const recentItems = recent
    .map((id) => itemById.get(id))
    .filter((item): item is MenuItem => !!item && !favoriteIds.has(item.id));

  // 3. 收集已展示在"收藏"和"最近使用"的ID
  const topSectionIds = new Set([
    ...favoriteIds,
    ...recentItems.map((i) => i.id),
  ]);

  // 4. 获取推荐项，并过滤掉已在收藏或最近使用中的
  const recommendedIds = getRecommendedIds(care);
  const recommendedItems = recommendedIds
    .map((id) => itemById.get(id))
    .filter((item): item is MenuItem => !!item && !topSectionIds.has(item.id));

  // 5. 更新所有顶部区域已展示的ID集合（用于过滤下方分类列表）
  const allTopIds = new Set([
    ...topSectionIds,
    ...recommendedItems.map((i) => i.id),
  ]);

  // 6. 搜索过滤
  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems = filterMenuItems(allItems, query);

  // 7. 确定已展示ID集合（搜索时不去重，正常显示时去重）
  const shownIds = normalizedQuery ? new Set<string>() : allTopIds;

  // 8. 分类项（去重）
  const petFunItems = deduplicateItems(
    getSectionItems(filteredItems, 'pet_fun'),
    shownIds
  );
  const petCareItems = deduplicateItems(
    getSectionItems(filteredItems, 'pet_care'),
    shownIds
  );
  const assistantItems = deduplicateItems(
    getSectionItems(filteredItems, 'assistant'),
    shownIds
  );
  const systemItems = deduplicateItems(
    getSectionItems(filteredItems, 'system'),
    shownIds
  );

  return {
    favoriteItems,
    recentItems,
    recommendedItems,
    petFunItems,
    petCareItems,
    assistantItems,
    systemItems,
    filteredItems,
    normalizedQuery,
    allTopIds,
  };
}

/**
 * 获取所有可见菜单项（用于键盘导航）
 *
 * @param processed - 处理后的菜单项分组
 * @param collapsedSections - 折叠的分类集合
 * @returns 所有可见的菜单项（去重后）
 */
export function getVisibleMenuItems(
  processed: MenuItemsFiltered,
  collapsedSections: Set<MenuSection>
): MenuItem[] {
  const {
    favoriteItems,
    recentItems,
    recommendedItems,
    petFunItems,
    petCareItems,
    assistantItems,
    systemItems,
    filteredItems,
    normalizedQuery,
  } = processed;

  // 搜索模式：直接返回搜索结果
  if (normalizedQuery) {
    return filteredItems;
  }

  // 正常模式：按分组和折叠状态组装
  const items: MenuItem[] = [];

  if (favoriteItems.length > 0) items.push(...favoriteItems);
  if (recentItems.length > 0) items.push(...recentItems);
  if (recommendedItems.length > 0) items.push(...recommendedItems);

  if (!collapsedSections.has('pet_fun')) items.push(...petFunItems);
  if (!collapsedSections.has('pet_care')) items.push(...petCareItems);
  if (!collapsedSections.has('assistant')) items.push(...assistantItems);
  if (!collapsedSections.has('system')) items.push(...systemItems);

  // 最终去重（确保没有重复显示）
  const deduped: MenuItem[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    deduped.push(item);
  }

  return deduped;
}
