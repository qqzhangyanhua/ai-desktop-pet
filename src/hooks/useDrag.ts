import { useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { usePetStore } from '../stores';

interface UseDragOptions {
  onDragStart?: () => void;
  onDragEnd?: (position: { x: number; y: number }) => void;
}

export function useDrag(options: UseDragOptions = {}) {
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const windowStartPos = useRef({ x: 0, y: 0 });
  const optionsRef = useRef(options);
  const rafId = useRef<number | null>(null);
  const pendingPosition = useRef<{ x: number; y: number } | null>(null);

  // Update options ref when options change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const handleMouseDown = useCallback(
    async (e: React.MouseEvent) => {
      if (e.button !== 0) return; // Only left click

      isDragging.current = true;
      startPos.current = { x: e.screenX, y: e.screenY };

      try {
        const pos = await invoke<[number, number]>('get_window_position');
        windowStartPos.current = { x: pos[0], y: pos[1] };
      } catch (err) {
        console.error('Failed to get window position:', err);
      }

      optionsRef.current.onDragStart?.();
    },
    []
  );

  const updateWindowPosition = useCallback(() => {
    if (pendingPosition.current) {
      const { x, y } = pendingPosition.current;
      pendingPosition.current = null;

      invoke('set_window_position', { x, y }).catch((err) => {
        console.error('Failed to set window position:', err);
      });

      usePetStore.getState().setPosition({ x, y });
    }
    rafId.current = null;
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current) return;

      const deltaX = e.screenX - startPos.current.x;
      const deltaY = e.screenY - startPos.current.y;

      let newX = windowStartPos.current.x + deltaX;
      let newY = windowStartPos.current.y + deltaY;

      // Boundary check - prevent window from going off-screen
      const windowWidth = 300;
      // const windowHeight = 400; // Not used in current boundary logic
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

      const deltaX = e.screenX - startPos.current.x;
      const deltaY = e.screenY - startPos.current.y;

      const finalX = windowStartPos.current.x + deltaX;
      const finalY = windowStartPos.current.y + deltaY;

      optionsRef.current.onDragEnd?.({ x: finalX, y: finalY });
    },
    []
  );

  useEffect(() => {
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
