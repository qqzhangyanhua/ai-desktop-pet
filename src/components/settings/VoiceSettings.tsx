// Voice Settings Component

import { useCallback, useEffect, useState } from 'react';
import type { VoiceConfig, TTSVoice } from '../../types';
import type { TTSEngine } from '../../services/voice';
import { getVoiceManager } from '../../services/voice';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
          <Checkbox
            checked={config.sttEnabled}
            onCheckedChange={(checked) => handleChange('sttEnabled', !!checked)}
          />
        </div>

        <div className="settings-row">
          <span className="settings-label">Language</span>
          <Select
            value={config.sttLanguage}
            onValueChange={(value) => handleChange('sttLanguage', value)}
            disabled={!config.sttEnabled}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STT_LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="settings-row">
          <span className="settings-label">Push-to-Talk Key</span>
          <Input
            type="text"
            className="settings-input w-[100px] text-center"
            value={config.pushToTalkKey}
            onChange={(e) => handleChange('pushToTalkKey', e.target.value)}
            placeholder="Press a key..."
            onKeyDown={(e) => {
              e.preventDefault();
              handleChange('pushToTalkKey', e.key);
            }}
            disabled={!config.sttEnabled}
          />
        </div>

        <div className="settings-row border-none pt-1 text-[11px] text-slate-400">
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
          <Checkbox
            checked={config.ttsEnabled}
            onCheckedChange={(checked) => handleChange('ttsEnabled', !!checked)}
          />
        </div>

        <div className="settings-row">
          <span className="settings-label">Engine</span>
          <Select
            value={config.ttsEngine}
            onValueChange={(value) => handleEngineChange(value as TTSEngine)}
            disabled={!config.ttsEnabled}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TTS_ENGINES.map((engine) => (
                <SelectItem key={engine.value} value={engine.value}>
                  {engine.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="settings-row">
          <span className="settings-label">Voice</span>
          <Select
            value={config.ttsVoice}
            onValueChange={(value) => handleChange('ttsVoice', value)}
            disabled={!config.ttsEnabled}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableVoices.map((voice) => (
                <SelectItem key={voice.id} value={voice.id}>
                  {voice.name} ({voice.language})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            className="w-[120px] accent-indigo-500"
          />
          <span className="ml-2 text-xs text-slate-600 font-medium">
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
            className="w-[120px] accent-indigo-500"
          />
          <span className="ml-2 text-xs text-slate-600 font-medium">
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
            className="w-[120px] accent-indigo-500"
          />
          <span className="ml-2 text-xs text-slate-600 font-medium">
            {Math.round(config.ttsVolume * 100)}%
          </span>
        </div>

        <div className="settings-row border-none">
          <span className="settings-label">Test</span>
          <Button
            onClick={handleTestTTS}
            disabled={!config.ttsEnabled}
            variant="outline"
            size="sm"
            className="px-3 py-1.5 text-xs"
          >
            Play Test
          </Button>
        </div>

        <div className="settings-row border-none pt-1 text-[11px] text-slate-400">
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
