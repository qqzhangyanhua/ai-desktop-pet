import { useEffect, useRef, useState } from 'react';
import { Application, Graphics } from 'pixi.js';
import { usePetStore } from '../../stores';
import type { EmotionType } from '../../types';
import '../../styles/global.css';

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
  onContextMenu?: (e: React.MouseEvent) => void;
}

export function PetCanvas({
  width = 300,
  height = 400,
  onContextMenu
}: PetCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const graphicsRef = useRef<Graphics | null>(null);
  const [isReady, setIsReady] = useState(false);

  const { emotion, bubbleText } = usePetStore();

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

      graphicsRef.current.position.y = offsetY;
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
      {bubbleText && (
        <div className="chat-bubble">
          {bubbleText}
        </div>
      )}
    </div>
  );
}
