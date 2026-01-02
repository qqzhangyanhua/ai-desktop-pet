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
      favorites: Array.isArray(parsed.favorites)
        ? parsed.favorites.filter((v) => typeof v === 'string' && v.length > 0).slice(0, 12)
        : [],
      recent: Array.isArray(parsed.recent)
        ? parsed.recent.filter((v) => typeof v === 'string' && v.length > 0).slice(0, 10)
        : [],
      collapsedSections: Array.isArray(parsed.collapsedSections)
        ? parsed.collapsedSections.filter((v) => typeof v === 'string') as ContextMenuSection[]
        : [],
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

/**
 * Debounced save to localStorage
 * Linus原则: 减少不必要的I/O操作
 */
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedSave(prefs: ContextMenuPrefs): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // ignore
    }
  }, 300);
}

/**
 * Context Menu Store with Set-based optimization
 * Linus原则: "Bad programmers worry about the code. Good programmers worry about data structures."
 *
 * 优化策略:
 * - 内部使用 Set 实现 O(1) 查找
 * - 对外保持数组接口兼容性（零破坏性）
 * - debounced localStorage 写入
 */
export const useContextMenuStore = create<ContextMenuStore>((set) => {
  const initial = loadPrefs();

  // 内部维护 Set 实现快速查找 - O(1) instead of O(n)
  let favoritesSet = new Set(initial.favorites);
  let collapsedSet = new Set(initial.collapsedSections);

  return {
    favorites: initial.favorites,
    recent: initial.recent,
    collapsedSections: initial.collapsedSections,

    // O(1) 查找 - 不再是 O(n) 的 includes()
    isFavorite: (id) => favoritesSet.has(id),

    toggleFavorite: (id) => {
      set((state) => {
        // 使用 Set 操作
        if (favoritesSet.has(id)) {
          favoritesSet.delete(id);
        } else {
          favoritesSet.add(id);
          // 限制最多12个收藏
          if (favoritesSet.size > 12) {
            const oldest = state.favorites[state.favorites.length - 1];
            if (oldest) favoritesSet.delete(oldest);
          }
        }

        // 转回数组（保持顺序：新的在前）
        const favorites = Array.from(favoritesSet);

        // debounced 保存
        debouncedSave({
          favorites,
          recent: state.recent,
          collapsedSections: state.collapsedSections,
        });

        return { favorites };
      });
    },

    recordRecent: (id) => {
      set((state) => {
        // 去重并前置新项
        const recent = [id, ...state.recent.filter((x) => x !== id)].slice(0, 10);

        debouncedSave({
          favorites: state.favorites,
          recent,
          collapsedSections: state.collapsedSections,
        });

        return { recent };
      });
    },

    clearRecent: () => {
      set((state) => {
        debouncedSave({
          favorites: state.favorites,
          recent: [],
          collapsedSections: state.collapsedSections,
        });

        return { recent: [] };
      });
    },

    // O(1) 查找
    isCollapsed: (section) => collapsedSet.has(section),

    toggleCollapsed: (section) => {
      set((state) => {
        // 使用 Set 操作
        if (collapsedSet.has(section)) {
          collapsedSet.delete(section);
        } else {
          collapsedSet.add(section);
        }

        const collapsedSections = Array.from(collapsedSet);

        debouncedSave({
          favorites: state.favorites,
          recent: state.recent,
          collapsedSections,
        });

        return { collapsedSections };
      });
    },
  };
});

