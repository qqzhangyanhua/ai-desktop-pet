import { useMemo } from 'react';
import { useCareStore } from '../../stores';
import '../settings/game-ui.css';

interface StatConfig {
  key: 'satiety' | 'energy' | 'hygiene' | 'mood' | 'boredom';
  label: string;
  color: string;
  reverse?: boolean;
}

const STAT_CONFIG: StatConfig[] = [
  { key: 'satiety', label: '饱腹', color: '#ffb74d' },
  { key: 'energy', label: '体力', color: '#4db6ac' },
  { key: 'hygiene', label: '清洁', color: '#64b5f6' },
  { key: 'mood', label: '心情', color: '#9575cd' },
  { key: 'boredom', label: '无聊', color: '#ef5350', reverse: true },
];

export function PetStatusPanel() {
  const satiety = useCareStore((state) => state.satiety);
  const energy = useCareStore((state) => state.energy);
  const hygiene = useCareStore((state) => state.hygiene);
  const mood = useCareStore((state) => state.mood);
  const boredom = useCareStore((state) => state.boredom);

  const warnings = useMemo(() => {
    const list: string[] = [];
    if (satiety < 35) list.push('喂食');
    if (hygiene < 40) list.push('清洁');
    if (energy < 35) list.push('休息');
    if (boredom > 70) list.push('陪玩');
    return list;
  }, [satiety, hygiene, energy, boredom]);

  return (
    <div className="game-status-panel no-drag">
      {STAT_CONFIG.map((item) => {
        const value =
          item.key === 'satiety'
            ? satiety
            : item.key === 'energy'
              ? energy
              : item.key === 'hygiene'
                ? hygiene
                : item.key === 'mood'
                  ? mood
                  : boredom;
        const displayValue = item.reverse ? 100 - value : value;
        return (
          <div key={item.key} className="game-status-row">
            <span className="game-status-label">{item.label}</span>
            <div className="game-status-bar-container">
              <div
                className="game-status-bar-fill"
                style={{
                  width: `${Math.round(displayValue)}%`,
                  background: item.color,
                }}
              />
            </div>
            <span className="game-status-value">{Math.round(value)}</span>
          </div>
        );
      })}
      {warnings.length > 0 && (
        <div className="game-status-warning">
          需要关注：{warnings.join(' / ')}
        </div>
      )}
    </div>
  );
}
