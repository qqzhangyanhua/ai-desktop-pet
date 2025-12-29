import { useState, useCallback, useEffect, useMemo } from 'react';
import { usePetStatusStore } from '../stores';
import { handleInteraction } from '../services/pet/interaction';

type FeedbackFn = (message: string, type: 'success' | 'warning') => void;

export function usePetInteraction(showFeedback: FeedbackFn) {
  const { status: petStatus, updateStatusImmediate, getCooldownRemaining } = usePetStatusStore();

  // Nickname editing state
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [editedNickname, setEditedNickname] = useState(petStatus.nickname);

  // Feed state
  const feedCooldown = useMemo(() => getCooldownRemaining('feed'), [petStatus.lastFeed, getCooldownRemaining]);
  const [isFeeding, setIsFeeding] = useState(false);

  // Sync editedNickname with petStatus.nickname
  useEffect(() => {
    setEditedNickname(petStatus.nickname);
  }, [petStatus.nickname]);

  const handleNicknameEdit = useCallback(() => {
    setIsEditingNickname(true);
  }, []);

  const handleNicknameSave = useCallback(async () => {
    const trimmedNickname = editedNickname.trim();
    if (trimmedNickname === '') {
      showFeedback('昵称不能为空', 'warning');
      setEditedNickname(petStatus.nickname);
      setIsEditingNickname(false);
      return;
    }

    if (trimmedNickname === petStatus.nickname) {
      setIsEditingNickname(false);
      return;
    }

    try {
      await updateStatusImmediate({ nickname: trimmedNickname });
      setIsEditingNickname(false);
      showFeedback('昵称已更新', 'success');
    } catch (error) {
      console.error('Failed to update nickname:', error);
      showFeedback('昵称更新失败', 'warning');
      setEditedNickname(petStatus.nickname);
    }
  }, [editedNickname, petStatus.nickname, updateStatusImmediate, showFeedback]);

  const handleNicknameCancel = useCallback(() => {
    setEditedNickname(petStatus.nickname);
    setIsEditingNickname(false);
  }, [petStatus.nickname]);

  const handleNicknameKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNicknameSave();
    } else if (e.key === 'Escape') {
      handleNicknameCancel();
    }
  }, [handleNicknameSave, handleNicknameCancel]);

  const handleFeed = useCallback(async () => {
    if (feedCooldown > 0) {
      showFeedback(`冷却中，还需 ${feedCooldown} 秒`, 'warning');
      return;
    }

    if (isFeeding) return;

    setIsFeeding(true);
    try {
      const result = await handleInteraction('feed', petStatus);

      if (result.success) {
        await updateStatusImmediate({
          mood: result.newStatus.mood,
          energy: result.newStatus.energy,
          intimacy: result.newStatus.intimacy,
          lastFeed: Date.now(),
        });

        showFeedback('投喂成功！精力 +15', 'success');
      } else {
        showFeedback(result.message || '操作失败', 'warning');
      }
    } catch (error) {
      console.error('[usePetInteraction] Feed failed:', error);
      showFeedback('投喂失败，请稍后重试', 'warning');
    } finally {
      setIsFeeding(false);
    }
  }, [feedCooldown, isFeeding, petStatus, updateStatusImmediate, showFeedback]);

  return {
    petStatus,
    feedCooldown,
    isFeeding,
    isEditingNickname,
    editedNickname,
    setEditedNickname,
    handlers: {
      handleNicknameEdit,
      handleNicknameSave,
      handleNicknameCancel,
      handleNicknameKeyDown,
      handleFeed,
    },
  };
}
