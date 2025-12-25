import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { AlarmReminder, AssistantSkill, UserPreference } from '../types';

interface AssistantStore {
  preferences: Record<string, UserPreference>;
  habits: string[];
  alarms: AlarmReminder[];
  lightOn: boolean;
  lastSkill: AssistantSkill | null;
  lastAdvice: string | null;
  rememberPreference: (key: string, value: string) => void;
  getPreference: (key: string) => UserPreference | undefined;
  addHabit: (note: string) => void;
  addAlarm: (label: string, time: number) => AlarmReminder;
  markAlarmTriggered: (id: string) => void;
  toggleLight: () => boolean;
  setLight: (on: boolean) => void;
  setLastAdvice: (text: string) => void;
  setLastSkill: (skill: AssistantSkill) => void;
  clearTriggered: () => void;
}

const initialState = {
  preferences: {} as Record<string, UserPreference>,
  habits: [] as string[],
  alarms: [] as AlarmReminder[],
  lightOn: false,
  lastSkill: null as AssistantSkill | null,
  lastAdvice: null as string | null,
};

export const useAssistantStore = create<AssistantStore>((set, get) => ({
  ...initialState,

  rememberPreference: (key, value) =>
    set((state) => ({
      preferences: {
        ...state.preferences,
        [key]: { key, value, updatedAt: Date.now() },
      },
    })),

  getPreference: (key) => get().preferences[key],

  addHabit: (note) =>
    set((state) => ({
      habits: [...state.habits.slice(-4), note],
    })),

  addAlarm: (label, time) => {
    const alarm: AlarmReminder = {
      id: uuidv4(),
      label,
      time,
      status: 'pending',
    };
    set((state) => ({
      alarms: [...state.alarms, alarm],
    }));
    return alarm;
  },

  markAlarmTriggered: (id) =>
    set((state) => ({
      alarms: state.alarms.map((alarm) =>
        alarm.id === id ? { ...alarm, status: 'triggered' } : alarm
      ),
    })),

  toggleLight: () => {
    let next = false;
    set((state) => {
      next = !state.lightOn;
      return { lightOn: next };
    });
    return next;
  },

  setLight: (on) => {
    set({ lightOn: on });
  },

  setLastAdvice: (text) => set({ lastAdvice: text }),

  setLastSkill: (skill) => set({ lastSkill: skill }),

  clearTriggered: () =>
    set((state) => ({
      alarms: state.alarms.filter((alarm) => alarm.status !== 'triggered'),
    })),
}));
