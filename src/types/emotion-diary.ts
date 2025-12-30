/**
 * Emotional Diary Types
 * 情感日记类型定义
 */

/**
 * 日记条目
 */
export interface DiaryEntry {
  /** 唯一ID */
  id: string;
  /** 创建时间戳 */
  createdAt: number;
  /** 最后修改时间戳 */
  updatedAt: number;
  /** 日记标题 */
  title: string;
  /** 日记内容 */
  content: string;
  /** 情绪标签 */
  emotion: {
    /** 主导情绪 */
    primary: string;
    /** 次要情绪（可选） */
    secondary?: string;
    /** 情绪强度 (0-1) */
    intensity: number;
    /** 情绪置信度 (0-1) */
    confidence: number;
  };
  /** 活动标签 */
  activities: string[];
  /** 天气 */
  weather?: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy' | 'foggy';
  /** 地点 */
  location?: string;
  /** 照片URL */
  photos?: string[];
  /** 语音备注（音频URL） */
  voiceNote?: string;
  /** 关联的对话ID */
  relatedConversationId?: string;
  /** 是否收藏 */
  isFavorite: boolean;
  /** 标签 */
  tags: string[];
  /** 可见性 */
  visibility: 'private' | 'shared' | 'public';
}

/**
 * 日记统计
 */
export interface DiaryStatistics {
  /** 总条目数 */
  totalEntries: number;
  /** 本月条目数 */
  entriesThisMonth: number;
  /** 本周条目数 */
  entriesThisWeek: number;
  /** 连续记录天数 */
  streakDays: number;
  /** 最常见情绪 */
  topEmotions: Array<{
    emotion: string;
    count: number;
    percentage: number;
  }>;
  /** 最常见活动 */
  topActivities: Array<{
    activity: string;
    count: number;
  }>;
  /** 情绪分布（按日期） */
  emotionTimeline: Array<{
    date: string;
    emotion: string;
    intensity: number;
  }>;
}

/**
 * 情绪趋势报告
 */
export interface EmotionTrendReport {
  /** 报告ID */
  id: string;
  /** 报告类型 */
  type: 'weekly' | 'monthly' | 'custom';
  /** 开始日期 */
  startDate: string;
  /** 结束日期 */
  endDate: string;
  /** 生成时间 */
  generatedAt: number;
  /** 情绪趋势 */
  trends: {
    /** 整体情绪趋势 */
    overall: 'improving' | 'stable' | 'declining';
    /** 每日情绪评分 */
    dailyScores: Array<{
      date: string;
      score: number;
    }>;
    /** 情绪变化图 */
    emotionChanges: Array<{
      date: string;
      from: string;
      to: string;
    }>;
  };
  /** 情绪统计 */
  statistics: {
    /** 主导情绪 */
    dominantEmotion: string;
    /** 平均情绪强度 */
    averageIntensity: number;
    /** 情绪多样性（熵） */
    emotionDiversity: number;
  };
  /** 洞察和建议 */
  insights: {
    /** 发现的模式 */
    patterns: string[];
    /** 建议 */
    recommendations: string[];
  };
}

/**
 * 日记查询选项
 */
export interface DiaryQueryOptions {
  /** 开始日期 */
  startDate?: Date;
  /** 结束日期 */
  endDate?: Date;
  /** 情绪过滤 */
  emotion?: string;
  /** 标签过滤 */
  tags?: string[];
  /** 活动过滤 */
  activities?: string[];
  /** 是否只看收藏 */
  favoritesOnly?: boolean;
  /** 搜索关键词 */
  keyword?: string;
  /** 排序方式 */
  sortBy?: 'date' | 'emotion' | 'intensity';
  /** 排序顺序 */
  sortOrder?: 'asc' | 'desc';
  /** 分页 */
  limit?: number;
  offset?: number;
}

/**
 * 日记创建选项
 */
export interface DiaryCreateOptions {
  /** 标题 */
  title: string;
  /** 内容 */
  content: string;
  /** 情绪 */
  emotion: DiaryEntry['emotion'];
  /** 活动标签 */
  activities?: string[];
  /** 天气 */
  weather?: DiaryEntry['weather'];
  /** 地点 */
  location?: string;
  /** 照片 */
  photos?: string[];
  /** 语音备注 */
  voiceNote?: string;
  /** 关联的对话ID */
  relatedConversationId?: string;
  /** 标签 */
  tags?: string[];
  /** 可见性 */
  visibility?: DiaryEntry['visibility'];
}

/**
 * 日记更新选项
 */
export type DiaryUpdateOptions = Partial<DiaryCreateOptions> & {
  /** 是否收藏 */
  isFavorite?: boolean;
};

/**
 * 日记分享选项
 */
export interface DiaryShareOptions {
  /** 日记ID */
  entryId: string;
  /** 分享平台 */
  platform: 'twitter' | 'facebook' | 'weibo' | 'link';
  /** 是否包含照片 */
  includePhotos?: boolean;
  /** 自定义消息 */
  customMessage?: string;
}

/**
 * 情感日记服务回调
 */
export interface DiaryCallbacks {
  /** 日记创建完成 */
  onEntryCreated?: (entry: DiaryEntry) => void;
  /** 日记更新完成 */
  onEntryUpdated?: (entry: DiaryEntry) => void;
  /** 日记删除完成 */
  onEntryDeleted?: (entryId: string) => void;
  /** 情绪统计更新 */
  onStatisticsUpdated?: (stats: DiaryStatistics) => void;
}

/**
 * 数据库行类型定义
 * Database row types - 与SQLite表结构对应
 */

/** 日记条目数据库行类型 */
export interface DiaryEntryRow {
  id: string;
  created_at: number;
  updated_at: number;
  title: string;
  content: string;
  emotion_primary: string;
  emotion_secondary: string | null;
  emotion_intensity: number;
  emotion_confidence: number;
  activities: string;
  weather: string | null;
  location: string | null;
  photos: string;
  voice_note: string | null;
  related_conversation_id: string | null;
  is_favorite: number;
  tags: string;
  visibility: string;
}
