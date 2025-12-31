/**
 * Mini Status Bar Component
 * 迷你状态条组件
 *
 * 悬停时显示宠物核心状态（饱腹、精力、心情）
 * 低于30%显示红色警告，点击可触发对应互动
 */

import { memo } from 'react';
import { Utensils, Zap, Heart } from 'lucide-react';
import type { PetCareStats, InteractionType } from '@/types';
import './MiniStatusBar.css';

interface MiniStatusBarProps {
  /** 宠物状态数据 */
  stats: PetCareStats;
  /** 是否可见 */
  visible: boolean;
  /** 状态行点击回调 */
  onStatClick?: (type: InteractionType) => void;
}

/** 警告阈值 */
const WARNING_THRESHOLD = 30;

/**
 * 状态行配置
 */
interface StatConfig {
  key: 'satiety' | 'energy' | 'mood';
  label: string;
  icon: typeof Utensils;
  interactionType: InteractionType;
}

const STAT_CONFIGS: StatConfig[] = [
  { key: 'satiety', label: '饱腹', icon: Utensils, interactionType: 'feed' },
  { key: 'energy', label: '精力', icon: Zap, interactionType: 'pet' },
  { key: 'mood', label: '心情', icon: Heart, interactionType: 'play' },
];

/**
 * 单行状态条
 */
const StatusRow = memo(function StatusRow({
  config,
  value,
  onClick,
}: {
  config: StatConfig;
  value: number;
  onClick?: () => void;
}) {
  const Icon = config.icon;
  const isWarning = value < WARNING_THRESHOLD;
  const percentage = Math.max(0, Math.min(100, value));

  const fillClassName = [
    'mini-status-bar-fill',
    isWarning
      ? 'mini-status-bar-fill--warning'
      : `mini-status-bar-fill--${config.key}`,
  ].join(' ');

  const valueClassName = [
    'mini-status-value',
    isWarning ? 'mini-status-value--warning' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const rowClassName = [
    'mini-status-row',
    onClick ? 'mini-status-row--clickable no-drag' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={rowClassName}
      onClick={onClick}
      title={`${config.label}: ${percentage}%${onClick ? ' (点击互动)' : ''}`}
    >
      <div className="mini-status-icon">
        <Icon size={14} />
      </div>
      <div className="mini-status-bar-container">
        <div
          className={fillClassName}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={valueClassName}>{Math.round(percentage)}%</span>
    </div>
  );
});

/**
 * 迷你状态条组件
 */
export const MiniStatusBar = memo(function MiniStatusBar({
  stats,
  visible,
  onStatClick,
}: MiniStatusBarProps) {
  const barClassName = [
    'mini-status-bar',
    visible ? 'mini-status-bar--visible' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="mini-status-bar-wrapper">
      <div className={barClassName}>
        {STAT_CONFIGS.map((config) => (
          <StatusRow
            key={config.key}
            config={config}
            value={stats[config.key]}
            onClick={
              onStatClick
                ? () => onStatClick(config.interactionType)
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
});

export default MiniStatusBar;
