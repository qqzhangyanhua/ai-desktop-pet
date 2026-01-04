import { useMemo } from 'react';
import { Tag, Sparkles, Smile, Zap, Heart, Edit2 } from 'lucide-react';
import { usePetStatusStore, useSkinStore } from '../../stores';

interface PetProfileCardProps {
  isEditingNickname: boolean;
  editedNickname: string;
  onEditedNicknameChange: (value: string) => void;
  onNicknameKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onNicknameSave: () => void;
  onNicknameEdit: () => void;
}

export function PetProfileCard({
  isEditingNickname,
  editedNickname,
  onEditedNicknameChange,
  onNicknameKeyDown,
  onNicknameSave,
  onNicknameEdit,
}: PetProfileCardProps) {
  const { status: petStatus, getStageProgress } = usePetStatusStore();
  const { getCurrentSkin, currentSkinId } = useSkinStore();

  const stageProgress = useMemo(() => {
    return getStageProgress();
  }, [petStatus.intimacy, getStageProgress]);

  const currentSkin = useMemo(() => {
    return getCurrentSkin();
  }, [currentSkinId, getCurrentSkin]);

  const avatarUrl = currentSkin?.avatarImage || currentSkin?.previewImage || './models/default/texture_00.png';

  return (
    <div className="w-1/3 flex flex-col gap-4 max-w-sm">
      <div className="game-parchment rounded-2xl p-6 flex-1 flex flex-col items-center relative overflow-hidden border-2 border-amber-900/10 shadow-inner">
        {/* Pet Image */}
        <div className="w-48 h-48 bg-white/50 rounded-full mb-6 border-4 border-white/80 shadow-lg flex items-center justify-center overflow-hidden relative group">
          <img
            src={avatarUrl}
            alt="Pet"
            className="w-full h-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-110"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';
              (e.target as HTMLImageElement).style.backgroundColor = '#fca5a5';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
        </div>

        {/* Stats */}
        <div className="w-full space-y-4 px-2">
          {/* Nickname */}
          <div className="flex items-center justify-between text-amber-900 border-b border-amber-900/10 pb-2">
            <div className="flex items-center gap-2 font-bold">
              <Tag size={16} className="text-amber-700" />
              <span>昵称</span>
            </div>
            {isEditingNickname ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editedNickname}
                  onChange={(e) => onEditedNicknameChange(e.target.value)}
                  onKeyDown={onNicknameKeyDown}
                  onBlur={onNicknameSave}
                  autoFocus
                  className="font-mono font-bold bg-white/70 border border-amber-700 rounded px-2 py-1 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold">{petStatus.nickname}</span>
                <button
                  onClick={onNicknameEdit}
                  className="p-1 hover:bg-amber-100 rounded transition-colors"
                  aria-label="编辑昵称"
                >
                  <Edit2 size={14} className="text-amber-700" />
                </button>
              </div>
            )}
          </div>

          {/* Stage */}
          <div className="flex items-center justify-between text-amber-900 border-b border-amber-900/10 pb-2">
            <div className="flex items-center gap-2 font-bold">
              <Sparkles size={16} className="text-purple-600" />
              <span>阶段</span>
            </div>
            <span className="font-bold">{stageProgress.config.name}</span>
          </div>

          {/* Mood */}
          <div className="flex items-center justify-between text-amber-900 border-b border-amber-900/10 pb-2">
            <div className="flex items-center gap-2 font-bold">
              <Smile size={16} className="text-orange-500" />
              <span>心情</span>
            </div>
            <span className="font-mono font-bold">{Math.round(petStatus.mood)}/100</span>
          </div>

          {/* Energy */}
          <div className="flex items-center justify-between text-amber-900 border-b border-amber-900/10 pb-2">
            <div className="flex items-center gap-2 font-bold">
              <Zap size={16} className="text-yellow-600" />
              <span>精力</span>
            </div>
            <span className="font-mono font-bold">{Math.round(petStatus.energy)}/100</span>
          </div>

          {/* XP Bar (Intimacy Progress) */}
          <div className="mt-4 pt-2">
            <div className="flex items-center justify-between text-xs text-amber-900 mb-1 font-bold">
              <div className="flex items-center gap-1">
                <Heart size={12} className="text-pink-500 fill-pink-500" />
                <span>亲密度</span>
              </div>
              <span className="font-mono">
                {Math.round(stageProgress.intimacy)} / {stageProgress.config.intimacyRange[1]}
              </span>
            </div>
            <div className="game-progress-bar h-3 shadow-inner bg-black/10">
              <div
                className="game-progress-fill bg-gradient-to-r from-pink-400 to-rose-500"
                style={{ width: `${Math.max(0, Math.min(100, stageProgress.progressPercent))}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
