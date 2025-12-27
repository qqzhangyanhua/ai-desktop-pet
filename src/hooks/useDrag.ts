import { useCallback, useRef, useEffect } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { LogicalPosition, type LogicalSize } from '@tauri-apps/api/dpi';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { usePetStore } from '../stores';

interface UseDragOptions {
  onDragStart?: () => void;
  onDragEnd?: (position: { x: number; y: number }) => void;
}

export function useDrag(options: UseDragOptions = {}) {
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const windowStartPos = useRef({ x: 0, y: 0 });
  const windowSize = useRef<LogicalSize | null>(null);
  const optionsRef = useRef(options);
  const rafId = useRef<number | null>(null);
  const pendingPosition = useRef<{ x: number; y: number } | null>(null);
  const appWindowRef = useRef<ReturnType<typeof getCurrentWindow> | null>(null);
  const nativeDragging = useRef(false);

  // Update options ref when options change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const handleMouseDown = useCallback(
    async (e: React.MouseEvent) => {
      if (e.button !== 0) return; // Only left click
      if (!isTauri()) return;
      e.preventDefault();

      if (!appWindowRef.current) {
        appWindowRef.current = getCurrentWindow();
      }
      const appWindow = appWindowRef.current;

      // 使用原生拖拽，避免高频 setPosition 造成卡顿甚至崩溃
      nativeDragging.current = false;
      optionsRef.current.onDragStart?.();
      try {
        await appWindow.startDragging();
        nativeDragging.current = true;
        isDragging.current = true;
        return;
      } catch (err) {
        console.warn('[useDrag] startDragging 失败，降级为手动 setPosition 拖拽：', err);
      }

      // 兜底：手动 setPosition 拖拽
      isDragging.current = true;
      startPos.current = { x: e.screenX, y: e.screenY };

      try {
        const [scaleFactor, outerPosition, outerSize] = await Promise.all([
          appWindow.scaleFactor(),
          appWindow.outerPosition(),
          appWindow.outerSize(),
        ]);

        const logicalPos = outerPosition.toLogical(scaleFactor);
        windowStartPos.current = { x: logicalPos.x, y: logicalPos.y };

        const logicalSize = outerSize.toLogical(scaleFactor);
        windowSize.current = logicalSize;
      } catch (err) {
        console.error('Failed to get window position:', err);
      }

    },
    []
  );

  const updateWindowPosition = useCallback(() => {
    if (pendingPosition.current) {
      const { x, y } = pendingPosition.current;
      pendingPosition.current = null;

      const appWindow = appWindowRef.current;
      if (appWindow) {
        appWindow.setPosition(new LogicalPosition(x, y)).catch((err) => {
          console.error('Failed to set window position:', err);
        });
      }

      usePetStore.getState().setPosition({ x, y });
    }
    rafId.current = null;
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current) return;
      if (nativeDragging.current) return;

      const deltaX = e.screenX - startPos.current.x;
      const deltaY = e.screenY - startPos.current.y;

      let newX = windowStartPos.current.x + deltaX;
      let newY = windowStartPos.current.y + deltaY;

      // Boundary check - prevent window from going off-screen
      const { width: windowWidth } = windowSize.current ?? usePetStore.getState().size;
      const screenWidth = window.screen.width;
      const screenHeight = window.screen.height;

      // Keep at least 50px of the window visible
      const minVisible = 50;
      newX = Math.max(-windowWidth + minVisible, Math.min(screenWidth - minVisible, newX));
      newY = Math.max(0, Math.min(screenHeight - minVisible, newY));

      // Store pending position
      pendingPosition.current = { x: newX, y: newY };

      // Schedule update using requestAnimationFrame for smooth dragging
      if (rafId.current === null) {
        rafId.current = requestAnimationFrame(updateWindowPosition);
      }
    },
    [updateWindowPosition]
  );

  const handleMouseUp = useCallback(
    async (e: MouseEvent) => {
      if (!isDragging.current) return;

      isDragging.current = false;
      const wasNativeDrag = nativeDragging.current;
      nativeDragging.current = false;

      // 原生拖拽：尽力在 mouseup 时回调最终位置
      if (wasNativeDrag) {
        try {
          const appWindow = appWindowRef.current ?? getCurrentWindow();
          appWindowRef.current = appWindow;
          const [scaleFactor, outerPosition] = await Promise.all([
            appWindow.scaleFactor(),
            appWindow.outerPosition(),
          ]);
          const logicalPos = outerPosition.toLogical(scaleFactor);
          optionsRef.current.onDragEnd?.({ x: logicalPos.x, y: logicalPos.y });
        } catch {
          // 忽略：某些情况下 mouseup 不可靠，位置持久化交给 onMoved 监听处理
        }
        return;
      }

      const deltaX = e.screenX - startPos.current.x;
      const deltaY = e.screenY - startPos.current.y;

      const finalX = windowStartPos.current.x + deltaX;
      const finalY = windowStartPos.current.y + deltaY;

      optionsRef.current.onDragEnd?.({ x: finalX, y: finalY });
    },
    []
  );

  useEffect(() => {
    if (!isTauri()) return;

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      // Cancel pending animation frame
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, [handleMouseMove, handleMouseUp]);

  return { handleMouseDown };
}
