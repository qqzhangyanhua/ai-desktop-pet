// Skins Database Service

import { getDatabase } from './index';
import type { SkinMeta } from '../../types';

// Get all custom skins
export async function getSkins(): Promise<SkinMeta[]> {
  const db = await getDatabase();

  const result = await db.select<
    Array<{
      id: string;
      name: string;
      path: string;
      preview_image: string | null;
      is_builtin: number;
      created_at: number;
    }>
  >('SELECT * FROM skins WHERE is_builtin = 0 ORDER BY created_at DESC');

  return result.map((row) => ({
    id: row.id,
    name: row.name,
    path: row.path,
    previewImage: row.preview_image,
    isBuiltin: row.is_builtin === 1,
    createdAt: row.created_at,
  }));
}

// Get skin by ID
export async function getSkinById(id: string): Promise<SkinMeta | null> {
  const db = await getDatabase();

  const result = await db.select<
    Array<{
      id: string;
      name: string;
      path: string;
      preview_image: string | null;
      is_builtin: number;
      created_at: number;
    }>
  >('SELECT * FROM skins WHERE id = ?', [id]);

  const row = result[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    path: row.path,
    previewImage: row.preview_image,
    isBuiltin: row.is_builtin === 1,
    createdAt: row.created_at,
  };
}

// Save a skin
export async function saveSkin(skin: SkinMeta): Promise<void> {
  const db = await getDatabase();

  await db.execute(
    `INSERT OR REPLACE INTO skins (id, name, path, preview_image, is_builtin, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      skin.id,
      skin.name,
      skin.path,
      skin.previewImage,
      skin.isBuiltin ? 1 : 0,
      skin.createdAt,
    ]
  );
}

// Save multiple skins
export async function saveSkins(skins: SkinMeta[]): Promise<void> {
  const db = await getDatabase();

  for (const skin of skins) {
    await db.execute(
      `INSERT OR REPLACE INTO skins (id, name, path, preview_image, is_builtin, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        skin.id,
        skin.name,
        skin.path,
        skin.previewImage,
        skin.isBuiltin ? 1 : 0,
        skin.createdAt,
      ]
    );
  }
}

// Delete a skin
export async function deleteSkin(id: string): Promise<void> {
  const db = await getDatabase();
  await db.execute('DELETE FROM skins WHERE id = ? AND is_builtin = 0', [id]);
}

// Check if skin exists
export async function skinExists(id: string): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.select<Array<{ count: number }>>(
    'SELECT COUNT(*) as count FROM skins WHERE id = ?',
    [id]
  );
  return (result[0]?.count ?? 0) > 0;
}
