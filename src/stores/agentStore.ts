import { create } from 'zustand';
import type { AgentState, AgentEvent, AgentStatus } from '../types';

interface AgentStore extends AgentState {
  setStatus: (status: AgentStatus) => void;
  setCurrentAgent: (agentId: string | null) => void;
  addEvent: (event: AgentEvent) => void;
  clearEvents: () => void;
  setToolResult: (toolCallId: string, result: unknown) => void;
  reset: () => void;
}

const initialState: AgentState = {
  status: 'idle',
  currentAgent: null,
  toolResults: {},
  events: [],
};

export const useAgentStore = create<AgentStore>((set) => ({
  ...initialState,

  setStatus: (status) => set({ status }),

  setCurrentAgent: (currentAgent) => set({ currentAgent }),

  addEvent: (event) =>
    set((state) => ({ events: [...state.events, event] })),

  clearEvents: () => set({ events: [] }),

  setToolResult: (toolCallId, result) =>
    set((state) => ({
      toolResults: { ...state.toolResults, [toolCallId]: result },
    })),

  reset: () => set(initialState),
}));
