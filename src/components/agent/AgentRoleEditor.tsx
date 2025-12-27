// Agent Role Editor Component

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { AgentRole } from '../../types';
import { confirmAction } from '@/lib/confirm';

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

  const handleDelete = useCallback(async () => {
    if (role?.id && onDelete) {
      const ok = await confirmAction(`确认删除智能体角色「${role.name}」吗？`, {
        title: '删除智能体角色',
        kind: 'warning',
        okLabel: '删除',
        cancelLabel: '取消',
      });
      if (ok) {
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
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Code Reviewer"
          className={errors.name ? 'border-red-500' : ''}
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
        <Input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of the agent's purpose"
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
        <Textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="Instructions for the agent. Define its role, capabilities, and behavior..."
          rows={6}
          className={errors.systemPrompt ? 'border-red-500' : ''}
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
            <Button
              key={tool}
              onClick={() => handleToolToggle(tool)}
              variant={selectedTools.includes(tool) ? 'default' : 'outline'}
              size="sm"
              className={selectedTools.includes(tool) ? 'bg-indigo-500 hover:bg-indigo-600' : ''}
            >
              {tool}
            </Button>
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
            <Button
              onClick={handleDelete}
              variant="outline"
              size="sm"
              className="bg-red-50 text-red-500 border-red-200 hover:bg-red-100"
            >
              Delete
            </Button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            onClick={onCancel}
            variant="outline"
            size="sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-indigo-500 hover:bg-indigo-600"
            size="sm"
          >
            {role ? 'Save Changes' : 'Create Role'}
          </Button>
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
        <Button
          onClick={onCreate}
          className="bg-indigo-500 hover:bg-indigo-600"
          size="sm"
        >
          + New Role
        </Button>
      </div>

      {roles.length === 0 ? (
        <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
          No custom agent roles yet
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {roles.map((role) => (
            <Button
              key={role.id}
              onClick={() => onSelect(role)}
              variant="outline"
              className="justify-start text-left h-auto py-3"
            >
              <div className="w-full">
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
              </div>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
