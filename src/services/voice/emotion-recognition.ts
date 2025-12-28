/**
 * Voice Emotion Recognition Service
 * 语音情绪识别服务
 *
 * Linus准则：
 * - 数据结构优先：音频特征清晰定义
 * - 消除特殊情况：统一的识别接口
 * - 简洁实现：优先使用特征分析，可选API集成
 */

import type {
  VoiceEmotion,
  VoiceEmotionResult,
  AudioFeatures,
  VoiceEmotionConfig,
  MultimodalEmotionResult,
  VoiceEmotionAnalysisOptions,
} from '@/types/voice-emotion';

/**
 * 默认配置
 */
const DEFAULT_CONFIG: VoiceEmotionConfig = {
  enabled: true,
  method: 'features',
  featureConfig: {
    analyzePitch: true,
    analyzeVolume: true,
    analyzeSpeechRate: true,
    analyzePauses: true,
  },
  fusionWeights: {
    text: 0.6,
    voice: 0.4,
  },
};

/**
 * 语音情绪识别服务
 */
export class VoiceEmotionRecognition {
  private config: VoiceEmotionConfig;
  private audioContext: AudioContext | null = null;

  constructor(config: Partial<VoiceEmotionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 识别语音情绪
   */
  async recognizeEmotion(
    options: VoiceEmotionAnalysisOptions
  ): Promise<VoiceEmotionResult> {
    const { audioData, callbacks } = options;

    callbacks?.onAnalysisStart?.();

    try {
      // 提取音频特征
      const features = await this.extractFeatures(audioData);

      // 基于特征分析情绪
      const emotion = this.analyzeEmotionFromFeatures(features);

      const result: VoiceEmotionResult = {
        emotion: emotion.emotion,
        confidence: emotion.confidence,
        intensity: emotion.intensity,
        features,
        timestamp: Date.now(),
      };

      callbacks?.onRecognized?.(result);
      callbacks?.onAnalysisComplete?.();

      return result;
    } catch (error) {
      callbacks?.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * 多模态情绪融合（文本+语音）
   */
  fuseEmotions(
    textEmotion: { emotion: string; confidence: number },
    voiceResult: VoiceEmotionResult,
    fusionMethod: MultimodalEmotionResult['fusionMethod'] = 'weighted'
  ): MultimodalEmotionResult {
    const textWeight = this.config.fusionWeights?.text ?? 0.6;
    const voiceWeight = this.config.fusionWeights?.voice ?? 0.4;

    let fusedEmotion: string;
    let fusedConfidence: number;

    switch (fusionMethod) {
      case 'weighted':
        // 加权融合
        fusedEmotion = this.weightedFusion(
          textEmotion.emotion,
          voiceResult.emotion,
          textWeight,
          voiceWeight
        );
        fusedConfidence =
          textEmotion.confidence * textWeight +
          voiceResult.confidence * voiceWeight;
        break;

      case 'voting':
        // 投票法
        fusedEmotion = this.votingFusion(
          textEmotion.emotion,
          voiceResult.emotion,
          textEmotion.confidence,
          voiceResult.confidence
        );
        fusedConfidence = Math.max(
          textEmotion.confidence,
          voiceResult.confidence
        );
        break;

      case 'cascade':
        // 级联法：语音优先，不确定时使用文本
        if (voiceResult.confidence > 0.7) {
          fusedEmotion = voiceResult.emotion;
          fusedConfidence = voiceResult.confidence;
        } else {
          fusedEmotion = textEmotion.emotion;
          fusedConfidence = textEmotion.confidence;
        }
        break;
    }

    return {
      emotion: fusedEmotion,
      confidence: fusedConfidence,
      textSentiment: textEmotion,
      voiceEmotion: {
        emotion: voiceResult.emotion,
        confidence: voiceResult.confidence,
      },
      fusionMethod,
    };
  }

  /**
   * 提取音频特征
   */
  private async extractFeatures(
    audioData: AudioBuffer | Blob
  ): Promise<AudioFeatures> {
    let audioBuffer: AudioBuffer;

    if (audioData instanceof Blob) {
      // 从Blob解码音频
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }
      const arrayBuffer = await audioData.arrayBuffer();
      audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    } else {
      audioBuffer = audioData;
    }

    // 获取音频数据
    const channelData = audioBuffer.getChannelData(0); // 使用单声道
    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;

    // 计算特征
    const features: AudioFeatures = {
      pitch: this.calculatePitch(channelData, sampleRate),
      pitchRange: this.calculatePitchRange(channelData, sampleRate),
      volume: this.calculateVolume(channelData),
      volumeVariance: this.calculateVolumeVariance(channelData),
      speechRate: this.estimateSpeechRate(channelData, sampleRate),
      pauseCount: this.countPauses(channelData, sampleRate),
      duration,
    };

    return features;
  }

  /**
   * 计算音高（使用自相关法）
   */
  private calculatePitch(data: Float32Array, sampleRate: number): number {
    // 简化的音高检测：使用零交叉率
    let zeroCrossings = 0;
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      const curr = data[i];
      if (curr !== undefined && ((prev !== undefined && prev >= 0 && curr < 0) || (prev !== undefined && prev < 0 && curr >= 0))) {
        zeroCrossings++;
      }
    }

    // 零交叉率转换为大致音高
    const zeroCrossingRate = zeroCrossings / data.length;
    return zeroCrossingRate * sampleRate / 2;
  }

  /**
   * 计算音高变化范围
   */
  private calculatePitchRange(data: Float32Array, _sampleRate: number): number {
    // 使用标准差估计音高变化
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance =
      data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    return Math.sqrt(variance) * 100; // 缩放到合理范围
  }

  /**
   * 计算音量（RMS）
   */
  private calculateVolume(data: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const val = data[i];
      if (val !== undefined) {
        sum += val * val;
      }
    }
    return Math.sqrt(sum / data.length);
  }

  /**
   * 计算音量变化
   */
  private calculateVolumeVariance(data: Float32Array): number {
    const windowSize = Math.floor(data.length / 10); // 分成10段
    const volumes: number[] = [];

    for (let i = 0; i < data.length; i += windowSize) {
      const end = Math.min(i + windowSize, data.length);
      const chunk = data.slice(i, end);
      const volume = chunk ? this.calculateVolume(chunk) : 0;
      volumes.push(volume);
    }

    const mean = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
    const variance =
      volumes.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / volumes.length;

    return Math.sqrt(variance);
  }

  /**
   * 估算语速（基于能量变化）
   */
  private estimateSpeechRate(data: Float32Array, sampleRate: number): number {
    // 简化的语速估算：计算能量峰值数量
    const windowSize = Math.floor(sampleRate * 0.05); // 50ms窗口
    let peakCount = 0;
    let lastEnergy = 0;
    const threshold = 0.01;

    for (let i = 0; i < data.length - windowSize; i += windowSize) {
      let energy = 0;
      for (let j = 0; j < windowSize; j++) {
        const val = data[i + j];
        if (val !== undefined) {
          energy += Math.abs(val);
        }
      }
      energy /= windowSize;

      if (energy > threshold && energy > lastEnergy * 1.5) {
        peakCount++;
      }
      lastEnergy = energy;
    }

    // 估算字符/秒（粗略）
    return peakCount / (data.length / (sampleRate || 1));
  }

  /**
   * 计算停顿次数
   */
  private countPauses(data: Float32Array, sampleRate: number): number {
    const windowSize = Math.floor(sampleRate * 0.1); // 100ms窗口
    const silenceThreshold = 0.005;
    let pauseCount = 0;
    let inPause = false;

    for (let i = 0; i < data.length - windowSize; i += windowSize) {
      let energy = 0;
      for (let j = 0; j < windowSize; j++) {
        const val = data[i + j];
        if (val !== undefined) {
          energy += Math.abs(val);
        }
      }
      energy /= windowSize;

      if (energy < silenceThreshold) {
        if (!inPause) {
          pauseCount++;
          inPause = true;
        }
      } else {
        inPause = false;
      }
    }

    return pauseCount;
  }

  /**
   * 基于特征分析情绪
   */
  private analyzeEmotionFromFeatures(
    features: AudioFeatures
  ): Pick<VoiceEmotionResult, 'emotion' | 'confidence' | 'intensity'> {
    let emotion: VoiceEmotion = 'neutral';
    let confidence = 0.5;
    let intensity = 0.5;

    // 基于特征的简单规则（实际应该使用ML模型）
    const { pitch, pitchRange, volume, volumeVariance, speechRate } = features;

    // 高音高 + 大音量变化 → 开心/兴奋
    if (pitch > 200 && volumeVariance > 0.1) {
      if (speechRate > 4) {
        emotion = 'excited';
        confidence = 0.7;
        intensity = Math.min(1, (pitch - 200) / 200 + volumeVariance);
      } else {
        emotion = 'happy';
        confidence = 0.65;
        intensity = Math.min(1, volume + pitchRange / 50);
      }
    }
    // 低音高 + 低音量 + 慢语速 → 难过
    else if (pitch < 150 && volume < 0.1 && speechRate < 2.5) {
      emotion = 'sad';
      confidence = 0.7;
      intensity = 1 - volume;
    }
    // 快语速 + 高音量 + 高音量变化 → 生气/焦虑
    else if (speechRate > 5 && volume > 0.2) {
      if (volumeVariance > 0.15) {
        emotion = 'anxious';
        confidence = 0.6;
        intensity = speechRate / 8;
      } else {
        emotion = 'angry';
        confidence = 0.65;
        intensity = volume + speechRate / 10;
      }
    }
    // 稳定节奏 + 适中音量 → 平静
    else if (volumeVariance < 0.05 && speechRate > 2 && speechRate < 4) {
      emotion = 'calm';
      confidence = 0.75;
      intensity = volume;
    }
    // 其他情况 → 中性
    else {
      emotion = 'neutral';
      confidence = 0.5;
      intensity = 0.5;
    }

    return { emotion, confidence, intensity };
  }

  /**
   * 加权融合
   */
  private weightedFusion(
    textEmotion: string,
    voiceEmotion: VoiceEmotion,
    textWeight: number,
    voiceWeight: number
  ): string {
    // 简化实现：优先选择权重高的情绪
    if (textWeight >= voiceWeight) {
      return textEmotion;
    } else {
      return voiceEmotion;
    }
  }

  /**
   * 投票融合
   */
  private votingFusion(
    textEmotion: string,
    voiceEmotion: VoiceEmotion,
    textConfidence: number,
    voiceConfidence: number
  ): string {
    // 高置信度者获胜
    if (textConfidence > voiceConfidence) {
      return textEmotion;
    } else {
      return voiceEmotion;
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<VoiceEmotionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取配置
   */
  getConfig(): VoiceEmotionConfig {
    return { ...this.config };
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// 单例实例
let voiceEmotionInstance: VoiceEmotionRecognition | null = null;

export function getVoiceEmotionRecognition(
  config?: Partial<VoiceEmotionConfig>
): VoiceEmotionRecognition {
  if (!voiceEmotionInstance) {
    voiceEmotionInstance = new VoiceEmotionRecognition(config);
  } else if (config) {
    voiceEmotionInstance.updateConfig(config);
  }
  return voiceEmotionInstance;
}

export function destroyVoiceEmotionRecognition(): void {
  if (voiceEmotionInstance) {
    voiceEmotionInstance.destroy();
    voiceEmotionInstance = null;
  }
}
