// Agent Runtime - Manages tool calling with LLM

import { streamText, stepCountIs, type CoreMessage } from 'ai';
import { createModel } from '../llm/providers';
import type { LLMProviderConfig } from '../llm/types';
import type { Tool, AgentEvent, ToolCallEvent, ToolResultEvent, TextEvent, StatusEvent } from '../../types';
import { createBuiltInTools } from './tools';
import { z } from 'zod';
import { confirmAction } from '@/lib/confirm';

export interface AgentRuntimeConfig {
  llmConfig: LLMProviderConfig;
  systemPrompt?: string;
  tools?: Tool[];
  maxSteps?: number;
  onEvent?: (event: AgentEvent) => void;
}

export interface AgentRunResult {
  content: string;
  events: AgentEvent[];
  toolCalls: Array<{
    name: string;
    args: Record<string, unknown>;
    result: unknown;
  }>;
}

function emitEvent(event: AgentEvent, onEvent?: (event: AgentEvent) => void): void {
  onEvent?.(event);
}

function createStatusEvent(
  status: StatusEvent['status'],
  message?: string
): StatusEvent {
  return { type: 'status', status, message };
}

function createTextEvent(content: string): TextEvent {
  return { type: 'text', content };
}

function createToolCallEvent(
  toolName: string,
  toolCallId: string,
  args: Record<string, unknown>
): ToolCallEvent {
  return { type: 'tool_call', toolName, toolCallId, arguments: args };
}

function createToolResultEvent(
  toolCallId: string,
  result: unknown,
  error?: string
): ToolResultEvent {
  return { type: 'tool_result', toolCallId, result, error };
}

// Build zod schema from our tool schema
function buildZodSchema(properties: Record<string, { type: string; description: string; enum?: string[] }>, required: string[]): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const zodSchema: Record<string, z.ZodTypeAny> = {};

  for (const [key, prop] of Object.entries(properties)) {
    let zodType: z.ZodTypeAny;

    switch (prop.type) {
      case 'string':
        zodType = prop.enum ? z.enum(prop.enum as [string, ...string[]]) : z.string();
        break;
      case 'number':
        zodType = z.number();
        break;
      case 'boolean':
        zodType = z.boolean();
        break;
      default:
        zodType = z.unknown();
    }

    if (prop.description) {
      zodType = zodType.describe(prop.description);
    }

    if (!required.includes(key)) {
      zodType = zodType.optional();
    }

    zodSchema[key] = zodType;
  }

  return z.object(zodSchema);
}

function formatArgsForConfirmation(args: Record<string, unknown>): string {
  const redactKeys = new Set(['apiKey', 'api_key', 'token', 'password', 'secret']);

  const valueToPreview = (value: unknown): unknown => {
    if (typeof value === 'string') {
      if (value.length <= 160) return value;
      return `${value.slice(0, 160)}…(共${value.length}字)`;
    }
    if (Array.isArray(value)) return value.slice(0, 10).map(valueToPreview);
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj).slice(0, 20)) {
        out[k] = redactKeys.has(k) ? '[已脱敏]' : valueToPreview(v);
      }
      return out;
    }
    return value;
  };

  try {
    return JSON.stringify(valueToPreview(args), null, 2);
  } catch {
    return '[参数无法序列化]';
  }
}

async function confirmToolExecution(tool: Tool, args: Record<string, unknown>): Promise<boolean> {
  const preview = formatArgsForConfirmation(args);
  const message =
    `工具「${tool.name}」需要你的确认才能执行。\n\n` +
    `说明：${tool.description}\n\n` +
    `参数预览：\n${preview}\n\n` +
    `是否允许执行？`;

  return await confirmAction(message, {
    title: '需要确认',
    kind: 'warning',
    okLabel: '允许',
    cancelLabel: '拒绝',
  });
}

export class AgentRuntime {
  private tools: Map<string, Tool> = new Map();
  private abortController: AbortController | null = null;

  constructor(private config: AgentRuntimeConfig) {
    // Register built-in tools
    const builtInTools = createBuiltInTools();
    for (const tool of builtInTools) {
      this.tools.set(tool.name, tool);
    }

    // Register custom tools
    if (config.tools) {
      for (const tool of config.tools) {
        this.tools.set(tool.name, tool);
      }
    }
  }

  getTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  addTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  removeTool(name: string): boolean {
    return this.tools.delete(name);
  }

  async run(
    messages: CoreMessage[],
    enabledTools?: string[]
  ): Promise<AgentRunResult> {
    const { llmConfig, systemPrompt, onEvent } = this.config;

    // Create model
    const model = createModel(llmConfig);

    // Filter and convert tools
    const toolsToUse = enabledTools
      ? Array.from(this.tools.values()).filter((t) => enabledTools.includes(t.name))
      : Array.from(this.tools.values());

    // AI SDK tool type definition
    interface SDKTool {
      description: string;
      inputSchema: z.ZodObject<Record<string, z.ZodTypeAny>>;
      execute: (args: Record<string, unknown>) => Promise<unknown>;
    }

    // Convert to AI SDK tools format
    const sdkTools: Record<string, SDKTool> = {};
    for (const t of toolsToUse) {
      const properties = t.schema.parameters.properties;
      const required = t.schema.parameters.required ?? [];
      const inputSchema = buildZodSchema(properties, required);

      sdkTools[t.name] = {
        description: t.description,
        inputSchema: inputSchema,
        execute: async (args: Record<string, unknown>) => {
          if (t.requiresConfirmation) {
            const allowed = await confirmToolExecution(t, args);
            if (!allowed) {
              return {
                success: false,
                error: '用户拒绝执行该工具',
              };
            }
          }
          return t.execute(args);
        },
      };
    }

    // Prepare messages
    const fullMessages: CoreMessage[] = [];
    if (systemPrompt) {
      fullMessages.push({ role: 'system', content: systemPrompt });
    }
    fullMessages.push(...messages);

    // Track events and results
    const events: AgentEvent[] = [];
    const toolCallsResult: AgentRunResult['toolCalls'] = [];
    let fullContent = '';

    // Create abort controller
    this.abortController = new AbortController();

    try {
      emitEvent(createStatusEvent('thinking'), onEvent);
      events.push(createStatusEvent('thinking'));

      const result = streamText({
        model,
        messages: fullMessages,
        tools: sdkTools,
        stopWhen: stepCountIs(this.config.maxSteps ?? 5),
        temperature: llmConfig.temperature ?? 0.7,
        maxOutputTokens: llmConfig.maxTokens ?? 2048,
        abortSignal: this.abortController.signal,
        onStepFinish: ({ text, toolCalls, toolResults }) => {
          // Emit text events
          if (text) {
            const textEvent = createTextEvent(text);
            emitEvent(textEvent, onEvent);
            events.push(textEvent);
          }

          // Emit tool call/result events
          if (toolCalls) {
            for (const tc of toolCalls) {
              const callEvent = createToolCallEvent(
                tc.toolName,
                tc.toolCallId,
                'args' in tc ? (tc.args as Record<string, unknown>) : {}
              );
              emitEvent(callEvent, onEvent);
              events.push(callEvent);
            }
          }

          if (toolResults) {
            for (const tr of toolResults) {
              const resultValue = 'result' in tr ? tr.result : tr;
              const resultEvent = createToolResultEvent(tr.toolCallId, resultValue);
              emitEvent(resultEvent, onEvent);
              events.push(resultEvent);

              // Track for final result
              const tc = toolCalls?.find((c) => c.toolCallId === tr.toolCallId);
              if (tc) {
                toolCallsResult.push({
                  name: tc.toolName,
                  args: 'args' in tc ? (tc.args as Record<string, unknown>) : {},
                  result: resultValue,
                });
              }
            }
          }

          // Update status
          if (toolCalls && toolCalls.length > 0) {
            emitEvent(createStatusEvent('executing', 'Executing tools...'), onEvent);
          }
        },
      });

      // Stream text content
      for await (const chunk of result.textStream) {
        fullContent += chunk;
      }

      // Wait for completion
      await result.text;

      emitEvent(createStatusEvent('done'), onEvent);
      events.push(createStatusEvent('done'));

      return {
        content: fullContent,
        events,
        toolCalls: toolCallsResult,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      emitEvent(createStatusEvent('error', errorMessage), onEvent);
      events.push(createStatusEvent('error', errorMessage));

      return {
        content: fullContent,
        events,
        toolCalls: toolCallsResult,
      };
    } finally {
      this.abortController = null;
    }
  }

  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  isRunning(): boolean {
    return this.abortController !== null;
  }
}
