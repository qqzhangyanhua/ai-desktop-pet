// Voice service exports

export { WebSpeechSTT, getWebSpeechSTT, destroyWebSpeechSTT } from './stt-web';
export { WebSpeechTTS, getWebSpeechTTS, destroyWebSpeechTTS } from './tts-web';
export { EdgeTTS, getEdgeTTS, destroyEdgeTTS } from './tts-edge';
export {
  VoiceManager,
  getVoiceManager,
  initVoiceManager,
  destroyVoiceManager,
} from './manager';
export {
  getPushToTalkManager,
  enablePushToTalk,
  disablePushToTalk,
} from './push-to-talk';
export type { STTEngine, TTSEngine } from './manager';
export type { PushToTalkStatus, PushToTalkConfig, PushToTalkState } from '@/types/voice';
