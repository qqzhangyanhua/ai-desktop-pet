/**
 * Memory Management Tab
 * 记忆管理标签页
 *
 * 功能：
 * - 查看所有记忆（支持分类筛选）
 * - 删除记忆
 * - 显示记忆统计信息
 */

import { useState, useEffect, useCallback } from 'react';
import { Brain, Trash2, RefreshCw, AlertCircle, CheckCircle2, Filter } from 'lucide-react';
import { getAllMemories, deleteMemory, getMemoriesByCategory, cleanupMemories } from '@/services/database/memory';
import { useUserProfileStore } from '@/stores';
import type { LongTermMemory, MemoryCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { toast } from '@/stores/toastStore';

const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  preference: '偏好',
  event: '事件',
  habit: '习惯',
};

const CATEGORY_COLORS: Record<MemoryCategory, string> = {
  preference: '#F472B6',
  event: '#60A5FA',
  habit: '#34D399',
};

const IMPORTANCE_COLORS: Record<number, string> = {
  1: '#94A3B8',
  2: '#94A3B8',
  3: '#94A3B8',
  4: '#94A3B8',
  5: '#FBBF24',
  6: '#FBBF24',
  7: '#F97316',
  8: '#F97316',
  9: '#EF4444',
  10: '#EF4444',
};

interface MemoryStats {
  total: number;
  byCategory: Record<MemoryCategory, number>;
  avgImportance: number;
}

export function MemoryTab() {
  const { profile } = useUserProfileStore();
  const [memories, setMemories] = useState<LongTermMemory[]>([]);
  const [filter, setFilter] = useState<'all' | MemoryCategory>('all');
  const [stats, setStats] = useState<MemoryStats>({
    total: 0,
    byCategory: { preference: 0, event: 0, habit: 0 },
    avgImportance: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Load memories
  const loadMemories = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = filter === 'all'
        ? await getAllMemories(100)
        : await getMemoriesByCategory(filter, 100);

      setMemories(data);

      // Calculate stats
      const byCategory: Record<MemoryCategory, number> = {
        preference: 0,
        event: 0,
        habit: 0,
      };

      let totalImportance = 0;
      data.forEach((m) => {
        byCategory[m.category]++;
        totalImportance += m.importance;
      });

      setStats({
        total: data.length,
        byCategory,
        avgImportance: data.length > 0 ? Math.round(totalImportance / data.length) : 0,
      });
    } catch (error) {
      console.error('[MemoryTab] Failed to load memories:', error);
      toast.error('加载记忆失败');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  // Initial load
  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  // Delete memory
  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingIds((prev) => new Set(prev).add(id));

      try {
        await deleteMemory(id);
        await loadMemories();
        toast.success('记忆已删除');
      } catch (error) {
        console.error('[MemoryTab] Failed to delete memory:', error);
        toast.error('删除失败');
      } finally {
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [loadMemories]
  );

  // Cleanup old memories
  const handleCleanup = useCallback(async () => {
    try {
      const count = await cleanupMemories();
      if (count > 0) {
        await loadMemories();
        toast.success(`已清理 ${count} 条旧记忆`);
      } else {
        toast.info('没有需要清理的记忆');
      }
    } catch (error) {
      console.error('[MemoryTab] Failed to cleanup memories:', error);
      toast.error('清理失败');
    }
  }, [loadMemories]);

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return '今天';
    } else if (diffDays === 1) {
      return '昨天';
    } else if (diffDays < 7) {
      return `${diffDays} 天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  };

  return (
    <div className="space-y-6">
      {/* 用户信息卡片 */}
      <div className="settings-section">
        <div className="settings-section-title">
          <Brain className="w-5 h-5 mr-2" />
          用户画像
        </div>
        <div className="settings-row">
          <span className="settings-label">昵称</span>
          <span className="font-medium">{profile.nickname}</span>
        </div>
        <div className="settings-row">
          <span className="settings-label">作息时间</span>
          <span className="text-gray-600">
            {profile.wakeUpHour}:00 - {profile.sleepHour}:00
          </span>
        </div>
        <div className="settings-row">
          <span className="settings-label">兴趣话题</span>
          <span className="text-gray-600">
            {profile.preferredTopics.length > 0
              ? profile.preferredTopics.join('、')
              : '暂无'}
          </span>
        </div>
      </div>

      {/* 记忆统计卡片 */}
      <div className="settings-section">
        <div className="settings-section-title">记忆统计</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-500">{stats.total}</div>
            <div className="text-sm text-gray-500">总记忆数</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-pink-500">{stats.byCategory.preference}</div>
            <div className="text-sm text-gray-500">偏好</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-500">{stats.byCategory.event}</div>
            <div className="text-sm text-gray-500">事件</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-500">{stats.byCategory.habit}</div>
            <div className="text-sm text-gray-500">习惯</div>
          </div>
        </div>
      </div>

      {/* 记忆列表 */}
      <div className="settings-section">
        <div className="settings-section-title">记忆列表</div>

        {/* 筛选器 */}
        <div className="settings-row">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="settings-label">筛选</span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              全部
            </Button>
            <Button
              size="sm"
              variant={filter === 'preference' ? 'default' : 'outline'}
              onClick={() => setFilter('preference')}
            >
              偏好
            </Button>
            <Button
              size="sm"
              variant={filter === 'event' ? 'default' : 'outline'}
              onClick={() => setFilter('event')}
            >
              事件
            </Button>
            <Button
              size="sm"
              variant={filter === 'habit' ? 'default' : 'outline'}
              onClick={() => setFilter('habit')}
            >
              习惯
            </Button>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2 mt-4">
          <Button size="sm" variant="outline" onClick={loadMemories} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCleanup}
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            清理旧记忆
          </Button>
        </div>

        {/* 记忆列表 */}
        {memories.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Brain className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p>{filter === 'all' ? '还没有任何记忆' : '该分类下没有记忆'}</p>
            <p className="text-sm mt-2">和{profile.nickname}多聊天，我会记住重要的事情哦~</p>
          </div>
        ) : (
          <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
            {memories.map((memory) => (
              <div
                key={memory.id}
                className="game-list-item flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {/* 类别标签 */}
                <div
                  className="px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap"
                  style={{ backgroundColor: CATEGORY_COLORS[memory.category] }}
                >
                  {CATEGORY_LABELS[memory.category]}
                </div>

                {/* 记忆内容 */}
                <div className="flex-1 min-w-0">
                  <p className="text-gray-800 break-words">{memory.content}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                    <span>重要度: {memory.importance}/10</span>
                    <span>访问 {memory.accessCount} 次</span>
                    <span>{formatDate(memory.createdAt)}</span>
                  </div>
                </div>

                {/* 重要性指示器 */}
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
                  style={{ backgroundColor: IMPORTANCE_COLORS[memory.importance] }}
                  title={`重要度: ${memory.importance}/10`}
                />

                {/* 删除按钮 */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(memory.id)}
                  disabled={deletingIds.has(memory.id)}
                >
                  <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 隐私提示 */}
      <div className="game-alert mt-6">
        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
        <div className="flex-1">
          <div className="font-medium">隐私保护</div>
          <div className="text-sm text-gray-600 mt-1">
            所有记忆仅存储在本地，不会上传到云端。您可以随时删除任何记忆。
            记忆用于让{profile.nickname}更好地了解{profile.nickname}。
          </div>
        </div>
      </div>
    </div>
  );
}
