/**
 * PetCore Service Exports
 * 宠物核心服务导出
 *
 * P2-1-E: Cleaned up - removed StateManager (deprecated)
 * TODO P2-1-F: Will update examples to not use PetCoreService
 */

export { default as PetCoreService, petCoreService } from './service';
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
