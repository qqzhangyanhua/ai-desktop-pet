# TaskScheduler 使用指南

TaskScheduler 是一个功能完整的任务调度系统，支持多种触发方式和动作类型。

## 架构概览

```
Frontend (TypeScript)          Backend (Rust)
┌─────────────────┐           ┌──────────────────┐
│ SchedulerManager│◄─────────►│ TaskScheduler    │
│   (manager.ts)  │   Tauri   │   (mod.rs)       │
└─────────────────┘  Commands └──────────────────┘
        │                              │
        ▼                              ▼
┌─────────────────┐           ┌──────────────────┐
│ SchedulerStore  │           │ SQLite Database  │
│ (schedulerStore)│           │ (tasks table)    │
└─────────────────┘           └──────────────────┘
```

## 核心概念

### Trigger (触发器)
定义任务何时执行：
- **cron**: 使用 cron 表达式（如 `0 9 * * *` = 每天 9 点）
- **interval**: 每隔 N 秒执行一次
- **event**: 响应特定事件触发
- **manual**: 仅手动触发

### Action (动作)
定义任务执行什么：
- **notification**: 显示通知
- **agent_task**: 运行 Agent 任务
- **workflow**: 执行 LangGraph 工作流
- **script**: 执行自定义脚本（预留功能）

## 快速开始

### 1. 创建简单的定时提醒

```typescript
import { getSchedulerManager } from '@/services/scheduler';

const scheduler = getSchedulerManager();

// 每天早上 9 点提醒
const taskId = await scheduler.createTask({
  name: '早安提醒',
  description: '每天 9 点的问候',
  trigger: {
    type: 'cron',
    config: {
      type: 'cron',
      expression: '0 9 * * *'  // 9 AM daily
    }
  },
  action: {
    type: 'notification',
    config: {
      type: 'notification',
      title: '早上好！',
      body: '新的一天开始了，加油！'
    }
  },
  enabled: true
});
```

### 2. 创建周期性任务

```typescript
// 每 30 分钟执行一次
await scheduler.createTask({
  name: '定期检查',
  trigger: {
    type: 'interval',
    config: {
      type: 'interval',
      seconds: 1800  // 30 minutes
    }
  },
  action: {
    type: 'agent_task',
    config: {
      type: 'agent_task',
      prompt: '检查是否有新邮件并总结',
      toolsAllowed: ['email']
    }
  },
  enabled: true
});
```

### 3. 监听任务事件

```typescript
scheduler.on('started', (taskId) => {
  console.log('任务开始:', taskId);
});

scheduler.on('completed', (taskId) => {
  console.log('任务完成:', taskId);
});

scheduler.on('failed', ({ id, error }) => {
  console.error('任务失败:', id, error);
});

scheduler.on('notification', (data) => {
  // 显示通知 UI
  showNotification(data.title, data.body);
});
```

### 4. 管理任务

```typescript
// 获取所有任务
const tasks = await scheduler.getAllTasks();

// 启用/禁用任务
await scheduler.enableTask(taskId, false);

// 立即执行任务
await scheduler.executeNow(taskId);

// 更新任务
await scheduler.updateTask(taskId, {
  name: '新名称',
  enabled: true
});

// 删除任务
await scheduler.deleteTask(taskId);

// 查看执行历史
const executions = await scheduler.getExecutions(taskId, 50);
```

## Cron 表达式参考

```
┌───────────── 分钟 (0 - 59)
│ ┌─────────── 小时 (0 - 23)
│ │ ┌───────── 日期 (1 - 31)
│ │ │ ┌─────── 月份 (1 - 12)
│ │ │ │ ┌───── 星期 (0 - 6, 0=周日)
│ │ │ │ │
* * * * *
```

**常用示例：**
- `0 9 * * *` - 每天 9:00
- `0 */2 * * *` - 每 2 小时
- `0 9 * * 1` - 每周一 9:00
- `0 0 1 * *` - 每月 1 号 0:00
- `*/30 * * * *` - 每 30 分钟

## 测试

### 运行测试脚本

```typescript
import { testScheduler } from '@/services/scheduler/test';

// 运行完整测试套件
await testScheduler();
```

### 或在浏览器控制台中测试

```bash
# 启动开发服务器
pnpm tauri dev

# 在控制台运行
testScheduler()
```

## 数据库表结构

### tasks 表
```sql
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    trigger_type TEXT NOT NULL,
    trigger_config TEXT NOT NULL,  -- JSON
    action_type TEXT NOT NULL,
    action_config TEXT NOT NULL,   -- JSON
    enabled INTEGER DEFAULT 1,
    last_run INTEGER,
    next_run INTEGER,
    metadata TEXT,                 -- JSON
    created_at INTEGER NOT NULL,
    updated_at INTEGER
);
```

### task_executions 表
```sql
CREATE TABLE task_executions (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    status TEXT NOT NULL,          -- 'running' | 'success' | 'failed'
    started_at INTEGER NOT NULL,
    completed_at INTEGER,
    result TEXT,
    error TEXT,
    duration INTEGER,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
```

## 性能考虑

1. **检查频率**: 调度器每分钟检查一次到期任务
2. **执行隔离**: 任务在独立的异步任务中执行，不阻塞主流程
3. **数据库索引**: 在 `next_run` 和 `enabled` 字段上有索引
4. **内存占用**: 调度器本身不持有任务列表，从数据库按需加载

## 后续扩展

基于此 TaskScheduler，可以轻松实现：
- 主动提醒系统
- 屏幕感知触发器
- 快捷指令系统
- 自动化工作流

详见设计文档中的高价值功能扩展。

## 故障排查

### 任务不执行
1. 检查任务是否启用: `task.enabled === true`
2. 检查 `next_run` 是否已计算
3. 查看 Rust 控制台日志: `[Scheduler]` 前缀
4. 检查数据库表是否正确创建

### Cron 表达式错误
- 使用 [crontab.guru](https://crontab.guru) 验证表达式
- 确保字段顺序正确: 分/时/日/月/周

### 事件未触发
- 确保在 App.tsx 中正确初始化了 scheduler
- 检查事件监听器是否正确注册
- 查看浏览器控制台错误

## API 文档

完整 API 参考见：
- TypeScript 类型: `src/types/scheduler.ts`
- Manager: `src/services/scheduler/manager.ts`
- Store: `src/stores/schedulerStore.ts`
