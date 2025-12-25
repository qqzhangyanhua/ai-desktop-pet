// Workflow Visualizer Component

import { useState, useMemo } from 'react';
import type { WorkflowState, AgentMessage } from '../../services/agent/workflows/types';

interface WorkflowVisualizerProps {
  state: WorkflowState | null;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
}

const AGENT_COLORS: Record<string, string> = {
  supervisor: '#6366f1',
  researcher: '#22c55e',
  writer: '#f59e0b',
  executor: '#ef4444',
  end: '#94a3b8',
};

const AGENT_ICONS: Record<string, string> = {
  supervisor: 'S',
  researcher: 'R',
  writer: 'W',
  executor: 'E',
  end: '-',
};

function AgentNode({
  id,
  isActive,
  isCompleted,
}: {
  id: string;
  isActive: boolean;
  isCompleted: boolean;
}) {
  const color = AGENT_COLORS[id] || '#64748b';
  const icon = AGENT_ICONS[id] || '?';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: isActive ? color : isCompleted ? `${color}80` : '#e2e8f0',
          border: isActive ? `3px solid ${color}` : '2px solid #cbd5e1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isActive || isCompleted ? 'white' : '#64748b',
          fontWeight: 'bold',
          fontSize: '14px',
          animation: isActive ? 'pulse 2s infinite' : 'none',
        }}
      >
        {icon}
      </div>
      <span
        style={{
          fontSize: '10px',
          color: isActive ? color : '#64748b',
          fontWeight: isActive ? 'bold' : 'normal',
          textTransform: 'capitalize',
        }}
      >
        {id}
      </span>
    </div>
  );
}

function MessageItem({ message }: { message: AgentMessage }) {
  const fromColor = AGENT_COLORS[message.from] || '#64748b';

  return (
    <div
      style={{
        padding: '8px 12px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        borderLeft: `3px solid ${fromColor}`,
        marginBottom: '8px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '4px',
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 'bold', color: fromColor }}>
          {message.from} → {message.to}
        </span>
        <span style={{ fontSize: '10px', color: '#94a3b8' }}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <p
        style={{
          fontSize: '12px',
          color: '#334155',
          margin: 0,
          whiteSpace: 'pre-wrap',
          maxHeight: '60px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {message.content.slice(0, 200)}
        {message.content.length > 200 ? '...' : ''}
      </p>
    </div>
  );
}

export function WorkflowVisualizer({
  state,
  onPause,
  onResume,
  onCancel,
}: WorkflowVisualizerProps) {
  const [showMessages, setShowMessages] = useState(true);

  const agents = ['supervisor', 'researcher', 'writer', 'executor', 'end'];

  const completedAgents = useMemo(() => {
    if (!state) return new Set<string>();
    return new Set(Object.keys(state.results));
  }, [state]);

  const statusColor = useMemo(() => {
    switch (state?.status) {
      case 'running':
        return '#22c55e';
      case 'paused':
        return '#f59e0b';
      case 'completed':
        return '#6366f1';
      case 'error':
        return '#ef4444';
      case 'cancelled':
        return '#94a3b8';
      default:
        return '#64748b';
    }
  }, [state?.status]);

  const elapsedTime = useMemo(() => {
    if (!state?.startTime) return null;
    const end = state.endTime || Date.now();
    const seconds = Math.round((end - state.startTime) / 1000);
    return `${seconds}s`;
  }, [state?.startTime, state?.endTime]);

  if (!state) {
    return (
      <div
        style={{
          padding: '20px',
          textAlign: 'center',
          color: '#94a3b8',
        }}
      >
        No workflow running
      </div>
    );
  }

  return (
    <div style={{ padding: '12px' }}>
      {/* Status bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          padding: '8px 12px',
          backgroundColor: '#f1f5f9',
          borderRadius: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: statusColor,
            }}
          />
          <span style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'capitalize' }}>
            {state.status}
          </span>
          {elapsedTime && (
            <span style={{ fontSize: '11px', color: '#64748b' }}>({elapsedTime})</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          {state.status === 'running' && onPause && (
            <button
              onClick={onPause}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer',
              }}
            >
              Pause
            </button>
          )}
          {state.status === 'paused' && onResume && (
            <button
              onClick={onResume}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                border: '1px solid #22c55e',
                borderRadius: '4px',
                backgroundColor: '#dcfce7',
                cursor: 'pointer',
              }}
            >
              Resume
            </button>
          )}
          {(state.status === 'running' || state.status === 'paused') && onCancel && (
            <button
              onClick={onCancel}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                border: '1px solid #fecaca',
                borderRadius: '4px',
                backgroundColor: '#fef2f2',
                color: '#ef4444',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Agent nodes visualization */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '16px 0',
          marginBottom: '16px',
          backgroundColor: '#fafafa',
          borderRadius: '8px',
        }}
      >
        {agents.map((agent, index) => (
          <div key={agent} style={{ display: 'flex', alignItems: 'center' }}>
            <AgentNode
              id={agent}
              isActive={state.currentNode === agent}
              isCompleted={completedAgents.has(agent)}
            />
            {index < agents.length - 1 && (
              <div
                style={{
                  width: '30px',
                  height: '2px',
                  backgroundColor: '#e2e8f0',
                  margin: '0 8px',
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Iteration counter */}
      <div
        style={{
          fontSize: '11px',
          color: '#64748b',
          textAlign: 'center',
          marginBottom: '12px',
        }}
      >
        Iteration {state.iteration} / {state.maxIterations}
      </div>

      {/* Messages section */}
      <div>
        <button
          onClick={() => setShowMessages(!showMessages)}
          style={{
            width: '100%',
            padding: '8px',
            fontSize: '12px',
            fontWeight: 'bold',
            border: 'none',
            backgroundColor: '#f1f5f9',
            borderRadius: '6px',
            cursor: 'pointer',
            marginBottom: '8px',
          }}
        >
          {showMessages ? 'Hide' : 'Show'} Messages ({state.messages.length})
        </button>

        {showMessages && (
          <div
            style={{
              maxHeight: '200px',
              overflowY: 'auto',
              padding: '8px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
            }}
          >
            {state.messages.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
                No messages yet
              </p>
            ) : (
              state.messages
                .slice()
                .reverse()
                .map((msg) => <MessageItem key={msg.id} message={msg} />)
            )}
          </div>
        )}
      </div>

      {/* Output section */}
      {state.output && (
        <div
          style={{
            marginTop: '12px',
            padding: '12px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '8px',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 'bold',
              color: '#16a34a',
              marginBottom: '8px',
            }}
          >
            Final Output
          </div>
          <p
            style={{
              fontSize: '12px',
              color: '#334155',
              margin: 0,
              whiteSpace: 'pre-wrap',
            }}
          >
            {state.output}
          </p>
        </div>
      )}

      {/* Error section */}
      {state.error && (
        <div
          style={{
            marginTop: '12px',
            padding: '12px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 'bold',
              color: '#dc2626',
              marginBottom: '8px',
            }}
          >
            Error
          </div>
          <p style={{ fontSize: '12px', color: '#7f1d1d', margin: 0 }}>{state.error}</p>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
