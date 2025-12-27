import { useCallback, useEffect, useRef } from 'react';
import { useAssistantStore, usePetStore, toast } from '../stores';
import { useCareStore } from '../stores/careStore';
import type { AssistantSkill } from '../types';
import { ensurePetVoiceLinkInitialized, petSpeak } from '@/services/pet/voice-link';
import { useConfigStore } from '@/stores';

// 智能助手技能：时间播报、简易闹钟、灯光/电脑操作模拟、习惯记忆提示
interface SkillPayload {
  city?: string;
  light?: 'on' | 'off';
}

export function useAssistantSkills() {
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const voice = useConfigStore((s) => s.config.voice);

  const performSkill = useCallback((skill: AssistantSkill, payload?: SkillPayload) => {
    const assistant = useAssistantStore.getState();
    const pet = usePetStore.getState();
    const care = useCareStore.getState();
    const ttsEnabled = useConfigStore.getState().config.voice.ttsEnabled;

    if (ttsEnabled || voice.sttEnabled) {
      ensurePetVoiceLinkInitialized();
    }

    assistant.setLastSkill(skill);

    switch (skill) {
      case 'time': {
        const now = new Date();
        const msg = `现在是 ${now.getHours()}点${now.getMinutes().toString().padStart(2, '0')}分`;
        pet.setEmotion('thinking');
        pet.showBubble(msg, 5200);
        if (ttsEnabled) void petSpeak(msg, { priority: 'normal', interrupt: true });
        toast.success('已播报当前时间');
        break;
      }
      case 'weather': {
        const city = payload?.city?.trim();
        pet.setEmotion('confused');
        if (city) {
          pet.showBubble(`正在查询 ${city} 的天气，稍后告诉你`, 5200);
          assistant.rememberPreference('lastWeatherCity', city);
        } else {
          pet.showBubble('说“天气+城市名”或在聊天输入城市，我会查询最新天气', 5200);
        }
        assistant.rememberPreference('lastWeatherHint', 'weather');
        break;
      }
      case 'alarm': {
        const label = '闹钟提醒';
        const time = Date.now() + 15 * 60 * 1000;
        assistant.addAlarm(label, time);
        pet.setEmotion('happy');
        const msg = '好的，15 分钟后提醒你休息';
        pet.showBubble(msg, 5200);
        if (ttsEnabled) void petSpeak(msg, { priority: 'normal', interrupt: true });
        toast.info(`已创建提醒：${label}`);
        // 计时器在订阅中处理
        assistant.addHabit('喜欢定时提醒');
        break;
      }
      case 'lights': {
        const on = payload?.light
          ? (assistant.setLight(payload.light === 'on'), payload.light === 'on')
          : assistant.toggleLight();
        pet.setEmotion('excited');
        const msg = on ? '灯光/设备已开启（模拟）' : '灯光/设备已关闭（模拟）';
        pet.showBubble(msg, 5200);
        if (ttsEnabled) void petSpeak(msg, { priority: 'normal', interrupt: true });
        break;
      }
      case 'pc_action': {
        pet.setEmotion('thinking');
        const msg = '我可以执行简单操作（打开链接、应用、复制/粘贴），请在聊天描述需求';
        pet.showBubble(msg, 5800);
        if (ttsEnabled) void petSpeak(msg, { priority: 'normal', interrupt: true });
        assistant.setLastAdvice('可在聊天窗口下达操作指令');
        break;
      }
      case 'habit': {
        const careStats = care.getStatusReport();
        const preferenceList = Object.values(assistant.preferences);
        const recentPreference = preferenceList[preferenceList.length - 1]?.value;
        const advice =
          recentPreference ??
          assistant.preferences['favoriteMusic']?.value ??
          assistant.lastAdvice ??
          (careStats.warnings[0] ?? '今天需要什么帮助吗？');
        pet.setEmotion('happy');
        const msg = `记得你喜欢：${advice}`;
        pet.showBubble(msg, 5200);
        if (ttsEnabled) void petSpeak(msg, { priority: 'normal', interrupt: true });
        assistant.setLastAdvice(advice);
        break;
      }
      default:
        break;
    }
  }, [voice.sttEnabled]);

  // 监听闹钟列表并触发提醒
  useEffect(() => {
    const timers = timersRef.current;
    const unsubscribe = useAssistantStore.subscribe((state) => {
      const alarms = state.alarms;
      alarms
        .filter((alarm) => alarm.status === 'pending')
        .forEach((alarm) => {
          if (timers.has(alarm.id)) return;
          const delay = Math.max(0, alarm.time - Date.now());
          const timer = setTimeout(() => {
            const pet = usePetStore.getState();
            const assistant = useAssistantStore.getState();
            const msg = `提醒：${alarm.label}`;
            pet.setEmotion('excited');
            pet.showBubble(msg, 6000);
            if (useConfigStore.getState().config.voice.ttsEnabled) {
              ensurePetVoiceLinkInitialized();
              void petSpeak(msg, { priority: 'high', interrupt: true });
            }
            toast.success(`闹钟触发：${alarm.label}`);
            assistant.markAlarmTriggered(alarm.id);
            timers.delete(alarm.id);
          }, delay);
          timers.set(alarm.id, timer);
        });

      // 清理无效定时器
      timers.forEach((timer, id) => {
        const exists = alarms.find((alarm) => alarm.id === id && alarm.status === 'pending');
        if (!exists) {
          clearTimeout(timer);
          timers.delete(id);
        }
      });
    });

    return () => {
      unsubscribe();
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  return { performSkill };
}
