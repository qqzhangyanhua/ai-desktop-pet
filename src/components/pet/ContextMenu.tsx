import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import {
  GlassWater,
  Gamepad2,
  Music,
  Sparkles,
  Wand2,
  Palette,
  Moon,
  Droplet,
  Brush,
  Armchair,
  Cloud,
  Clock,
  Bell,
  Lightbulb,
  Monitor,
  Star,
  MessageSquare,
  Settings,
  BarChart3,
  EyeOff,
  X,
} from 'lucide-react';
import type { AssistantSkill, PetActionType } from '../../types';
import { useConfigStore } from '@/stores';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onChat: () => void;
  onPetAction: (action: PetActionType) => void;
  onAssistantAction: (skill: AssistantSkill) => void;
}

export function ContextMenu({
  x,
  y,
  onClose,
  onChat,
  onPetAction,
  onAssistantAction,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const statusPanelVisible = useConfigStore((s) => s.config.appearance.statusPanelVisible);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  // 边界检测逻辑：默认右下，溢出则翻转
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;

    const margin = 8; // 与窗口边缘的安全距离
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const rect = el.getBoundingClientRect();
    const menuWidth = rect.width;
    const menuHeight = rect.height;

    // 默认位置：鼠标右下方
    let left = x;
    let top = y;

    // 右侧溢出检测：如果菜单右边缘超出窗口，翻转到左边
    if (x + menuWidth > viewportWidth - margin) {
      left = x - menuWidth;
    }

    // 下方溢出检测：如果菜单下边缘超出窗口，翻转到上边
    if (y + menuHeight > viewportHeight - margin) {
      top = y - menuHeight;
    }

    // 确保菜单不超出左边界和上边界
    left = Math.max(margin, left);
    top = Math.max(margin, top);

    // 极端情况：窗口太小，菜单无法完整显示
    // 确保至少有一部分可见（不要完全超出右边界和下边界）
    left = Math.min(left, viewportWidth - margin);
    top = Math.min(top, viewportHeight - margin);

    setPosition({ left, top });
  }, [x, y]);

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

  const handleToggleStatusPanel = async () => {
    const { config, setConfig, saveConfig } = useConfigStore.getState();
    setConfig({
      appearance: {
        ...config.appearance,
        statusPanelVisible: !config.appearance.statusPanelVisible,
      },
    });
    try {
      await saveConfig();
    } catch (err) {
      console.warn('[ContextMenu] Failed to save config:', err);
    }
    onClose();
  };

  const handlePetAction = (action: PetActionType) => {
    onPetAction(action);
    onClose();
  };

  const handleAssistantAction = (skill: AssistantSkill) => {
    onAssistantAction(skill);
    onClose();
  };

  const handleOpenChat = async () => {
    onClose();
    const chatWindow = await WebviewWindow.getByLabel('chat');

    if (chatWindow) {
      await chatWindow.setFocus();
    } else {
      // In dev mode, use dev server URL; in production, use chat.html
      const isDev = window.location.hostname === 'localhost';
      const url = isDev ? 'http://localhost:1420/chat.html' : 'chat.html';

      new WebviewWindow('chat', {
        url,
        title: '聊天窗口',
        width: 600,
        height: 700,
        resizable: true,
        center: true,
        decorations: true,
        alwaysOnTop: false,
        skipTaskbar: false,
      });
    }
  };

  const handleOpenSettings = async () => {
    onClose();
    const settingsWindow = await WebviewWindow.getByLabel('settings');

    if (settingsWindow) {
      await settingsWindow.setFocus();
    } else {
      // In dev mode, use dev server URL; in production, use settings.html
      const isDev = window.location.hostname === 'localhost';
      const url = isDev ? 'http://localhost:1420/settings.html' : 'settings.html';

      new WebviewWindow('settings', {
        url,
        title: '设置中心',
        width: 1000,
        height: 600,
        resizable: true,
        center: true,
        decorations: true,
        alwaysOnTop: false,
        skipTaskbar: false,
      });
    }
  };

  return (
    <div
      ref={menuRef}
      className="context-menu no-drag"
      style={{
        left: position?.left ?? 0,
        top: position?.top ?? 0,
        visibility: position ? 'visible' : 'hidden',
      }}
    >
      <div className="context-menu-title">娱乐与表演</div>
      <div className="context-menu-item" onClick={() => handlePetAction('feed')}>
        <GlassWater className="w-4 h-4" />
        喂食/吃苹果
      </div>
      <div className="context-menu-item" onClick={() => handlePetAction('play')}>
        <Gamepad2 className="w-4 h-4" />
        玩小游戏
      </div>
      <div className="context-menu-item" onClick={() => handlePetAction('dance')}>
        <Music className="w-4 h-4" />
        跳舞秀
      </div>
      <div className="context-menu-item" onClick={() => handlePetAction('music')}>
        <Music className="w-4 h-4" />
        播放音乐
      </div>
      <div className="context-menu-item" onClick={() => handlePetAction('magic')}>
        <Wand2 className="w-4 h-4" />
        表演魔术
      </div>
      <div className="context-menu-item" onClick={() => handlePetAction('art')}>
        <Palette className="w-4 h-4" />
        生成艺术作品
      </div>
      <div className="context-menu-item" onClick={() => handlePetAction('transform')}>
        <Sparkles className="w-4 h-4" />
        变身
      </div>
      <div className="context-menu-divider" />

      <div className="context-menu-title">休息与护理</div>
      <div className="context-menu-item" onClick={() => handlePetAction('sleep')}>
        <Moon className="w-4 h-4" />
        睡觉/休息
      </div>
      <div className="context-menu-item" onClick={() => handlePetAction('clean')}>
        <Droplet className="w-4 h-4" />
        清洁
      </div>
      <div className="context-menu-item" onClick={() => handlePetAction('brush')}>
        <Brush className="w-4 h-4" />
        梳毛
      </div>
      <div className="context-menu-item" onClick={() => handlePetAction('rest')}>
        <Armchair className="w-4 h-4" />
        放松
      </div>

      <div className="context-menu-divider" />
      <div className="context-menu-title">智能助手</div>
      <div className="context-menu-item" onClick={() => handleAssistantAction('weather')}>
        <Cloud className="w-4 h-4" />
        查询天气提示
      </div>
      <div className="context-menu-item" onClick={() => handleAssistantAction('time')}>
        <Clock className="w-4 h-4" />
        播报时间
      </div>
      <div className="context-menu-item" onClick={() => handleAssistantAction('alarm')}>
        <Bell className="w-4 h-4" />
        创建15分钟提醒
      </div>
      <div className="context-menu-item" onClick={() => handleAssistantAction('lights')}>
        <Lightbulb className="w-4 h-4" />
        控制灯光/设备（模拟）
      </div>
      <div className="context-menu-item" onClick={() => handleAssistantAction('pc_action')}>
        <Monitor className="w-4 h-4" />
        简单电脑操作
      </div>
      <div className="context-menu-item" onClick={() => handleAssistantAction('habit')}>
        <Star className="w-4 h-4" />
        记住偏好/给出建议
      </div>

      <div className="context-menu-divider" />
      <div className="context-menu-item" onClick={handleOpenChat}>
        <MessageSquare className="w-4 h-4" />
        Chat
      </div>
      <div className="context-menu-item" onClick={handleOpenSettings}>
        <Settings className="w-4 h-4" />
        Settings
      </div>
      <div className="context-menu-item" onClick={handleToggleStatusPanel}>
        <BarChart3 className="w-4 h-4" />
        {statusPanelVisible ? '隐藏状态面板' : '显示状态面板'}
      </div>
      <div className="context-menu-divider" />
      <div className="context-menu-item" onClick={handleHide}>
        <EyeOff className="w-4 h-4" />
        Hide
      </div>
      <div className="context-menu-item danger" onClick={handleQuit}>
        <X className="w-4 h-4" />
        Quit
      </div>
    </div>
  );
}
