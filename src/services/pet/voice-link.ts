import { getVoiceManager, initVoiceManager } from '@/services/voice';
import { getLive2DManager } from '@/services/live2d';
import { useConfigStore, usePetStore } from '@/stores';
import type { EmotionType } from '@/types';
import { getActiveExpressionPack } from '@/services/pet/expression-pack';

let lastConfigKey: string | null = null;
let initPromise: Promise<void> | null = null;
let lastListening = false;
let lastListeningBubbleAt = 0;
let preListeningEmotion: EmotionType | null = null;
let lastSpeakAt = 0;
let lastSpeakText = '';

const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)]!;

function buildConfigKey(): string {
  const voice = useConfigStore.getState().config.voice;
  return [
    voice.sttEnabled ? 'stt:1' : 'stt:0',
    voice.ttsEnabled ? 'tts:1' : 'tts:0',
    `sttEngine:${voice.sttEngine}`,
    `sttLang:${voice.sttLanguage}`,
    `ttsEngine:${voice.ttsEngine}`,
    `ttsVoice:${voice.ttsVoice}`,
    `rate:${voice.ttsRate}`,
    `pitch:${voice.ttsPitch}`,
    `vol:${voice.ttsVolume}`,
  ].join('|');
}

export function ensurePetVoiceLinkInitialized(): void {
  const config = useConfigStore.getState().config;
  if (!config.voice.sttEnabled && !config.voice.ttsEnabled) return;

  const key = buildConfigKey();
  if (initPromise && lastConfigKey === key) return;
  lastConfigKey = key;

  initPromise = (async () => {
    const voice = useConfigStore.getState().config.voice;

    const manager = await initVoiceManager(
      {
        sttEngine: voice.sttEngine,
        ttsEngine: voice.ttsEngine,
        sttConfig: { language: voice.sttLanguage },
        ttsConfig: {
          voice: voice.ttsVoice,
          rate: voice.ttsRate,
          pitch: voice.ttsPitch,
          volume: voice.ttsVolume,
        },
      },
      (state) => {
        const pet = usePetStore.getState();
        pet.setSpeaking(state.isSpeaking);
        pet.setListening(state.isListening);

        // 听写联动：进入 listening 时做“我在听”的轻量反馈（严格频控）
        if (state.isListening !== lastListening) {
          const config = useConfigStore.getState().config;

          if (state.isListening) {
            preListeningEmotion = pet.emotion;

            if (!pet.isSpeaking && !pet.bubbleText) {
              pet.setEmotion('thinking');
            }

            if (
              config.behavior.notifications.bubbleEnabled &&
              Date.now() - lastListeningBubbleAt > 30000 &&
              !pet.bubbleText
            ) {
              const msg = pick(getActiveExpressionPack().voice.listeningHints);
              pet.showBubble(msg, 1400);
              lastListeningBubbleAt = Date.now();
            }

            try {
              const live2d = getLive2DManager();
              if (live2d.isInitialized()) {
                live2d.playIdleGesture('pulse');
              }
            } catch {
              // ignore
            }
          } else {
            if (pet.emotion === 'thinking' && preListeningEmotion) {
              pet.setEmotion(preListeningEmotion);
            }
            preListeningEmotion = null;
          }

          lastListening = state.isListening;
        }

        try {
          const live2d = getLive2DManager();
          if (live2d.isInitialized()) {
            live2d.setSpeaking(state.isSpeaking);
          }
        } catch {
          // ignore
        }
      }
    );

    // 运行时配置更新（避免设置中心改了但主窗口不生效）
    manager.setSTTLanguage(voice.sttLanguage);
    manager.setTTSVoice(voice.ttsVoice);
    manager.setTTSConfig({
      rate: voice.ttsRate,
      pitch: voice.ttsPitch,
      volume: voice.ttsVolume,
    });
  })().then(
    () => undefined,
    () => undefined
  );
}

function sanitizeForTTS(text: string): string {
  const firstLine = text.split('\n')[0] ?? '';
  const trimmed = firstLine.trim();
  if (trimmed.length <= 120) return trimmed;
  return trimmed.slice(0, 120);
}

export type PetSpeakPriority = 'low' | 'normal' | 'high';

export interface PetSpeakOptions {
  priority?: PetSpeakPriority;
  interrupt?: boolean;
}

const getCooldownMs = (priority: PetSpeakPriority) => {
  switch (priority) {
    case 'low':
      return 20000;
    case 'high':
      return 0;
    case 'normal':
    default:
      return 4500;
  }
};

export async function petSpeak(text: string, options: PetSpeakOptions = {}): Promise<boolean> {
  const config = useConfigStore.getState().config;
  if (!config.voice.ttsEnabled) return false;

  ensurePetVoiceLinkInitialized();

  const manager = getVoiceManager();
  if (!manager.isTTSAvailable()) return false;

  const payload = sanitizeForTTS(text);
  if (!payload) return false;

  const priority = options.priority ?? 'normal';
  const cooldownMs = getCooldownMs(priority);
  const now = Date.now();

  // 文案去重（避免“同一句”在短时间内被多处触发）
  if (payload === lastSpeakText && now - lastSpeakAt < 15000) return false;

  // 节流（避免太吵）：低/普通优先级默认进入冷却期
  if (cooldownMs > 0 && now - lastSpeakAt < cooldownMs) return false;

  const pet = usePetStore.getState();
  if (pet.isSpeaking) {
    if (priority === 'high' || options.interrupt) {
      manager.stopSpeaking();
    } else {
      return false;
    }
  }

  const voice = config.voice;
  manager.setTTSVoice(voice.ttsVoice);
  manager.setTTSConfig({
    rate: voice.ttsRate,
    pitch: voice.ttsPitch,
    volume: voice.ttsVolume,
  });

  const ok = await manager.speak(payload);
  if (ok) {
    lastSpeakAt = now;
    lastSpeakText = payload;
  }
  return ok;
}
