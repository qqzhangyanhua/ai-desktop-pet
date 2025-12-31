/**
 * Message Generator
 * 关怀消息生成器
 *
 * P1-4: Extracted from care-engine.ts (705 lines)
 * Linus原则: 配置驱动 - 所有消息模板集中管理
 */

import type { CareOpportunity } from '../types';
import type { MessageTemplate, GeneratedCareMessage } from './types';

/**
 * 消息模板库
 */
const MESSAGE_TEMPLATES: Record<CareOpportunity['type'], MessageTemplate[]> = {
  low_mood: [
    {
      tone: 'supportive',
      title: '需要陪伴',
      message: '我注意到你心情不太好，需要我陪陪你吗？',
    },
    {
      tone: 'supportive',
      title: '我在这里',
      message: '不管怎样，我都在这里陪着你。要聊聊吗？',
    },
  ],
  high_stress: [
    {
      tone: 'gentle',
      title: '休息一下吧',
      message: '你看起来压力很大，建议休息一下。试试深呼吸或简单的伸展运动？',
    },
    {
      tone: 'gentle',
      title: '放松时刻',
      message: '工作再重要，也没有你的健康重要。稍微休息一下吧？',
    },
  ],
  long_work: [
    {
      tone: 'gentle',
      title: '工作时间过长',
      message: '已经连续工作很久了，休息一下吧！你的健康很重要。',
    },
    {
      tone: 'gentle',
      title: '该休息了',
      message: '长时间工作会让人疲惫，给自己一点休息时间吧？',
    },
  ],
  low_energy: [
    {
      tone: 'gentle',
      title: '补充能量',
      message: '看起来有点累，要不要喝杯水或吃个小点心？',
    },
    {
      tone: 'gentle',
      title: '恢复精力',
      message: '需要充电啦！补充能量后再继续吧～',
    },
  ],
  break_reminder: [
    {
      tone: 'gentle',
      title: '休息时间',
      message: '起来活动一下吧，久坐对身体不好哦！',
    },
    {
      tone: 'gentle',
      title: '动一动',
      message: '花几分钟伸展一下，缓解疲劳吧！',
    },
  ],
  health_warning: [
    {
      tone: 'urgent',
      title: '健康提醒',
      message: '长时间的紧张工作可能影响健康，请注意劳逸结合！',
    },
    {
      tone: 'urgent',
      title: '注意身体',
      message: '你的健康比任何工作都重要，请务必注意休息！',
    },
  ],
  emotional_support: [
    {
      tone: 'supportive',
      title: '需要支持',
      message: '我在这里陪着你。如果需要聊天或只是静静坐着，我都在。',
    },
    {
      tone: 'supportive',
      title: '我理解你',
      message: '我知道有时候会感到困难，但请记住，你并不孤单。',
    },
  ],
  achievement_celebration: [
    {
      tone: 'celebratory',
      title: '太棒了！',
      message: '我为你感到高兴！继续保持这种积极的状态！',
    },
    {
      tone: 'celebratory',
      title: '做得好！',
      message: '你的努力有回报了！为你骄傲！',
    },
  ],
  breathing_exercise: [
    {
      tone: 'gentle',
      title: '呼吸放松',
      message: '来做个简单的呼吸练习吧，只需要几分钟就能帮你放松身心。',
    },
    {
      tone: 'gentle',
      title: '深呼吸',
      message: '试试4-7-8呼吸法，跟着我一起调整呼吸，缓解压力。',
    },
  ],
  bedtime_story: [
    {
      tone: 'gentle',
      title: '睡前故事',
      message: '夜深了，要不要听个温馨的故事帮助入睡？',
    },
    {
      tone: 'gentle',
      title: '晚安时光',
      message: '我准备了一些轻松的故事，陪你度过安静的夜晚。',
    },
  ],
  meditation_suggestion: [
    {
      tone: 'gentle',
      title: '冥想时刻',
      message: '花几分钟冥想一下吧，让心灵得到片刻宁静。',
    },
    {
      tone: 'gentle',
      title: '正念练习',
      message: '我们来做个简短的正念练习，帮你重新集中注意力。',
    },
  ],
};

/**
 * 消息生成器类
 */
export class MessageGenerator {
  private userPreferences: Map<string, number> = new Map();

  /**
   * 生成关怀消息
   */
  generate(opportunity: CareOpportunity): GeneratedCareMessage {
    const templates = this.getTemplates(opportunity.type);
    const selected = this.selectBestTemplate(templates, opportunity);
    return this.personalize(selected, opportunity);
  }

  /**
   * 获取消息模板
   */
  private getTemplates(type: CareOpportunity['type']): MessageTemplate[] {
    return MESSAGE_TEMPLATES[type] || [];
  }

  /**
   * 选择最佳模板
   */
  private selectBestTemplate(
    templates: MessageTemplate[],
    _opportunity: CareOpportunity
  ): MessageTemplate {
    // 简化：随机选择或根据用户偏好选择
    const template = templates[Math.floor(Math.random() * templates.length)];
    if (!template) {
      return {
        tone: 'gentle',
        title: '关怀',
        message: '我在这里陪着你',
      };
    }
    return template;
  }

  /**
   * 个性化消息
   */
  private personalize(
    template: MessageTemplate,
    opportunity: CareOpportunity
  ): GeneratedCareMessage {
    // 这里可以添加个性化逻辑
    // 例如：根据用户历史反馈调整语调

    return {
      title: template.title,
      message: template.message,
      action: opportunity.suggestion.action,
      tone: template.tone,
    };
  }

  /**
   * 学习用户偏好
   */
  learnPreference(opportunityId: string, rating: number): void {
    const currentRating = this.userPreferences.get(opportunityId) || 0;
    const newRating = (currentRating + rating) / 2; // 平均值
    this.userPreferences.set(opportunityId, newRating);
  }
}
