# 设置中心致命问题修复计划

## 架构分析

### 当前组件关系

```
入口文件:
├── src/settings.tsx → GameSettingsWindow (实际使用)
└── src/App.tsx → PetContainer → SettingsPanel (弹窗模式)

设置组件:
├── SettingsPanel.tsx (265行) - 弹窗模式, 用于主窗口
├── SettingsWindow.tsx (405行) - 独立窗口模式, 未使用!
├── GameSettingsWindow.tsx (230行) - 游戏风格独立窗口, settings.html入口
└── SettingsDashboard.tsx (136行) - 仪表板组件, 被GameSettingsWindow使用
```

### 致命问题清单

| ID | 问题 | 严重性 | 影响 |
|----|------|--------|------|
| P0-1 | AgentToolPolicyPanel未集成 | 高 | 工具权限配置无法使用 |
| P0-2 | 快捷键输入是摆设 | 高 | 用户体验极差 |
| P0-3 | SettingsWindow.tsx未使用 | 中 | 代码库臃肿 |
| P1-1 | MCP状态管理在顶层 | 中 | 代码耦合 |
| P1-2 | unknown类型逃避 | 低 | 类型安全 |
| P1-3 | 硬编码模型列表 | 低 | 维护性 |

---

## 修复计划

### P0-1: 集成AgentToolPolicyPanel到Advanced标签

**文件**: `src/components/settings/tabs/AdvancedTab.tsx`

**当前代码**:
```tsx
export function AdvancedTab({ ... }) {
  return (
    <>
      <MCPSettings ... />
      <SchedulerTestPanel />
      <DataSettings />
    </>
  );
}
```

**修改后**:
```tsx
import { AgentToolPolicyPanel } from '../AgentToolPolicyPanel';

export function AdvancedTab({ ... }) {
  return (
    <>
      <AgentToolPolicyPanel />  {/* 新增: 智能体工具权限 */}
      <MCPSettings ... />
      <SchedulerTestPanel />
      <DataSettings />
    </>
  );
}
```

**工作量**: 5分钟

---

### P0-2: 修复快捷键输入 - 使用ShortcutInput组件

**文件**: `src/components/settings/tabs/AssistantTab.tsx`

**当前代码** (行 186-222):
```tsx
<div className="settings-row">
  <span className="settings-label">打开聊天</span>
  <Input
    type="text"
    value={localConfig.assistant.shortcuts.openChat}
    onChange={(e) => ...}
    placeholder="例如：CmdOrCtrl+Shift+C"
  />
</div>
```

**修改后**:
```tsx
import { ShortcutInput } from '../ShortcutInput';

<div className="settings-row settings-row-column">
  <span className="settings-label">打开聊天</span>
  <ShortcutInput
    value={localConfig.assistant.shortcuts.openChat}
    onChange={(value) =>
      setLocalConfig((prev) => ({
        ...prev,
        assistant: {
          ...prev.assistant,
          shortcuts: { ...prev.assistant.shortcuts, openChat: value },
        },
      }))
    }
    placeholder="点击后按下快捷键"
  />
</div>
```

**工作量**: 15分钟

---

### P0-3: 删除未使用的SettingsWindow.tsx

**分析**:
- `settings.tsx` 使用 `GameSettingsWindow`
- `App.tsx` 使用 `SettingsPanel`
- `SettingsWindow.tsx` (405行) **完全未被引用**

**操作**:
1. 删除 `src/components/settings/SettingsWindow.tsx`
2. 从 `src/components/settings/index.ts` 移除导出 (如果有)

**工作量**: 5分钟

---

### P1-1: 重构MCP状态管理 - 下沉到AdvancedTab

**当前问题**: SettingsPanel 管理MCP状态并传递给 AdvancedTab

**SettingsPanel.tsx (行 30-85)**:
```tsx
const [mcpServers, setMcpServers] = useState<MCPServerConfig[]>([]);
const [mcpServerStates, setMcpServerStates] = useState<Map<string, MCPClientState>>(new Map());
// ... 4个handler函数
```

**方案**: 创建 `useMCPSettings` Hook

**新文件**: `src/hooks/useMCPSettings.ts`
```typescript
import { useState, useEffect, useCallback } from 'react';
import { getMCPManager } from '../services/mcp';
import type { MCPServerConfig, MCPClientState } from '../services/mcp/types';

export function useMCPSettings() {
  const [servers, setServers] = useState<MCPServerConfig[]>([]);
  const [serverStates, setServerStates] = useState<Map<string, MCPClientState>>(new Map());

  useEffect(() => {
    const manager = getMCPManager();
    setServers(manager.getServers());
    setServerStates(manager.getServerStates());
  }, []);

  const addServer = useCallback(async (config: MCPServerConfig) => {
    const manager = getMCPManager();
    manager.addServer(config);
    setServers(manager.getServers());
    try {
      await manager.connectServer(config.id);
      setServerStates(manager.getServerStates());
    } catch (error) {
      console.error('Failed to connect to server:', error);
    }
  }, []);

  const removeServer = useCallback((serverId: string) => {
    const manager = getMCPManager();
    manager.removeServer(serverId);
    setServers(manager.getServers());
    setServerStates(manager.getServerStates());
  }, []);

  const connect = useCallback(async (serverId: string) => {
    const manager = getMCPManager();
    await manager.connectServer(serverId);
    setServerStates(manager.getServerStates());
  }, []);

  const disconnect = useCallback(async (serverId: string) => {
    const manager = getMCPManager();
    await manager.disconnectServer(serverId);
    setServerStates(manager.getServerStates());
  }, []);

  return { servers, serverStates, addServer, removeServer, connect, disconnect };
}
```

**修改 AdvancedTab.tsx**:
```tsx
import { useMCPSettings } from '../../../hooks/useMCPSettings';

export function AdvancedTab() {
  const { servers, serverStates, addServer, removeServer, connect, disconnect } = useMCPSettings();

  return (
    <>
      <AgentToolPolicyPanel />
      <MCPSettings
        servers={servers}
        serverStates={serverStates}
        onAddServer={addServer}
        onRemoveServer={removeServer}
        onConnect={connect}
        onDisconnect={disconnect}
      />
      <SchedulerTestPanel />
      <DataSettings />
    </>
  );
}
```

**修改 SettingsPanel.tsx**: 删除MCP相关状态和handler (行 30-85)

**工作量**: 30分钟

---

### P1-2: 清理AssistantTab的unknown类型

**文件**: `src/components/settings/tabs/AssistantTab.tsx`

**当前代码** (行 33-42):
```typescript
interface AssistantTabProps {
  localConfig: AppConfig;
  setLocalConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  handleVoiceConfigChange?: (voice: VoiceConfig) => void;
  // 这些是垃圾:
  llmProviders?: unknown;
  availableModels?: unknown;
  onProviderChange?: unknown;
  // ...
}
```

**修改后**: 直接删除这些无用的props
```typescript
interface AssistantTabProps {
  localConfig: AppConfig;
  setLocalConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  handleVoiceConfigChange?: (voice: VoiceConfig) => void;
}
```

组件内部已经自己处理了provider/model变更逻辑, 这些外部props完全是历史遗留。

**工作量**: 10分钟

---

### P1-3: 模型列表外部化配置

**方案**: 将模型列表移到配置文件

**新文件**: `src/services/llm/models.ts`
```typescript
export interface ModelInfo {
  id: string;
  name: string;
  contextWindow?: number;
  isDeprecated?: boolean;
}

export const LLM_MODELS: Record<string, ModelInfo[]> = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o mini' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'o1', name: 'o1' },
    { id: 'o1-mini', name: 'o1 mini' },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
  ],
  ollama: [
    { id: 'llama3.3', name: 'Llama 3.3' },
    { id: 'qwen2.5', name: 'Qwen 2.5' },
    { id: 'deepseek-r1', name: 'DeepSeek R1' },
  ],
};

export function getModelsForProvider(provider: string): ModelInfo[] {
  return LLM_MODELS[provider] ?? [];
}
```

**工作量**: 20分钟

---

## 执行顺序

```
Phase 1 (P0 - 必须修复):
┌─────────────────────────────────────────────────────┐
│ 1. P0-1: 集成AgentToolPolicyPanel (5分钟)          │
│ 2. P0-2: 修复快捷键输入 (15分钟)                    │
│ 3. P0-3: 删除SettingsWindow.tsx (5分钟)            │
└─────────────────────────────────────────────────────┘
                    ↓
Phase 2 (P1 - 品味提升):
┌─────────────────────────────────────────────────────┐
│ 4. P1-1: 重构MCP状态管理 (30分钟)                   │
│ 5. P1-2: 清理unknown类型 (10分钟)                   │
│ 6. P1-3: 模型列表外部化 (20分钟)                    │
└─────────────────────────────────────────────────────┘

总工作量: 约 1.5 小时
```

---

## 验证清单

- [ ] AgentToolPolicyPanel 在高级设置中可见
- [ ] 快捷键输入支持键盘录制
- [ ] SettingsWindow.tsx 已删除
- [ ] AdvancedTab 不再需要从父组件接收MCP props
- [ ] AssistantTab 无unknown类型
- [ ] TypeScript编译无错误: `pnpm tsc --noEmit`
- [ ] 应用正常启动: `pnpm tauri dev`
