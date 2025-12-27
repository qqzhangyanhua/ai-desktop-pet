// Agent Panel - Shows agent status and tool call history

import { useAgentStore } from '../../stores';
import { ToolCallItem } from './ToolCallItem';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { ToolCallEvent, ToolResultEvent } from '../../types';

interface AgentPanelProps {
  onClose: () => void;
}

export function AgentPanel({ onClose }: AgentPanelProps) {
  const { status, events, clearEvents } = useAgentStore();

  // Extract tool calls and their results from events
  const toolCalls: Array<{ call: ToolCallEvent; result?: ToolResultEvent }> = [];
  const toolCallMap = new Map<string, ToolCallEvent>();

  for (const event of events) {
    if (event.type === 'tool_call') {
      toolCallMap.set(event.toolCallId, event);
      toolCalls.push({ call: event });
    } else if (event.type === 'tool_result') {
      const call = toolCallMap.get(event.toolCallId);
      if (call) {
        const existing = toolCalls.find((tc) => tc.call.toolCallId === event.toolCallId);
        if (existing) {
          existing.result = event;
        }
      }
    }
  }

  const getStatusDisplay = (): { text: string; className: string } => {
    switch (status) {
      case 'thinking':
        return { text: 'Thinking...', className: 'thinking' };
      case 'executing':
        return { text: 'Executing tools...', className: 'executing' };
      case 'done':
        return { text: 'Done', className: 'done' };
      case 'error':
        return { text: 'Error', className: 'error' };
      default:
        return { text: 'Idle', className: 'idle' };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="agent-panel no-drag">
      <div className="agent-panel-header">
        <span>Agent Activity</span>
        <div className="agent-panel-actions">
          {toolCalls.length > 0 && (
            <Button
              className="agent-clear-btn"
              onClick={clearEvents}
              title="Clear history"
              variant="outline"
              size="sm"
            >
              Clear
            </Button>
          )}
          <Button
            className="agent-close-btn h-6 w-6 p-0"
            onClick={onClose}
            variant="ghost"
            size="sm"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="agent-status-bar">
        <span className={`agent-status-dot ${statusDisplay.className}`} />
        <span className="agent-status-text">{statusDisplay.text}</span>
      </div>

      <div className="agent-tool-calls">
        {toolCalls.length === 0 ? (
          <div className="agent-empty-state">
            No tool calls yet
          </div>
        ) : (
          toolCalls.map((tc) => (
            <ToolCallItem
              key={tc.call.toolCallId}
              toolCall={tc.call}
              result={tc.result}
            />
          ))
        )}
      </div>
    </div>
  );
}
