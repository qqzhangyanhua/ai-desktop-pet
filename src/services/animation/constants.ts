import type { InteractionZone, MicroInteractionConfig } from './types';

/**
 * 默认配置
 */
export const DEFAULT_MICRO_INTERACTION_CONFIG: MicroInteractionConfig = {
  enabled: true,
  hoverDelay: 100,
  responseDelay: 50,
  cooldownEnabled: true,
  cooldownDuration: 2000,
  showRipple: true,
  showParticles: true,
  playSound: false,
};

/**
 * 互动区域定义（基于宠物模型）
 */
export const PET_INTERACTION_ZONES: InteractionZone[] = [
  {
    id: 'head',
    name: '头部',
    x: 0.2,
    y: 0.05,
    width: 0.6,
    height: 0.3,
  },
  {
    id: 'body',
    name: '身体',
    x: 0.25,
    y: 0.35,
    width: 0.5,
    height: 0.35,
  },
  {
    id: 'feet',
    name: '脚部',
    x: 0.3,
    y: 0.7,
    width: 0.4,
    height: 0.25,
  },
];
