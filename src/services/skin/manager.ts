// Skin Manager - Handle skin switching and Live2D model management

import type { SkinMeta } from '../../types';
import { useSkinStore } from '../../stores/skinStore';
import { usePetStore } from '../../stores/petStore';

export interface SkinManagerEvents {
  onSkinChange?: (skin: SkinMeta) => void;
  onLoadStart?: (skinId: string) => void;
  onLoadComplete?: (skinId: string) => void;
  onLoadError?: (skinId: string, error: string) => void;
}

export class SkinManager {
  private events: SkinManagerEvents;
  private isLoading = false;

  constructor(events: SkinManagerEvents = {}) {
    this.events = events;
  }

  // Switch to a different skin
  async switchSkin(skinId: string): Promise<boolean> {
    if (this.isLoading) {
      console.warn('Already loading a skin');
      return false;
    }

    const skinStore = useSkinStore.getState();
    const skin = skinStore.getSkin(skinId);

    if (!skin) {
      console.error(`Skin not found: ${skinId}`);
      return false;
    }

    this.isLoading = true;
    this.events.onLoadStart?.(skinId);

    try {
      // Update stores
      skinStore.setCurrentSkin(skinId);
      usePetStore.getState().setCurrentSkin(skinId);

      // The Live2D component will react to the state change
      // and reload the model automatically

      this.events.onLoadComplete?.(skinId);
      this.events.onSkinChange?.(skin);

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to switch skin';
      this.events.onLoadError?.(skinId, errorMessage);
      return false;
    } finally {
      this.isLoading = false;
    }
  }

  // Get current skin
  getCurrentSkin(): SkinMeta | undefined {
    return useSkinStore.getState().getCurrentSkin();
  }

  // Get all available skins
  getAvailableSkins(): SkinMeta[] {
    return useSkinStore.getState().skins;
  }

  // Check if a skin exists
  hasSkin(skinId: string): boolean {
    return useSkinStore.getState().getSkin(skinId) !== undefined;
  }

  // Get skin by ID
  getSkin(skinId: string): SkinMeta | undefined {
    return useSkinStore.getState().getSkin(skinId);
  }

  // Check if currently loading
  isCurrentlyLoading(): boolean {
    return this.isLoading;
  }
}

// Singleton instance
let skinManagerInstance: SkinManager | null = null;

export function getSkinManager(events?: SkinManagerEvents): SkinManager {
  if (!skinManagerInstance) {
    skinManagerInstance = new SkinManager(events);
  }
  return skinManagerInstance;
}

export function destroySkinManager(): void {
  skinManagerInstance = null;
}
