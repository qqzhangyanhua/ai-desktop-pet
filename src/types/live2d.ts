// Live2D types

export interface Live2DModelConfig {
  name: string;
  path: string | string[];
  scale?: number;
  position?: [number, number];
  stageStyle?: {
    width?: number;
    height?: number;
  };
  mobileScale?: number;
  mobilePosition?: [number, number];
  mobileStageStyle?: {
    width?: number;
    height?: number;
  };
}

export interface Live2DConfig {
  models: Live2DModelConfig[];
  dockedPosition?: 'left' | 'right';
  primaryColor?: string;
  sayHello?: boolean;
  mobileDisplay?: boolean;
}

export type Live2DMotionPriority = 'idle' | 'normal' | 'force';

export interface Live2DEmotionMapping {
  happy: string;
  sad: string;
  angry: string;
  surprised: string;
  thinking: string;
  neutral: string;
  excited: string;
  confused: string;
}

export interface Live2DState {
  isLoaded: boolean;
  currentModel: string | null;
  currentModelIndex: number;
  isPlaying: boolean;
}
