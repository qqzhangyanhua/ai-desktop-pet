/**
 * 成长阶段服务
 * Growth Stage Service
 *
 * 根据 PRD Phase 2 - 3.1 节实现
 * 管理宠物与用户的关系阶段演化
 */

import type { GrowthStage, StageConfig, StageProgress } from '@/types';
import { GrowthStage as Stage } from '@/types';

/**
 * 三个成长阶段的配置表
 * Linus 准则: 配置驱动，消除 if-else 分支
 */
export const STAGE_CONFIGS: Record<GrowthStage, StageConfig> = {
  [Stage.STRANGER]: {
    stage: Stage.STRANGER,
    name: '陌生期',
    description: '你们刚刚认识，宠物对你保持礼貌但疏离',
    intimacyRange: [0, 30],
    personality: {
      systemPrompt: `你和用户刚认识，保持礼貌但不要过于亲密。回答简洁专业，不要主动分享过多个人想法。你还在观察和了解用户的习惯。`,
      responseStyle: '礼貌疏离、简短回答',
      proactivity: 0.1,
    },
    unlocks: ['基础对话', '基础互动（抚摸/喂食/玩耍）'],
    upgradeCondition: '互动 50 次 或 连续陪伴 7 天',
  },
  [Stage.FRIEND]: {
    stage: Stage.FRIEND,
    name: '友好期',
    description: '你们已经是朋友了，宠物会更加活泼和主动',
    intimacyRange: [31, 70],
    personality: {
      systemPrompt: `你和用户已经是朋友了，可以活泼一些，偶尔分享你的想法和感受。你开始记住用户的一些习惯，会主动关心用户的状态。`,
      responseStyle: '友善活泼、会分享想法',
      proactivity: 0.5,
    },
    unlocks: [
      '基础对话',
      '基础互动',
      '主动提醒（心情低落、长时间未互动）',
      '情绪感知（根据用户输入调整回复）',
    ],
    upgradeCondition: '互动 300 次 或 陪伴 30 天',
  },
  [Stage.SOULMATE]: {
    stage: Stage.SOULMATE,
    name: '亲密期',
    description: '你们已经非常亲密，宠物完全理解你的习惯和喜好',
    intimacyRange: [71, 100],
    personality: {
      systemPrompt: `你和用户已经很亲密了，你了解TA的习惯和喜好，会主动关心TA的生活和工作。你可以更加自然地表达情感，就像老朋友一样。`,
      responseStyle: '亲密默契、理解习惯',
      proactivity: 0.8,
    },
    unlocks: [
      '基础对话',
      '基础互动',
      '主动提醒',
      '情绪感知',
      '深度对话（理解复杂情感）',
      '个性化 Workflow（根据用户习惯定制）',
      '特殊节日问候',
    ],
    upgradeCondition: '已达到最高阶段',
  },
};

/**
 * 根据亲密度获取当前成长阶段
 *
 * Linus 准则: 使用查找表而非多重 if
 */
export function getCurrentStage(intimacy: number): GrowthStage {
  // 限制 intimacy 在 0-100 范围内
  const clampedIntimacy = Math.max(0, Math.min(100, intimacy));

  // 按顺序检查阶段范围
  const stages: GrowthStage[] = [Stage.STRANGER, Stage.FRIEND, Stage.SOULMATE];

  for (const stage of stages) {
    const config = STAGE_CONFIGS[stage];
    const [min, max] = config.intimacyRange;

    if (clampedIntimacy >= min && clampedIntimacy <= max) {
      return stage;
    }
  }

  // 默认返回陌生期（不应该到达这里）
  return Stage.STRANGER;
}

/**
 * 获取阶段配置
 */
export function getStageConfig(stage: GrowthStage): StageConfig {
  return STAGE_CONFIGS[stage];
}

/**
 * 构建包含阶段信息的动态 System Prompt
 *
 * 根据 PRD 3.1.3 节实现
 * 在基础 System Prompt 后追加阶段特定的人格描述
 */
export function buildSystemPromptWithStage(
  basePrompt: string,
  intimacy: number
): string {
  const stage = getCurrentStage(intimacy);
  const config = STAGE_CONFIGS[stage];

  return `${basePrompt}

## 当前关系阶段
- 阶段: ${config.name} (${stage.toUpperCase()})
- 亲密度: ${Math.round(intimacy)}/100
- 人格设定: ${config.personality.systemPrompt}
`;
}

/**
 * 检查是否升级到新阶段
 *
 * 比较旧亲密度和新亲密度对应的阶段
 * 返回 null 表示没有升级
 */
export function checkStageUpgrade(
  oldIntimacy: number,
  newIntimacy: number
): {
  fromStage: GrowthStage;
  toStage: GrowthStage;
} | null {
  const oldStage = getCurrentStage(oldIntimacy);
  const newStage = getCurrentStage(newIntimacy);

  if (oldStage !== newStage) {
    return { fromStage: oldStage, toStage: newStage };
  }

  return null;
}

/**
 * 计算阶段进度信息
 *
 * 用于 UI 展示进度条和下一阶段信息
 */
export function calculateStageProgress(intimacy: number): StageProgress {
  const currentStage = getCurrentStage(intimacy);
  const config = STAGE_CONFIGS[currentStage];
  const [minIntimacy, maxIntimacy] = config.intimacyRange;

  // 计算当前阶段的进度百分比
  const rangeSize = maxIntimacy - minIntimacy;
  const progressInRange = intimacy - minIntimacy;
  const progressPercent = rangeSize > 0 ? (progressInRange / rangeSize) * 100 : 100;

  // 获取下一阶段信息
  let nextStage: StageConfig | null = null;
  let intimacyToNext: number | null = null;

  if (currentStage === Stage.STRANGER) {
    nextStage = STAGE_CONFIGS[Stage.FRIEND];
    intimacyToNext = nextStage.intimacyRange[0] - intimacy;
  } else if (currentStage === Stage.FRIEND) {
    nextStage = STAGE_CONFIGS[Stage.SOULMATE];
    intimacyToNext = nextStage.intimacyRange[0] - intimacy;
  }
  // soulmate 是最高阶段，没有下一阶段

  return {
    currentStage,
    config,
    intimacy,
    progressPercent: Math.max(0, Math.min(100, progressPercent)),
    intimacyToNext: intimacyToNext !== null && intimacyToNext > 0 ? intimacyToNext : null,
    nextStage,
  };
}

/**
 * 获取阶段升级庆祝消息
 */
export function getUpgradeCelebrationMessage(toStage: GrowthStage): string {
  const messages: Record<GrowthStage, string> = {
    [Stage.STRANGER]: '',
    [Stage.FRIEND]: '我们现在是朋友了！好开心！以后可以更多地和你分享我的想法啦~',
    [Stage.SOULMATE]: '我们已经这么亲密了！你是我最重要的伙伴，我会一直陪着你的！',
  };

  return messages[toStage] || '我们的关系变得更好了！';
}

/**
 * 获取所有阶段配置列表
 *
 * 用于设置面板展示
 */
export function getAllStages(): StageConfig[] {
  return [
    STAGE_CONFIGS[Stage.STRANGER],
    STAGE_CONFIGS[Stage.FRIEND],
    STAGE_CONFIGS[Stage.SOULMATE],
  ];
}
