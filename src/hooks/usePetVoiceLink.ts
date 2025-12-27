import { useEffect } from 'react';
import { useConfigStore } from '@/stores';
import { ensurePetVoiceLinkInitialized } from '@/services/pet/voice-link';

/**
 * 语音联动
 * - 初始化 VoiceManager（让 PTT / TTS 真正可用）
 * - 同步 speaking 状态到 PetStore + Live2D（更像在说话）
 */
export function usePetVoiceLink() {
  const voice = useConfigStore((s) => s.config.voice);

  useEffect(() => {
    if (!voice.sttEnabled && !voice.ttsEnabled) return;
    ensurePetVoiceLinkInitialized();
  }, [
    voice.sttEnabled,
    voice.ttsEnabled,
    voice.sttEngine,
    voice.sttLanguage,
    voice.ttsEngine,
    voice.ttsVoice,
    voice.ttsRate,
    voice.ttsPitch,
    voice.ttsVolume,
  ]);
}

