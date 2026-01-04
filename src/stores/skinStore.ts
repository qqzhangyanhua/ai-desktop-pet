// Skin Store - Manage pet skins

import { create } from 'zustand';
import type { SkinMeta } from '../types';

// Default built-in skins
// 注意：图片使用相对路径 ./ 可以工作，但 Live2D 模型需要绝对路径 /
const DEFAULT_SKINS: SkinMeta[] = [
  {
    id: 'white-cat',
    name: 'White Cat',
    path: '/whitecatfree_vts/white-cat.model3.json',
    previewImage: './whitecatfree_vts/white-cat.2048/preview.png',
    avatarImage: './whitecatfree_vts/white-cat.2048/avatar.png',
    isBuiltin: true,
    createdAt: Date.now(),
  },
  {
    id: 'shizuku',
    name: 'Shizuku',
    path: '/models/shizuku/shizuku.model.json',
    previewImage: './models/shizuku/preview.png',
    isBuiltin: true,
    createdAt: Date.now(),
  },
  {
    id: 'haru',
    name: 'Haru',
    path: '/models/haru/haru.model.json',
    previewImage: './models/haru/preview.png',
    isBuiltin: true,
    createdAt: Date.now(),
  },
];

interface SkinState {
  currentSkinId: string;
  skins: SkinMeta[];
  isLoading: boolean;
  error: string | null;
}

interface SkinStore extends SkinState {
  // Actions
  setCurrentSkin: (skinId: string) => void;
  addSkin: (skin: SkinMeta) => void;
  removeSkin: (skinId: string) => void;
  updateSkin: (skinId: string, updates: Partial<SkinMeta>) => void;
  loadSkins: () => Promise<void>;
  saveSkins: () => Promise<void>;
  getSkin: (skinId: string) => SkinMeta | undefined;
  getCurrentSkin: () => SkinMeta | undefined;
}

export const useSkinStore = create<SkinStore>((set, get) => ({
  // 默认使用本地白猫模型（与 test.html 保持一致）
  currentSkinId: 'white-cat',
  skins: DEFAULT_SKINS,
  isLoading: false,
  error: null,

  setCurrentSkin: (skinId) => {
    const skin = get().skins.find((s) => s.id === skinId);
    if (skin) {
      set({ currentSkinId: skinId });
    }
  },

  addSkin: (skin) => {
    set((state) => ({
      skins: [...state.skins, skin],
    }));
  },

  removeSkin: (skinId) => {
    const skin = get().skins.find((s) => s.id === skinId);
    if (skin?.isBuiltin) {
      console.warn('Cannot remove built-in skin');
      return;
    }

    set((state) => {
      const newSkins = state.skins.filter((s) => s.id !== skinId);
      // If removing current skin, switch to first available
      const newCurrentId =
        state.currentSkinId === skinId
          ? newSkins[0]?.id ?? 'shizuku'
          : state.currentSkinId;

      return {
        skins: newSkins,
        currentSkinId: newCurrentId,
      };
    });
  },

  updateSkin: (skinId, updates) => {
    set((state) => ({
      skins: state.skins.map((s) =>
        s.id === skinId ? { ...s, ...updates } : s
      ),
    }));
  },

  loadSkins: async () => {
    set({ isLoading: true, error: null });

    try {
      // Load custom skins from database
      const { getSkins } = await import('../services/database/skins');
      const customSkins = await getSkins();

      set({
        skins: [...DEFAULT_SKINS, ...customSkins],
        isLoading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load skins';
      set({ error: errorMessage, isLoading: false });
    }
  },

  saveSkins: async () => {
    const customSkins = get().skins.filter((s) => !s.isBuiltin);

    try {
      const { saveSkins } = await import('../services/database/skins');
      await saveSkins(customSkins);
    } catch (error) {
      console.error('Failed to save skins:', error);
    }
  },

  getSkin: (skinId) => {
    return get().skins.find((s) => s.id === skinId);
  },

  getCurrentSkin: () => {
    const state = get();
    return state.skins.find((s) => s.id === state.currentSkinId);
  },
}));
