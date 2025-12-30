/**
 * Context Menu Position Hook
 * 右键菜单位置计算 Hook
 *
 * P1-D-3: Extracted from ContextMenu.tsx (530 lines)
 * Linus原则: 单一职责 - 只负责菜单位置的边界检测与翻转
 */

import { useLayoutEffect, useState } from 'react';

export interface MenuPosition {
  left: number;
  top: number;
}

/**
 * 计算菜单位置，确保不溢出窗口边界
 *
 * 策略：
 * - 默认位置：鼠标右下方
 * - 右侧溢出：翻转到左边
 * - 下方溢出：翻转到上边
 * - 确保不超出左边界和上边界
 *
 * @param x - 鼠标X坐标
 * @param y - 鼠标Y坐标
 * @param menuRef - 菜单DOM引用
 * @returns 计算后的位置 {left, top}
 */
export function useContextMenuPosition(
  x: number,
  y: number,
  menuRef: React.RefObject<HTMLDivElement | null>
): MenuPosition | null {
  const [position, setPosition] = useState<MenuPosition | null>(null);

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
  }, [x, y, menuRef]);

  return position;
}
