/**
 * useStatusDisplay Hook
 * 状态展示 Hook
 *
 * 整合状态气泡和迷你状态条的显示逻辑
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useCareStore } from '@/stores';
import type { StatusBubble, InteractionType, PetCareStats } from '@/types';
import { createStatusBubble, BUBBLE_PRIORITY } from '@/types/bubble';
import { checkStatusThresholds, isUrgentStatus, getCooldownFeedback } from '@/services/pet';

interface UseStatusDisplayOptions {
  /** 检查间隔 (毫秒) */
  checkInterval?: number;
  /** 是否启用状态气泡 */
  enableBubble?: boolean;
  /** 是否启用迷你状态条 */
  enableMiniBar?: boolean;
  /** 悬停显示延迟 (毫秒) */
  hoverDelay?: number;
}

interface UseStatusDisplayReturn {
  /** 当前状态 */
  stats: PetCareStats;
  /** 当前气泡 */
  currentBubble: StatusBubble | null;
  /** 是否为紧急状态 */
  isUrgent: boolean;
  /** 迷你状态条是否可见 */
  miniBarVisible: boolean;
  /** 处理气泡按钮点击 */
  handleBubbleAction: (actionType: InteractionType | 'dismiss') => void;
  /** 关闭气泡 */
  dismissBubble: () => void;
  /** 鼠标进入 (显示迷你状态条) */
  handleMouseEnter: () => void;
  /** 鼠标离开 (隐藏迷你状态条) */
  handleMouseLeave: () => void;
  /** 显示冷却提示气泡 */
  showCooldownBubble: (type: InteractionType, remainingSeconds: number) => void;
}

export function useStatusDisplay(
  options: UseStatusDisplayOptions = {}
): UseStatusDisplayReturn {
  const {
    checkInterval = 30000, // 30秒
    enableBubble = true,
    enableMiniBar = true,
    hoverDelay = 2000, // 2秒
  } = options;

  // 从 CareStore 获取状态
  const careStore = useCareStore();
  const stats: PetCareStats = {
    satiety: careStore.satiety,
    energy: careStore.energy,
    hygiene: careStore.hygiene,
    mood: careStore.mood,
    boredom: careStore.boredom,
    isSick: careStore.isSick,
    lastAction: careStore.lastAction,
  };

  const [currentBubble, setCurrentBubble] = useState<StatusBubble | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);
  const [miniBarVisible, setMiniBarVisible] = useState(false);

  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentBubbleRef = useRef<StatusBubble | null>(null);

  // 同步 ref
  useEffect(() => {
    currentBubbleRef.current = currentBubble;
  }, [currentBubble]);

  // 清理定时器
  const clearTimers = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  }, []);

  // 检查状态阈值
  const checkStatus = useCallback(() => {
    if (!enableBubble) return;

    // 如果已有气泡，不覆盖
    if (currentBubbleRef.current) return;

    const bubble = checkStatusThresholds(stats);
    if (bubble) {
      setCurrentBubble(bubble);
      setIsUrgent(isUrgentStatus(stats));
    }
  }, [stats, enableBubble]);

  // 定期检查状态
  useEffect(() => {
    if (!enableBubble) return;

    // 初始检查（延迟5秒，等待初始化完成）
    const initTimer = setTimeout(() => {
      checkStatus();
    }, 5000);

    // 定期检查
    checkTimerRef.current = setInterval(checkStatus, checkInterval);

    return () => {
      clearTimeout(initTimer);
      if (checkTimerRef.current) {
        clearInterval(checkTimerRef.current);
      }
    };
  }, [enableBubble, checkInterval, checkStatus]);

  // 处理气泡按钮点击
  const handleBubbleAction = useCallback(
    (actionType: InteractionType | 'dismiss') => {
      if (actionType === 'dismiss') {
        setCurrentBubble(null);
        return;
      }

      // 其他操作由外部处理，这里只关闭气泡
      setCurrentBubble(null);
    },
    []
  );

  // 关闭气泡
  const dismissBubble = useCallback(() => {
    setCurrentBubble(null);
  }, []);

  // 显示冷却提示气泡
  const showCooldownBubble = useCallback(
    (type: InteractionType, remainingSeconds: number) => {
      const feedback = getCooldownFeedback(type, remainingSeconds);
      const bubble = createStatusBubble({
        type: 'cooldown',
        priority: BUBBLE_PRIORITY.MEDIUM,
        message: `${feedback.message}\n${feedback.remainingText}`,
        emotion: feedback.emotion,
        duration: feedback.duration,
        dismissible: true,
      });
      setCurrentBubble(bubble);
      setIsUrgent(false);
    },
    []
  );

  // 鼠标进入
  const handleMouseEnter = useCallback(() => {
    if (!enableMiniBar) return;

    clearTimers();

    // 延迟显示
    hoverTimerRef.current = setTimeout(() => {
      setMiniBarVisible(true);
    }, hoverDelay);
  }, [enableMiniBar, hoverDelay, clearTimers]);

  // 鼠标离开
  const handleMouseLeave = useCallback(() => {
    if (!enableMiniBar) return;

    clearTimers();

    // 延迟隐藏
    leaveTimerRef.current = setTimeout(() => {
      setMiniBarVisible(false);
    }, 300);
  }, [enableMiniBar, clearTimers]);

  // 清理
  useEffect(() => {
    return () => {
      clearTimers();
      if (checkTimerRef.current) {
        clearInterval(checkTimerRef.current);
      }
    };
  }, [clearTimers]);

  return {
    stats,
    currentBubble,
    isUrgent,
    miniBarVisible,
    handleBubbleAction,
    dismissBubble,
    handleMouseEnter,
    handleMouseLeave,
    showCooldownBubble,
  };
}

export default useStatusDisplay;
