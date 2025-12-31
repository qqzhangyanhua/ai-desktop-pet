import { useEffect, useRef, useState, useCallback } from 'react';
import { Application, Graphics } from 'pixi.js';
import { usePetStore } from '../../stores';
import type { EmotionType } from '../../types';
import { usePetStatus } from '../../hooks/usePetStatus';
import '../../styles/global.css';
import '../../components/settings/game-ui.css';

// Placeholder pet rendering until Live2D is integrated
function drawPlaceholderPet(
  graphics: Graphics,
  width: number,
  height: number,
  emotion: EmotionType
) {
  graphics.clear();

  // Body
  graphics.circle(width / 2, height / 2, 80);
  graphics.fill({ color: 0x6ec6ff });

  // Face based on emotion
  const centerX = width / 2;
  const centerY = height / 2;

  // Eyes
  const eyeY = centerY - 15;
  const leftEyeX = centerX - 25;
  const rightEyeX = centerX + 25;

  graphics.circle(leftEyeX, eyeY, 10);
  graphics.circle(rightEyeX, eyeY, 10);
  graphics.fill({ color: 0x333333 });

  // Eye highlights
  graphics.circle(leftEyeX + 3, eyeY - 3, 3);
  graphics.circle(rightEyeX + 3, eyeY - 3, 3);
  graphics.fill({ color: 0xffffff });

  // Mouth based on emotion
  const mouthY = centerY + 20;

  switch (emotion) {
    case 'happy':
    case 'excited':
      // Smile
      graphics.arc(centerX, mouthY, 20, 0.1, Math.PI - 0.1);
      graphics.stroke({ color: 0x333333, width: 3 });
      break;
    case 'sad':
      // Frown
      graphics.arc(centerX, mouthY + 15, 20, Math.PI + 0.1, -0.1);
      graphics.stroke({ color: 0x333333, width: 3 });
      break;
    case 'thinking':
      // Dot dot dot
      graphics.circle(centerX - 15, mouthY, 3);
      graphics.circle(centerX, mouthY, 3);
      graphics.circle(centerX + 15, mouthY, 3);
      graphics.fill({ color: 0x333333 });
      break;
    case 'confused':
      // Wavy line
      graphics.moveTo(centerX - 20, mouthY);
      graphics.quadraticCurveTo(centerX - 10, mouthY - 8, centerX, mouthY);
      graphics.quadraticCurveTo(centerX + 10, mouthY + 8, centerX + 20, mouthY);
      graphics.stroke({ color: 0x333333, width: 3 });
      break;
    case 'surprised':
      // O mouth
      graphics.circle(centerX, mouthY, 12);
      graphics.stroke({ color: 0x333333, width: 3 });
      break;
    default:
      // Neutral line
      graphics.moveTo(centerX - 15, mouthY);
      graphics.lineTo(centerX + 15, mouthY);
      graphics.stroke({ color: 0x333333, width: 3 });
  }

  // Blush for happy emotions
  if (emotion === 'happy' || emotion === 'excited') {
    graphics.circle(leftEyeX - 15, centerY, 8);
    graphics.circle(rightEyeX + 15, centerY, 8);
    graphics.fill({ color: 0xffb6c1, alpha: 0.5 });
  }
}

interface PetCanvasProps {
  width?: number;
  height?: number;
  maxFps?: number;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export function PetCanvas({
  width = 300,
  height = 400,
  maxFps = 60,
  onContextMenu
}: PetCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const graphicsRef = useRef<Graphics | null>(null);
  const [isReady, setIsReady] = useState(false);

  const { emotion, bubbleText, isSpeaking, isListening, currentProactiveRequest, respondToProactiveRequest, clearProactiveRequest } = usePetStore();
  const { performInteraction } = usePetStatus();

  /**
   * 处理主动请求的按钮点击
   */
  const handleProactiveResponse = useCallback(async (response: 'accepted' | 'declined') => {
    if (!currentProactiveRequest) return;

    // 标记响应
    respondToProactiveRequest(response);

    if (response === 'accepted') {
      // 执行推荐的互动
      const suggestedInteraction = currentProactiveRequest.suggestedInteraction;
      await performInteraction(suggestedInteraction);
    } else {
      // 拒绝时显示理解的文案
      // （气泡已被 respondToProactiveRequest 清除）
    }

    // 延迟清除请求（给动画时间）
    setTimeout(() => {
      clearProactiveRequest();
    }, 300);
  }, [currentProactiveRequest, respondToProactiveRequest, performInteraction, clearProactiveRequest]);

  // Initialize PixiJS
  useEffect(() => {
    let mounted = true;

    async function initPixi() {
      if (!containerRef.current || appRef.current) return;

      const app = new Application();
      await app.init({
        width,
        height,
        backgroundAlpha: 0,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (!mounted || !containerRef.current) {
        app.destroy(true);
        return;
      }

      containerRef.current.appendChild(app.canvas);
      appRef.current = app;
      app.ticker.maxFPS = maxFps;

      // Create graphics for placeholder pet
      const graphics = new Graphics();
      app.stage.addChild(graphics);
      graphicsRef.current = graphics;

      setIsReady(true);
    }

    initPixi();

    return () => {
      mounted = false;
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, [width, height]);

  useEffect(() => {
    if (!appRef.current) return;
    appRef.current.ticker.maxFPS = maxFps;
  }, [maxFps]);

  // Update pet appearance based on emotion
  useEffect(() => {
    if (!isReady || !graphicsRef.current) return;
    drawPlaceholderPet(graphicsRef.current, width, height, emotion);
  }, [isReady, emotion, width, height]);

  // Idle animation
  useEffect(() => {
    if (!isReady || !appRef.current || !graphicsRef.current) return;

    let frame = 0;

    const ticker = () => {
      if (!graphicsRef.current) return;

      frame += 0.05;
      const offsetY = Math.sin(frame) * 3;
      const voiceState = usePetStore.getState();
      const speakOffset = voiceState.isSpeaking ? Math.sin(frame * 6) * 1.2 : 0;
      const listenOffset = voiceState.isListening ? Math.sin(frame * 4) * 0.8 : 0;

      graphicsRef.current.position.y = offsetY + speakOffset + listenOffset;
    };

    appRef.current.ticker.add(ticker);

    return () => {
      if (appRef.current) {
        appRef.current.ticker.remove(ticker);
      }
    };
  }, [isReady, height]);

  return (
    <div
      ref={containerRef}
      className="pet-canvas"
      onContextMenu={onContextMenu}
      style={{ width, height }}
    >
      {/* 渲染气泡：普通气泡 或 交互式主动请求气泡 */}
      {bubbleText && (
        <div className="game-pet-bubble">
          <div className="game-pet-bubble-text">{bubbleText}</div>

          {/* 如果有主动请求且未响应，显示按钮 */}
          {currentProactiveRequest && !currentProactiveRequest.responded && (
            <div className="game-pet-bubble-actions">
              <button
                className="game-pet-bubble-btn game-pet-bubble-btn-primary"
                onClick={() => handleProactiveResponse('accepted')}
              >
                {getAcceptButtonText(currentProactiveRequest.type)}
              </button>
              <button
                className="game-pet-bubble-btn game-pet-bubble-btn-secondary"
                onClick={() => handleProactiveResponse('declined')}
              >
                {getDeclineButtonText(currentProactiveRequest.type)}
              </button>
            </div>
          )}
        </div>
      )}

      {!bubbleText && (isSpeaking || isListening) && (
        <div
          className={`pet-voice-indicator ${isListening ? 'listening' : 'speaking'}`}
          aria-live="polite"
        >
          <span className="pet-voice-indicator-text">{isListening ? '听' : '说'}</span>
          <span className="pet-voice-indicator-dots" aria-hidden="true">
            <span className="pet-voice-indicator-dot" />
            <span className="pet-voice-indicator-dot" />
            <span className="pet-voice-indicator-dot" />
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * 根据请求类型获取"接受"按钮文案
 */
function getAcceptButtonText(type: string): string {
  switch (type) {
    case 'need_attention':
      return '休息一会';
    case 'hungry':
      return '喂食';
    case 'bored':
      return '一起玩';
    default:
      return '好的';
  }
}

/**
 * 根据请求类型获取"拒绝"按钮文案
 */
function getDeclineButtonText(type: string): string {
  switch (type) {
    case 'need_attention':
      return '继续工作';
    case 'hungry':
      return '稍等';
    case 'bored':
      return '我很忙';
    default:
      return '稍后';
  }
}
