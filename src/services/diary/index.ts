/**
 * Diary Service Exports
 * 日记服务导出
 */

export {
  EmotionDiaryService,
  getEmotionDiaryService,
  destroyEmotionDiaryService,
} from './emotion-diary';

export type {
  DiaryEntry,
  DiaryStatistics,
  EmotionTrendReport,
  DiaryQueryOptions,
  DiaryCreateOptions,
  DiaryUpdateOptions,
  DiaryShareOptions,
  DiaryCallbacks,
} from '@/types/emotion-diary';
