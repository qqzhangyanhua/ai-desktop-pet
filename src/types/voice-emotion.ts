/**
 * Voice Emotion Recognition Types
 * 语音情绪识别类型定义
 */

/**
 * 语音情绪识别结果
 */
export interface VoiceEmotionResult {
  /** 检测到的情绪 */
  emotion: VoiceEmotion;
  /** 置信度 (0-1) */
  confidence: number;
  /** 情绪强度 (0-1) */
  intensity: number;
  /** 音频特征 */
  features: AudioFeatures;
  /** 检测时间戳 */
  timestamp: number;
}

/**
 * 语音情绪类型
 */
export type VoiceEmotion =
  | 'neutral'      // 中性
  | 'happy'        // 开心（语调上扬、节奏轻快）
  | 'sad'          // 难过（语调低沉、语速缓慢）
  | 'angry'        // 生气（语速快、音量大）
  | 'anxious'      // 焦虑（语速快、音量不稳定）
  | 'calm'         // 平静（节奏稳定、音量适中）
  | 'excited';     // 兴奋（语调上扬、语速快）

/**
 * 音频特征
 */
export interface AudioFeatures {
  /** 平均音高 (Hz) */
  pitch: number;
  /** 音高变化范围 (Hz) */
  pitchRange: number;
  /** 平均音量 (0-1) */
  volume: number;
  /** 音量变化 (0-1) */
  volumeVariance: number;
  /** 语速 (字符/秒) */
  speechRate: number;
  /** 停顿次数 */
  pauseCount: number;
  /** 音频时长 (秒) */
  duration: number;
}

/**
 * 语音情绪识别配置
 */
export interface VoiceEmotionConfig {
  /** 是否启用语音情绪识别 */
  enabled: boolean;
  /** 识别方法 */
  method: 'api' | 'features' | 'hybrid';
  /** API配置（用于第三方API） */
  apiConfig?: {
    provider: 'hume' | 'assemblyai' | 'custom';
    endpoint?: string;
    apiKey?: string;
  };
  /** 特征分析配置 */
  featureConfig?: {
    /** 是否分析音高 */
    analyzePitch: boolean;
    /** 是否分析音量 */
    analyzeVolume: boolean;
    /** 是否分析语速 */
    analyzeSpeechRate: boolean;
    /** 是否分析停顿 */
    analyzePauses: boolean;
  };
  /** 情绪融合权重 */
  fusionWeights?: {
    /** 文本情绪权重 */
    text: number;
    /** 语音情绪权重 */
    voice: number;
  };
}

/**
 * 多模态情绪融合结果
 */
export interface MultimodalEmotionResult {
  /** 融合后的情绪 */
  emotion: string;
  /** 置信度 */
  confidence: number;
  /** 文本情绪分析 */
  textSentiment: {
    emotion: string;
    confidence: number;
  };
  /** 语音情绪分析 */
  voiceEmotion: {
    emotion: VoiceEmotion;
    confidence: number;
  };
  /** 融合方法 */
  fusionMethod: 'weighted' | 'voting' | 'cascade';
}

/**
 * 语音情绪识别回调
 */
export interface VoiceEmotionCallbacks {
  /** 识别完成 */
  onRecognized?: (result: VoiceEmotionResult) => void;
  /** 识别错误 */
  onError?: (error: Error) => void;
  /** 开始分析 */
  onAnalysisStart?: () => void;
  /** 分析完成 */
  onAnalysisComplete?: () => void;
}

/**
 * 语音情绪分析选项
 */
export interface VoiceEmotionAnalysisOptions {
  /** 音频数据（AudioBuffer或Blob） */
  audioData: AudioBuffer | Blob;
  /** 对应的文本（用于融合分析） */
  text?: string;
  /** 回调函数 */
  callbacks?: VoiceEmotionCallbacks;
}
