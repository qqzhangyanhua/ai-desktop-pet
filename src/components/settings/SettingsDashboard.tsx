import {
  Mic,
  Smile,
  Users,
  Trophy,
  Bell,
  Shield,
  Fish,
  Briefcase,
  ShoppingBag,
  Home,
  Bookmark,
} from 'lucide-react';
import { PetProfileCard } from './PetProfileCard';

type SettingsTab = 'appearance' | 'behavior' | 'chat' | 'assistant' | 'statistics' | 'performance' | 'advanced' | 'bookmark';

interface DashboardButton {
  icon: React.ComponentType<{ size: number }>;
  label: string;
  tab: SettingsTab | null;
  color: 'blue' | 'orange' | 'green' | 'pink' | 'purple';
  disabled?: boolean;
}

interface SettingsDashboardProps {
  feedCooldown: number;
  isFeeding: boolean;
  isEditingNickname: boolean;
  editedNickname: string;
  onEditedNicknameChange: (value: string) => void;
  onNicknameKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onNicknameSave: () => void;
  onNicknameEdit: () => void;
  onFeed: () => void;
  onTabChange: (tab: SettingsTab) => void;
  onClose: () => void;
}

const DASHBOARD_BUTTONS: DashboardButton[] = [
  { icon: Mic, label: '语音交流', tab: 'assistant', color: 'blue' },
  { icon: Smile, label: '动作表情', tab: 'behavior', color: 'orange' },
  { icon: Users, label: '好友拜访', tab: 'advanced', color: 'green' },
  { icon: Trophy, label: '分享成就', tab: 'statistics', color: 'pink' },
  { icon: Bell, label: '消息通知', tab: 'behavior', color: 'orange' },
  { icon: Shield, label: '隐私设置', tab: 'assistant', color: 'purple' },
  { icon: Bookmark, label: '书签管理', tab: 'bookmark', color: 'blue' },
];

export function SettingsDashboard({
  feedCooldown,
  isFeeding,
  isEditingNickname,
  editedNickname,
  onEditedNicknameChange,
  onNicknameKeyDown,
  onNicknameSave,
  onNicknameEdit,
  onFeed,
  onTabChange,
  onClose,
}: SettingsDashboardProps) {
  return (
    <div className="flex w-full h-full p-6 gap-6">
      {/* Left Panel: Profile */}
      <PetProfileCard
        isEditingNickname={isEditingNickname}
        editedNickname={editedNickname}
        onEditedNicknameChange={onEditedNicknameChange}
        onNicknameKeyDown={onNicknameKeyDown}
        onNicknameSave={onNicknameSave}
        onNicknameEdit={onNicknameEdit}
      />

      {/* Right Panel: Actions */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Title */}
        <div className="game-title-board rounded-xl p-3 text-center text-2xl font-bold tracking-[0.2em] relative -mt-2 mx-auto w-2/3 shadow-lg z-10 transform hover:scale-[1.02] transition-transform">
          互动交流设置
        </div>

        {/* Grid Buttons */}
        <div className="grid grid-cols-2 gap-4 flex-1 content-start">
          {DASHBOARD_BUTTONS.map((btn, index) => (
            <button
              key={index}
              className={`game-btn game-btn-${btn.color} text-lg py-6 shadow-md hover:shadow-xl transition-all ${
                btn.disabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={() => btn.tab && onTabChange(btn.tab)}
              disabled={btn.disabled}
            >
              <btn.icon size={28} />
              <span>{btn.label}</span>
            </button>
          ))}
        </div>

        {/* Bottom Action Row */}
        <div className="flex gap-4 h-16 mt-auto">
          <button
            className={`game-btn game-btn-brown flex-1 justify-center text-sm font-bold shadow-lg hover:-translate-y-1 transition-transform ${
              feedCooldown > 0 || isFeeding ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={onFeed}
            disabled={feedCooldown > 0 || isFeeding}
          >
            <Fish size={20} />
            <span>喂养宠物</span>
            {feedCooldown > 0 && <span className="text-xs ml-1">({feedCooldown}s)</span>}
          </button>
          <button
            className="game-btn game-btn-brown flex-1 justify-center text-sm font-bold shadow-lg hover:-translate-y-1 transition-transform opacity-50 cursor-not-allowed"
            disabled
          >
            <Briefcase size={20} />
            工作学习
            <span className="text-xs ml-1">(开发中)</span>
          </button>
          <button
            className="game-btn game-btn-brown flex-1 justify-center text-sm font-bold shadow-lg hover:-translate-y-1 transition-transform"
            onClick={() => onTabChange('appearance')}
          >
            <ShoppingBag size={20} />
            皮肤设置
          </button>
          <button
            className="game-btn game-btn-green w-24 justify-center shadow-lg hover:-translate-y-1 transition-transform"
            onClick={onClose}
          >
            <Home size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
