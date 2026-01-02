/**
 * Menu Keyboard Navigation Hook
 * 菜单键盘导航 Hook
 *
 * P1-D-4: Extracted from ContextMenu.tsx (530 lines)
 * Linus原则: 单一职责 - 只负责键盘交互（Escape关闭、Arrow导航、Enter选择）
 */

import { useEffect, useRef, useState } from 'react';
import type { MenuItem } from './menu-items';

export interface UseMenuKeyboardOptions {
  /** 当前可见的菜单项列表 */
  visibleItems: MenuItem[];
  /** 关闭菜单回调 */
  onClose: () => void;
  /** 记录最近使用回调 */
  recordRecent: (id: string) => void;
}

export interface UseMenuKeyboardResult {
  /** 当前激活的菜单项ID */
  activeId: string | null;
  /** 设置激活ID */
  setActiveId: (id: string | null) => void;
  /** 可见项列表引用（用于外部滚动同步） */
  visibleItemsRef: React.RefObject<MenuItem[]>;
}

/**
 * 菜单键盘导航 Hook
 *
 * 功能：
 * - Escape: 关闭菜单
 * - ArrowDown/ArrowUp: 上下导航
 * - Enter: 选择当前项
 *
 * @param options - Hook配置
 * @returns 键盘导航状态
 */
export function useMenuKeyboard(
  options: UseMenuKeyboardOptions
): UseMenuKeyboardResult {
  const { visibleItems, onClose, recordRecent } = options;
  const [activeId, setActiveId] = useState<string | null>(null);
  const visibleItemsRef = useRef<MenuItem[]>([]);

  // 同步 visibleItems 到 ref，并更新 activeId
  useEffect(() => {
    visibleItemsRef.current = visibleItems;
    setActiveId((prev) => {
      if (prev && visibleItems.some((i) => i.id === prev)) return prev;
      return visibleItems[0]?.id ?? null;
    });
  }, [visibleItems]);

  // 键盘事件监听
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveId((prev) => {
          const list = visibleItemsRef.current;

          // 边界检查：空列表
          if (list.length === 0) return null;

          // 边界检查：单项列表
          if (list.length === 1) return list[0]!.id;

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

    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('keydown', handleKey);
    };
  }, [activeId, onClose, recordRecent]);

  return {
    activeId,
    setActiveId,
    visibleItemsRef,
  };
}
