// Workflow Graph - LangGraph-style state machine

import type {
  WorkflowGraph,
  WorkflowState,
  WorkflowNode,
  WorkflowEdge,
  WorkflowEvent,
  WorkflowOptions,
} from './types';
import { createInitialState } from './types';

export class WorkflowGraphExecutor {
  private graph: WorkflowGraph;
  private state: WorkflowState;
  private onEvent?: (event: WorkflowEvent) => void;
  private abortSignal?: AbortSignal;
  private isPaused = false;

  constructor(graph: WorkflowGraph) {
    this.graph = graph;
    this.state = createInitialState('');
  }

  private emitEvent(event: Omit<WorkflowEvent, 'timestamp'>): void {
    this.onEvent?.({ ...event, timestamp: Date.now() });
  }

  private getNextNode(currentNode: string): string | null {
    // Find edges from current node
    const outEdges = this.graph.edges.filter((e) => e.from === currentNode);

    if (outEdges.length === 0) {
      return null;
    }

    // Evaluate conditions
    for (const edge of outEdges) {
      if (edge.condition && !edge.condition(this.state)) {
        continue;
      }

      // Dynamic routing
      if (typeof edge.to === 'function') {
        return edge.to(this.state);
      }

      return edge.to;
    }

    return null;
  }

  async run(input: string, options: WorkflowOptions = {}): Promise<WorkflowState> {
    const { maxIterations = 10, onEvent, signal } = options;

    this.onEvent = onEvent;
    this.abortSignal = signal;
    this.isPaused = false;

    // Initialize state
    this.state = createInitialState(input, maxIterations);
    this.state.status = 'running';
    this.state.startTime = Date.now();
    this.state.currentNode = this.graph.entryPoint;

    this.emitEvent({ type: 'status_change', status: 'running' });

    try {
      while (this.state.currentNode && this.state.iteration < this.state.maxIterations) {
        // Check abort
        if (this.abortSignal?.aborted) {
          this.state.status = 'cancelled';
          this.emitEvent({ type: 'status_change', status: 'cancelled' });
          break;
        }

        // Check pause
        while (this.isPaused) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          if (this.abortSignal?.aborted) {
            this.state.status = 'cancelled';
            this.emitEvent({ type: 'status_change', status: 'cancelled' });
            return this.state;
          }
        }

        const node = this.graph.nodes.get(this.state.currentNode);
        if (!node) {
          throw new Error(`Node not found: ${this.state.currentNode}`);
        }

        // Execute node
        this.emitEvent({ type: 'node_start', nodeId: node.id });

        try {
          const updates = await node.execute(this.state);
          this.state = { ...this.state, ...updates };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.emitEvent({ type: 'error', nodeId: node.id, error: errorMessage });
          throw error;
        }

        this.emitEvent({ type: 'node_end', nodeId: node.id });

        // Check if reached end node
        if (this.state.currentNode && this.graph.endNodes.includes(this.state.currentNode)) {
          this.state.status = 'completed';
          break;
        }

        // Get next node
        if (this.state.currentNode) {
          const nextNode = this.getNextNode(this.state.currentNode);
          this.state.currentNode = nextNode;
        }
        this.state.iteration++;
      }

      // Handle max iterations
      if (this.state.iteration >= this.state.maxIterations) {
        this.state.status = 'error';
        this.state.error = 'Max iterations reached';
      }

      this.state.endTime = Date.now();
      this.emitEvent({ type: 'status_change', status: this.state.status });

      return this.state;
    } catch (error) {
      this.state.status = 'error';
      this.state.error = error instanceof Error ? error.message : 'Unknown error';
      this.state.endTime = Date.now();
      this.emitEvent({ type: 'status_change', status: 'error' });
      return this.state;
    }
  }

  pause(): void {
    if (this.state.status === 'running') {
      this.isPaused = true;
      this.state.status = 'paused';
      this.emitEvent({ type: 'status_change', status: 'paused' });
    }
  }

  resume(): void {
    if (this.state.status === 'paused') {
      this.isPaused = false;
      this.state.status = 'running';
      this.emitEvent({ type: 'status_change', status: 'running' });
    }
  }

  cancel(): void {
    this.state.status = 'cancelled';
    this.emitEvent({ type: 'status_change', status: 'cancelled' });
  }

  getState(): WorkflowState {
    return { ...this.state };
  }
}

// Builder class for creating workflow graphs
export class WorkflowGraphBuilder {
  private id: string;
  private name: string;
  private description: string;
  private nodes: Map<string, WorkflowNode> = new Map();
  private edges: WorkflowEdge[] = [];
  private entryPoint: string = '';
  private endNodes: string[] = [];

  constructor(id: string, name: string, description = '') {
    this.id = id;
    this.name = name;
    this.description = description;
  }

  addNode(node: WorkflowNode): this {
    this.nodes.set(node.id, node);
    return this;
  }

  addEdge(
    from: string,
    to: string | ((state: WorkflowState) => string),
    condition?: (state: WorkflowState) => boolean
  ): this {
    this.edges.push({ from, to, condition });
    return this;
  }

  setEntryPoint(nodeId: string): this {
    this.entryPoint = nodeId;
    return this;
  }

  addEndNode(nodeId: string): this {
    if (!this.endNodes.includes(nodeId)) {
      this.endNodes.push(nodeId);
    }
    return this;
  }

  build(): WorkflowGraph {
    if (!this.entryPoint) {
      throw new Error('Entry point not set');
    }
    if (this.endNodes.length === 0) {
      throw new Error('No end nodes defined');
    }
    if (!this.nodes.has(this.entryPoint)) {
      throw new Error(`Entry point node not found: ${this.entryPoint}`);
    }

    return {
      id: this.id,
      name: this.name,
      description: this.description,
      nodes: this.nodes,
      edges: this.edges,
      entryPoint: this.entryPoint,
      endNodes: this.endNodes,
    };
  }
}
