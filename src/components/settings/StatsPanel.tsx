/**
 * Statistics Panel Component
 * 统计面板组件 - 展示互动数据和成就
 */

import { useState, useEffect } from 'react';
import { Calendar, Sparkles, Flame, Target, Hand, Utensils, Gamepad2, MessageSquare, type LucideIcon } from 'lucide-react';
import type { StatsSummary, Achievement } from '@/types';
import { getStatsSummary } from '@/services/statistics';
import {
  getAchievements,
  getAchievementStatistics,
} from '@/services/achievements';
import { getAchievementIcon } from '@/utils/achievement-icons';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  suffix?: string;
}

function StatCard({ icon: Icon, label, value, suffix }: StatCardProps) {
  return (
    <div className="bg-[#FFF8DC] rounded-lg p-4 border border-amber-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-2">
        <Icon className="w-6 h-6 text-amber-700" />
      </div>
      <div className="text-sm text-amber-800 mb-1 font-bold">{label}</div>
      <div className="text-2xl font-bold text-amber-900">
        {value}
        {suffix && <span className="text-sm font-normal ml-1">{suffix}</span>}
      </div>
    </div>
  );
}

interface InteractionCardProps {
  icon: LucideIcon;
  label: string;
  count: number;
}

function InteractionCard({ icon: Icon, label, count }: InteractionCardProps) {
  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-5 h-5 text-amber-700" />
        <span className="text-sm font-bold text-amber-800">{label}</span>
      </div>
      <div className="text-2xl font-bold text-amber-600">{count}</div>
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
      className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all border-b-4 active:border-b-0 active:translate-y-1 ${
        active
          ? 'bg-amber-500 text-white border-amber-700 shadow-md'
          : 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
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

  // 获取成就图标组件
  const AchievementIcon = getAchievementIcon(achievement.icon);

  return (
    <div
      className={`rounded-lg p-4 border-2 transition-all ${
        achievement.isUnlocked
          ? 'bg-[#FFF8DC] border-amber-300 shadow-sm'
          : 'bg-gray-100 border-gray-200 opacity-60 grayscale'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex items-center justify-center w-12 h-12 rounded-lg ${
            achievement.isUnlocked ? 'bg-amber-100' : 'bg-gray-200'
          }`}
        >
          {AchievementIcon && (
            <AchievementIcon
              className={`w-6 h-6 ${
                achievement.isUnlocked ? 'text-amber-600' : 'text-gray-400'
              }`}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4
              className={`font-bold text-sm ${
                achievement.isUnlocked ? 'text-amber-900' : 'text-gray-500'
              }`}
            >
              {achievement.name}
            </h4>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${colorClass}`}
            >
              {typeLabels[achievement.type]}
            </span>
          </div>
          <p className="text-xs text-amber-800/80 mb-2 font-medium">
            {achievement.description}
          </p>
          {achievement.isUnlocked && achievement.unlockedAt && (
            <p className="text-[10px] text-amber-700/60 font-mono">
              解锁于{' '}
              {new Date(achievement.unlockedAt).toLocaleDateString('zh-CN')}
            </p>
          )}
          {!achievement.isUnlocked && (
            <p className="text-[10px] text-gray-500 italic">
              {achievement.unlockCondition}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

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
      <div className="flex items-center justify-center p-12 h-full">
        <div className="text-amber-800 font-bold animate-pulse">正在读取记忆水晶...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center p-12 h-full">
        <div className="text-amber-800 font-bold">记忆读取失败</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-2">
      {/* 统计摘要 */}
      <section>
        <h3 className="text-lg font-bold mb-4 text-amber-900 border-b-2 border-amber-200 pb-2 inline-block">统计概览</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Calendar}
            label="陪伴天数"
            value={stats.totalDays}
            suffix="天"
          />
          <StatCard
            icon={Sparkles}
            label="总互动次数"
            value={stats.totalInteractions}
            suffix="次"
          />
          <StatCard
            icon={Flame}
            label="连续互动"
            value={stats.consecutiveDays}
            suffix="天"
          />
          <StatCard
            icon={Target}
            label="本周活跃"
            value={stats.weeklyActiveDays}
            suffix="天"
          />
        </div>
      </section>

      {/* 今日互动 */}
      <section>
        <h3 className="text-lg font-bold mb-4 text-amber-900 border-b-2 border-amber-200 pb-2 inline-block">今日互动</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InteractionCard icon={Hand} label="抚摸" count={stats.today.pet} />
          <InteractionCard icon={Utensils} label="喂食" count={stats.today.feed} />
          <InteractionCard icon={Gamepad2} label="玩耍" count={stats.today.play} />
          <InteractionCard icon={MessageSquare} label="对话" count={stats.today.chat} />
        </div>
      </section>

      {/* 成就系统 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-amber-900 border-b-2 border-amber-200 pb-2 inline-block">成就系统</h3>
          <div className="text-sm font-bold bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
            <span className="text-amber-700">解锁进度:</span>
            <span className="ml-2 text-amber-900">{achievementStats.unlocked} / {achievementStats.total}</span>
            <span className="ml-1 text-amber-600">({achievementStats.percentage.toFixed(0)}%)</span>
          </div>
        </div>

        {/* 成就进度条 */}
        <div className="mb-6 px-1">
          <div className="h-4 bg-amber-100/50 rounded-full overflow-hidden border border-amber-200 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500 relative"
              style={{ width: `${achievementStats.percentage}%` }}
            >
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20"></div>
            </div>
          </div>
        </div>

        {/* 成就过滤标签 */}
        <div className="flex gap-3 mb-4">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 game-scrollbar">
          {filteredAchievements.map((achievement) => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
            />
          ))}
        </div>

        {filteredAchievements.length === 0 && (
          <div className="text-center py-12 text-amber-800/50 italic border-2 border-dashed border-amber-200 rounded-lg bg-amber-50/30">
            {activeAchievementTab === 'unlocked'
              ? '还没有解锁任何成就，继续探索吧！'
              : '空空如也...'}
          </div>
        )}
      </section>
    </div>
  );
}
