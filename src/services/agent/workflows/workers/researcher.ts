// Researcher Agent - Information gathering and analysis

import { generateText, type CoreMessage } from 'ai';
import { createModel } from '../../../llm/providers';
import type { LLMProviderConfig } from '../../../llm/types';
import type { WorkflowNode, WorkflowState, AgentMessage } from '../types';
import { generateId } from '../types';
import { AgentRuntime } from '../../runtime';

const RESEARCHER_SYSTEM_PROMPT = `You are a research specialist. Your role is to:
1. Search for relevant information
2. Analyze and verify data
3. Summarize findings clearly

You have access to search and weather tools. Use them when needed.
Be thorough but concise. Focus on facts and cite sources when available.

After completing your research, summarize your key findings.`;

export interface ResearcherConfig {
  llmConfig: LLMProviderConfig;
}

export function createResearcherNode(config: ResearcherConfig): WorkflowNode {
  const { llmConfig } = config;

  return {
    id: 'researcher',
    type: 'researcher',
    name: 'Researcher',
    systemPrompt: RESEARCHER_SYSTEM_PROMPT,
    tools: ['search', 'weather'],

    execute: async (state: WorkflowState): Promise<Partial<WorkflowState>> => {
      // Get pending tasks for researcher
      const myTasks = state.tasks.filter(
        (t) => t.assignedTo === 'researcher' && t.status === 'pending'
      );

      if (myTasks.length === 0) {
        // No tasks, just respond to input
        const model = createModel(llmConfig);
        const messages: CoreMessage[] = [
          { role: 'system', content: RESEARCHER_SYSTEM_PROMPT },
          { role: 'user', content: state.input },
        ];

        // Add context from previous messages
        const contextMessages = state.messages
          .filter((m) => m.to === 'researcher')
          .map((m): CoreMessage => ({
            role: 'assistant',
            content: `[Previous context from ${m.from}]: ${m.content}`,
          }));

        const result = await generateText({
          model,
          messages: [...messages, ...contextMessages],
          temperature: 0.5,
        });

        const researcherMessage: AgentMessage = {
          id: generateId(),
          from: 'researcher',
          to: 'supervisor',
          content: result.text,
          timestamp: Date.now(),
        };

        return {
          results: {
            ...state.results,
            researcher: result.text,
          },
          messages: [...state.messages, researcherMessage],
          currentNode: 'supervisor',
        };
      }

      // Process tasks with tool access
      const runtime = new AgentRuntime({
        llmConfig,
        systemPrompt: RESEARCHER_SYSTEM_PROMPT,
        maxSteps: 3,
      });

      const taskDescriptions = myTasks.map((t) => t.description).join('\n');
      const runResult = await runtime.run([
        { role: 'user', content: `Research the following:\n${taskDescriptions}` },
      ], ['web_search', 'weather']);

      // Update task status
      const updatedTasks = state.tasks.map((t) => {
        if (t.assignedTo === 'researcher' && t.status === 'pending') {
          return { ...t, status: 'completed' as const, result: runResult.content };
        }
        return t;
      });

      const researcherMessage: AgentMessage = {
        id: generateId(),
        from: 'researcher',
        to: 'supervisor',
        content: runResult.content,
        metadata: {
          toolCalls: runResult.toolCalls.length,
          tasks: myTasks.map((t) => t.id),
        },
        timestamp: Date.now(),
      };

      return {
        tasks: updatedTasks,
        results: {
          ...state.results,
          researcher: runResult.content,
        },
        messages: [...state.messages, researcherMessage],
        currentNode: 'supervisor',
      };
    },
  };
}
