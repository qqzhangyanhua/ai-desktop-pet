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
export type { STTEngine, TTSEngine } from './manager';
