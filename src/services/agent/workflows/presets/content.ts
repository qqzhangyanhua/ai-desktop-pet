// Content Creation Workflow - Writing and publishing preset

import type { LLMProviderConfig } from '../../../llm/types';
import type { WorkflowGraph, WorkflowNode, WorkflowState } from '../types';
import { WorkflowGraphBuilder } from '../graph';
import { createSupervisorNode } from '../supervisor';
import { createResearcherNode, createWriterNode, createExecutorNode } from '../workers';

export interface ContentWorkflowConfig {
  llmConfig: LLMProviderConfig;
  maxIterations?: number;
}

// End node for content workflow
function createEndNode(): WorkflowNode {
  return {
    id: 'end',
    type: 'custom',
    name: 'End',
    systemPrompt: '',
    tools: [],
    execute: async (state: WorkflowState): Promise<Partial<WorkflowState>> => {
      if (!state.output) {
        // Prefer writer's output, then executor's, then researcher's
        const output = state.results.writer
          || state.results.executor
          || state.results.researcher
          || 'Content creation completed.';
        return { output };
      }
      return {};
    },
  };
}

// Create content creation workflow
export function createContentWorkflow(config: ContentWorkflowConfig): WorkflowGraph {
  const { llmConfig } = config;

  const builder = new WorkflowGraphBuilder(
    'content',
    'Content Creation',
    'Multi-agent workflow for researching, writing, and publishing content'
  );

  // Add all nodes
  builder.addNode(createSupervisorNode({ llmConfig }));
  builder.addNode(createResearcherNode({ llmConfig }));
  builder.addNode(createWriterNode({ llmConfig }));
  builder.addNode(createExecutorNode({ llmConfig }));
  builder.addNode(createEndNode());

  // Define edges - supervisor routes based on state
  builder.addEdge('supervisor', (state) => {
    if (state.output) return 'end';
    return state.currentNode || 'researcher';
  });

  // All workers return to supervisor for next assignment
  builder.addEdge('researcher', 'supervisor');
  builder.addEdge('writer', 'supervisor');
  builder.addEdge('executor', 'supervisor');

  // Set entry and end points
  builder.setEntryPoint('supervisor');
  builder.addEndNode('end');

  return builder.build();
}

// Convenience function to run content workflow
export async function runContentWorkflow(
  input: string,
  config: ContentWorkflowConfig,
  options?: {
    onEvent?: (event: import('../types').WorkflowEvent) => void;
    signal?: AbortSignal;
  }
): Promise<WorkflowState> {
  const { WorkflowGraphExecutor } = await import('../graph');

  const graph = createContentWorkflow(config);
  const executor = new WorkflowGraphExecutor(graph);

  return executor.run(input, {
    maxIterations: config.maxIterations ?? 15,
    ...options,
  });
}
