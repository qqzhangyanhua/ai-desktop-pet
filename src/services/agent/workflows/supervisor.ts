// Supervisor Node - Task analysis and delegation

import { generateText, type CoreMessage } from 'ai';
import { createModel } from '../../llm/providers';
import type { LLMProviderConfig } from '../../llm/types';
import type { WorkflowNode, WorkflowState, AgentTask, AgentMessage } from './types';
import { generateId } from './types';

const SUPERVISOR_SYSTEM_PROMPT = `You are a task supervisor responsible for:
1. Analyzing user requests and breaking them down into subtasks
2. Deciding which specialized agent should handle each task
3. Reviewing results and making decisions about next steps

Available agents:
- researcher: Searches for information, analyzes data, fact-checks
- writer: Creates content, writes summaries, formats text
- executor: Runs tools, executes commands, performs actions

Your responses should be in JSON format:
{
  "analysis": "Brief analysis of the request",
  "tasks": [
    {
      "description": "Task description",
      "assignTo": "researcher|writer|executor",
      "priority": 1
    }
  ],
  "nextAgent": "researcher|writer|executor|done",
  "reasoning": "Why this agent should go next"
}

If all tasks are complete, set nextAgent to "done".`;

const REVIEW_SYSTEM_PROMPT = `You are reviewing the results from specialized agents.
Based on the original request and the results gathered, decide:
1. If more work is needed (and which agent should do it)
2. If the task is complete (compose final answer)

Respond in JSON:
{
  "isComplete": true|false,
  "nextAgent": "researcher|writer|executor|done",
  "reasoning": "Your reasoning",
  "finalAnswer": "If complete, your final synthesized answer"
}`;

export interface SupervisorConfig {
  llmConfig: LLMProviderConfig;
}

export function createSupervisorNode(config: SupervisorConfig): WorkflowNode {
  const { llmConfig } = config;

  return {
    id: 'supervisor',
    type: 'supervisor',
    name: 'Supervisor',
    systemPrompt: SUPERVISOR_SYSTEM_PROMPT,
    tools: [],

    execute: async (state: WorkflowState): Promise<Partial<WorkflowState>> => {
      const model = createModel(llmConfig);

      // First invocation: analyze and create tasks
      if (state.tasks.length === 0) {
        const messages: CoreMessage[] = [
          { role: 'system', content: SUPERVISOR_SYSTEM_PROMPT },
          { role: 'user', content: state.input },
        ];

        const result = await generateText({
          model,
          messages,
          temperature: 0.3,
        });

        try {
          const parsed = JSON.parse(result.text);
          const tasks: AgentTask[] = (parsed.tasks || []).map(
            (t: { description: string; assignTo: string; priority?: number }, i: number) => ({
              id: generateId(),
              description: t.description,
              assignedTo: t.assignTo,
              dependsOn: i > 0 ? [parsed.tasks[i - 1].description] : [],
              status: 'pending' as const,
            })
          );

          const supervisorMessage: AgentMessage = {
            id: generateId(),
            from: 'supervisor',
            to: parsed.nextAgent || 'researcher',
            content: parsed.analysis || 'Starting task analysis',
            metadata: { tasks: tasks.map((t) => t.description) },
            timestamp: Date.now(),
          };

          return {
            tasks,
            messages: [...state.messages, supervisorMessage],
            currentNode: parsed.nextAgent === 'done' ? 'end' : parsed.nextAgent,
          };
        } catch {
          // If JSON parsing fails, create a simple research task
          const defaultTask: AgentTask = {
            id: generateId(),
            description: state.input,
            assignedTo: 'researcher',
            dependsOn: [],
            status: 'pending',
          };

          return {
            tasks: [defaultTask],
            currentNode: 'researcher',
          };
        }
      }

      // Review phase: check results and decide next steps
      const completedResults = Object.entries(state.results)
        .map(([agent, result]) => `[${agent}]: ${result}`)
        .join('\n\n');

      const messages: CoreMessage[] = [
        { role: 'system', content: REVIEW_SYSTEM_PROMPT },
        { role: 'user', content: `Original request: ${state.input}\n\nResults so far:\n${completedResults}` },
      ];

      const result = await generateText({
        model,
        messages,
        temperature: 0.3,
      });

      try {
        const parsed = JSON.parse(result.text);

        if (parsed.isComplete || parsed.nextAgent === 'done') {
          return {
            output: parsed.finalAnswer || completedResults,
            currentNode: 'end',
          };
        }

        const reviewMessage: AgentMessage = {
          id: generateId(),
          from: 'supervisor',
          to: parsed.nextAgent,
          content: parsed.reasoning || 'Continuing with next agent',
          timestamp: Date.now(),
        };

        return {
          messages: [...state.messages, reviewMessage],
          currentNode: parsed.nextAgent,
        };
      } catch {
        // Default to completion if parsing fails
        return {
          output: completedResults || 'Task completed.',
          currentNode: 'end',
        };
      }
    },
  };
}

// Routing function for supervisor
export function supervisorRouter(state: WorkflowState): string {
  // Check iteration limit
  if (state.iteration >= state.maxIterations - 1) {
    return 'end';
  }

  // If output is set, we're done
  if (state.output) {
    return 'end';
  }

  // Return to supervisor for review after any agent completes
  return state.currentNode || 'supervisor';
}
