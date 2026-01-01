import { useCallback, useEffect, useRef } from 'react';
import { useAssistantStore, usePetStore, usePromptDialogStore } from '../stores';
import { useCareStore } from '../stores/careStore';
import type { AssistantSkill, SkillPayload } from '../types';
import { ensurePetVoiceLinkInitialized, petSpeak } from '@/services/pet/voice-link';
import { useConfigStore } from '@/stores';
import { fetchWeather } from '@/services/weather';
import { open } from '@tauri-apps/plugin-shell';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { getWindowManager } from '@/services/window';

/**
 * 执行天气查询的辅助函数
 */
async function executeWeatherQuery(
  city: string,
  pet: ReturnType<typeof usePetStore.getState>,
  assistant: ReturnType<typeof useAssistantStore.getState>,
  ttsEnabled: boolean
): Promise<void> {
  // 显示加载状态
  pet.setEmotion('thinking');
  pet.showBubble(`正在查询 ${city} 的天气...`, 2000);

  try {
    const weather = await fetchWeather(city);
    // 记住用户输入的城市名（保持中文），而不是 API 返回的英文名
    assistant.rememberPreference('lastWeatherCity', city);

    const msg = `${city}：${weather.condition}，${weather.temperature}，体感 ${weather.feelsLike}，湿度 ${weather.humidity}`;
    pet.setEmotion('happy');
    pet.showBubble(msg, 6000);
    if (ttsEnabled) void petSpeak(msg, { priority: 'normal', interrupt: true });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '查询失败';
    pet.setEmotion('sad');
    pet.showBubble(`天气查询失败：${errorMsg}`, 4000);
  }
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
        break;
      }
      case 'weather': {
        // 获取城市：优先使用传入的，其次使用记忆的
        const city = payload?.city?.trim() || assistant.getPreference('lastWeatherCity')?.value || '';

        // 如果没有城市，弹出输入框让用户输入
        if (!city) {
          const promptDialog = usePromptDialogStore.getState();
          void (async () => {
            const inputCity = await promptDialog.prompt({
              title: '查询天气',
              description: '请输入要查询的城市名称',
              placeholder: '例如：北京、上海、广州...',
              confirmText: '查询',
              cancelText: '取消',
            });

            if (!inputCity) {
              // 用户取消
              return;
            }

            // 执行天气查询
            await executeWeatherQuery(inputCity, pet, assistant, ttsEnabled);
          })();
          break;
        }

        // 有城市，直接查询
        void executeWeatherQuery(city, pet, assistant, ttsEnabled);
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
        const { pcAction, target } = payload ?? {};

        // 如果没有指定操作，打开聊天窗口引导用户
        if (!pcAction) {
          pet.setEmotion('thinking');
          const msg = '打开聊天窗口，告诉我你想做什么吧~';
          pet.showBubble(msg, 3000);
          if (ttsEnabled) void petSpeak(msg, { priority: 'normal', interrupt: true });

          // 延迟打开聊天窗口
          setTimeout(() => {
            void getWindowManager().openChatWindow();
          }, 500);
          break;
        }

        // 执行具体操作
        void (async () => {
          try {
            switch (pcAction) {
              case 'open_url': {
                if (!target) {
                  pet.showBubble('请提供要打开的网址', 3000);
                  break;
                }
                const url = target.startsWith('http') ? target : `https://${target}`;
                await open(url);
                pet.setEmotion('happy');
                pet.showBubble(`已打开：${target}`, 3000);
                break;
              }
              case 'open_app': {
                if (!target) {
                  pet.showBubble('请提供要打开的应用路径', 3000);
                  break;
                }
                await open(target);
                pet.setEmotion('happy');
                pet.showBubble(`已打开应用`, 3000);
                break;
              }
              case 'copy': {
                if (!target) {
                  pet.showBubble('请提供要复制的内容', 3000);
                  break;
                }
                await writeText(target);
                pet.setEmotion('happy');
                pet.showBubble('已复制到剪贴板', 2500);
                break;
              }
              case 'search': {
                if (!target) {
                  pet.showBubble('请提供要搜索的关键词', 3000);
                  break;
                }
                const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(target)}`;
                await open(searchUrl);
                pet.setEmotion('happy');
                pet.showBubble(`正在搜索：${target}`, 3000);
                break;
              }
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : '操作失败';
            pet.setEmotion('sad');
            pet.showBubble(`操作失败：${errorMsg}`, 4000);
          }
        })();
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
