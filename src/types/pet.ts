// 宠物相关类型

export type EmotionType = 'happy' | 'thinking' | 'confused' | 'surprised' | 'neutral' | 'sad' | 'excited';

export interface PetPosition {
  x: number;
  y: number;
}

export interface PetSize {
  width: number;
  height: number;
}

export interface PetState {
  position: PetPosition;
  size: PetSize;
  scale: number;
  emotion: EmotionType;
  isVisible: boolean;
  currentSkinId: string;
  isListening: boolean;
  isSpeaking: boolean;
  bubbleText: string | null;
}

export interface PetAnimation {
  name: string;
  duration: number;
  loop: boolean;
}

export interface SkinMeta {
  id: string;
  name: string;
  path: string;
  previewImage: string | null;
  isBuiltin: boolean;
  createdAt: number;
  avatarImage?: string | null;
}

// 养成与互动动作
export type PetActionType =
  | 'feed'
  | 'play'
  | 'sleep'
  | 'work'
  | 'transform'
  | 'music'
  | 'dance'
  | 'magic'
  | 'art'
  | 'clean'
  | 'brush'
  | 'rest';

// 养成状态
export interface PetCareStats {
  satiety: number; // 饱腹感
  energy: number; // 体力
  hygiene: number; // 清洁度
  mood: number; // 心情
  boredom: number; // 无聊度
  isSick: boolean;
  lastAction: PetActionType | null;
}

export interface CareEffect {
  message: string;
  emotion: EmotionType;
  stats: Partial<PetCareStats>;
}

export interface CareStatusReport {
  summary: string;
  warnings: string[];
  emotion: EmotionType;
}
