import { useCallback } from 'react';
import { useAssistantSkills } from './useAssistantSkills';
import { usePetActions } from './usePetActions';
import { usePetStore, toast } from '../stores';
import { fetchWeather } from '../services/weather';

interface CommandRouterResult {
  handled: boolean;
}

const LIGHT_ON_PATTERNS = ['开灯', '打开灯', 'turn on light', 'lights on'];
const LIGHT_OFF_PATTERNS = ['关灯', '关闭灯', 'turn off light', 'lights off'];

// 简易命令路由：在聊天/语音提交前执行本地动作或助手技能
export function useAssistantCommandRouter() {
  const { performSkill } = useAssistantSkills();
  const { runPetAction } = usePetActions();

  const routeCommand = useCallback(
    async (raw: string): Promise<CommandRouterResult> => {
      const content = raw.trim();
      if (!content) return { handled: false };

      const lower = content.toLowerCase();
      const pet = usePetStore.getState();

      // 天气命令：天气+城市
      const weatherMatch = content.match(/天气[:：]?\s*([\u4e00-\u9fa5a-zA-Z\s]+)/);
      if (weatherMatch?.[1]) {
        const city = weatherMatch[1].trim();
        performSkill('weather', { city });
        try {
          const data = await fetchWeather(city);
          pet.setEmotion('happy');
          pet.showBubble(
            `${data.location} | ${data.temperature} · 体感${data.feelsLike} · ${data.condition} · 湿度${data.humidity}`,
            7200
          );
          toast.success('已获取最新天气');
        } catch (err) {
          toast.error(
            err instanceof Error ? `天气查询失败：${err.message}` : '天气查询失败'
          );
          pet.showBubble('天气接口暂不可用，请稍后再试', 5200);
        }
        return { handled: true };
      }

      // 灯光控制
      if (LIGHT_ON_PATTERNS.some((p) => lower.includes(p))) {
        performSkill('lights', { light: 'on' });
        toast.success('已开启灯光/设备（模拟）');
        return { handled: true };
      }
      if (LIGHT_OFF_PATTERNS.some((p) => lower.includes(p))) {
        performSkill('lights', { light: 'off' });
        toast.success('已关闭灯光/设备（模拟）');
        return { handled: true };
      }

      // 报时
      if (content.includes('时间') || lower.includes('time') || content.includes('几点')) {
        performSkill('time');
        return { handled: true };
      }

      // 休息/提醒
      if (content.includes('提醒') || content.includes('闹钟')) {
        performSkill('alarm');
        return { handled: true };
      }

      // 偏好/建议
      if (content.includes('偏好') || content.includes('建议') || content.includes('习惯')) {
        performSkill('habit');
        return { handled: true };
      }

      // 灌入养成动作
      if (/喂食|吃苹果/.test(content)) {
        runPetAction('feed');
        return { handled: true };
      }
      if (/玩(游戏|一会)/.test(content)) {
        runPetAction('play');
        return { handled: true };
      }
      if (/睡觉|休息/.test(content)) {
        runPetAction('sleep');
        return { handled: true };
      }
      if (/跳舞/.test(content)) {
        runPetAction('dance');
        return { handled: true };
      }
      if (/音乐|播放歌/.test(content)) {
        runPetAction('music');
        return { handled: true };
      }
      if (/魔术/.test(content)) {
        runPetAction('magic');
        return { handled: true };
      }
      if (/艺术|画画|生成图/.test(content)) {
        runPetAction('art');
        return { handled: true };
      }
      if (/变身|换装/.test(content)) {
        runPetAction('transform');
        return { handled: true };
      }
      if (/清洁|打扫/.test(content)) {
        runPetAction('clean');
        return { handled: true };
      }
      if (/梳(毛|理)/.test(content)) {
        runPetAction('brush');
        return { handled: true };
      }
      if (/放松|冥想/.test(content)) {
        runPetAction('rest');
        return { handled: true };
      }

      // 无聊/关怀
      if (content.includes('无聊')) {
        pet.showBubble('我可以陪你聊天、播歌或玩小游戏', 5200);
        return { handled: true };
      }

      return { handled: false };
    },
    [performSkill, runPetAction]
  );

  return { routeCommand };
}
