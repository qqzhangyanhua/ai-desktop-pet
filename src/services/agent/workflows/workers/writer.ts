// Writer Agent - Content creation and formatting

import { generateText, type CoreMessage } from 'ai';
import { createModel } from '../../../llm/providers';
import type { LLMProviderConfig } from '../../../llm/types';
import type { WorkflowNode, WorkflowState, AgentMessage } from '../types';
import { generateId } from '../types';

const WRITER_SYSTEM_PROMPT = `You are a professional writer and content specialist. Your role is to:
1. Create well-structured, engaging content
2. Summarize complex information clearly
3. Format text appropriately for the context
4. Edit and improve existing content

Focus on:
- Clear, concise language
- Logical structure and flow
- Appropriate tone for the audience
- Accurate representation of facts from research

When given research results, synthesize them into coherent content.
When asked to write, produce polished, ready-to-use text.`;

export interface WriterConfig {
  llmConfig: LLMProviderConfig;
}

export function createWriterNode(config: WriterConfig): WorkflowNode {
  const { llmConfig } = config;

  return {
    id: 'writer',
    type: 'writer',
    name: 'Writer',
    systemPrompt: WRITER_SYSTEM_PROMPT,
    tools: [],

    execute: async (state: WorkflowState): Promise<Partial<WorkflowState>> => {
      const model = createModel(llmConfig);

      // Gather context from research and previous messages
      const researchContext = state.results.researcher
        ? `Research findings:\n${state.results.researcher}\n\n`
        : '';

      const previousContext = state.messages
        .filter((m) => m.to === 'writer')
        .map((m) => `[${m.from}]: ${m.content}`)
        .join('\n');

      // Get pending writing tasks
      const myTasks = state.tasks.filter(
        (t) => t.assignedTo === 'writer' && t.status === 'pending'
      );

      const taskInstructions = myTasks.length > 0
        ? `\n\nWriting tasks:\n${myTasks.map((t) => `- ${t.description}`).join('\n')}`
        : '';

      const messages: CoreMessage[] = [
        { role: 'system', content: WRITER_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Original request: ${state.input}\n\n${researchContext}${previousContext}${taskInstructions}\n\nPlease create the appropriate content.`,
        },
      ];

      const result = await generateText({
        model,
        messages,
        temperature: 0.7,
      });

      // Update task status
      const updatedTasks = state.tasks.map((t) => {
        if (t.assignedTo === 'writer' && t.status === 'pending') {
          return { ...t, status: 'completed' as const, result: result.text };
        }
        return t;
      });

      const writerMessage: AgentMessage = {
        id: generateId(),
        from: 'writer',
        to: 'supervisor',
        content: result.text,
        metadata: { tasks: myTasks.map((t) => t.id) },
        timestamp: Date.now(),
      };

      return {
        tasks: updatedTasks,
        results: {
          ...state.results,
          writer: result.text,
        },
        messages: [...state.messages, writerMessage],
        currentNode: 'supervisor',
      };
    },
  };
}
