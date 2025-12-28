/**
 * Micro-Interaction System
 * 微互动系统
 *
 * Linus准则: 低摩擦的交互 - 悬停即有反应，无需点击
 */

/**
 * 工具函数：计算相对坐标
 */
export function calculateRelativePosition(
  clientX: number,
  clientY: number,
  element: HTMLElement
): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  const x = (clientX - rect.left) / rect.width;
  const y = (clientY - rect.top) / rect.height;
  return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
}

// Re-export types and classes
export * from './types';
export * from './constants';
export { MicroInteractionHandler } from './handler';
