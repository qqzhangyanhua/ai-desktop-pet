/**
 * Status Bar Component
 * 宠物状态显示条
 *
 * 显示 mood/energy/intimacy 三项属性的实时数值和进度条
 * 以及金币和等级信息
 *
 * Linus 准则: "消除特殊情况" - status 永远有值，无需 null 检查
 */

import { memo } from 'react';
import { usePetStatus } from '@/hooks/usePetStatus';
import { useEconomy } from '@/hooks/useEconomy';
import { useDrag } from '@/hooks/useDrag';
import { useConfigStore } from '@/stores';
import './StatusBar.css';

export const StatusBar = memo(function StatusBar() {
  const { status } = usePetStatus();
  const { coins, levelInfo } = useEconomy();
  const statusPanelVisible = useConfigStore((s) => s.config.appearance.statusPanelVisible);
  const { handleMouseDown } = useDrag();

  console.log('[StatusBar] statusPanelVisible:', statusPanelVisible);

  // 默认隐藏：仅在右键菜单显式开启时渲染
  if (!statusPanelVisible) return null;

  return (
    <div
      className="status-bar"
      onMouseDown={(e) => {
        e.stopPropagation();
        handleMouseDown(e);
      }}
      onMouseUp={(e) => {
        e.stopPropagation();
      }}
    >
      <div className="drag-indicator">
        <span className="drag-icon">⋮⋮</span>
        <span className="drag-hint">拖动移动</span>
      </div>
      <StatusItem
        label="心情"
        value={status.mood}
        color="#FFD93D"
      />
      <StatusItem
        label="精力"
        value={status.energy}
        color="#6BCB77"
      />
      <StatusItem
        label="亲密"
        value={status.intimacy}
        color="#FF6B9D"
      />
      <div className="status-divider" />
      <EconomyItem
        coins={coins}
        level={levelInfo.level}
        levelProgress={levelInfo.progress}
      />
    </div>
  );
});

interface StatusItemProps {
  label: string;
  value: number;
  color: string;
}

function StatusItem({ label, value, color }: StatusItemProps) {
  return (
    <div className="status-item">
      <div className="status-info">
        <div className="status-label">{label}</div>
        <div className="status-bar-bg">
          <div
            className="status-bar-fill"
            style={{
              width: `${value}%`,
              backgroundColor: color,
            }}
          />
        </div>
        <div className="status-value">{Math.round(value)}</div>
      </div>
    </div>
  );
}

interface EconomyItemProps {
  coins: number;
  level: number;
  levelProgress: number;
}

function EconomyItem({ coins, level, levelProgress }: EconomyItemProps) {
  return (
    <div className="status-economy">
      <div className="economy-item">
        <span className="economy-icon">💰</span>
        <span className="economy-value">{coins}</span>
      </div>
      <div className="economy-item">
        <span className="economy-icon">⭐</span>
        <span className="economy-value">Lv.{level}</span>
        <div className="economy-progress-bg">
          <div
            className="economy-progress-fill"
            style={{
              width: `${levelProgress * 100}%`,
              backgroundColor: '#a78bfa',
            }}
          />
        </div>
      </div>
    </div>
  );
}
