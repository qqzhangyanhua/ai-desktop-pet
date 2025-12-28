/**
 * PetCore Service Exports
 * 宠物核心服务导出
 */

export { default as PetCoreService } from './service';
export { StateManager, createInitialState } from './state-manager';
export {
  handleInteractionNew,
  checkCooldown,
  getAllCooldowns,
  hasAvailableInteraction,
  getRecommendedInteraction,
  applyDecay,
  getCurrentState,
  subscribeToStateChanges,
} from './interaction-handler';
export type { LegacyInteractionResult } from './interaction-handler';
export type {
  PetCoreState,
  InteractionEvent,
  StateTransitionEvent,
  StateChangeListener,
  InteractionConfig,
  InteractionResult,
  DecayConfig,
} from './types';

export { petCoreService } from './service';
