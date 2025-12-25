// 智能助手相关类型

export type AssistantSkill = 'weather' | 'time' | 'alarm' | 'lights' | 'pc_action' | 'habit';

export interface UserPreference {
  key: string;
  value: string;
  updatedAt: number;
}

export interface AlarmReminder {
  id: string;
  label: string;
  time: number;
  status: 'pending' | 'triggered';
}
