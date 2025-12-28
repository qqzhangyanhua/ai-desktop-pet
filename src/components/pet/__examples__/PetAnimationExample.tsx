/**
 * Pet Animation Integration Example
 * 宠物动画集成示例
 *
 * 展示如何在React组件中使用动画系统
 */

import React, { useEffect, useRef, useState } from 'react';
import { AnimationManager } from '@/services/animation';
import { petCoreService } from '@/services/pet-core';
import type { EmotionType } from '@/types';

/**
 * 示例组件：集成微互动和特效的宠物容器
 */
export function PetAnimationExample() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationManagerRef = useRef<AnimationManager | null>(null);
  const [emotion, setEmotion] = useState<EmotionType>('neutral');
  const [energy, setEnergy] = useState(100);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    // 初始化动画系统
    const animationManager = new AnimationManager(
      {
        enabled: true,
        hoverDelay: 100,
        responseDelay: 50,
        showRipple: true,
        showParticles: true,
      },
      {
        enabled: true,
        intensity: 0.7,
      }
    );

    animationManager.initialize(canvasRef.current);
    animationManagerRef.current = animationManager;

    // 订阅动画事件
    const unsubscribe = animationManager.subscribe((event) => {
      console.log('[PetAnimation] Animation event:', event);

      if (event.type === 'micro-interaction') {
        const { event: microEvent, result } = event.data;

        // 处理微互动结果
        if (result.emotion) {
          setEmotion(result.emotion);
        }

        // 触发语音反馈
        if (result.message) {
          console.log('[PetAnimation] Pet says:', result.message);
        }
      }

      if (event.type === 'idle-animation') {
        // 处理待机动画
        console.log('[PetAnimation] Idle animation:', event.data.type);
      }
    });

    // 订阅PetCore状态变更
    const unsubscribeState = petCoreService.subscribe((oldState, newState) => {
      // 更新动画系统的宠物状态
      const petEmotion = getEmotionFromMood(newState.care.mood, newState.care.energy);
      animationManager.updatePetState(petEmotion, newState.care.energy);

      setEmotion(petEmotion);
      setEnergy(newState.care.energy);
    });

    // 动画循环
    let animationFrameId: number;
    const animate = () => {
      animationManager.update();
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    // 清理函数
    return () => {
      unsubscribe();
      unsubscribeState();
      animationManager.destroy();
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  /**
   * 处理鼠标事件
   */
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || !animationManagerRef.current) return;

    animationManagerRef.current.handleMouseMove(
      e.clientX,
      e.clientY,
      containerRef.current
    );
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (!containerRef.current || !animationManagerRef.current) return;

    animationManagerRef.current.handleMouseEnter(
      e.clientX,
      e.clientY,
      containerRef.current
    );
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    if (!containerRef.current || !animationManagerRef.current) return;

    animationManagerRef.current.handleMouseLeave(
      e.clientX,
      e.clientY,
      containerRef.current
    );
  };

  const handleClick = async (e: React.MouseEvent) => {
    if (!containerRef.current || !animationManagerRef.current) return;

    // 处理点击互动
    animationManagerRef.current.handleClick(
      e.clientX,
      e.clientY,
      containerRef.current
    );

    // 同时触发PetCore互动
    const zone = getZoneFromClick(e.clientX, e.clientY, containerRef.current);
    if (zone) {
      const interactionType = zoneToInteractionType(zone);
      await petCoreService.handleInteraction(interactionType);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '300px',
        height: '400px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* 粒子特效Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />

      {/* 宠物显示区域 */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '200px',
          height: '200px',
          background: 'rgba(255, 192, 203, 0.3)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '48px',
          transition: 'transform 0.3s ease',
          transform: `translate(-50%, -50%) ${
            animationManagerRef.current?.getSwayAngle()
              ? `rotate(${animationManagerRef.current.getSwayAngle()}deg)`
              : ''
          } scale(${1 + (animationManagerRef.current?.getBreathingValue() || 0) * 0.05})`,
        }}
      >
        {emotionToEmoji(emotion)}
      </div>

      {/* 状态指示器 */}
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          right: '10px',
          background: 'rgba(0, 0, 0, 0.5)',
          color: 'white',
          padding: '8px',
          borderRadius: '8px',
          fontSize: '12px',
        }}
      >
        <div>Emotion: {emotion}</div>
        <div>Energy: {energy}</div>
        <div style={{ marginTop: '4px' }}>
          Hover over me! Try clicking my head, body, or feet.
        </div>
      </div>
    </div>
  );
}

/**
 * 根据心情和精力获取表情
 */
function getEmotionFromMood(mood: number, energy: number): EmotionType {
  if (energy < 20) return 'sleepy';
  if (mood >= 70) return 'happy';
  if (mood >= 40) return 'neutral';
  return 'sad';
}

/**
 * 表情转emoji（仅示例）
 */
function emotionToEmoji(emotion: EmotionType): string {
  const emojiMap: Record<EmotionType, string> = {
    happy: '😊',
    excited: '🤩',
    thinking: '🤔',
    confused: '😕',
    surprised: '😮',
    neutral: '😐',
    sad: '😢',
  };
  return emojiMap[emotion] || '😐';
}

/**
 * 从点击位置获取互动区域
 */
function getZoneFromClick(
  clientX: number,
  clientY: number,
  element: HTMLElement
): 'head' | 'body' | 'feet' | null {
  const rect = element.getBoundingClientRect();
  const x = (clientX - rect.left) / rect.width;
  const y = (clientY - rect.top) / rect.height;

  // 简单的区域划分
  if (y < 0.35) return 'head';
  if (y < 0.7) return 'body';
  return 'feet';
}

/**
 * 区域转互动类型
 */
function zoneToInteractionType(
  zone: 'head' | 'body' | 'feet'
): 'pet' | 'feed' | 'play' {
  const mapping = {
    head: 'pet',
    body: 'feed',
    feet: 'play',
  } as const;

  return mapping[zone];
}
