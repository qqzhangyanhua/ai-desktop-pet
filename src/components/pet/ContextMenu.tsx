import { useEffect, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { AssistantSkill, PetActionType } from '../../types';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onChat: () => void;
  onSettings: () => void;
  onPetAction: (action: PetActionType) => void;
  onAssistantAction: (skill: AssistantSkill) => void;
}

export function ContextMenu({
  x,
  y,
  onClose,
  onChat,
  onSettings,
  onPetAction,
  onAssistantAction,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleHide = async () => {
    onClose();
    const appWindow = getCurrentWindow();
    await appWindow.hide();
  };

  const handleQuit = async () => {
    const appWindow = getCurrentWindow();
    await appWindow.close();
  };

  const handlePetAction = (action: PetActionType) => {
    onPetAction(action);
    onClose();
  };

  const handleAssistantAction = (skill: AssistantSkill) => {
    onAssistantAction(skill);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="context-menu no-drag"
      style={{ left: x, top: y }}
    >
      <div className="context-menu-title">娱乐与表演</div>
      <div className="context-menu-item" onClick={() => handlePetAction('feed')}>
        🧃 喂食/吃苹果
      </div>
      <div className="context-menu-item" onClick={() => handlePetAction('play')}>
        🎮 玩小游戏
      </div>
      <div className="context-menu-item" onClick={() => handlePetAction('dance')}>
        💃 跳舞秀
      </div>
      <div className="context-menu-item" onClick={() => handlePetAction('music')}>
        🎵 播放音乐
      </div>
      <div className="context-menu-item" onClick={() => handlePetAction('magic')}>
        🎩 表演魔术
      </div>
      <div className="context-menu-item" onClick={() => handlePetAction('art')}>
        🎨 生成艺术作品
      </div>
      <div className="context-menu-item" onClick={() => handlePetAction('transform')}>
        ✨ 变身
      </div>
      <div className="context-menu-divider" />

      <div className="context-menu-title">休息与护理</div>
      <div className="context-menu-item" onClick={() => handlePetAction('sleep')}>
        😴 睡觉/休息
      </div>
      <div className="context-menu-item" onClick={() => handlePetAction('clean')}>
        🫧 清洁
      </div>
      <div className="context-menu-item" onClick={() => handlePetAction('brush')}>
        🪮 梳毛
      </div>
      <div className="context-menu-item" onClick={() => handlePetAction('rest')}>
        🧘 放松
      </div>

      <div className="context-menu-divider" />
      <div className="context-menu-title">智能助手</div>
      <div className="context-menu-item" onClick={() => handleAssistantAction('weather')}>
        ☁️ 查询天气提示
      </div>
      <div className="context-menu-item" onClick={() => handleAssistantAction('time')}>
        ⏰ 播报时间
      </div>
      <div className="context-menu-item" onClick={() => handleAssistantAction('alarm')}>
        🔔 创建15分钟提醒
      </div>
      <div className="context-menu-item" onClick={() => handleAssistantAction('lights')}>
        💡 控制灯光/设备（模拟）
      </div>
      <div className="context-menu-item" onClick={() => handleAssistantAction('pc_action')}>
        🖥️ 简单电脑操作
      </div>
      <div className="context-menu-item" onClick={() => handleAssistantAction('habit')}>
        ⭐ 记住偏好/给出建议
      </div>

      <div className="context-menu-divider" />
      <div className="context-menu-item" onClick={onChat}>
        Chat
      </div>
      <div className="context-menu-item" onClick={onSettings}>
        Settings
      </div>
      <div className="context-menu-divider" />
      <div className="context-menu-item" onClick={handleHide}>
        Hide
      </div>
      <div className="context-menu-item danger" onClick={handleQuit}>
        Quit
      </div>
    </div>
  );
}
