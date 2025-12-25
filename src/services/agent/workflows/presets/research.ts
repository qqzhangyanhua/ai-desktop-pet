// Research Workflow - Deep research preset

import type { LLMProviderConfig } from '../../../llm/types';
import type { WorkflowGraph, WorkflowNode, WorkflowState } from '../types';
import { WorkflowGraphBuilder } from '../graph';
import { createSupervisorNode } from '../supervisor';
import { createResearcherNode, createWriterNode } from '../workers';

export interface ResearchWorkflowConfig {
  llmConfig: LLMProviderConfig;
  maxIterations?: number;
}

// End node - finalizes the workflow
function createEndNode(): WorkflowNode {
  return {
    id: 'end',
    type: 'custom',
    name: 'End',
    systemPrompt: '',
    tools: [],
    execute: async (state: WorkflowState): Promise<Partial<WorkflowState>> => {
      // Compile final output if not already set
      if (!state.output) {
        const writerResult = state.results.writer;
        const researcherResult = state.results.researcher;
        return {
          output: writerResult || researcherResult || 'Research completed.',
        };
      }
      return {};
    },
  };
}

// Create research workflow
export function createResearchWorkflow(config: ResearchWorkflowConfig): WorkflowGraph {
  const { llmConfig } = config;

  const builder = new WorkflowGraphBuilder(
    'research',
    'Deep Research',
    'Multi-agent workflow for comprehensive research and report generation'
  );

  // Add nodes
  builder.addNode(createSupervisorNode({ llmConfig }));
  builder.addNode(createResearcherNode({ llmConfig }));
  builder.addNode(createWriterNode({ llmConfig }));
  builder.addNode(createEndNode());

  // Define edges
  // Supervisor routes to appropriate agent
  builder.addEdge('supervisor', (state) => {
    if (state.output) return 'end';
    return state.currentNode || 'researcher';
  });

  // Workers return to supervisor
  builder.addEdge('researcher', 'supervisor');
  builder.addEdge('writer', 'supervisor');

  // Set entry and end points
  builder.setEntryPoint('supervisor');
  builder.addEndNode('end');

  return builder.build();
}

// Convenience function to run research workflow
export async function runResearchWorkflow(
  input: string,
  config: ResearchWorkflowConfig,
  options?: {
    onEvent?: (event: import('../types').WorkflowEvent) => void;
    signal?: AbortSignal;
  }
): Promise<WorkflowState> {
  const { WorkflowGraphExecutor } = await import('../graph');

  const graph = createResearchWorkflow(config);
  const executor = new WorkflowGraphExecutor(graph);

  return executor.run(input, {
    maxIterations: config.maxIterations ?? 10,
    ...options,
  });
}
