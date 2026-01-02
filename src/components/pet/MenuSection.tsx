/**
 * MenuSection Component
 * 菜单分组渲染组件
 *
 * Linus原则: "好代码没有特殊情况" - 消除8个重复渲染块
 *
 * 统一处理：
 * - 收藏/最近/推荐/分类 的渲染逻辑
 * - 折叠/展开状态
 * - 搜索模式的条件显示
 */

import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { MenuItem } from './menu-items';
import type { ContextMenuSection as SectionType } from '@/stores/contextMenuStore';
import { renderMenuItems } from './menu-renderers';

interface MenuSectionProps {
  /** 分组ID（用于折叠状态） */
  id?: SectionType;
  /** 分组标题 */
  title: string;
  /** 菜单项列表 */
  items: MenuItem[];
  /** 是否折叠 */
  collapsed?: boolean;
  /** 是否搜索模式 */
  searchMode?: boolean;
  /** 当前激活的菜单项ID */
  activeId: string | null;
  /** 检查是否收藏 */
  isFavorite: (id: string) => boolean;
  /** 设置激活ID */
  setActiveId: (id: string | null) => void;
  /** 选择菜单项 */
  onSelectItem: (item: MenuItem) => void;
  /** 切换收藏 */
  onToggleFavorite: (id: string) => void;
  /** 切换折叠（可选） */
  onToggleCollapsed?: () => void;
  /** 自定义标题操作（如"清空最近"按钮） */
  titleAction?: ReactNode;
  /** 是否显示分割线 */
  showDivider?: boolean;
}

/**
 * 渲染菜单标题
 */
function MenuSectionTitle({
  title,
  collapsed,
  collapsible,
  onToggle,
  action,
}: {
  title: string;
  collapsed?: boolean;
  collapsible?: boolean;
  onToggle?: () => void;
  action?: ReactNode;
}) {
  return (
    <div className="game-context-menu-title">
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {collapsible && onToggle && (
          <button
            type="button"
            className="game-context-menu-title-collapse-btn"
            onClick={onToggle}
            aria-label={collapsed ? '展开' : '折叠'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        )}
        <span>{title}</span>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

/**
 * MenuSection 组件
 *
 * 统一渲染所有类型的菜单分组，消除重复代码
 */
export function MenuSection({
  id,
  title,
  items,
  collapsed = false,
  searchMode = false,
  activeId,
  isFavorite,
  setActiveId,
  onSelectItem,
  onToggleFavorite,
  onToggleCollapsed,
  titleAction,
  showDivider = true,
}: MenuSectionProps) {
  // 空列表不渲染
  if (items.length === 0) return null;

  const collapsible = !!id && !!onToggleCollapsed && !searchMode;

  return (
    <>
      <MenuSectionTitle
        title={title}
        collapsed={collapsed}
        collapsible={collapsible}
        onToggle={onToggleCollapsed}
        action={titleAction}
      />

      {/* 非折叠或搜索模式显示内容 */}
      {(!collapsed || searchMode) && (
        <>
          {renderMenuItems(
            items,
            activeId,
            isFavorite,
            setActiveId,
            onSelectItem,
            onToggleFavorite
          )}
        </>
      )}

      {/* 分割线 */}
      {showDivider && <div className="game-context-menu-divider" />}
    </>
  );
}
