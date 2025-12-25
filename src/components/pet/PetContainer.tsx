import { useState, useCallback, useEffect } from 'react';
import { PetCanvas } from './PetCanvas';
import { Live2DPet } from './Live2DPet';
import { ContextMenu } from './ContextMenu';
import { PetStatusPanel } from './PetStatusPanel';
import { useConfigStore } from '../../stores';
import { useAssistantSkills, usePetActions, usePetCareLoop } from '../../hooks';

interface PetContainerProps {
  onOpenChat: () => void;
  onOpenSettings: () => void;
}

export function PetContainer({ onOpenChat, onOpenSettings }: PetContainerProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [live2dReady, setLive2dReady] = useState(false);
  const [live2dError, setLive2dError] = useState<Error | null>(null);
  const { runPetAction } = usePetActions();
  const { performSkill } = useAssistantSkills();

  // Get config to determine if Live2D is enabled
  const { config } = useConfigStore();
  const useLive2D = config?.useLive2D ?? false;

  const handleContextMenu = useCallback((e: React.MouseEvent | MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Add global context menu listener when Live2D is active
  // This catches right-clicks on the oh-my-live2d canvas
  useEffect(() => {
    if (useLive2D && live2dReady) {
      const handleGlobalContextMenu = (e: MouseEvent) => {
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

  const handleLive2DReady = useCallback(() => {
    setLive2dReady(true);
    console.log('Live2D model loaded successfully');
  }, []);

  const handleLive2DError = useCallback((error: Error) => {
    setLive2dError(error);
    console.error('Live2D error:', error);
  }, []);

  // 养成状态循环提醒
  usePetCareLoop();

  return (
    <div className="pet-container" data-tauri-drag-region>
      <PetStatusPanel />

      {/* Show placeholder if Live2D is disabled or not ready */}
      {(!useLive2D || !live2dReady || live2dError) && (
        <PetCanvas onContextMenu={handleContextMenu} />
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
          onChat={() => {
            handleCloseContextMenu();
            onOpenChat();
          }}
          onSettings={() => {
            handleCloseContextMenu();
            onOpenSettings();
          }}
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
