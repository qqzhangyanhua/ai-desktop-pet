import { useCallback, useEffect, useRef } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { PhysicalPosition } from '@tauri-apps/api/dpi';
import { currentMonitor, getCurrentWindow } from '@tauri-apps/api/window';
import { useConfigStore } from '@/stores';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function useWindowPlacement() {
  const interaction = useConfigStore((s) => s.config.interaction);
  const applyingRef = useRef(false);
  const moveEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistPlacementFromWindow = useCallback(async () => {
    if (!isTauri()) return;
    if (!interaction.rememberPosition) return;

    const appWindow = getCurrentWindow();
    const [pos, monitor, size] = await Promise.all([
      appWindow.outerPosition(),
      currentMonitor(),
      appWindow.outerSize(),
    ]);

    const monitorPos = monitor?.position ?? { x: 0, y: 0 };
    const monitorSize = monitor?.size ?? { width: window.screen.width, height: window.screen.height };

    const minVisible = 60;
    const maxX = monitorPos.x + monitorSize.width - minVisible;
    const maxY = monitorPos.y + monitorSize.height - minVisible;
    const minX = monitorPos.x - size.width + minVisible;
    const minY = monitorPos.y;

    const clampedX = clamp(pos.x, minX, maxX);
    const clampedY = clamp(pos.y, minY, maxY);

    const { config, setConfig, saveConfig } = useConfigStore.getState();
    setConfig({
      interaction: {
        ...config.interaction,
        lastPosition: { x: clampedX, y: clampedY },
      },
    });
    await saveConfig();
  }, [interaction.rememberPosition]);

  const snapAndPersistOnDragEnd = useCallback(async () => {
    if (!isTauri()) return;
    if (applyingRef.current) return;

    const appWindow = getCurrentWindow();
    const [pos, size, monitor] = await Promise.all([
      appWindow.outerPosition(),
      appWindow.outerSize(),
      currentMonitor(),
    ]);

    const monitorPos = monitor?.position ?? { x: 0, y: 0 };
    const monitorSize = monitor?.size ?? { width: window.screen.width, height: window.screen.height };

    let nextX = pos.x;
    let nextY = pos.y;
    let dockedEdge: typeof interaction.dockedEdge = null;

    if (interaction.snapEnabled) {
      const left = monitorPos.x;
      const right = monitorPos.x + monitorSize.width;
      const windowLeft = pos.x;
      const windowRight = pos.x + size.width;

      if (Math.abs(windowLeft - left) <= interaction.snapThreshold) {
        nextX = left;
        dockedEdge = 'left';
      } else if (Math.abs(right - windowRight) <= interaction.snapThreshold) {
        nextX = right - size.width;
        dockedEdge = 'right';
      }
    }

    const minVisible = 60;
    const maxX = monitorPos.x + monitorSize.width - minVisible;
    const maxY = monitorPos.y + monitorSize.height - minVisible;
    const minX = monitorPos.x - size.width + minVisible;
    const minY = monitorPos.y;

    nextX = clamp(nextX, minX, maxX);
    nextY = clamp(nextY, minY, maxY);

    const shouldMove = nextX !== pos.x || nextY !== pos.y;
    if (shouldMove) {
      applyingRef.current = true;
      await appWindow.setPosition(new PhysicalPosition(nextX, nextY));
      setTimeout(() => {
        applyingRef.current = false;
      }, 280);
    }

    if (interaction.rememberPosition) {
      const { config, setConfig, saveConfig } = useConfigStore.getState();
      setConfig({
        interaction: {
          ...config.interaction,
          lastPosition: { x: nextX, y: nextY },
          dockedEdge,
        },
      });
      await saveConfig();
    }
  }, [interaction.dockedEdge, interaction.rememberPosition, interaction.snapEnabled, interaction.snapThreshold]);

  // 监听窗口移动，拖拽结束（移动停止）后再统一做吸附与持久化，避免拖拽过程中高频 setPosition
  useEffect(() => {
    if (!isTauri()) return;
    if (!interaction.snapEnabled && !interaction.rememberPosition) return;

    const appWindow = getCurrentWindow();
    let disposed = false;

    const unlistenPromise = appWindow.onMoved(() => {
      if (disposed) return;
      if (moveEndTimerRef.current) {
        clearTimeout(moveEndTimerRef.current);
      }
      moveEndTimerRef.current = setTimeout(() => {
        snapAndPersistOnDragEnd().catch((err) => {
          console.warn('[useWindowPlacement] Failed to snap/persist after move:', err);
        });
      }, 240);
    });

    return () => {
      disposed = true;
      if (moveEndTimerRef.current) {
        clearTimeout(moveEndTimerRef.current);
        moveEndTimerRef.current = null;
      }
      unlistenPromise.then((unlisten) => unlisten()).catch(() => undefined);
    };
  }, [interaction.rememberPosition, interaction.snapEnabled, snapAndPersistOnDragEnd]);

  return {
    persistPlacementFromWindow,
    snapAndPersistOnDragEnd,
  };
}
