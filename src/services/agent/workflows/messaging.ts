// Agent Messaging - Inter-agent communication utilities

import type { AgentMessage, WorkflowState } from './types';
import { generateId } from './types';

// Message filter types
export type MessageFilter = {
  from?: string | string[];
  to?: string | string[];
  afterTimestamp?: number;
  beforeTimestamp?: number;
};

// Filter messages based on criteria
export function filterMessages(
  messages: AgentMessage[],
  filter: MessageFilter
): AgentMessage[] {
  return messages.filter((m) => {
    if (filter.from) {
      const fromList = Array.isArray(filter.from) ? filter.from : [filter.from];
      if (!fromList.includes(m.from)) return false;
    }

    if (filter.to) {
      const toList = Array.isArray(filter.to) ? filter.to : [filter.to];
      if (!toList.includes(m.to)) return false;
    }

    if (filter.afterTimestamp && m.timestamp <= filter.afterTimestamp) {
      return false;
    }

    if (filter.beforeTimestamp && m.timestamp >= filter.beforeTimestamp) {
      return false;
    }

    return true;
  });
}

// Get messages for a specific agent
export function getMessagesForAgent(
  state: WorkflowState,
  agentId: string
): AgentMessage[] {
  return filterMessages(state.messages, { to: agentId });
}

// Get messages from a specific agent
export function getMessagesFromAgent(
  state: WorkflowState,
  agentId: string
): AgentMessage[] {
  return filterMessages(state.messages, { from: agentId });
}

// Get conversation between two agents
export function getConversation(
  state: WorkflowState,
  agent1: string,
  agent2: string
): AgentMessage[] {
  return state.messages.filter(
    (m) =>
      (m.from === agent1 && m.to === agent2) ||
      (m.from === agent2 && m.to === agent1)
  ).sort((a, b) => a.timestamp - b.timestamp);
}

// Create a new message
export function createMessage(
  from: string,
  to: string,
  content: string,
  metadata?: Record<string, unknown>
): AgentMessage {
  return {
    id: generateId(),
    from,
    to,
    content,
    metadata,
    timestamp: Date.now(),
  };
}

// Broadcast message to all agents
export function createBroadcast(
  from: string,
  content: string,
  agents: string[]
): AgentMessage[] {
  const timestamp = Date.now();
  return agents.map((to) => ({
    id: generateId(),
    from,
    to,
    content,
    timestamp,
  }));
}

// Format messages as conversation string
export function formatConversation(messages: AgentMessage[]): string {
  return messages
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((m) => `[${m.from} -> ${m.to}]: ${m.content}`)
    .join('\n\n');
}

// Get latest message from each agent
export function getLatestFromEachAgent(
  state: WorkflowState
): Record<string, AgentMessage> {
  const latest: Record<string, AgentMessage> = {};

  for (const msg of state.messages) {
    const existing = latest[msg.from];
    if (!existing || msg.timestamp > existing.timestamp) {
      latest[msg.from] = msg;
    }
  }

  return latest;
}

// Calculate message statistics
export interface MessageStats {
  totalMessages: number;
  byAgent: Record<string, { sent: number; received: number }>;
  averageResponseTime: number;
}

export function calculateMessageStats(state: WorkflowState): MessageStats {
  const byAgent: Record<string, { sent: number; received: number }> = {};
  const responseTimes: number[] = [];

  for (const msg of state.messages) {
    // Count sent
    if (!byAgent[msg.from]) {
      byAgent[msg.from] = { sent: 0, received: 0 };
    }
    const fromAgent = byAgent[msg.from];
    if (fromAgent) {
      fromAgent.sent++;
    }

    // Count received
    if (!byAgent[msg.to]) {
      byAgent[msg.to] = { sent: 0, received: 0 };
    }
    const toAgent = byAgent[msg.to];
    if (toAgent) {
      toAgent.received++;
    }
  }

  // Calculate response times
  const sorted = [...state.messages].sort((a, b) => a.timestamp - b.timestamp);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (prev && curr && prev.to === curr.from) {
      responseTimes.push(curr.timestamp - prev.timestamp);
    }
  }

  const averageResponseTime =
    responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

  return {
    totalMessages: state.messages.length,
    byAgent,
    averageResponseTime,
  };
}
