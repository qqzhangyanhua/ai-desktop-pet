/**
 * Statistics Panel Component
 * 统计面板组件 - 展示互动数据和成就
 */

import { useState, useEffect } from 'react';
import type { StatsSummary, Achievement } from '@/types';
import { getStatsSummary } from '@/services/statistics';
import {
  getAchievements,
  getAchievementStatistics,
} from '@/services/achievements';

export function StatsPanel() {
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [achievementStats, setAchievementStats] = useState({
    total: 0,
    unlocked: 0,
    percentage: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeAchievementTab, setActiveAchievementTab] = useState<
    'all' | 'unlocked' | 'locked'
  >('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [summaryData, achievementsData, achievementStatsData] =
        await Promise.all([
          getStatsSummary(),
          getAchievements(),
          getAchievementStatistics(),
        ]);

      setStats(summaryData);
      setAchievements(achievementsData);
      setAchievementStats(achievementStatsData);
    } catch (error) {
      console.error('[StatsPanel] Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAchievements = achievements.filter((a) => {
    if (activeAchievementTab === 'unlocked') return a.isUnlocked;
    if (activeAchievementTab === 'locked') return !a.isUnlocked;
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-500">无法加载统计数据</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 统计摘要 */}
      <section>
        <h3 className="text-lg font-semibold mb-4 text-gray-800">统计概览</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon="📅"
            label="陪伴天数"
            value={stats.totalDays}
            suffix="天"
          />
          <StatCard
            icon="✨"
            label="总互动次数"
            value={stats.totalInteractions}
            suffix="次"
          />
          <StatCard
            icon="🔥"
            label="连续互动"
            value={stats.consecutiveDays}
            suffix="天"
          />
          <StatCard
            icon="🎯"
            label="本周活跃"
            value={stats.weeklyActiveDays}
            suffix="天"
          />
        </div>
      </section>

      {/* 今日互动 */}
      <section>
        <h3 className="text-lg font-semibold mb-4 text-gray-800">今日互动</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InteractionCard icon="👋" label="抚摸" count={stats.today.pet} />
          <InteractionCard icon="🍱" label="喂食" count={stats.today.feed} />
          <InteractionCard icon="🎮" label="玩耍" count={stats.today.play} />
          <InteractionCard icon="💬" label="对话" count={stats.today.chat} />
        </div>
      </section>

      {/* 成就系统 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">成就</h3>
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-blue-600">
              {achievementStats.unlocked}
            </span>
            <span className="mx-1">/</span>
            <span>{achievementStats.total}</span>
            <span className="ml-2 text-gray-500">
              ({achievementStats.percentage.toFixed(0)}%)
            </span>
          </div>
        </div>

        {/* 成就进度条 */}
        <div className="mb-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
              style={{ width: `${achievementStats.percentage}%` }}
            />
          </div>
        </div>

        {/* 成就过滤标签 */}
        <div className="flex gap-2 mb-4">
          <AchievementTab
            active={activeAchievementTab === 'all'}
            onClick={() => setActiveAchievementTab('all')}
            label="全部"
            count={achievements.length}
          />
          <AchievementTab
            active={activeAchievementTab === 'unlocked'}
            onClick={() => setActiveAchievementTab('unlocked')}
            label="已解锁"
            count={achievementStats.unlocked}
          />
          <AchievementTab
            active={activeAchievementTab === 'locked'}
            onClick={() => setActiveAchievementTab('locked')}
            label="未解锁"
            count={achievementStats.total - achievementStats.unlocked}
          />
        </div>

        {/* 成就列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
          {filteredAchievements.map((achievement) => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
            />
          ))}
        </div>

        {filteredAchievements.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {activeAchievementTab === 'unlocked'
              ? '还没有解锁任何成就'
              : '没有找到成就'}
          </div>
        )}
      </section>
    </div>
  );
}

interface StatCardProps {
  icon: string;
  label: string;
  value: number;
  suffix?: string;
}

function StatCard({ icon, label, value, suffix }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-800">
        {value}
        {suffix && <span className="text-sm font-normal ml-1">{suffix}</span>}
      </div>
    </div>
  );
}

interface InteractionCardProps {
  icon: string;
  label: string;
  count: number;
}

function InteractionCard({ icon, label, count }: InteractionCardProps) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <div className="text-2xl font-bold text-blue-600">{count}</div>
    </div>
  );
}

interface AchievementTabProps {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}

function AchievementTab({ active, onClick, label, count }: AchievementTabProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-blue-500 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {label} ({count})
    </button>
  );
}

interface AchievementCardProps {
  achievement: Achievement;
}

function AchievementCard({ achievement }: AchievementCardProps) {
  const typeColors = {
    interaction: 'bg-blue-100 text-blue-700 border-blue-300',
    duration: 'bg-green-100 text-green-700 border-green-300',
    intimacy: 'bg-pink-100 text-pink-700 border-pink-300',
    special: 'bg-purple-100 text-purple-700 border-purple-300',
  };

  const typeLabels = {
    interaction: '互动',
    duration: '陪伴',
    intimacy: '亲密',
    special: '特殊',
  };

  const colorClass = typeColors[achievement.type];

  return (
    <div
      className={`rounded-lg p-4 border ${
        achievement.isUnlocked
          ? 'bg-white border-gray-200'
          : 'bg-gray-50 border-gray-300 opacity-60'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`text-3xl ${
            achievement.isUnlocked ? '' : 'grayscale opacity-50'
          }`}
        >
          {achievement.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4
              className={`font-semibold text-sm ${
                achievement.isUnlocked ? 'text-gray-800' : 'text-gray-500'
              }`}
            >
              {achievement.name}
            </h4>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}
            >
              {typeLabels[achievement.type]}
            </span>
          </div>
          <p className="text-xs text-gray-600 mb-2">
            {achievement.description}
          </p>
          {achievement.isUnlocked && achievement.unlockedAt && (
            <p className="text-xs text-gray-500">
              解锁于{' '}
              {new Date(achievement.unlockedAt).toLocaleDateString('zh-CN')}
            </p>
          )}
          {!achievement.isUnlocked && (
            <p className="text-xs text-gray-500 italic">
              {achievement.unlockCondition}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
