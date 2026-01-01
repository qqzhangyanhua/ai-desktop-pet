// 智能助手相关类型

export type AssistantSkill = 'weather' | 'time' | 'alarm' | 'lights' | 'pc_action' | 'habit';

/** PC操作类型 */
export type PcActionType = 'open_url' | 'open_app' | 'copy' | 'search';

/** 技能调用参数 */
export interface SkillPayload {
  /** 天气查询城市 */
  city?: string;
  /** 灯光开关状态 */
  light?: 'on' | 'off';
  /** PC操作类型 */
  pcAction?: PcActionType;
  /** PC操作目标值 */
  target?: string;
}

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
