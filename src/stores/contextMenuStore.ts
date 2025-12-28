import { create } from 'zustand';

export type ContextMenuSection = 'quick' | 'pet_fun' | 'pet_care' | 'assistant' | 'system';

interface ContextMenuPrefs {
  favorites: string[];
  recent: string[];
  collapsedSections: ContextMenuSection[];
}

interface ContextMenuStore extends ContextMenuPrefs {
  toggleFavorite: (id: string) => void;
  recordRecent: (id: string) => void;
  isFavorite: (id: string) => boolean;
  isCollapsed: (section: ContextMenuSection) => boolean;
  toggleCollapsed: (section: ContextMenuSection) => void;
  clearRecent: () => void;
}

const STORAGE_KEY = 'pet.contextMenuPrefs.v1';

const DEFAULT_PREFS: ContextMenuPrefs = {
  favorites: [],
  recent: [],
  collapsedSections: [],
};

function loadPrefs(): ContextMenuPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<ContextMenuPrefs>;
    return {
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites.filter((v) => typeof v === 'string') : [],
      recent: Array.isArray(parsed.recent) ? parsed.recent.filter((v) => typeof v === 'string') : [],
      collapsedSections: Array.isArray(parsed.collapsedSections)
        ? parsed.collapsedSections.filter((v) => typeof v === 'string') as ContextMenuSection[]
        : [],
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(prefs: ContextMenuPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export const useContextMenuStore = create<ContextMenuStore>((set, get) => ({
  ...DEFAULT_PREFS,
  ...loadPrefs(),

  isFavorite: (id) => get().favorites.includes(id),

  toggleFavorite: (id) => {
    set((state) => {
      const exists = state.favorites.includes(id);
      const favorites = exists ? state.favorites.filter((x) => x !== id) : [id, ...state.favorites].slice(0, 12);
      const next = { ...state, favorites };
      savePrefs({ favorites: next.favorites, recent: next.recent, collapsedSections: next.collapsedSections });
      return { favorites };
    });
  },

  recordRecent: (id) => {
    set((state) => {
      const recent = [id, ...state.recent.filter((x) => x !== id)].slice(0, 10);
      const next = { ...state, recent };
      savePrefs({ favorites: next.favorites, recent: next.recent, collapsedSections: next.collapsedSections });
      return { recent };
    });
  },

  clearRecent: () => {
    set((state) => {
      const next = { ...state, recent: [] as string[] };
      savePrefs({ favorites: next.favorites, recent: next.recent, collapsedSections: next.collapsedSections });
      return { recent: [] };
    });
  },

  isCollapsed: (section) => get().collapsedSections.includes(section),

  toggleCollapsed: (section) => {
    set((state) => {
      const exists = state.collapsedSections.includes(section);
      const collapsedSections = exists
        ? state.collapsedSections.filter((s) => s !== section)
        : [...state.collapsedSections, section];
      const next = { ...state, collapsedSections };
      savePrefs({ favorites: next.favorites, recent: next.recent, collapsedSections: next.collapsedSections });
      return { collapsedSections };
    });
  },
}));

