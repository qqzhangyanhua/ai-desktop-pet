// Tool Call Item - Displays a single tool call with its status and result

import { useState } from 'react';
import type { ToolCallEvent, ToolResultEvent } from '../../types';

interface ToolCallItemProps {
  toolCall: ToolCallEvent;
  result?: ToolResultEvent;
}

export function ToolCallItem({ toolCall, result }: ToolCallItemProps) {
  const [expanded, setExpanded] = useState(false);

  const getStatusIcon = (): string => {
    if (!result) return '...';
    if (result.error) return '!';
    return 'v';
  };

  const getStatusClass = (): string => {
    if (!result) return 'pending';
    if (result.error) return 'error';
    return 'success';
  };

  const formatArgs = (args: Record<string, unknown>): string => {
    try {
      return JSON.stringify(args, null, 2);
    } catch {
      return String(args);
    }
  };

  const formatResult = (resultData: unknown): string => {
    try {
      if (typeof resultData === 'string') return resultData;
      return JSON.stringify(resultData, null, 2);
    } catch {
      return String(resultData);
    }
  };

  return (
    <div className={`tool-call-item ${getStatusClass()}`}>
      <div
        className="tool-call-header"
        onClick={() => setExpanded(!expanded)}
      >
        <span className={`tool-status-icon ${getStatusClass()}`}>
          {getStatusIcon()}
        </span>
        <span className="tool-name">{toolCall.toolName}</span>
        <span className="tool-expand-icon">{expanded ? '-' : '+'}</span>
      </div>

      {expanded && (
        <div className="tool-call-details">
          <div className="tool-call-section">
            <span className="tool-section-label">Arguments:</span>
            <pre className="tool-code-block">
              {formatArgs(toolCall.arguments)}
            </pre>
          </div>

          {result && (
            <div className="tool-call-section">
              <span className="tool-section-label">
                {result.error ? 'Error:' : 'Result:'}
              </span>
              <pre className={`tool-code-block ${result.error ? 'error' : ''}`}>
                {result.error || formatResult(result.result)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
