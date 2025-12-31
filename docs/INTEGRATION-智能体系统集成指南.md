# 智能体系统集成指南

> **文档版本**: v1.0  
> **创建日期**: 2025-12-31  
> **状态**: ✅ 已完成

---

## 📋 集成概览

智能体系统已成功集成到应用主流程中，包括：

### ✅ 已完成的集成

1. **应用启动集成** (`App.tsx`)
   - 通过 `useAgentSystem` Hook 自动初始化
   - 通过 `useAgentListener` Hook 监听智能体事件
   - 在数据库和配置加载完成后启动

2. **用户对话集成** (`useChat.ts`)
   - 用户发送消息时自动触发智能体
   - 智能体可以感知对话内容和情绪
   - 支持智能体主动响应

3. **事件系统集成** (`integration.ts`)
   - 提供统一的事件触发接口
   - 支持用户行为记录
   - 支持跨模块事件通信

---

## 🏗️ 核心架构

```
应用启动
  ↓
App.tsx (useAgentSystem)
  ↓
AgentDispatcher 初始化
  ↓
TriggerManager 初始化
  ↓
注册 10 个智能体
  ↓
启动智能体系统
  ↓
监听事件 (useAgentListener)
```

---

## 📁 文件结构

```
src/
├── hooks/
│   ├── useAgentSystem.ts          # 智能体系统初始化 Hook
│   ├── useAgentListener.ts        # 智能体事件监听 Hook
│   └── useChat.ts                 # 对话 Hook（已集成触发器）
│
├── services/
│   ├── agent-registry.ts          # 智能体注册服务
│   └── agent/
│       ├── integration.ts         # 集成接口
│       ├── index.ts               # 统一导出
│       ├── agents/                # 10 个智能体实现
│       ├── dispatcher/            # 调度器
│       ├── tools/                 # 工具集
│       └── utils/                 # 工具函数
│
├── stores/
│   └── agentSystemStore.ts        # 智能体系统状态管理
│
└── types/
    └── agent-system.ts            # 类型定义
```

---

## 🔌 集成点说明

### 1. 应用启动集成

**位置**: `src/App.tsx`

```typescript
// 初始化智能体系统
useAgentSystem({
  autoStart: true,      // 自动启动
  enableInDev: true,    // 开发模式启用
});

// 监听智能体事件
useAgentListener();
```

**时机**: 在数据库初始化完成后，通过 Hook 自动启动

**功能**:
- 创建 `AgentDispatcher` 和 `TriggerManager` 单例
- 注册所有 10 个智能体
- 启动调度系统
- 开始监听触发器

---

### 2. 用户对话集成

**位置**: `src/hooks/useChat.ts`

```typescript
// 触发智能体系统处理用户消息
try {
  const { triggerUserMessage } = await import('../services/agent/integration');
  void triggerUserMessage(content.trim());
} catch (error) {
  console.warn('[useChat] Failed to trigger agent system:', error);
}
```

**时机**: 用户发送消息后立即触发

**功能**:
- 将用户消息传递给智能体系统
- 匹配关键词触发相应智能体
- 智能体可以感知对话上下文

---

### 3. 事件触发集成

**位置**: `src/services/agent/integration.ts`

提供的接口：

```typescript
// 触发用户消息
triggerUserMessage(message: string): Promise<void>

// 触发自定义事件
triggerEvent(eventName: string, data?: Record<string, unknown>): void

// 记录用户互动
recordUserInteraction(type: string, value?: number): void

// 触发情绪检测
triggerEmotionDetection(emotion: string, intensity: number): void

// 触发日程提醒
triggerScheduleReminder(scheduleId: string): void
```

**使用示例**:

```typescript
import { triggerEvent, recordUserInteraction } from '@/services/agent/integration';

// 记录用户点击
recordUserInteraction('feed', 1);

// 触发自定义事件
triggerEvent('pet_level_up', { level: 5 });
```

---

## 🎯 智能体触发方式

### 1. 用户消息触发

**触发条件**: 用户发送包含关键词的消息

**示例**:
- 用户说 "我好累" → 触发 `情绪感知智能体`
- 用户说 "提醒我明天开会" → 触发 `日程管家智能体`
- 用户说 "讲个故事" → 触发 `睡前故事智能体`

### 2. 定时触发

**触发条件**: 按设定的时间间隔触发

**示例**:
- 每小时触发 `健康管家` 提醒喝水
- 每 45 分钟触发 `健康管家` 提醒站立
- 每晚 10 点触发 `每日总结智能体`

### 3. 条件触发

**触发条件**: 满足特定条件时触发

**示例**:
- 检测到焦虑情绪 → 触发 `冥想引导智能体`
- 到达睡眠时间 → 触发 `睡前故事智能体`
- 早晨时间 → 触发 `天气生活智能体` 播报

### 4. 事件触发

**触发条件**: 应用内发生特定事件

**示例**:
- 用户解锁成就 → 触发 `成就解锁智能体`
- 用户完成任务 → 触发 `每日总结智能体`
- 情绪变化 → 触发 `情绪感知智能体`

---

## 🔧 配置与控制

### 全局开关

**位置**: `agentSystemStore`

```typescript
import { useAgentSystemStore } from '@/stores/agentSystemStore';

// 启用/禁用整个智能体系统
useAgentSystemStore.getState().setGlobalEnabled(true);

// 查看系统状态
const { systemStatus, globalEnabled } = useAgentSystemStore.getState();
```

### 单个智能体控制

```typescript
// 启用/禁用特定智能体
useAgentSystemStore.getState().setAgentEnabled('agent-health-butler', false);

// 查看智能体列表
const agents = useAgentSystemStore.getState().registeredAgents;
```

### 调度器配置

```typescript
import { getAgentDispatcher } from '@/services/agent/dispatcher';

const dispatcher = getAgentDispatcher();

// 更新配置
dispatcher.updateConfig({
  maxConcurrency: 3,
  taskTimeout: 30000,
  retryAttempts: 2,
});
```

---

## 📊 监控与调试

### 查看系统状态

```typescript
import { useAgentSystemStore } from '@/stores/agentSystemStore';

const store = useAgentSystemStore.getState();

console.log('系统状态:', store.systemStatus);
console.log('已注册智能体:', store.registeredAgents.length);
console.log('活动任务:', store.activeTasks.length);
console.log('执行历史:', store.executionHistory.slice(-10));
```

### 日志输出

智能体系统会在控制台输出详细日志：

```
[AgentSystem] Starting initialization...
[AgentRegistry] Registering all agents...
[AgentRegistry] ✅ Registered 10 total agents
[AgentSystem] Starting dispatcher...
[AgentSystem] Starting trigger manager...
[AgentSystem] ✅ Agent system started successfully
```

### 事件监听

```typescript
import { getTriggerManager } from '@/services/agent/dispatcher';

const triggerManager = getTriggerManager();

// 监听触发器激活
triggerManager.onTrigger((context) => {
  console.log('触发器激活:', context.triggerId);
});
```

---

## 🎨 UI 集成建议

### 1. 智能体状态指示器

可以在设置页面添加智能体系统状态显示：

```tsx
import { useAgentSystemStore } from '@/stores/agentSystemStore';

function AgentSystemStatus() {
  const { systemStatus, registeredAgents, activeTasks } = useAgentSystemStore();

  return (
    <div>
      <h3>智能体系统</h3>
      <p>状态: {systemStatus}</p>
      <p>已注册: {registeredAgents.length} 个智能体</p>
      <p>活动任务: {activeTasks.length}</p>
    </div>
  );
}
```

### 2. 智能体列表管理

```tsx
function AgentList() {
  const { registeredAgents, agentEnabledMap, setAgentEnabled } = useAgentSystemStore();

  return (
    <div>
      {registeredAgents.map((agent) => (
        <div key={agent.agent.metadata.id}>
          <span>{agent.agent.metadata.icon} {agent.agent.metadata.name}</span>
          <Switch
            checked={agentEnabledMap[agent.agent.metadata.id] ?? agent.enabled}
            onChange={(enabled) => setAgentEnabled(agent.agent.metadata.id, enabled)}
          />
        </div>
      ))}
    </div>
  );
}
```

### 3. 执行历史查看

```tsx
function AgentHistory() {
  const { executionHistory } = useAgentSystemStore();

  return (
    <div>
      <h3>执行历史</h3>
      {executionHistory.slice(-10).reverse().map((record) => (
        <div key={record.executionId}>
          <p>{new Date(record.startTime).toLocaleString()}</p>
          <p>{record.agentId}</p>
          <p>状态: {record.status}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## 🚀 扩展智能体

### 添加新智能体

1. **创建智能体类**

```typescript
// src/services/agent/agents/my-agent.ts
import { BaseAgent } from './base-agent';

export class MyAgent extends BaseAgent {
  readonly metadata = {
    id: 'agent-my-agent',
    name: '我的智能体',
    description: '描述',
    version: '1.0.0',
    icon: '🤖',
    category: 'utility',
    priority: 'normal',
    isSystem: false,
  };

  protected async onExecute(context: AgentContext): Promise<AgentResult> {
    // 实现逻辑
    return this.createResult(true, '执行成功');
  }
}
```

2. **注册智能体**

在 `src/services/agent-registry.ts` 中添加：

```typescript
import { MyAgent } from './agent/agents/my-agent';

export async function registerAllAgents(dispatcher: AgentDispatcher) {
  // ... 其他智能体

  const myAgent = new MyAgent();
  await dispatcher.registerAgent(myAgent, {
    priority: 'normal',
    enabled: true,
    tags: ['custom'],
  });
}
```

3. **导出智能体**

在 `src/services/agent/agents/index.ts` 中添加：

```typescript
export { MyAgent } from './my-agent';
```

---

## ⚠️ 注意事项

### 1. 性能考虑

- 智能体系统在后台运行，注意控制并发数量
- 定时触发器会定期检查，避免设置过短的间隔
- 大量智能体同时执行可能影响性能

### 2. 错误处理

- 所有智能体执行都有超时保护
- 失败的任务会自动重试（可配置）
- 错误会记录到执行历史中

### 3. 数据持久化

- 智能体状态目前存储在内存中
- 重启应用后需要重新初始化
- 未来可以考虑持久化到数据库

### 4. 开发模式

- 开发模式下默认启用智能体系统
- 可以通过配置禁用以提高开发效率
- 建议在生产环境充分测试

---

## 📝 常见问题

### Q: 智能体没有响应？

**A**: 检查以下几点：
1. 全局开关是否启用
2. 特定智能体是否启用
3. 触发条件是否满足
4. 查看控制台日志

### Q: 如何禁用某个智能体？

**A**: 使用 Store 方法：

```typescript
useAgentSystemStore.getState().setAgentEnabled('agent-id', false);
```

### Q: 智能体执行失败怎么办？

**A**: 
1. 查看执行历史中的错误信息
2. 检查智能体的工具依赖是否正常
3. 查看控制台详细日志

### Q: 如何测试智能体？

**A**: 可以手动触发：

```typescript
import { triggerUserMessage } from '@/services/agent/integration';

// 测试情绪感知
await triggerUserMessage('我好开心');

// 测试日程管理
await triggerUserMessage('提醒我明天开会');
```

---

## 🎉 总结

智能体系统已完全集成到应用中，提供了：

✅ **自动初始化** - 应用启动时自动加载  
✅ **事件驱动** - 支持多种触发方式  
✅ **易于扩展** - 简单添加新智能体  
✅ **状态管理** - 完整的状态追踪  
✅ **错误处理** - 健壮的异常处理  
✅ **性能优化** - 并发控制和超时保护  

现在可以开始使用智能体系统，让桌面宠物变得更加智能和主动！🚀
