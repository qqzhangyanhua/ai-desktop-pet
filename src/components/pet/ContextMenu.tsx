import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  Star,
  Search,
  ChevronDown,
  ChevronRight,
  Trash2,
  X,
} from 'lucide-react';
import type { AssistantSkill, PetActionType } from '../../types';
import { useCareStore, useConfigStore, useContextMenuStore } from '@/stores';
import { createMenuItems, type MenuItem, type MenuSection } from './menu-items';
import { getWindowManager } from '@/services/window';
import '../settings/game-ui.css';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  // Chat is now opened in separate window, no callback needed
  onPetAction: (action: PetActionType) => void;
  onAssistantAction: (skill: AssistantSkill) => void;
}

export function ContextMenu({
  x,
  y,
  onClose,
  onPetAction,
  onAssistantAction,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const statusPanelVisible = useConfigStore((s) => s.config.appearance.statusPanelVisible);
  const care = useCareStore();
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const favorites = useContextMenuStore((s) => s.favorites);
  const recent = useContextMenuStore((s) => s.recent);
  const toggleFavorite = useContextMenuStore((s) => s.toggleFavorite);
  const recordRecent = useContextMenuStore((s) => s.recordRecent);
  const clearRecent = useContextMenuStore((s) => s.clearRecent);
  const isFavorite = useContextMenuStore((s) => s.isFavorite);
  const isCollapsed = useContextMenuStore((s) => s.isCollapsed);
  const toggleCollapsed = useContextMenuStore((s) => s.toggleCollapsed);

  // 边界检测逻辑：默认右下，溢出则翻转
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;

    const margin = 8; // 与窗口边缘的安全距离
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const rect = el.getBoundingClientRect();
    const menuWidth = rect.width;
    const menuHeight = rect.height;

    // 默认位置：鼠标右下方
    let left = x;
    let top = y;

    // 右侧溢出检测：如果菜单右边缘超出窗口，翻转到左边
    if (x + menuWidth > viewportWidth - margin) {
      left = x - menuWidth;
    }

    // 下方溢出检测：如果菜单下边缘超出窗口，翻转到上边
    if (y + menuHeight > viewportHeight - margin) {
      top = y - menuHeight;
    }

    // 确保菜单不超出左边界和上边界
    left = Math.max(margin, left);
    top = Math.max(margin, top);

    // 极端情况：窗口太小，菜单无法完整显示
    // 确保至少有一部分可见（不要完全超出右边界和下边界）
    left = Math.min(left, viewportWidth - margin);
    top = Math.min(top, viewportHeight - margin);

    setPosition({ left, top });
  }, [x, y]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveId((prev) => {
          const list = visibleItemsRef.current;
          if (list.length === 0) return null;

          const currentIndex = prev ? list.findIndex((i) => i.id === prev) : -1;
          const dir = e.key === 'ArrowDown' ? 1 : -1;
          const nextIndex =
            currentIndex === -1
              ? 0
              : (currentIndex + dir + list.length) % list.length;
          return list[nextIndex]?.id ?? null;
        });
        return;
      }

      if (e.key === 'Enter') {
        const list = visibleItemsRef.current;
        const current = activeId ? list.find((i) => i.id === activeId) : list[0];
        if (!current) return;
        e.preventDefault();
        recordRecent(current.id);
        current.onSelect();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [activeId, onClose, recordRecent]);

  useEffect(() => {
    // 打开菜单时自动聚焦搜索框（方便直接输入）
    searchInputRef.current?.focus();
  }, []);

  const handleHide = async () => {
    onClose();
    const appWindow = getCurrentWindow();
    await appWindow.hide();
  };

  const handleQuit = async () => {
    const appWindow = getCurrentWindow();
    await appWindow.close();
  };

  const handleToggleStatusPanel = async () => {
    const { config, setConfig, saveConfig } = useConfigStore.getState();
    setConfig({
      appearance: {
        ...config.appearance,
        statusPanelVisible: !config.appearance.statusPanelVisible,
      },
    });
    try {
      await saveConfig();
    } catch (err) {
      console.warn('[ContextMenu] Failed to save config:', err);
    }
    onClose();
  };

  const handlePetAction = (action: PetActionType) => {
    onPetAction(action);
    onClose();
  };

  const handleAssistantAction = (skill: string) => {
    onAssistantAction(skill as AssistantSkill);
    onClose();
  };

  const handleOpenChat = async () => {
    onClose();
    const windowManager = getWindowManager();
    await windowManager.openChatWindow();
  };

  const handleOpenSettings = async () => {
    onClose();
    const windowManager = getWindowManager();
    await windowManager.openSettingsWindow();
  };

  const allItems: MenuItem[] = createMenuItems(
    handlePetAction,
    handleAssistantAction,
    handleOpenChat,
    handleOpenSettings,
    handleToggleStatusPanel,
    handleHide,
    handleQuit,
    statusPanelVisible
  );

  const itemById = new Map(allItems.map((i) => [i.id, i]));
  
  // 1. 获取所有收藏项
  const favoriteItems = favorites.map((id) => itemById.get(id)).filter(Boolean) as MenuItem[];
  const favoriteIds = new Set(favoriteItems.map(i => i.id));

  // 2. 获取最近使用项，并过滤掉已在收藏中的
  const recentItems = recent
    .map((id) => itemById.get(id))
    .filter((item): item is MenuItem => !!item && !favoriteIds.has(item.id));
  
  // 3. 获取推荐项，并过滤掉已在收藏或最近使用中的
  // 收集已展示在"收藏"和"最近使用"的ID
  const topSectionIds = new Set([...favoriteIds, ...recentItems.map(i => i.id)]);

  const recommendedIds = (() => {
    const ids: string[] = [];
    if (care.satiety < 35) ids.push('pet:feed');
    if (care.energy < 35) ids.push('pet:sleep');
    if (care.boredom > 70) ids.push('pet:play');
    if (care.hygiene < 40) ids.push('pet:clean', 'pet:brush');

    // 默认给一点“好用入口”，减少用户上下滑
    ids.push('system:chat', 'system:settings');

    const deduped: string[] = [];
    for (const id of ids) {
      if (!deduped.includes(id)) deduped.push(id);
    }
    return deduped.slice(0, 6);
  })();

  const recommendedItems = recommendedIds
    .map((id) => itemById.get(id))
    .filter((item): item is MenuItem => !!item && !topSectionIds.has(item.id));

  // 更新所有顶部区域已展示的ID集合（用于过滤下方分类列表）
  const allTopIds = new Set([...topSectionIds, ...recommendedItems.map(i => i.id)]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems = normalizedQuery
    ? allItems.filter((item) => {
        const haystack = `${item.label} ${item.keywords.join(' ')}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      })
    : allItems;

  const selectItem = (item: MenuItem) => {
    recordRecent(item.id);
    item.onSelect();
  };

  const renderItems = (items: MenuItem[]) =>
    items.map((item) => {
      const active = item.id === activeId;
      const fav = isFavorite(item.id);
      return (
        <div
          key={item.id}
          data-menu-id={item.id}
          className={`game-context-menu-item${item.danger ? ' danger' : ''}${active ? ' active' : ''}`}
          onMouseEnter={() => setActiveId(item.id)}
          onClick={() => selectItem(item)}
        >
          <span className="game-context-menu-item-left">
            {item.icon}
            <span>{item.label}</span>
          </span>
          <span className="game-context-menu-item-right">
            <button
              type="button"
              className={`game-context-menu-fav-btn${fav ? ' active' : ''}`}
              aria-label={fav ? '取消收藏' : '收藏'}
              title={fav ? '取消收藏' : '收藏'}
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(item.id);
              }}
            >
              <Star className="w-4 h-4" />
            </button>
          </span>
        </div>
      );
    });

  const getSectionItems = (section: MenuSection) =>
    filteredItems.filter((i) => i.section === section);

  // Determine which items are already shown in top sections to avoid duplicates below
  const shownIds = useMemo(() => {
    if (normalizedQuery) return new Set<string>();
    return allTopIds;
  }, [normalizedQuery, allTopIds]);

  const petFunItems = getSectionItems('pet_fun').filter((i) => !shownIds.has(i.id));
  const petCareItems = getSectionItems('pet_care').filter((i) => !shownIds.has(i.id));
  const assistantItems = getSectionItems('assistant').filter((i) => !shownIds.has(i.id));
  const systemItems = getSectionItems('system').filter((i) => !shownIds.has(i.id));

  const getVisibleItems = useMemo(() => {
    if (normalizedQuery) return filteredItems;

    const items: MenuItem[] = [];
    if (favoriteItems.length > 0) items.push(...favoriteItems);
    if (recentItems.length > 0) items.push(...recentItems);
    if (recommendedItems.length > 0) items.push(...recommendedItems);

    if (!isCollapsed('pet_fun')) items.push(...petFunItems);
    if (!isCollapsed('pet_care')) items.push(...petCareItems);
    if (!isCollapsed('assistant')) items.push(...assistantItems);
    if (!isCollapsed('system')) items.push(...systemItems);

    const deduped: MenuItem[] = [];
    const seen = new Set<string>();
    for (const item of items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      deduped.push(item);
    }
    return deduped;
  }, [
    assistantItems,
    favoriteItems,
    filteredItems,
    isCollapsed,
    normalizedQuery,
    petCareItems,
    petFunItems,
    recentItems,
    recommendedItems,
    systemItems,
  ]);

  const visibleItemsRef = useRef<MenuItem[]>([]);
  useEffect(() => {
    visibleItemsRef.current = getVisibleItems;
    setActiveId((prev) => {
      if (prev && getVisibleItems.some((i) => i.id === prev)) return prev;
      return getVisibleItems[0]?.id ?? null;
    });
  }, [getVisibleItems]);

  useEffect(() => {
    if (!activeId) return;
    const el = menuRef.current?.querySelector(`[data-menu-id="${activeId}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeId]);

  const renderTitle = (label: string, section?: MenuSection, right?: React.ReactNode) => {
    if (!section) {
      return (
        <div className="game-context-menu-title-row">
          <div className="game-context-menu-title">{label}</div>
          {right ? <div className="game-context-menu-title-actions">{right}</div> : null}
        </div>
      );
    }
    const collapsed = isCollapsed(section);
    const Icon = collapsed ? ChevronRight : ChevronDown;
    return (
      <div className="game-context-menu-title-row">
        <button
          type="button"
          className="game-context-menu-title-button"
          onClick={() => toggleCollapsed(section)}
          title={collapsed ? '展开' : '收起'}
        >
          <Icon className="w-4 h-4" />
          <span className="game-context-menu-title">{label}</span>
        </button>
        {right ? <div className="game-context-menu-title-actions">{right}</div> : null}
      </div>
    );
  };

  return (
    <div
      ref={menuRef}
      className="game-context-menu no-drag"
      style={{
        left: position?.left ?? 0,
        top: position?.top ?? 0,
        visibility: position ? 'visible' : 'hidden',
      }}
    >
      <div className="game-context-menu-search" onClick={(e) => e.stopPropagation()}>
        <Search className="game-context-menu-search-icon" />
        <input
          ref={searchInputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索…（喂食/睡觉/天气/设置）"
          className="game-context-menu-search-input"
        />
        <button
          type="button"
          className="game-context-menu-close-btn"
          onClick={onClose}
          title="关闭"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {!normalizedQuery && favoriteItems.length > 0 && (
        <>
          {renderTitle('收藏')}
          {renderItems(favoriteItems)}
          <div className="game-context-menu-divider" />
        </>
      )}

      {!normalizedQuery && recentItems.length > 0 && (
        <>
          {renderTitle(
            '最近使用',
            undefined,
            <button
              type="button"
              className="game-context-menu-title-action-btn"
              onClick={() => clearRecent()}
              title="清空最近"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {renderItems(recentItems)}
          <div className="game-context-menu-divider" />
        </>
      )}

      {!normalizedQuery && recommendedItems.length > 0 && (
        <>
          {renderTitle('推荐/快捷')}
          {renderItems(recommendedItems)}
          <div className="game-context-menu-divider" />
        </>
      )}

      {normalizedQuery && filteredItems.length === 0 ? (
        <div className="game-context-menu-empty">没有匹配项</div>
      ) : (
        <>
          {petFunItems.length > 0 && !normalizedQuery && (
            <>
              {renderTitle('娱乐与表演', 'pet_fun')}
              {!isCollapsed('pet_fun') ? (
                <>
                  {renderItems(petFunItems)}
                  <div className="game-context-menu-divider" />
                </>
              ) : (
                <div className="game-context-menu-divider" />
              )}
            </>
          )}

          {(petFunItems.length > 0 && normalizedQuery) && (
            <>
              {renderTitle('娱乐与表演')}
              {renderItems(petFunItems)}
              <div className="game-context-menu-divider" />
            </>
          )}

          {petCareItems.length > 0 && !normalizedQuery && (
            <>
              {renderTitle('休息与护理', 'pet_care')}
              {!isCollapsed('pet_care') ? (
                <>
                  {renderItems(petCareItems)}
                  <div className="game-context-menu-divider" />
                </>
              ) : (
                <div className="game-context-menu-divider" />
              )}
            </>
          )}

          {(petCareItems.length > 0 && normalizedQuery) && (
            <>
              {renderTitle('休息与护理')}
              {renderItems(petCareItems)}
              <div className="game-context-menu-divider" />
            </>
          )}

          {assistantItems.length > 0 && !normalizedQuery && (
            <>
              {renderTitle('智能助手', 'assistant')}
              {!isCollapsed('assistant') ? (
                <>
                  {renderItems(assistantItems)}
                  <div className="game-context-menu-divider" />
                </>
              ) : (
                <div className="game-context-menu-divider" />
              )}
            </>
          )}

          {(assistantItems.length > 0 && normalizedQuery) && (
            <>
              {renderTitle('智能助手')}
              {renderItems(assistantItems)}
              <div className="game-context-menu-divider" />
            </>
          )}

          {systemItems.length > 0 && !normalizedQuery && (
            <>
              {renderTitle('系统', 'system')}
              {!isCollapsed('system') ? renderItems(systemItems) : null}
            </>
          )}

          {(systemItems.length > 0 && normalizedQuery) && (
            <>
              {renderTitle('系统')}
              {renderItems(systemItems)}
            </>
          )}
        </>
      )}
    </div>
  );
}
