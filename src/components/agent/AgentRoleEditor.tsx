// Agent Role Editor Component

import { useState, useCallback } from 'react';
import type { AgentRole } from '../../types';

interface AgentRoleEditorProps {
  role?: AgentRole | null;
  availableTools: string[];
  onSave: (role: Omit<AgentRole, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
}

export function AgentRoleEditor({
  role,
  availableTools,
  onSave,
  onCancel,
  onDelete,
}: AgentRoleEditorProps) {
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [systemPrompt, setSystemPrompt] = useState(role?.systemPrompt ?? '');
  const [selectedTools, setSelectedTools] = useState<string[]>(role?.tools ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!systemPrompt.trim()) {
      newErrors.systemPrompt = 'System prompt is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, systemPrompt]);

  const handleSave = useCallback(() => {
    if (!validate()) return;

    onSave({
      name: name.trim(),
      description: description.trim() || null,
      systemPrompt: systemPrompt.trim(),
      tools: selectedTools,
    });
  }, [name, description, systemPrompt, selectedTools, validate, onSave]);

  const handleToolToggle = useCallback((tool: string) => {
    setSelectedTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]
    );
  }, []);

  const handleDelete = useCallback(() => {
    if (role?.id && onDelete) {
      if (window.confirm(`Delete agent role "${role.name}"?`)) {
        onDelete(role.id);
      }
    }
  }, [role, onDelete]);

  return (
    <div style={{ padding: '16px' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>
        {role ? 'Edit Agent Role' : 'Create Agent Role'}
      </h3>

      {/* Name field */}
      <div style={{ marginBottom: '16px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 'bold',
            marginBottom: '4px',
          }}
        >
          Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Code Reviewer"
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '14px',
            border: errors.name ? '1px solid #ef4444' : '1px solid #e2e8f0',
            borderRadius: '6px',
            boxSizing: 'border-box',
          }}
        />
        {errors.name && (
          <span style={{ fontSize: '11px', color: '#ef4444' }}>{errors.name}</span>
        )}
      </div>

      {/* Description field */}
      <div style={{ marginBottom: '16px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 'bold',
            marginBottom: '4px',
          }}
        >
          Description
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of the agent's purpose"
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '14px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* System Prompt field */}
      <div style={{ marginBottom: '16px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 'bold',
            marginBottom: '4px',
          }}
        >
          System Prompt *
        </label>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="Instructions for the agent. Define its role, capabilities, and behavior..."
          rows={6}
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '13px',
            border: errors.systemPrompt ? '1px solid #ef4444' : '1px solid #e2e8f0',
            borderRadius: '6px',
            resize: 'vertical',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
        {errors.systemPrompt && (
          <span style={{ fontSize: '11px', color: '#ef4444' }}>{errors.systemPrompt}</span>
        )}
      </div>

      {/* Tools selection */}
      <div style={{ marginBottom: '16px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 'bold',
            marginBottom: '8px',
          }}
        >
          Available Tools
        </label>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          {availableTools.map((tool) => (
            <button
              key={tool}
              onClick={() => handleToolToggle(tool)}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                border: selectedTools.includes(tool)
                  ? '1px solid #6366f1'
                  : '1px solid #e2e8f0',
                borderRadius: '16px',
                backgroundColor: selectedTools.includes(tool) ? '#eef2ff' : 'white',
                color: selectedTools.includes(tool) ? '#6366f1' : '#64748b',
                cursor: 'pointer',
              }}
            >
              {tool}
            </button>
          ))}
        </div>
        <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
          {selectedTools.length} tools selected
        </span>
      </div>

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '16px',
          borderTop: '1px solid #e2e8f0',
        }}
      >
        <div>
          {role?.id && onDelete && (
            <button
              onClick={handleDelete}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                backgroundColor: '#fef2f2',
                color: '#ef4444',
                cursor: 'pointer',
              }}
            >
              Delete
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#6366f1',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            {role ? 'Save Changes' : 'Create Role'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Role list component
interface AgentRoleListProps {
  roles: AgentRole[];
  onSelect: (role: AgentRole) => void;
  onCreate: () => void;
}

export function AgentRoleList({ roles, onSelect, onCreate }: AgentRoleListProps) {
  return (
    <div style={{ padding: '12px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '14px' }}>Agent Roles</h3>
        <button
          onClick={onCreate}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: '#6366f1',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          + New Role
        </button>
      </div>

      {roles.length === 0 ? (
        <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
          No custom agent roles yet
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => onSelect(role)}
              style={{
                padding: '12px',
                textAlign: 'left',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                backgroundColor: 'white',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>
                {role.name}
              </div>
              {role.description && (
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                  {role.description}
                </div>
              )}
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                {role.tools.length} tools
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
