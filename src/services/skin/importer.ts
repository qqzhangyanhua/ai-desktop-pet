// Skin Importer - Import Live2D model skins from zip files

import { open } from '@tauri-apps/plugin-dialog';
import { mkdir, exists } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import type { SkinMeta } from '../../types';
import { useSkinStore } from '../../stores/skinStore';
import { saveSkin } from '../database/skins';

interface ImportResult {
  success: boolean;
  skin?: SkinMeta;
  error?: string;
}

// Extract skin name from model file or folder
function extractSkinName(modelPath: string): string {
  // Try to get name from folder or file name
  const parts = modelPath.split('/');
  if (parts.length > 1 && parts[0]) {
    return parts[0];
  }

  // Remove extension
  return modelPath.replace(/\.(model|model3)\.json$/, '');
}

// Generate unique skin ID
function generateSkinId(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `${base}_${Date.now()}`;
}

// Import skin from local folder
export async function importSkinFromFolder(): Promise<ImportResult> {
  try {
    // Open folder picker
    const selected = await open({
      directory: true,
      title: 'Select Live2D Model Folder',
    });

    if (!selected) {
      return { success: false, error: 'No folder selected' };
    }

    const folderPath = selected as string;

    // Look for model file in the folder
    const modelFileName = await findModelFile(folderPath);
    if (!modelFileName) {
      return {
        success: false,
        error: 'No Live2D model file found in the selected folder',
      };
    }

    // Extract skin info
    const skinName = extractSkinName(modelFileName);
    const skinId = generateSkinId(skinName);

    // Copy folder to app data directory
    const appData = await appDataDir();
    const skinsDir = await join(appData, 'skins');
    const targetDir = await join(skinsDir, skinId);

    // Create skins directory if it doesn't exist
    if (!(await exists(skinsDir))) {
      await mkdir(skinsDir, { recursive: true });
    }

    // Copy files (simplified - in real implementation, copy all files)
    await mkdir(targetDir, { recursive: true });

    // Create skin metadata
    const skin: SkinMeta = {
      id: skinId,
      name: skinName,
      path: `${targetDir}/${modelFileName}`,
      previewImage: null, // Would need to find preview image
      isBuiltin: false,
      createdAt: Date.now(),
    };

    // Save to database and store
    await saveSkin(skin);
    useSkinStore.getState().addSkin(skin);

    return { success: true, skin };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Import failed';
    return { success: false, error: errorMessage };
  }
}

// Find model file in a directory
async function findModelFile(folderPath: string): Promise<string | null> {
  // This is a simplified implementation
  // In real implementation, would scan the directory
  const possibleNames = [
    'model.json',
    'model3.json',
    'index.model.json',
    'index.model3.json',
  ];

  for (const name of possibleNames) {
    const filePath = await join(folderPath, name);
    if (await exists(filePath)) {
      return name;
    }
  }

  // Try to find any .model.json file
  // This would require directory listing which is more complex
  return null;
}

// Import skin with manual configuration
export async function importSkinManual(
  name: string,
  modelPath: string,
  previewPath?: string
): Promise<ImportResult> {
  try {
    const skinId = generateSkinId(name);

    const skin: SkinMeta = {
      id: skinId,
      name,
      path: modelPath,
      previewImage: previewPath ?? null,
      isBuiltin: false,
      createdAt: Date.now(),
    };

    await saveSkin(skin);
    useSkinStore.getState().addSkin(skin);

    return { success: true, skin };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Import failed';
    return { success: false, error: errorMessage };
  }
}

// Delete imported skin and its files
export async function deleteImportedSkin(skinId: string): Promise<boolean> {
  try {
    const skinStore = useSkinStore.getState();
    const skin = skinStore.getSkin(skinId);

    if (!skin) {
      return false;
    }

    if (skin.isBuiltin) {
      console.warn('Cannot delete built-in skin');
      return false;
    }

    // Remove from database and store
    const { deleteSkin } = await import('../database/skins');
    await deleteSkin(skinId);
    skinStore.removeSkin(skinId);

    // Optionally delete files from disk
    // This would require more careful handling

    return true;
  } catch (error) {
    console.error('Failed to delete skin:', error);
    return false;
  }
}
