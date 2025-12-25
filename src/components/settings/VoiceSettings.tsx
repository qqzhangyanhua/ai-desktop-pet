// Voice Settings Component

import { useCallback, useEffect, useState } from 'react';
import type { VoiceConfig, TTSVoice } from '../../types';
import type { TTSEngine } from '../../services/voice';
import { getVoiceManager } from '../../services/voice';

interface VoiceSettingsProps {
  config: VoiceConfig;
  onChange: (config: VoiceConfig) => void;
}

const STT_LANGUAGES = [
  { value: 'zh-CN', label: 'Chinese (Simplified)' },
  { value: 'zh-TW', label: 'Chinese (Traditional)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'ja-JP', label: 'Japanese' },
  { value: 'ko-KR', label: 'Korean' },
];

const TTS_ENGINES: { value: TTSEngine; label: string }[] = [
  { value: 'web-speech', label: 'Web Speech (Built-in)' },
  { value: 'edge-tts', label: 'Edge TTS (High Quality)' },
];

const EDGE_TTS_VOICES: TTSVoice[] = [
  { id: 'zh-CN-XiaoxiaoNeural', name: 'Xiaoxiao (Female)', language: 'zh-CN', gender: 'female' },
  { id: 'zh-CN-XiaoyiNeural', name: 'Xiaoyi (Female)', language: 'zh-CN', gender: 'female' },
  { id: 'zh-CN-YunxiNeural', name: 'Yunxi (Male)', language: 'zh-CN', gender: 'male' },
  { id: 'zh-CN-YunyangNeural', name: 'Yunyang (Male)', language: 'zh-CN', gender: 'male' },
  { id: 'en-US-JennyNeural', name: 'Jenny (Female)', language: 'en-US', gender: 'female' },
  { id: 'en-US-GuyNeural', name: 'Guy (Male)', language: 'en-US', gender: 'male' },
  { id: 'ja-JP-NanamiNeural', name: 'Nanami (Female)', language: 'ja-JP', gender: 'female' },
  { id: 'ja-JP-KeitaNeural', name: 'Keita (Male)', language: 'ja-JP', gender: 'male' },
];

export function VoiceSettings({ config, onChange }: VoiceSettingsProps) {
  const [webSpeechVoices, setWebSpeechVoices] = useState<TTSVoice[]>([]);

  useEffect(() => {
    // Load Web Speech voices
    const loadVoices = () => {
      if ('speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        const mappedVoices: TTSVoice[] = voices.map((v) => ({
          id: v.name,
          name: v.name,
          language: v.lang,
          gender: 'neutral' as const,
        }));
        setWebSpeechVoices(mappedVoices);
      }
    };

    loadVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const handleChange = useCallback(
    (key: keyof VoiceConfig, value: VoiceConfig[keyof VoiceConfig]) => {
      onChange({ ...config, [key]: value });
    },
    [config, onChange]
  );

  const handleEngineChange = useCallback(
    (engine: TTSEngine) => {
      // When switching engine, reset voice to first available
      let defaultVoice = '';
      if (engine === 'edge-tts') {
        defaultVoice = EDGE_TTS_VOICES[0]?.id ?? '';
      } else {
        defaultVoice = webSpeechVoices[0]?.id ?? '';
      }
      onChange({
        ...config,
        ttsEngine: engine,
        ttsVoice: defaultVoice,
      });
    },
    [config, onChange, webSpeechVoices]
  );

  const availableVoices =
    config.ttsEngine === 'edge-tts' ? EDGE_TTS_VOICES : webSpeechVoices;

  const handleTestTTS = useCallback(async () => {
    try {
      const manager = getVoiceManager({
        ttsEngine: config.ttsEngine,
        ttsConfig: {
          voice: config.ttsVoice,
          rate: config.ttsRate,
          pitch: config.ttsPitch,
          volume: config.ttsVolume,
        },
      });
      await manager.init();
      await manager.speak('Hello! This is a voice test.');
    } catch (error) {
      console.error('TTS test failed:', error);
    }
  }, [config]);

  return (
    <>
      {/* STT Settings */}
      <div className="settings-section">
        <div className="settings-section-title">Speech Recognition (STT)</div>

        <div className="settings-row">
          <span className="settings-label">Enable STT</span>
          <input
            type="checkbox"
            checked={config.sttEnabled}
            onChange={(e) => handleChange('sttEnabled', e.target.checked)}
            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
          />
        </div>

        <div className="settings-row">
          <span className="settings-label">Language</span>
          <select
            className="settings-select"
            value={config.sttLanguage}
            onChange={(e) => handleChange('sttLanguage', e.target.value)}
            disabled={!config.sttEnabled}
          >
            {STT_LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <div className="settings-row">
          <span className="settings-label">Push-to-Talk Key</span>
          <input
            type="text"
            className="settings-input"
            value={config.pushToTalkKey}
            onChange={(e) => handleChange('pushToTalkKey', e.target.value)}
            placeholder="Press a key..."
            onKeyDown={(e) => {
              e.preventDefault();
              handleChange('pushToTalkKey', e.key);
            }}
            disabled={!config.sttEnabled}
            style={{ width: '100px', textAlign: 'center' }}
          />
        </div>

        <div
          className="settings-row"
          style={{
            fontSize: '11px',
            color: '#888',
            borderBottom: 'none',
            paddingTop: '4px',
          }}
        >
          {config.sttEnabled
            ? 'Hold the key to speak, release to send'
            : 'Enable STT to use voice input'}
        </div>
      </div>

      {/* TTS Settings */}
      <div className="settings-section">
        <div className="settings-section-title">Text-to-Speech (TTS)</div>

        <div className="settings-row">
          <span className="settings-label">Enable TTS</span>
          <input
            type="checkbox"
            checked={config.ttsEnabled}
            onChange={(e) => handleChange('ttsEnabled', e.target.checked)}
            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
          />
        </div>

        <div className="settings-row">
          <span className="settings-label">Engine</span>
          <select
            className="settings-select"
            value={config.ttsEngine}
            onChange={(e) => handleEngineChange(e.target.value as TTSEngine)}
            disabled={!config.ttsEnabled}
          >
            {TTS_ENGINES.map((engine) => (
              <option key={engine.value} value={engine.value}>
                {engine.label}
              </option>
            ))}
          </select>
        </div>

        <div className="settings-row">
          <span className="settings-label">Voice</span>
          <select
            className="settings-select"
            value={config.ttsVoice}
            onChange={(e) => handleChange('ttsVoice', e.target.value)}
            disabled={!config.ttsEnabled}
          >
            {availableVoices.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.name} ({voice.language})
              </option>
            ))}
          </select>
        </div>

        <div className="settings-row">
          <span className="settings-label">Rate</span>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={config.ttsRate}
            onChange={(e) => handleChange('ttsRate', parseFloat(e.target.value))}
            disabled={!config.ttsEnabled}
            style={{ width: '120px' }}
          />
          <span style={{ marginLeft: '8px', fontSize: '12px' }}>
            {config.ttsRate.toFixed(1)}x
          </span>
        </div>

        <div className="settings-row">
          <span className="settings-label">Pitch</span>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={config.ttsPitch}
            onChange={(e) => handleChange('ttsPitch', parseFloat(e.target.value))}
            disabled={!config.ttsEnabled}
            style={{ width: '120px' }}
          />
          <span style={{ marginLeft: '8px', fontSize: '12px' }}>
            {config.ttsPitch.toFixed(1)}
          </span>
        </div>

        <div className="settings-row">
          <span className="settings-label">Volume</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={config.ttsVolume}
            onChange={(e) => handleChange('ttsVolume', parseFloat(e.target.value))}
            disabled={!config.ttsEnabled}
            style={{ width: '120px' }}
          />
          <span style={{ marginLeft: '8px', fontSize: '12px' }}>
            {Math.round(config.ttsVolume * 100)}%
          </span>
        </div>

        <div className="settings-row" style={{ borderBottom: 'none' }}>
          <span className="settings-label">Test</span>
          <button
            onClick={handleTestTTS}
            disabled={!config.ttsEnabled}
            style={{
              padding: '6px 12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              background: config.ttsEnabled ? '#f5f5f5' : '#eee',
              cursor: config.ttsEnabled ? 'pointer' : 'not-allowed',
              fontSize: '12px',
            }}
          >
            Play Test
          </button>
        </div>

        <div
          className="settings-row"
          style={{
            fontSize: '11px',
            color: '#888',
            borderBottom: 'none',
            paddingTop: '4px',
          }}
        >
          {config.ttsEnabled
            ? config.ttsEngine === 'edge-tts'
              ? 'Using Microsoft Edge TTS (requires edge-tts CLI)'
              : 'Using browser built-in speech synthesis'
            : 'Enable TTS to hear AI responses'}
        </div>
      </div>
    </>
  );
}
