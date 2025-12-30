/**
 * Context Menu Component
 * 右键菜单组件
 *
 * P1-D-7: Refactored from monolithic 530-line file
 * Linus原则: 主组件作为协调器，职责清晰分离
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Search, Trash2, X } from 'lucide-react';
import type { AssistantSkill, PetActionType } from '../../types';
import { useCareStore, useConfigStore, useContextMenuStore } from '@/stores';
import { createMenuItems, type MenuItem } from './menu-items';
import { getWindowManager } from '@/services/window';
import { useContextMenuPosition } from './useContextMenuPosition';
import { useMenuKeyboard } from './useMenuKeyboard';
import { processMenuItems, getVisibleMenuItems } from './menu-logic';
import { renderMenuItems, renderMenuTitle } from './menu-renderers';
import '../settings/game-ui.css';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
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
  const [query, setQuery] = useState('');

  const favorites = useContextMenuStore((s) => s.favorites);
  const recent = useContextMenuStore((s) => s.recent);
  const toggleFavorite = useContextMenuStore((s) => s.toggleFavorite);
  const recordRecent = useContextMenuStore((s) => s.recordRecent);
  const clearRecent = useContextMenuStore((s) => s.clearRecent);
  const isFavorite = useContextMenuStore((s) => s.isFavorite);
  const isCollapsed = useContextMenuStore((s) => s.isCollapsed);
  const toggleCollapsed = useContextMenuStore((s) => s.toggleCollapsed);

  // 位置计算 hook
  const position = useContextMenuPosition(x, y, menuRef);

  // 事件处理函数
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

  // 创建所有菜单项
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

  // 处理菜单逻辑（过滤、推荐、分组）
  const processed = useMemo(
    () => processMenuItems(allItems, favorites, recent, care, query),
    [allItems, favorites, recent, care, query]
  );

  // 获取折叠状态集合
  const collapsedSections = useMemo(() => {
    const sections = new Set<'pet_fun' | 'pet_care' | 'assistant' | 'system'>();
    if (isCollapsed('pet_fun')) sections.add('pet_fun');
    if (isCollapsed('pet_care')) sections.add('pet_care');
    if (isCollapsed('assistant')) sections.add('assistant');
    if (isCollapsed('system')) sections.add('system');
    return sections;
  }, [isCollapsed]);

  // 获取所有可见项（用于键盘导航）
  const visibleItems = useMemo(
    () => getVisibleMenuItems(processed, collapsedSections),
    [processed, collapsedSections]
  );

  // 键盘导航 hook
  const { activeId, setActiveId } = useMenuKeyboard({
    visibleItems,
    onClose,
    recordRecent,
  });

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // 自动聚焦搜索框
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // 滚动激活项到可见区域
  useEffect(() => {
    if (!activeId) return;
    const el = menuRef.current?.querySelector(`[data-menu-id="${activeId}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeId]);

  // 选择菜单项
  const selectItem = (item: MenuItem) => {
    recordRecent(item.id);
    item.onSelect();
  };

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
          {renderMenuTitle('收藏')}
          {renderMenuItems(favoriteItems, activeId, isFavorite, setActiveId, selectItem, toggleFavorite)}
          <div className="game-context-menu-divider" />
        </>
      )}

      {!normalizedQuery && recentItems.length > 0 && (
        <>
          {renderMenuTitle(
            '最近使用',
            undefined,
            undefined,
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
          {renderMenuItems(recentItems, activeId, isFavorite, setActiveId, selectItem, toggleFavorite)}
          <div className="game-context-menu-divider" />
        </>
      )}

      {!normalizedQuery && recommendedItems.length > 0 && (
        <>
          {renderMenuTitle('推荐/快捷')}
          {renderMenuItems(recommendedItems, activeId, isFavorite, setActiveId, selectItem, toggleFavorite)}
          <div className="game-context-menu-divider" />
        </>
      )}

      {normalizedQuery && filteredItems.length === 0 ? (
        <div className="game-context-menu-empty">没有匹配项</div>
      ) : (
        <>
          {petFunItems.length > 0 && !normalizedQuery && (
            <>
              {renderMenuTitle('娱乐与表演', 'pet_fun', isCollapsed('pet_fun'), () =>
                toggleCollapsed('pet_fun')
              )}
              {!isCollapsed('pet_fun') ? (
                <>
                  {renderMenuItems(petFunItems, activeId, isFavorite, setActiveId, selectItem, toggleFavorite)}
                  <div className="game-context-menu-divider" />
                </>
              ) : (
                <div className="game-context-menu-divider" />
              )}
            </>
          )}

          {petFunItems.length > 0 && normalizedQuery && (
            <>
              {renderMenuTitle('娱乐与表演')}
              {renderMenuItems(petFunItems, activeId, isFavorite, setActiveId, selectItem, toggleFavorite)}
              <div className="game-context-menu-divider" />
            </>
          )}

          {petCareItems.length > 0 && !normalizedQuery && (
            <>
              {renderMenuTitle('休息与护理', 'pet_care', isCollapsed('pet_care'), () =>
                toggleCollapsed('pet_care')
              )}
              {!isCollapsed('pet_care') ? (
                <>
                  {renderMenuItems(petCareItems, activeId, isFavorite, setActiveId, selectItem, toggleFavorite)}
                  <div className="game-context-menu-divider" />
                </>
              ) : (
                <div className="game-context-menu-divider" />
              )}
            </>
          )}

          {petCareItems.length > 0 && normalizedQuery && (
            <>
              {renderMenuTitle('休息与护理')}
              {renderMenuItems(petCareItems, activeId, isFavorite, setActiveId, selectItem, toggleFavorite)}
              <div className="game-context-menu-divider" />
            </>
          )}

          {assistantItems.length > 0 && !normalizedQuery && (
            <>
              {renderMenuTitle('智能助手', 'assistant', isCollapsed('assistant'), () =>
                toggleCollapsed('assistant')
              )}
              {!isCollapsed('assistant') ? (
                <>
                  {renderMenuItems(assistantItems, activeId, isFavorite, setActiveId, selectItem, toggleFavorite)}
                  <div className="game-context-menu-divider" />
                </>
              ) : (
                <div className="game-context-menu-divider" />
              )}
            </>
          )}

          {assistantItems.length > 0 && normalizedQuery && (
            <>
              {renderMenuTitle('智能助手')}
              {renderMenuItems(assistantItems, activeId, isFavorite, setActiveId, selectItem, toggleFavorite)}
              <div className="game-context-menu-divider" />
            </>
          )}

          {systemItems.length > 0 && !normalizedQuery && (
            <>
              {renderMenuTitle('系统', 'system', isCollapsed('system'), () =>
                toggleCollapsed('system')
              )}
              {!isCollapsed('system')
                ? renderMenuItems(systemItems, activeId, isFavorite, setActiveId, selectItem, toggleFavorite)
                : null}
            </>
          )}

          {systemItems.length > 0 && normalizedQuery && (
            <>
              {renderMenuTitle('系统')}
              {renderMenuItems(systemItems, activeId, isFavorite, setActiveId, selectItem, toggleFavorite)}
            </>
          )}
        </>
      )}
    </div>
  );
}
