import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import {
  GlassWater,
  Gamepad2,
  Music,
  Sparkles,
  Wand2,
  Palette,
  Moon,
  Droplet,
  Brush,
  Armchair,
  Cloud,
  Clock,
  Bell,
  Lightbulb,
  Monitor,
  Star,
  Search,
  MessageSquare,
  Settings,
  BarChart3,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Trash2,
  X,
} from 'lucide-react';
import type { AssistantSkill, PetActionType } from '../../types';
import { useCareStore, useConfigStore, useContextMenuStore } from '@/stores';
import { Input } from '@/components/ui/input';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onChat: () => void;
  onPetAction: (action: PetActionType) => void;
  onAssistantAction: (skill: AssistantSkill) => void;
}

type MenuSection = 'quick' | 'pet_fun' | 'pet_care' | 'assistant' | 'system';

interface MenuItem {
  id: string;
  section: MenuSection;
  label: string;
  keywords: string[];
  icon: React.ReactNode;
  danger?: boolean;
  onSelect: () => void;
}

export function ContextMenu({
  x,
  y,
  onClose,
  onChat,
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

  const handleAssistantAction = (skill: AssistantSkill) => {
    onAssistantAction(skill);
    onClose();
  };

  const handleOpenChat = () => {
    onChat();
  };

  const handleOpenSettings = async () => {
    onClose();
    const settingsWindow = await WebviewWindow.getByLabel('settings');

    if (settingsWindow) {
      await settingsWindow.setFocus();
    } else {
      // In dev mode, use dev server URL; in production, use settings.html
      const isDev = window.location.hostname === 'localhost';
      const url = isDev ? 'http://localhost:1420/settings.html' : 'settings.html';

      new WebviewWindow('settings', {
        url,
        title: '设置中心',
        width: 1000,
        height: 600,
        resizable: true,
        center: true,
        decorations: true,
        alwaysOnTop: false,
        skipTaskbar: false,
      });
    }
  };

  const allItems: MenuItem[] = [
    // Pet fun
    {
      id: 'pet:feed',
      section: 'pet_fun',
      label: '喂食/吃苹果',
      keywords: ['喂食', '吃', '苹果', 'feed'],
      icon: <GlassWater className="w-4 h-4" />,
      onSelect: () => handlePetAction('feed'),
    },
    {
      id: 'pet:play',
      section: 'pet_fun',
      label: '玩小游戏',
      keywords: ['玩', '游戏', 'play'],
      icon: <Gamepad2 className="w-4 h-4" />,
      onSelect: () => handlePetAction('play'),
    },
    {
      id: 'pet:dance',
      section: 'pet_fun',
      label: '跳舞秀',
      keywords: ['跳舞', '舞蹈', 'dance'],
      icon: <Music className="w-4 h-4" />,
      onSelect: () => handlePetAction('dance'),
    },
    {
      id: 'pet:music',
      section: 'pet_fun',
      label: '播放音乐',
      keywords: ['音乐', '播放', 'music'],
      icon: <Music className="w-4 h-4" />,
      onSelect: () => handlePetAction('music'),
    },
    {
      id: 'pet:magic',
      section: 'pet_fun',
      label: '表演魔术',
      keywords: ['魔术', 'magic'],
      icon: <Wand2 className="w-4 h-4" />,
      onSelect: () => handlePetAction('magic'),
    },
    {
      id: 'pet:art',
      section: 'pet_fun',
      label: '生成艺术作品',
      keywords: ['艺术', '画', 'art'],
      icon: <Palette className="w-4 h-4" />,
      onSelect: () => handlePetAction('art'),
    },
    {
      id: 'pet:transform',
      section: 'pet_fun',
      label: '变身',
      keywords: ['变身', '换装', 'transform'],
      icon: <Sparkles className="w-4 h-4" />,
      onSelect: () => handlePetAction('transform'),
    },

    // Pet care
    {
      id: 'pet:sleep',
      section: 'pet_care',
      label: '睡觉/休息',
      keywords: ['睡觉', '休息', 'sleep'],
      icon: <Moon className="w-4 h-4" />,
      onSelect: () => handlePetAction('sleep'),
    },
    {
      id: 'pet:clean',
      section: 'pet_care',
      label: '清洁',
      keywords: ['清洁', '洗', 'clean'],
      icon: <Droplet className="w-4 h-4" />,
      onSelect: () => handlePetAction('clean'),
    },
    {
      id: 'pet:brush',
      section: 'pet_care',
      label: '梳毛',
      keywords: ['梳', '梳毛', 'brush'],
      icon: <Brush className="w-4 h-4" />,
      onSelect: () => handlePetAction('brush'),
    },
    {
      id: 'pet:rest',
      section: 'pet_care',
      label: '放松',
      keywords: ['放松', '冥想', 'rest'],
      icon: <Armchair className="w-4 h-4" />,
      onSelect: () => handlePetAction('rest'),
    },

    // Assistant
    {
      id: 'assistant:weather',
      section: 'assistant',
      label: '查询天气提示',
      keywords: ['天气', 'weather'],
      icon: <Cloud className="w-4 h-4" />,
      onSelect: () => handleAssistantAction('weather'),
    },
    {
      id: 'assistant:time',
      section: 'assistant',
      label: '播报时间',
      keywords: ['时间', '几点', 'time'],
      icon: <Clock className="w-4 h-4" />,
      onSelect: () => handleAssistantAction('time'),
    },
    {
      id: 'assistant:alarm',
      section: 'assistant',
      label: '创建15分钟提醒',
      keywords: ['提醒', '闹钟', 'alarm'],
      icon: <Bell className="w-4 h-4" />,
      onSelect: () => handleAssistantAction('alarm'),
    },
    {
      id: 'assistant:lights',
      section: 'assistant',
      label: '控制灯光/设备（模拟）',
      keywords: ['灯', '灯光', 'lights'],
      icon: <Lightbulb className="w-4 h-4" />,
      onSelect: () => handleAssistantAction('lights'),
    },
    {
      id: 'assistant:pc_action',
      section: 'assistant',
      label: '简单电脑操作',
      keywords: ['电脑', '打开', 'pc', 'action'],
      icon: <Monitor className="w-4 h-4" />,
      onSelect: () => handleAssistantAction('pc_action'),
    },
    {
      id: 'assistant:habit',
      section: 'assistant',
      label: '记住偏好/给出建议',
      keywords: ['偏好', '建议', '习惯', 'habit'],
      icon: <Star className="w-4 h-4" />,
      onSelect: () => handleAssistantAction('habit'),
    },

    // System
    {
      id: 'system:chat',
      section: 'system',
      label: '聊天',
      keywords: ['chat', '聊天', '对话'],
      icon: <MessageSquare className="w-4 h-4" />,
      onSelect: handleOpenChat,
    },
    {
      id: 'system:settings',
      section: 'system',
      label: '设置中心',
      keywords: ['设置', 'settings'],
      icon: <Settings className="w-4 h-4" />,
      onSelect: handleOpenSettings,
    },
    {
      id: 'system:status_panel',
      section: 'system',
      label: statusPanelVisible ? '隐藏状态面板' : '显示状态面板',
      keywords: ['状态', '面板', '统计'],
      icon: <BarChart3 className="w-4 h-4" />,
      onSelect: handleToggleStatusPanel,
    },
    {
      id: 'system:hide',
      section: 'system',
      label: '隐藏',
      keywords: ['隐藏', 'hide'],
      icon: <EyeOff className="w-4 h-4" />,
      onSelect: handleHide,
    },
    {
      id: 'system:quit',
      section: 'system',
      label: '退出',
      keywords: ['退出', 'quit'],
      icon: <X className="w-4 h-4" />,
      danger: true,
      onSelect: handleQuit,
    },
  ];

  const itemById = new Map(allItems.map((i) => [i.id, i]));
  const favoriteItems = favorites.map((id) => itemById.get(id)).filter(Boolean) as MenuItem[];
  const recentItems = recent.map((id) => itemById.get(id)).filter(Boolean) as MenuItem[];

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
    .filter(Boolean) as MenuItem[];

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
          className={`context-menu-item${item.danger ? ' danger' : ''}${active ? ' active' : ''}`}
          onMouseEnter={() => setActiveId(item.id)}
          onClick={() => selectItem(item)}
        >
          <span className="context-menu-item-left">
            {item.icon}
            <span className="context-menu-item-label">{item.label}</span>
          </span>
          <span className="context-menu-item-right">
            <button
              type="button"
              className={`context-menu-fav-btn${fav ? ' active' : ''}`}
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

  const petFunItems = getSectionItems('pet_fun');
  const petCareItems = getSectionItems('pet_care');
  const assistantItems = getSectionItems('assistant');
  const systemItems = getSectionItems('system');

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
        <div className="context-menu-title-row">
          <div className="context-menu-title">{label}</div>
          {right ? <div className="context-menu-title-actions">{right}</div> : null}
        </div>
      );
    }
    const collapsed = isCollapsed(section);
    const Icon = collapsed ? ChevronRight : ChevronDown;
    return (
      <div className="context-menu-title-row">
        <button
          type="button"
          className="context-menu-title-button"
          onClick={() => toggleCollapsed(section)}
          title={collapsed ? '展开' : '收起'}
        >
          <Icon className="w-4 h-4" />
          <span className="context-menu-title">{label}</span>
        </button>
        {right ? <div className="context-menu-title-actions">{right}</div> : null}
      </div>
    );
  };

  return (
    <div
      ref={menuRef}
      className="context-menu no-drag"
      style={{
        left: position?.left ?? 0,
        top: position?.top ?? 0,
        visibility: position ? 'visible' : 'hidden',
      }}
    >
      <div className="context-menu-search" onClick={(e) => e.stopPropagation()}>
        <Search className="context-menu-search-icon" />
        <Input
          ref={searchInputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索…（喂食/睡觉/天气/设置）"
          className="context-menu-search-input"
        />
      </div>

      {!normalizedQuery && favoriteItems.length > 0 && (
        <>
          {renderTitle('收藏')}
          {renderItems(favoriteItems)}
          <div className="context-menu-divider" />
        </>
      )}

      {!normalizedQuery && recentItems.length > 0 && (
        <>
          {renderTitle(
            '最近使用',
            undefined,
            <button
              type="button"
              className="context-menu-title-action-btn"
              onClick={() => clearRecent()}
              title="清空最近"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {renderItems(recentItems)}
          <div className="context-menu-divider" />
        </>
      )}

      {!normalizedQuery && recommendedItems.length > 0 && (
        <>
          {renderTitle('推荐/快捷')}
          {renderItems(recommendedItems)}
          <div className="context-menu-divider" />
        </>
      )}

      {normalizedQuery && filteredItems.length === 0 ? (
        <div className="context-menu-empty">没有匹配项</div>
      ) : (
        <>
          {petFunItems.length > 0 && !normalizedQuery && (
            <>
              {renderTitle('娱乐与表演', 'pet_fun')}
              {!isCollapsed('pet_fun') ? (
                <>
                  {renderItems(petFunItems)}
                  <div className="context-menu-divider" />
                </>
              ) : (
                <div className="context-menu-divider" />
              )}
            </>
          )}

          {(petFunItems.length > 0 && normalizedQuery) && (
            <>
              {renderTitle('娱乐与表演')}
              {renderItems(petFunItems)}
              <div className="context-menu-divider" />
            </>
          )}

          {petCareItems.length > 0 && !normalizedQuery && (
            <>
              {renderTitle('休息与护理', 'pet_care')}
              {!isCollapsed('pet_care') ? (
                <>
                  {renderItems(petCareItems)}
                  <div className="context-menu-divider" />
                </>
              ) : (
                <div className="context-menu-divider" />
              )}
            </>
          )}

          {(petCareItems.length > 0 && normalizedQuery) && (
            <>
              {renderTitle('休息与护理')}
              {renderItems(petCareItems)}
              <div className="context-menu-divider" />
            </>
          )}

          {assistantItems.length > 0 && !normalizedQuery && (
            <>
              {renderTitle('智能助手', 'assistant')}
              {!isCollapsed('assistant') ? (
                <>
                  {renderItems(assistantItems)}
                  <div className="context-menu-divider" />
                </>
              ) : (
                <div className="context-menu-divider" />
              )}
            </>
          )}

          {(assistantItems.length > 0 && normalizedQuery) && (
            <>
              {renderTitle('智能助手')}
              {renderItems(assistantItems)}
              <div className="context-menu-divider" />
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
