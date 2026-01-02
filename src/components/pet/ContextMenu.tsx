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
import { useCareStore, useConfigStore, useContextMenuStore, useRelaxationStore } from '@/stores';
import { createMenuItems, type MenuItem } from './menu-items';
import { getWindowManager } from '@/services/window';
import { useContextMenuPosition } from './useContextMenuPosition';
import { useMenuKeyboard } from './useMenuKeyboard';
import { processMenuItems, getVisibleMenuItems } from './menu-logic';
import { MenuSection } from './MenuSection';
import { FoodMenu } from './FoodMenu';
import { RelaxationPanel } from './RelaxationPanel';
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
  const [showFoodMenu, setShowFoodMenu] = useState(false);
  const [showRelaxationPanel, setShowRelaxationPanel] = useState(false);

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
    // Intercept feed action to show food menu
    if (action === 'feed') {
      setShowFoodMenu(true);
      return;
    }

    onPetAction(action);
    onClose();
  };

  const handleFoodSelect = (foodId: string) => {
    const feedResult = useCareStore.getState().feedPet(foodId);
    if (feedResult) {
      // Successfully fed - Don't close context menu immediately
      // Let FoodMenu handle its own animation and closure
      // Context menu will be closed when FoodMenu calls onClose
    }
    // If failed (cooldown/error), FoodMenu stays open with toast message
  };

  const handleCloseFoodMenu = () => {
    setShowFoodMenu(false);
  };

  const handleAssistantAction = (skill: AssistantSkill) => {
    onAssistantAction(skill);
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

  const handleOpenRelaxation = () => {
    setShowRelaxationPanel(true);
  };

  const handleCloseRelaxationPanel = () => {
    setShowRelaxationPanel(false);
  };

  // Legacy handlers for old menu items (deprecated)
  const handleOpenBreathing = () => {
    onClose();
    useRelaxationStore.getState().openBreathing();
  };

  const handleOpenStoryPlayer = () => {
    onClose();
    useRelaxationStore.getState().openStoryPlayer();
  };

  const handleOpenMeditation = () => {
    onClose();
    useRelaxationStore.getState().openMeditation();
  };

  // 创建所有菜单项（useMemo 优化）
  const allItems: MenuItem[] = useMemo(
    () =>
      createMenuItems({
        handlers: {
          pet: handlePetAction,
          assistant: handleAssistantAction,
          system: {
            openChat: handleOpenChat,
            openSettings: handleOpenSettings,
            toggleStatusPanel: handleToggleStatusPanel,
            hide: handleHide,
            quit: handleQuit,
          },
          relaxation: {
            openPanel: handleOpenRelaxation,
            breathing: handleOpenBreathing,
            story: handleOpenStoryPlayer,
            meditation: handleOpenMeditation,
          },
        },
        state: {
          statusPanelVisible,
        },
      }),
    [
      statusPanelVisible,
      handlePetAction,
      handleAssistantAction,
      handleOpenChat,
      handleOpenSettings,
      handleToggleStatusPanel,
      handleHide,
      handleQuit,
      handleOpenRelaxation,
      handleOpenBreathing,
      handleOpenStoryPlayer,
      handleOpenMeditation,
    ]
  );

  // 创建 itemById Map（useMemo 优化 - 避免重复构建）
  const itemById = useMemo(() => new Map(allItems.map((i) => [i.id, i])), [allItems]);

  // 处理菜单逻辑（过滤、推荐、分组）
  const processed = useMemo(
    () => processMenuItems(itemById, favorites, recent, care, query),
    [itemById, favorites, recent, care, query]
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
    try {
      Promise.resolve(item.onSelect()).catch((err) => {
        console.warn('[ContextMenu] Menu action failed:', item.id, err);
      });
    } catch (err) {
      console.warn('[ContextMenu] Menu action threw:', item.id, err);
    }
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
    <>
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
        <MenuSection
          title="收藏"
          items={favoriteItems}
          activeId={activeId}
          isFavorite={isFavorite}
          setActiveId={setActiveId}
          onSelectItem={selectItem}
          onToggleFavorite={toggleFavorite}
        />
      )}

      {!normalizedQuery && recentItems.length > 0 && (
        <MenuSection
          title="最近使用"
          items={recentItems}
          activeId={activeId}
          isFavorite={isFavorite}
          setActiveId={setActiveId}
          onSelectItem={selectItem}
          onToggleFavorite={toggleFavorite}
          titleAction={
            <button
              type="button"
              className="game-context-menu-title-action-btn"
              onClick={() => clearRecent()}
              title="清空最近"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          }
        />
      )}

      {!normalizedQuery && recommendedItems.length > 0 && (
        <MenuSection
          title="推荐/快捷"
          items={recommendedItems}
          activeId={activeId}
          isFavorite={isFavorite}
          setActiveId={setActiveId}
          onSelectItem={selectItem}
          onToggleFavorite={toggleFavorite}
        />
      )}

      {normalizedQuery && filteredItems.length === 0 ? (
        <div className="game-context-menu-empty">没有匹配项</div>
      ) : (
        <>
          <MenuSection
            id="pet_fun"
            title="娱乐与表演"
            items={petFunItems}
            collapsed={isCollapsed('pet_fun')}
            searchMode={!!normalizedQuery}
            activeId={activeId}
            isFavorite={isFavorite}
            setActiveId={setActiveId}
            onSelectItem={selectItem}
            onToggleFavorite={toggleFavorite}
            onToggleCollapsed={() => toggleCollapsed('pet_fun')}
          />

          <MenuSection
            id="pet_care"
            title="休息与护理"
            items={petCareItems}
            collapsed={isCollapsed('pet_care')}
            searchMode={!!normalizedQuery}
            activeId={activeId}
            isFavorite={isFavorite}
            setActiveId={setActiveId}
            onSelectItem={selectItem}
            onToggleFavorite={toggleFavorite}
            onToggleCollapsed={() => toggleCollapsed('pet_care')}
          />

          <MenuSection
            id="assistant"
            title="智能助手"
            items={assistantItems}
            collapsed={isCollapsed('assistant')}
            searchMode={!!normalizedQuery}
            activeId={activeId}
            isFavorite={isFavorite}
            setActiveId={setActiveId}
            onSelectItem={selectItem}
            onToggleFavorite={toggleFavorite}
            onToggleCollapsed={() => toggleCollapsed('assistant')}
          />

          <MenuSection
            id="system"
            title="系统"
            items={systemItems}
            collapsed={isCollapsed('system')}
            searchMode={!!normalizedQuery}
            activeId={activeId}
            isFavorite={isFavorite}
            setActiveId={setActiveId}
            onSelectItem={selectItem}
            onToggleFavorite={toggleFavorite}
            onToggleCollapsed={() => toggleCollapsed('system')}
            showDivider={false}
          />
        </>
      )}
    </div>

    {/* Food Menu Modal */}
    {showFoodMenu && (
      <FoodMenu onSelectFood={handleFoodSelect} onClose={handleCloseFoodMenu} />
    )}

    {/* Relaxation Panel Modal */}
    {showRelaxationPanel && (
      <RelaxationPanel onClose={handleCloseRelaxationPanel} />
    )}
  </>
  );
}
