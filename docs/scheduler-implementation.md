# TaskScheduler 实现文档

## 概述

TaskScheduler 是 AI Desktop Pet 的任务调度系统，提供灵活的定时任务管理能力，支持 cron 表达式、间隔执行、事件触发等多种调度方式。

### 核心特性

- ✅ **多种触发器**：支持 cron、interval、event、manual 四种触发方式
- ✅ **多种动作**：支持 notification、agent_task、workflow、script 四种执行动作
- ✅ **后台运行**：Rust 后台线程每 60 秒检查待执行任务
- ✅ **事件驱动**：实时事件通知（started、completed、failed）
- ✅ **执行历史**：记录每次任务执行的详细信息
- ✅ **独立数据库**：使用 sqlx 直接访问 SQLite，无需依赖 tauri-plugin-sql
- ✅ **类型安全**：完整的 TypeScript ↔ Rust 类型映射
- ✅ **测试友好**：提供独立测试 UI，不干扰主应用

---

## 架构设计

### 技术栈

**后端 (Rust)**
- `sqlx` 0.8 - 数据库访问
- `cron` 0.12 - Cron 表达式解析
- `chrono` 0.4 - 时间处理
- `tokio` - 异步运行时

**前端 (TypeScript)**
- React 19
- Zustand - 状态管理
- Tauri API - 调用后端命令

### 目录结构

```
src/
├── types/
│   └── scheduler.ts              # TypeScript 类型定义
├── services/
│   ├── scheduler/
│   │   ├── index.ts              # 导出
│   │   ├── manager.ts            # SchedulerManager 服务类
│   │   └── test.ts               # 测试脚本
│   └── database/
│       └── tasks.ts              # 数据库操作（前端侧，已弃用）
├── stores/
│   └── schedulerStore.ts         # Zustand 状态管理
├── components/
│   └── settings/
│       └── SchedulerTestPanel.tsx # 测试 UI
└── SchedulerTestApp.tsx          # 独立测试应用

src-tauri/
├── src/
│   ├── db.rs                     # 数据库连接池
│   ├── scheduler/
│   │   ├── mod.rs                # 调度器核心引擎
│   │   └── commands.rs           # Tauri 命令接口
│   └── lib.rs                    # 应用入口
└── Cargo.toml                    # Rust 依赖
```

---

## 数据模型

### Task（任务）

```typescript
interface Task {
  id: string;                     // UUID
  name: string;                   // 任务名称
  description?: string;           // 任务描述
  trigger: Trigger;               // 触发器配置
  action: Action;                 // 执行动作配置
  enabled: boolean;               // 是否启用
  lastRun?: number;               // 上次执行时间（Unix 时间戳）
  nextRun?: number;               // 下次执行时间（Unix 时间戳）
  metadata?: Record<string, any>; // 自定义元数据
  createdAt: number;              // 创建时间
  updatedAt?: number;             // 更新时间
}
```

### Trigger（触发器）

支持四种触发方式：

#### 1. Cron - 基于 Cron 表达式
```typescript
{
  type: 'cron',
  config: {
    expression: '0 9 * * *'  // 每天 9:00 执行
  }
}
```

**Cron 表达式格式**：`秒 分 时 日 月 周 [年]`
- `0 9 * * *` - 每天 9:00
- `*/5 * * * *` - 每 5 分钟
- `0 0 * * 1` - 每周一午夜
- `0 12 * * 1-5` - 工作日中午 12:00

#### 2. Interval - 固定间隔
```typescript
{
  type: 'interval',
  config: {
    seconds: 300  // 每 300 秒（5 分钟）执行一次
  }
}
```

#### 3. Event - 事件触发
```typescript
{
  type: 'event',
  config: {
    eventName: 'user_login'  // 监听 'user_login' 事件
  }
}
```

#### 4. Manual - 手动触发
```typescript
{
  type: 'manual',
  config: {}  // 只能通过 executeNow() 手动执行
}
```

### Action（动作）

支持四种执行动作：

#### 1. Notification - 系统通知
```typescript
{
  type: 'notification',
  config: {
    title: '提醒标题',
    body: '提醒内容',
    actionButton?: '操作按钮文本'
  }
}
```

#### 2. Agent Task - AI Agent 任务
```typescript
{
  type: 'agent_task',
  config: {
    prompt: '请帮我总结今天的日程',
    toolsAllowed?: ['search', 'calendar']
  }
}
```

#### 3. Workflow - 工作流
```typescript
{
  type: 'workflow',
  config: {
    workflowId: 'daily_report',
    input?: { date: '2024-01-01' }
  }
}
```

#### 4. Script - 自定义脚本
```typescript
{
  type: 'script',
  config: {
    script: 'console.log("Hello")',
    language: 'javascript'
  }
}
```

### TaskExecution（执行记录）

```typescript
interface TaskExecution {
  id: string;                // UUID
  taskId: string;            // 所属任务 ID
  status: 'running' | 'success' | 'failed';
  startedAt: number;         // 开始时间
  completedAt?: number;      // 完成时间
  result?: string;           // 执行结果（JSON）
  error?: string;            // 错误信息
  duration?: number;         // 执行时长（秒）
}
```

---

## API 文档

### SchedulerManager 类

前端服务类，单例模式。

#### 初始化

```typescript
import { getSchedulerManager } from '@/services/scheduler';

const scheduler = getSchedulerManager();
await scheduler.initialize();  // 设置事件监听器
```

#### 创建任务

```typescript
const taskId = await scheduler.createTask({
  name: '每日提醒',
  description: '每天早上 9 点提醒',
  trigger: {
    type: 'cron',
    config: { expression: '0 9 * * *' }
  },
  action: {
    type: 'notification',
    config: {
      title: '早安提醒',
      body: '新的一天开始了！'
    }
  },
  enabled: true
});
```

#### 获取任务

```typescript
// 获取单个任务
const task = await scheduler.getTask(taskId);

// 获取所有任务
const allTasks = await scheduler.getAllTasks();
```

#### 更新任务

```typescript
await scheduler.updateTask(taskId, {
  name: '修改后的名称',
  enabled: false  // 禁用任务
});
```

#### 删除任务

```typescript
await scheduler.deleteTask(taskId);
```

#### 启用/禁用任务

```typescript
await scheduler.enableTask(taskId, false);  // 禁用
await scheduler.enableTask(taskId, true);   // 启用
```

#### 立即执行

```typescript
await scheduler.executeNow(taskId);
```

#### 获取执行历史

```typescript
const executions = await scheduler.getExecutions(taskId, 50);
```

#### 事件监听

```typescript
// 任务开始执行
scheduler.on('started', (taskId: string) => {
  console.log('任务开始:', taskId);
});

// 任务执行完成
scheduler.on('completed', (taskId: string) => {
  console.log('任务完成:', taskId);
});

// 任务执行失败
scheduler.on('failed', (data: { id: string; error: string }) => {
  console.log('任务失败:', data.id, data.error);
});

// 通知动作触发
scheduler.on('notification', (data: { title: string; body: string }) => {
  console.log('收到通知:', data.title);
});

// Agent 任务触发
scheduler.on('agent_execute', (data: { prompt: string }) => {
  console.log('执行 Agent 任务:', data.prompt);
});

// 工作流触发
scheduler.on('workflow_execute', (data: { workflowId: string }) => {
  console.log('执行工作流:', data.workflowId);
});
```

#### 清理

```typescript
await scheduler.cleanup();  // 移除事件监听器
```

---

## 使用示例

### 示例 1：每天早晨提醒

```typescript
await scheduler.createTask({
  name: '早晨提醒',
  description: '每天早上 8:00 提醒起床',
  trigger: {
    type: 'cron',
    config: { expression: '0 8 * * *' }
  },
  action: {
    type: 'notification',
    config: {
      title: '早安',
      body: '该起床了！'
    }
  },
  enabled: true
});
```

### 示例 2：定时备份

```typescript
await scheduler.createTask({
  name: '数据备份',
  description: '每 6 小时备份一次数据',
  trigger: {
    type: 'interval',
    config: { seconds: 21600 }  // 6 小时 = 21600 秒
  },
  action: {
    type: 'script',
    config: {
      script: 'backup_data()',
      language: 'javascript'
    }
  },
  enabled: true
});
```

### 示例 3：工作日提醒

```typescript
await scheduler.createTask({
  name: '工作日提醒',
  description: '工作日下午 6 点提醒下班',
  trigger: {
    type: 'cron',
    config: { expression: '0 18 * * 1-5' }  // 周一到周五 18:00
  },
  action: {
    type: 'notification',
    config: {
      title: '下班提醒',
      body: '该下班了，记得签退！'
    }
  },
  enabled: true
});
```

### 示例 4：AI Agent 定时任务

```typescript
await scheduler.createTask({
  name: 'AI 日报生成',
  description: '每天晚上生成当日工作总结',
  trigger: {
    type: 'cron',
    config: { expression: '0 22 * * *' }
  },
  action: {
    type: 'agent_task',
    config: {
      prompt: '请总结今天的工作日志并生成报告',
      toolsAllowed: ['calendar', 'file_read']
    }
  },
  enabled: true
});
```

---

## 测试指南

### 访问测试页面

1. 启动开发服务器：
   ```bash
   pnpm tauri dev
   ```

2. 在浏览器中打开：
   ```
   http://localhost:1420/?test=scheduler
   ```

### 测试 UI 功能

**SchedulerTestPanel** 提供以下功能：

- **Create Test Task** - 创建测试任务（每 2 分钟执行一次）
- **Refresh** - 刷新任务列表
- **Run Now** - 立即执行任务
- **Enable/Disable** - 切换任务启用状态
- **Delete** - 删除任务
- **Event Log** - 实时显示事件日志

### 手动测试步骤

1. **创建任务**
   ```typescript
   import { testScheduler } from '@/services/scheduler/test';

   // 在浏览器控制台运行
   testScheduler();
   ```

2. **验证任务执行**
   - 创建一个 interval 为 120 秒的任务
   - 等待 2 分钟
   - 检查 Event Log 是否显示任务自动执行

3. **验证 Cron 表达式**
   - 创建一个 cron 任务（如 `*/1 * * * *` 每分钟执行）
   - 观察任务是否按时执行

4. **验证事件通知**
   - 执行任务后检查通知是否正确显示在 Event Log

---

## 开发指南

### 添加新的触发器类型

1. **更新类型定义** (`src/types/scheduler.ts`)
   ```typescript
   export type TriggerType = 'cron' | 'interval' | 'event' | 'manual' | 'my_new_trigger';

   export interface MyNewTriggerConfig {
     type: 'my_new_trigger';
     myParam: string;
   }

   export type TriggerConfig =
     | CronTriggerConfig
     | IntervalTriggerConfig
     | EventTriggerConfig
     | ManualTriggerConfig
     | MyNewTriggerConfig;
   ```

2. **实现 Rust 逻辑** (`src-tauri/src/scheduler/mod.rs`)
   ```rust
   fn calculate_next_run(task: &Task) -> Result<Option<i64>, String> {
       match task.trigger_type.as_str() {
           "my_new_trigger" => {
               // 解析配置
               let config: MyNewTriggerConfig =
                   serde_json::from_str(&task.trigger_config)?;

               // 计算 next_run
               Ok(Some(calculated_timestamp))
           }
           // ... 其他类型
       }
   }
   ```

### 添加新的动作类型

1. **更新类型定义** (`src/types/scheduler.ts`)
   ```typescript
   export type ActionType =
     | 'notification'
     | 'agent_task'
     | 'workflow'
     | 'script'
     | 'my_new_action';
   ```

2. **实现执行逻辑** (`src-tauri/src/scheduler/mod.rs`)
   ```rust
   async fn execute_action(app: AppHandle, task: &Task) -> Result<String, String> {
       match task.action_type.as_str() {
           "my_new_action" => {
               // 解析配置
               let config: MyNewActionConfig =
                   serde_json::from_str(&task.action_config)?;

               // 执行动作
               my_action_logic(&config).await?;

               Ok("Success".to_string())
           }
           // ... 其他类型
       }
   }
   ```

### 调试技巧

**查看 Rust 日志**
```bash
# 所有日志都带有前缀
[DB] ...           # 数据库相关
[Scheduler] ...    # 调度器相关
```

**查看前端日志**
```typescript
// SchedulerManager 内部已有日志
console.log('[SchedulerManager] ...');
```

**数据库调试**
```bash
# 数据库文件位置（macOS）
~/Library/Application Support/com.ai-desktop-pet.app/pet.db

# 使用 SQLite 工具查看
sqlite3 ~/Library/Application\ Support/com.ai-desktop-pet.app/pet.db
.tables
SELECT * FROM tasks;
SELECT * FROM task_executions;
```

---

## 常见问题

### Q: 任务没有按时执行？
A: 检查以下几点：
1. 任务的 `enabled` 字段是否为 `true`
2. `next_run` 时间戳是否正确计算
3. Rust 后台线程是否正常运行（查看 `[Scheduler] Found X due tasks` 日志）

### Q: Cron 表达式不生效？
A: 确保 cron 表达式格式正确：
- 使用标准 cron 格式（5-7 个字段）
- 测试表达式：`0 9 * * *` 每天 9:00
- 避免使用特殊字符（如 `L`, `W`, `#`）

### Q: 事件没有触发？
A: 确保正确设置了事件监听器：
```typescript
scheduler.on('started', (taskId) => { /* ... */ });
```

### Q: 数据库表不存在？
A: 检查 `init_schema()` 是否成功执行：
- 查看启动日志中是否有 `[DB] Database schema initialized`
- 手动运行 `CREATE TABLE IF NOT EXISTS tasks ...`

---

## 性能优化

### 数据库索引
系统已自动创建以下索引：
- `idx_tasks_enabled_next_run` - 加速任务查询
- `idx_task_executions_task_id` - 加速执行历史查询

### 后台任务频率
默认每 60 秒检查一次，可在 `src-tauri/src/scheduler/mod.rs` 中修改：
```rust
let mut ticker = interval(Duration::from_secs(60)); // 修改此处
```

### 执行历史清理
建议定期清理旧的执行记录：
```sql
DELETE FROM task_executions
WHERE started_at < strftime('%s', 'now', '-30 days');
```

---

## 安全考虑

1. **脚本执行**：`script` 动作类型应该沙箱化，避免执行恶意代码
2. **权限控制**：考虑添加任务权限管理
3. **输入验证**：所有用户输入都应验证（cron 表达式、脚本内容等）
4. **速率限制**：防止任务过度执行消耗系统资源

---

## 路线图

### 已完成 ✅
- [x] 基础调度引擎
- [x] Cron 和 Interval 触发器
- [x] Notification 和 Agent 动作
- [x] 事件系统
- [x] 测试 UI
- [x] 执行历史记录

### 计划中 🚧
- [ ] Event 触发器实现
- [ ] Workflow 动作集成
- [ ] Script 动作沙箱
- [ ] 任务依赖关系
- [ ] 任务优先级
- [ ] 并发执行控制
- [ ] 重试机制
- [ ] 任务分组/标签
- [ ] 导入/导出任务

---

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/new-trigger`)
3. 提交更改 (`git commit -m 'Add new trigger type'`)
4. 推送到分支 (`git push origin feature/new-trigger`)
5. 创建 Pull Request

---

## 许可证

本项目遵循项目主仓库的许可证。

---

## 技术支持

如有问题，请：
1. 查看本文档的「常见问题」部分
2. 查看 GitHub Issues
3. 提交新的 Issue（附上日志和错误信息）

---

**最后更新**: 2024-12-13
**版本**: 1.0.0
