import { useState, useCallback, useEffect, useRef } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { PetCanvas } from './PetCanvas';
import { ContextMenu } from './ContextMenu';
import { StatusBar } from './StatusBar';
import { InteractionFeedback } from './InteractionFeedback';
import { Live2DPet } from './Live2DPet';
// import { PetStatusPanel } from './PetStatusPanel';
import { useConfigStore } from '../../stores';
import {
  useAssistantSkills,
  useAutoWork,
  usePetActions,
  usePetCareLoop,
  usePetIdleBehavior,
  usePetVoiceLink,
  useWindowAutoHide,
} from '../../hooks';
import { useWindowPlacement } from '@/hooks/useWindowPlacement';
import { usePetStatus } from '../../hooks/usePetStatus';
import type { InteractionType } from '@/types';

interface PetContainerProps {
  // No props needed - chat opens in separate window
}

export function PetContainer(_props: PetContainerProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [live2dReady, setLive2dReady] = useState(false);
  const [live2dError, setLive2dError] = useState<Error | null>(null);
  const [clickStart, setClickStart] = useState<{ x: number; y: number } | null>(null);
  const [feedbackTrigger, setFeedbackTrigger] = useState<{
    type: InteractionType;
    value: number;
    position: { x: number; y: number };
  } | null>(null);
  const dragCandidateRef = useRef<{ x: number; y: number } | null>(null);
  const isWindowDragTriggeredRef = useRef(false);

  const { runPetAction } = usePetActions();
  const { performSkill } = useAssistantSkills();
  const { performInteraction, status } = usePetStatus();

  // Get config to determine if Live2D is enabled
  const { config } = useConfigStore();
  const useLive2D = config?.live2d?.useLive2D ?? false;
  const appearance = config.appearance;
  const performance = config.performance;

  // Debug: Log Live2D state
  useEffect(() => {
    console.log('[PetContainer] Live2D状态:', {
      useLive2D,
      'config.live2d.useLive2D': config.live2d?.useLive2D,
      live2dReady,
      live2dError,
      '是否显示占位符': !useLive2D || !live2dReady || !!live2dError,
    });
  }, [useLive2D, config.live2d, live2dReady, live2dError]);

  const backgroundStyle = (() => {
    const { mode, value } = appearance.background;
    if (mode === 'none') {
      return { background: 'transparent' };
    }
    if (mode === 'image' && value) {
      return {
        backgroundImage: `url(${value})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      } as const;
    }
    if (mode === 'color' && value) {
      return { background: value };
    }
    if (mode === 'preset') {
      switch (value) {
        case 'light':
          return { background: 'linear-gradient(135deg, rgba(255,255,255,0.85), rgba(200,230,255,0.6))' };
        case 'dark':
          return { background: 'linear-gradient(135deg, rgba(20,20,20,0.65), rgba(40,40,60,0.65))' };
        case 'sunset':
          return { background: 'linear-gradient(135deg, rgba(255,204,128,0.75), rgba(240,98,146,0.6))' };
        default:
          return { background: 'transparent' };
      }
    }
    return { background: 'transparent' };
  })();

  const handleContextMenu = useCallback((e: React.MouseEvent | MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  /**
   * Determine interaction zone from click position
   * 根据点击位置判断互动区域
   */
  const getInteractionZone = useCallback(
    (clickY: number, containerHeight: number): InteractionType => {
      const relativeY = clickY / containerHeight;

      if (relativeY < 0.33) return 'pet'; // 上1/3 - 抚摸头部
      if (relativeY < 0.67) return 'feed'; // 中1/3 - 喂食
      return 'play'; // 下1/3 - 玩耍
    },
    []
  );

  /**
   * Handle mouse down - record click start position
   * 记录点击起始位置
   */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // 排除右键和中键
    if (e.button !== 0) return;

    setClickStart({ x: e.clientX, y: e.clientY });
  }, []);

  /**
   * 鼠标按下（捕获阶段）- 准备判断“点击 vs 拖动窗口”
   * 目标：宠物主体区域可拖动，但轻点仍触发互动
   */
  const handleMouseDownCapture = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (!isTauri()) return;
    if (config.interaction.clickThrough) return;

    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (target.closest('.no-drag')) return;
    // 状态栏自身已经支持拖动，避免重复触发
    if (target.closest('.status-bar')) return;

    dragCandidateRef.current = { x: e.screenX, y: e.screenY };
    isWindowDragTriggeredRef.current = false;
  }, [config.interaction.clickThrough]);

  /**
   * 鼠标移动（捕获阶段）- 超过阈值后触发原生拖拽
   */
  const handleMouseMoveCapture = useCallback(async (e: React.MouseEvent) => {
    if (!dragCandidateRef.current) return;
    if (isWindowDragTriggeredRef.current) return;
    if (e.buttons !== 1) return;

    const dx = e.screenX - dragCandidateRef.current.x;
    const dy = e.screenY - dragCandidateRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance <= 6) return;

    isWindowDragTriggeredRef.current = true;
    dragCandidateRef.current = null;
    setClickStart(null);

    try {
      const appWindow = getCurrentWindow();
      await appWindow.startDragging();
    } catch (err) {
      console.warn('[PetContainer] startDragging failed:', err);
    }
  }, []);

  /**
   * 鼠标抬起（捕获阶段）- 清理拖动候选状态
   */
  const handleMouseUpCapture = useCallback(() => {
    dragCandidateRef.current = null;
  }, []);

  /**
   * Handle mouse up - detect click vs drag and trigger interaction
   * 区分点击和拖动，触发互动
   */
  const handleMouseUp = useCallback(
    async (e: React.MouseEvent) => {
      if (isWindowDragTriggeredRef.current) {
        isWindowDragTriggeredRef.current = false;
        setClickStart(null);
        return;
      }
      if (!clickStart) return;

      // 计算移动距离
      const dx = e.clientX - clickStart.x;
      const dy = e.clientY - clickStart.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 移动距离>5px视为拖动，不触发互动
      if (distance > 5) {
        setClickStart(null);
        return;
      }

      // 判断点击区域
      const container = e.currentTarget as HTMLElement;
      const rect = container.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;

      const zone = getInteractionZone(relativeY, rect.height);

      // 执行互动
      const result = await performInteraction(zone);

      if (result.success) {
        // 计算属性增益值（根据互动类型选择对应属性）
        let valueChange = 0;
        if (zone === 'pet') {
          valueChange = result.newStatus.mood - status.mood;
        } else if (zone === 'feed') {
          valueChange = result.newStatus.energy - status.energy;
        } else if (zone === 'play') {
          valueChange = result.newStatus.mood - status.mood;
        }

        // 触发反馈动画
        setFeedbackTrigger({
          type: zone,
          value: valueChange,
          position: { x: e.clientX, y: e.clientY },
        });

        console.log(`[PetContainer] Interaction success: ${zone} +${valueChange}`);
      } else if (result.message) {
        console.log(`[PetContainer] Interaction failed: ${result.message}`);
      }

      setClickStart(null);
    },
    [clickStart, performInteraction, getInteractionZone, status]
  );

  // Add global context menu listener when Live2D is active
  // This catches right-clicks on the oh-my-live2d canvas
  useEffect(() => {
    if (useLive2D && live2dReady) {
      const handleGlobalContextMenu = (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        // 仅拦截 Live2D 舞台/画布区域，避免影响其它 UI（例如状态栏、设置窗口等）
        const isLive2DArea = !!target.closest('#oml2d-stage, #oml2d-canvas, .oml2d-wrapper');
        if (!isLive2DArea) return;
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
      };

      document.addEventListener('contextmenu', handleGlobalContextMenu);

      return () => {
        document.removeEventListener('contextmenu', handleGlobalContextMenu);
      };
    }
    return undefined;
  }, [useLive2D, live2dReady]);

  // Live2D 舞台在 body 顶层渲染，React 的容器事件捕获不到它的鼠标事件
  // 这里补一层全局监听：在 Live2D 区域也能触发 Tauri 窗口拖动
  useEffect(() => {
    if (!isTauri()) return;
    if (!useLive2D || !live2dReady) return;
    if (config.interaction.clickThrough) return;

    const isLive2DArea = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      return !!el.closest('#oml2d-stage, #oml2d-canvas, .oml2d-wrapper');
    };

    const handleGlobalMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (!isLive2DArea(e.target)) return;
      dragCandidateRef.current = { x: e.screenX, y: e.screenY };
      isWindowDragTriggeredRef.current = false;
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!dragCandidateRef.current) return;
      if (isWindowDragTriggeredRef.current) return;
      if ((e.buttons & 1) !== 1) return;

      const dx = e.screenX - dragCandidateRef.current.x;
      const dy = e.screenY - dragCandidateRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= 6) return;

      isWindowDragTriggeredRef.current = true;
      dragCandidateRef.current = null;
      setClickStart(null);

      try {
        const appWindow = getCurrentWindow();
        void appWindow.startDragging();
      } catch (err) {
        console.warn('[PetContainer] startDragging (Live2D) failed:', err);
      }
    };

    const handleGlobalMouseUp = () => {
      dragCandidateRef.current = null;
    };

    document.addEventListener('mousedown', handleGlobalMouseDown, true);
    document.addEventListener('mousemove', handleGlobalMouseMove, true);
    document.addEventListener('mouseup', handleGlobalMouseUp, true);

    return () => {
      document.removeEventListener('mousedown', handleGlobalMouseDown, true);
      document.removeEventListener('mousemove', handleGlobalMouseMove, true);
      document.removeEventListener('mouseup', handleGlobalMouseUp, true);
    };
  }, [config.interaction.clickThrough, live2dReady, useLive2D]);

  const handleLive2DReady = useCallback(() => {
    console.log('[PetContainer] Live2D ready callback triggered! Setting live2dReady to true');
    setLive2dReady(true);
    console.log('Live2D model loaded successfully');
  }, []);

  const handleLive2DError = useCallback((error: Error) => {
    setLive2dError(error);
    console.error('Live2D error:', error);
  }, []);

  // 养成状态循环提醒
  usePetCareLoop();

  // 语音联动（说话/听写状态同步）
  usePetVoiceLink();

  // 日常行为（更像宠物，低打扰）
  usePetIdleBehavior();

  // 统一处理移动结束后的吸附与位置记忆
  useWindowPlacement();

  // 自动打工（最小版本：按频率定时触发“work”动作）
  useAutoWork();

  // 窗口自动隐藏功能
  useWindowAutoHide({
    enabled: config.interaction.autoHideEnabled,
    edgeThreshold: config.interaction.autoHideEdgeThreshold,
    hideOffset: config.interaction.autoHideOffset,
    hoverRevealDelay: config.interaction.autoHideHoverRevealDelay,
  });

  return (
    <div
      className="pet-container"
      onMouseDownCapture={handleMouseDownCapture}
      onMouseMoveCapture={handleMouseMoveCapture}
      onMouseUpCapture={handleMouseUpCapture}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      style={{
        opacity: Math.min(1, Math.max(0.2, appearance.opacity)),
        paddingTop: 100, // 进一步增加顶部内边距，确保气泡不溢出
        ...backgroundStyle,
      }}
    >
      {/* Status Bar - always visible */}
      <StatusBar />

      {/* Interaction Feedback - floating text */}
      <InteractionFeedback
        trigger={feedbackTrigger?.type || null}
        value={feedbackTrigger?.value || 0}
        position={feedbackTrigger?.position || { x: 0, y: 0 }}
      />

      {/* Show placeholder if Live2D is disabled or not ready */}
      {(!useLive2D || !live2dReady || live2dError) && (
        <PetCanvas
          width={appearance.size.width}
          height={appearance.size.height}
          maxFps={performance.animationFps}
          onContextMenu={handleContextMenu}
        />
      )}

      {/* Initialize Live2D if enabled */}
      {useLive2D && (
        <Live2DPet
          onReady={handleLive2DReady}
          onError={handleLive2DError}
        />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={handleCloseContextMenu}
          onPetAction={(action) => {
            runPetAction(action);
          }}
          onAssistantAction={(skill) => {
            performSkill(skill);
          }}
        />
      )}
    </div>
  );
}
