// MCP Settings Component

import { useState, useCallback } from 'react';
import type { MCPServerConfig, MCPClientState, MCPToolSchema } from '../../services/mcp/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface MCPSettingsProps {
  servers: MCPServerConfig[];
  serverStates: Map<string, MCPClientState>;
  onAddServer: (config: MCPServerConfig) => void;
  onRemoveServer: (serverId: string) => void;
  onConnect: (serverId: string) => void;
  onDisconnect: (serverId: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  connected: 'bg-green-500',
  connecting: 'bg-amber-500',
  disconnected: 'bg-slate-400',
  error: 'bg-red-500',
};

function ServerCard({
  config,
  state,
  onConnect,
  onDisconnect,
  onRemove,
}: {
  config: MCPServerConfig;
  state: MCPClientState | undefined;
  onConnect: () => void;
  onDisconnect: () => void;
  onRemove: () => void;
}) {
  const status = state?.status ?? 'disconnected';
  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';
  const statusColorClass = STATUS_COLORS[status] || 'bg-slate-400';

  return (
    <div className="game-card">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full ${statusColorClass}`} />
            <span className="font-bold text-[13px]">{config.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">
              {config.transport}
            </span>
          </div>

          {config.description && (
            <p className="text-[11px] text-slate-500 my-1">
              {config.description}
            </p>
          )}

          {config.transport === 'stdio' && config.command && (
            <p className="text-[10px] text-slate-400 my-1 font-mono">
              {config.command} {config.args?.join(' ')}
            </p>
          )}

          {config.transport === 'http' && config.url && (
            <p className="text-[10px] text-slate-400 my-1 font-mono">
              {config.url}
            </p>
          )}

          {state?.error && (
            <p className="text-[11px] text-red-500 my-1">
              错误: {state.error}
            </p>
          )}

          {isConnected && state?.tools && state.tools.length > 0 && (
            <div className="mt-2">
              <span className="text-[11px] text-slate-500">
                可用 {state.tools.length} 个工具
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {state.tools.slice(0, 5).map((tool: MCPToolSchema) => (
                  <span
                    key={tool.name}
                    className="text-[10px] px-1.5 py-0.5 bg-indigo-50 rounded text-indigo-500"
                  >
                    {tool.name}
                  </span>
                ))}
                {state.tools.length > 5 && (
                  <span className="text-[10px] text-slate-400">
                    还有 {state.tools.length - 5} 个
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-1 ml-2">
          {isConnected ? (
            <Button
              onClick={onDisconnect}
              variant="outline"
              size="sm"
              className="px-2 py-1 text-[11px] border-red-200 bg-red-50 text-red-500 hover:bg-red-100"
            >
              断开连接
            </Button>
          ) : (
            <Button
              onClick={onConnect}
              disabled={isConnecting}
              variant="outline"
              size="sm"
              className={`
                px-2 py-1 text-[11px]
                ${isConnecting
                  ? 'border-green-200 bg-green-50 text-green-600 opacity-70'
                  : 'border-green-300 bg-green-50 text-green-600 hover:bg-green-100'
                }
              `}
            >
              {isConnecting ? '连接中...' : '连接'}
            </Button>
          )}
          <Button
            onClick={onRemove}
            variant="outline"
            size="sm"
            className="px-2 py-1 text-[11px] border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
          >
            移除
          </Button>
        </div>
      </div>
    </div>
  );
}

function AddServerForm({
  onAdd,
  onCancel,
}: {
  onAdd: (config: MCPServerConfig) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [transport, setTransport] = useState<'stdio' | 'http'>('stdio');
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState('');
  const [url, setUrl] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = '名称不能为空';
    }

    if (transport === 'stdio' && !command.trim()) {
      newErrors.command = '命令不能为空';
    }

    if (transport === 'http' && !url.trim()) {
      newErrors.url = 'URL 不能为空';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, transport, command, url]);

  const handleSubmit = useCallback(() => {
    if (!validate()) return;

    const config: MCPServerConfig = {
      id: `mcp_${Date.now()}`,
      name: name.trim(),
      description: description.trim() || undefined,
      transport,
      ...(transport === 'stdio'
        ? {
            command: command.trim(),
            args: args.trim() ? args.split(' ').filter(Boolean) : undefined,
          }
        : {
            url: url.trim(),
          }),
    };

    onAdd(config);
  }, [name, description, transport, command, args, url, validate, onAdd]);

  return (
    <div className="game-card">
      <h4 className="m-0 mb-3 text-sm font-semibold text-slate-700">添加 MCP 服务器</h4>

      <div className="mb-3">
        <label className="block text-xs font-bold mb-1 text-slate-600">
          名称 *
        </label>
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：文件系统"
          className={`
            w-full p-2 text-[13px]
            ${errors.name ? 'border-red-500' : 'border-slate-200'}
          `}
        />
        {errors.name && <span className="text-[11px] text-red-500 mt-1 block">{errors.name}</span>}
      </div>

      <div className="mb-3">
        <label className="block text-xs font-bold mb-1 text-slate-600">
          描述
        </label>
        <Input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="简短描述"
          className="w-full p-2 text-[13px] border-slate-200"
        />
      </div>

      <div className="mb-3">
        <label className="block text-xs font-bold mb-1 text-slate-600">
          传输方式
        </label>
        <div className="flex gap-2">
          <Button
            onClick={() => setTransport('stdio')}
            variant={transport === 'stdio' ? 'default' : 'outline'}
            size="sm"
            className={transport === 'stdio' ? 'bg-indigo-500 text-white hover:bg-indigo-600' : ''}
          >
            stdio
          </Button>
          <Button
            onClick={() => setTransport('http')}
            variant={transport === 'http' ? 'default' : 'outline'}
            size="sm"
            className={transport === 'http' ? 'bg-indigo-500 text-white hover:bg-indigo-600' : ''}
          >
            HTTP
          </Button>
        </div>
      </div>

      {transport === 'stdio' && (
        <>
          <div className="mb-3">
            <label className="block text-xs font-bold mb-1 text-slate-600">
              命令 *
            </label>
            <Input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="例如：npx"
              className={`
                w-full p-2 text-[13px] font-mono
                ${errors.command ? 'border-red-500' : 'border-slate-200'}
              `}
            />
            {errors.command && <span className="text-[11px] text-red-500 mt-1 block">{errors.command}</span>}
          </div>

          <div className="mb-3">
            <label className="block text-xs font-bold mb-1 text-slate-600">
              参数
            </label>
            <Input
              type="text"
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              placeholder="例如：-y @modelcontextprotocol/server-filesystem"
              className="w-full p-2 text-[13px] font-mono border-slate-200"
            />
          </div>
        </>
      )}

      {transport === 'http' && (
        <div className="mb-3">
          <label className="block text-xs font-bold mb-1 text-slate-600">
            URL *
          </label>
          <Input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="例如：http://localhost:3000/mcp"
            className={`
              w-full p-2 text-[13px] font-mono
              ${errors.url ? 'border-red-500' : 'border-slate-200'}
            `}
          />
          {errors.url && <span className="text-[11px] text-red-500 mt-1 block">{errors.url}</span>}
        </div>
      )}

      <div className="flex justify-end gap-2 mt-4">
        <Button
          onClick={onCancel}
          variant="outline"
          size="sm"
          className="px-3 py-1.5 text-xs"
        >
          取消
        </Button>
        <Button
          onClick={handleSubmit}
          size="sm"
          className="px-3 py-1.5 text-xs bg-indigo-500 hover:bg-indigo-600"
        >
          添加服务器
        </Button>
      </div>
    </div>
  );
}

export function MCPSettings({
  servers,
  serverStates,
  onAddServer,
  onRemoveServer,
  onConnect,
  onDisconnect,
}: MCPSettingsProps) {
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAdd = useCallback(
    (config: MCPServerConfig) => {
      onAddServer(config);
      setShowAddForm(false);
    },
    [onAddServer]
  );

  return (
    <div className="settings-section">
      <div className="settings-section-title">MCP 服务器</div>

      {showAddForm ? (
        <AddServerForm onAdd={handleAdd} onCancel={() => setShowAddForm(false)} />
      ) : (
        <Button
          onClick={() => setShowAddForm(true)}
          variant="outline"
          className="w-full p-2 mb-3 text-xs border-dashed"
        >
          + 添加 MCP 服务器
        </Button>
      )}

      {servers.length === 0 ? (
        <p className="text-xs text-slate-400 text-center p-5">
          尚未配置 MCP 服务器
        </p>
      ) : (
        servers.map((server) => (
          <ServerCard
            key={server.id}
            config={server}
            state={serverStates.get(server.id)}
            onConnect={() => onConnect(server.id)}
            onDisconnect={() => onDisconnect(server.id)}
            onRemove={() => onRemoveServer(server.id)}
          />
        ))
      )}

      <div className="text-[11px] text-slate-400 p-2 bg-slate-50 rounded-md mt-2">
        MCP 服务器为 AI 助手提供额外工具。可以连接到文件系统、GitHub 或自定义服务器来扩展功能。
      </div>
    </div>
  );
}
