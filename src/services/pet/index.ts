/**
 * Pet Services
 * 宠物服务模块导出
 */

// Status calculation and decay
export {
  calculateDecay,
  applyDecay,
  applyInteractionEffects,
  checkCooldown,
  getMoodLevel,
  getEnergyLevel,
  getIntimacyLevel,
} from './status';

// Interaction handling
export {
  handleInteraction,
  getInteractionConfig,
  getAllCooldowns,
  hasAvailableInteraction,
  getRecommendedInteraction,
} from './interaction';

// Emotion mapping
export {
  getMoodEmotion,
  shouldUpdateEmotion,
  getEmotionIntensity,
  getRecommendedInteractionByEmotion,
  getEmotionWithIntimacy,
} from './emotion';

// Growth stage management
export {
  STAGE_CONFIGS,
  getCurrentStage,
  getStageConfig,
  buildSystemPromptWithStage,
  checkStageUpgrade,
  calculateStageProgress,
  getUpgradeCelebrationMessage,
  getAllStages,
} from './growth';
