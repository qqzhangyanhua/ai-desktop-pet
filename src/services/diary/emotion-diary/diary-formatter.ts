/**
 * Diary Formatter
 * 日记数据转换工具
 *
 * P1-C-3: Extracted from emotion-diary.ts (718 lines)
 * Linus原则: 单一职责 - 只负责数据库行与业务对象之间的转换
 */

import type { DiaryEntry, DiaryEntryRow } from '@/types/emotion-diary';

/**
 * 将数据库行转换为DiaryEntry对象
 */
export function rowToEntry(row: DiaryEntryRow): DiaryEntry {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    title: row.title,
    content: row.content,
    emotion: {
      primary: row.emotion_primary,
      secondary: row.emotion_secondary ?? undefined,
      intensity: row.emotion_intensity,
      confidence: row.emotion_confidence,
    },
    activities: JSON.parse(row.activities ?? '[]') as string[],
    weather: (row.weather as DiaryEntry['weather']) ?? undefined,
    location: row.location ?? undefined,
    photos: JSON.parse(row.photos ?? '[]') as string[],
    voiceNote: row.voice_note ?? undefined,
    relatedConversationId: row.related_conversation_id ?? undefined,
    isFavorite: row.is_favorite === 1,
    tags: JSON.parse(row.tags ?? '[]') as string[],
    visibility: row.visibility as DiaryEntry['visibility'],
  };
}

/**
 * 将DiaryEntry转换为数据库参数数组
 * 用于INSERT/UPDATE操作
 */
export function entryToParams(entry: Partial<DiaryEntry>): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  if (entry.title !== undefined) params.title = entry.title;
  if (entry.content !== undefined) params.content = entry.content;
  if (entry.emotion) {
    params.emotion_primary = entry.emotion.primary;
    params.emotion_secondary = entry.emotion.secondary ?? null;
    params.emotion_intensity = entry.emotion.intensity;
    params.emotion_confidence = entry.emotion.confidence;
  }
  if (entry.activities !== undefined) params.activities = JSON.stringify(entry.activities);
  if (entry.weather !== undefined) params.weather = entry.weather ?? null;
  if (entry.location !== undefined) params.location = entry.location ?? null;
  if (entry.photos !== undefined) params.photos = JSON.stringify(entry.photos);
  if (entry.voiceNote !== undefined) params.voice_note = entry.voiceNote ?? null;
  if (entry.relatedConversationId !== undefined) {
    params.related_conversation_id = entry.relatedConversationId ?? null;
  }
  if (entry.isFavorite !== undefined) params.is_favorite = entry.isFavorite ? 1 : 0;
  if (entry.tags !== undefined) params.tags = JSON.stringify(entry.tags);
  if (entry.visibility !== undefined) params.visibility = entry.visibility;

  return params;
}

/**
 * 生成UPDATE语句的SET子句和参数数组
 */
export function buildUpdateClause(params: Record<string, unknown>): {
  setClause: string;
  values: unknown[];
} {
  const fields = Object.keys(params);
  const values = Object.values(params);

  const setClause = fields.map((f) => `${f} = ?`).join(', ');

  return { setClause, values };
}
