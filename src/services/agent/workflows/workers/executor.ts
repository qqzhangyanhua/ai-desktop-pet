// Executor Agent - Tool execution and actions

import type { LLMProviderConfig } from '../../../llm/types';
import type { WorkflowNode, WorkflowState, AgentMessage } from '../types';
import { generateId } from '../types';
import { AgentRuntime } from '../../runtime';
import { useConfigStore } from '@/stores';

const EXECUTOR_SYSTEM_PROMPT = `You are an execution specialist. Your role is to:
1. Execute tools and commands to accomplish tasks
2. Handle file operations, clipboard, and system interactions
3. Verify execution results
4. Report outcomes clearly

Available tools:
- clipboard: Read/write clipboard content
- file: Read/write files (with user permission)
- opener: Open URLs and applications

Be careful with file operations and always confirm results.
Report any errors or issues encountered during execution.`;

export interface ExecutorConfig {
  llmConfig: LLMProviderConfig;
}

export function createExecutorNode(config: ExecutorConfig): WorkflowNode {
  const { llmConfig } = config;

  return {
    id: 'executor',
    type: 'executor',
    name: 'Executor',
    systemPrompt: EXECUTOR_SYSTEM_PROMPT,
    tools: ['clipboard', 'file', 'opener'],

    execute: async (state: WorkflowState): Promise<Partial<WorkflowState>> => {
      // Get pending execution tasks
      const myTasks = state.tasks.filter(
        (t) => t.assignedTo === 'executor' && t.status === 'pending'
      );

      if (myTasks.length === 0) {
        // No tasks, return to supervisor
        const executorMessage: AgentMessage = {
          id: generateId(),
          from: 'executor',
          to: 'supervisor',
          content: 'No execution tasks pending.',
          timestamp: Date.now(),
        };

        return {
          messages: [...state.messages, executorMessage],
          currentNode: 'supervisor',
        };
      }

      // Execute tasks with tool access
      const runtime = new AgentRuntime({
        llmConfig,
        systemPrompt: EXECUTOR_SYSTEM_PROMPT,
        maxSteps: 5,
        source: 'workflow',
        allowedTools: useConfigStore.getState().config.assistant.agent.enabledTools,
      });

      const taskDescriptions = myTasks.map((t) => t.description).join('\n');

      // Get context from previous agents
      const context = Object.entries(state.results)
        .map(([agent, result]) => `[${agent}]: ${result}`)
        .join('\n\n');

      const runResult = await runtime.run([
        {
          role: 'user',
          content: `Context:\n${context}\n\nTasks to execute:\n${taskDescriptions}`,
        },
      ], [
        'clipboard_read',
        'clipboard_write',
        'file_read',
        'file_write',
        'file_exists',
        'open_url',
        'open_app',
      ]);

      // Update task status
      const updatedTasks = state.tasks.map((t) => {
        if (t.assignedTo === 'executor' && t.status === 'pending') {
          return { ...t, status: 'completed' as const, result: runResult.content };
        }
        return t;
      });

      const executorMessage: AgentMessage = {
        id: generateId(),
        from: 'executor',
        to: 'supervisor',
        content: runResult.content,
        metadata: {
          toolCalls: runResult.toolCalls.map((tc) => ({
            name: tc.name,
            success: !tc.result?.toString().includes('error'),
          })),
          tasks: myTasks.map((t) => t.id),
        },
        timestamp: Date.now(),
      };

      return {
        tasks: updatedTasks,
        results: {
          ...state.results,
          executor: runResult.content,
        },
        messages: [...state.messages, executorMessage],
        currentNode: 'supervisor',
      };
    },
  };
}
