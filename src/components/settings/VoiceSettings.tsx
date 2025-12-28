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
  { value: 'zh-CN', label: '中文（简体）' },
  { value: 'zh-TW', label: '中文（繁体）' },
  { value: 'en-US', label: '英语（美国）' },
  { value: 'en-GB', label: '英语（英国）' },
  { value: 'ja-JP', label: '日语' },
  { value: 'ko-KR', label: '韩语' },
];

const TTS_ENGINES: { value: TTSEngine; label: string }[] = [
  { value: 'web-speech', label: 'Web Speech（内置）' },
  { value: 'edge-tts', label: 'Edge TTS（高品质）' },
];

const EDGE_TTS_VOICES: TTSVoice[] = [
  { id: 'zh-CN-XiaoxiaoNeural', name: '晓晓（女）', language: 'zh-CN', gender: 'female' },
  { id: 'zh-CN-XiaoyiNeural', name: '晓伊（女）', language: 'zh-CN', gender: 'female' },
  { id: 'zh-CN-YunxiNeural', name: '云希（男）', language: 'zh-CN', gender: 'male' },
  { id: 'zh-CN-YunyangNeural', name: '云扬（男）', language: 'zh-CN', gender: 'male' },
  { id: 'en-US-JennyNeural', name: 'Jenny（女）', language: 'en-US', gender: 'female' },
  { id: 'en-US-GuyNeural', name: 'Guy（男）', language: 'en-US', gender: 'male' },
  { id: 'ja-JP-NanamiNeural', name: 'Nanami（女）', language: 'ja-JP', gender: 'female' },
  { id: 'ja-JP-KeitaNeural', name: 'Keita（男）', language: 'ja-JP', gender: 'male' },
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
      await manager.speak('你好！这是语音测试。');
    } catch (error) {
      console.error('TTS test failed:', error);
    }
  }, [config]);

  return (
    <>
      {/* STT Settings */}
      <div className="settings-section">
        <div className="settings-section-title">语音识别（STT）</div>

        <div className="settings-row">
          <span className="settings-label">启用 STT</span>
          <Checkbox
            checked={config.sttEnabled}
            onCheckedChange={(checked) => handleChange('sttEnabled', !!checked)}
          />
        </div>

        <div className="settings-row">
          <span className="settings-label">语言</span>
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
          <span className="settings-label">按住说话键</span>
          <Input
            type="text"
            className="settings-input w-[100px] text-center"
            value={config.pushToTalkKey}
            onChange={(e) => handleChange('pushToTalkKey', e.target.value)}
            placeholder="按下一个键..."
            onKeyDown={(e) => {
              e.preventDefault();
              handleChange('pushToTalkKey', e.key);
            }}
            disabled={!config.sttEnabled}
          />
        </div>

        <div className="settings-row border-none pt-1 text-[11px] text-slate-400">
          {config.sttEnabled
            ? '按住按键说话，松开发送'
            : '启用 STT 以使用语音输入'}
        </div>
      </div>

      {/* TTS Settings */}
      <div className="settings-section">
        <div className="settings-section-title">语音合成（TTS）</div>

        <div className="settings-row">
          <span className="settings-label">启用 TTS</span>
          <Checkbox
            checked={config.ttsEnabled}
            onCheckedChange={(checked) => handleChange('ttsEnabled', !!checked)}
          />
        </div>

        <div className="settings-row">
          <span className="settings-label">引擎</span>
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
          <span className="settings-label">语音</span>
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
                  {voice.name}（{voice.language}）
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="settings-row">
          <span className="settings-label">语速</span>
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
          <span className="settings-label">音调</span>
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
          <span className="settings-label">音量</span>
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
          <span className="settings-label">测试</span>
          <Button
            onClick={handleTestTTS}
            disabled={!config.ttsEnabled}
            variant="outline"
            size="sm"
            className="px-3 py-1.5 text-xs"
          >
            播放测试
          </Button>
        </div>

        <div className="settings-row border-none pt-1 text-[11px] text-slate-400">
          {config.ttsEnabled
            ? config.ttsEngine === 'edge-tts'
              ? '使用 Microsoft Edge TTS（需要 edge-tts CLI）'
              : '使用浏览器内置语音合成'
            : '启用 TTS 以听到 AI 回复'}
        </div>
      </div>
    </>
  );
}
