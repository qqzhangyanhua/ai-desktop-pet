/**
 * Menu Renderers Module
 * 菜单渲染辅助组件
 *
 * P1-D-6: Extracted from ContextMenu.tsx (530 lines)
 * Linus原则: 单一职责 - 只负责菜单项的UI渲染逻辑
 */

import React from 'react';
import { Star, ChevronDown, ChevronRight } from 'lucide-react';
import type { MenuItem, MenuSection } from './menu-items';

/**
 * 渲染单个菜单项
 *
 * @param item - 菜单项
 * @param activeId - 当前激活的ID
 * @param isFavorite - 是否收藏
 * @param onMouseEnter - 鼠标进入回调
 * @param onClick - 点击回调
 * @param onToggleFavorite - 切换收藏回调
 */
export function renderMenuItem(
  item: MenuItem,
  activeId: string | null,
  isFavorite: boolean,
  onMouseEnter: () => void,
  onClick: () => void,
  onToggleFavorite: (e: React.MouseEvent) => void
): React.JSX.Element {
  const active = item.id === activeId;

  return (
    <div
      key={item.id}
      data-menu-id={item.id}
      className={`game-context-menu-item${item.danger ? ' danger' : ''}${active ? ' active' : ''}`}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      <span className="game-context-menu-item-left">
        {item.icon}
        <span>{item.label}</span>
      </span>
      <span className="game-context-menu-item-right">
        <button
          type="button"
          className={`game-context-menu-fav-btn${isFavorite ? ' active' : ''}`}
          aria-label={isFavorite ? '取消收藏' : '收藏'}
          title={isFavorite ? '取消收藏' : '收藏'}
          onClick={onToggleFavorite}
        >
          <Star className="w-4 h-4" />
        </button>
      </span>
    </div>
  );
}

/**
 * 渲染菜单项列表
 *
 * @param items - 菜单项数组
 * @param activeId - 当前激活的ID
 * @param isFavorite - 判断是否收藏的函数
 * @param setActiveId - 设置激活ID的函数
 * @param selectItem - 选择菜单项的函数
 * @param toggleFavorite - 切换收藏的函数
 */
export function renderMenuItems(
  items: MenuItem[],
  activeId: string | null,
  isFavorite: (id: string) => boolean,
  setActiveId: (id: string) => void,
  selectItem: (item: MenuItem) => void,
  toggleFavorite: (id: string) => void
): React.JSX.Element[] {
  return items.map((item) =>
    renderMenuItem(
      item,
      activeId,
      isFavorite(item.id),
      () => setActiveId(item.id),
      () => selectItem(item),
      (e) => {
        e.stopPropagation();
        toggleFavorite(item.id);
      }
    )
  );
}

/**
 * 渲染菜单标题
 *
 * @param label - 标题文本
 * @param section - 分类（如果提供，则显示折叠按钮）
 * @param isCollapsed - 是否折叠
 * @param toggleCollapsed - 切换折叠回调
 * @param right - 右侧操作区域（可选）
 */
export function renderMenuTitle(
  label: string,
  section?: MenuSection,
  isCollapsed?: boolean,
  toggleCollapsed?: () => void,
  right?: React.ReactNode
): React.JSX.Element {
  if (!section) {
    return (
      <div className="game-context-menu-title-row">
        <div className="game-context-menu-title">{label}</div>
        {right ? <div className="game-context-menu-title-actions">{right}</div> : null}
      </div>
    );
  }

  const collapsed = isCollapsed ?? false;
  const Icon = collapsed ? ChevronRight : ChevronDown;

  return (
    <div className="game-context-menu-title-row">
      <button
        type="button"
        className="game-context-menu-title-button"
        onClick={toggleCollapsed}
        title={collapsed ? '展开' : '收起'}
      >
        <Icon className="w-4 h-4" />
        <span className="game-context-menu-title">{label}</span>
      </button>
      {right ? <div className="game-context-menu-title-actions">{right}</div> : null}
    </div>
  );
}
