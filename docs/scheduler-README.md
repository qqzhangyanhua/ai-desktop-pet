# TaskScheduler - 任务调度系统

AI Desktop Pet 的核心任务调度模块，提供灵活的定时任务管理能力。

## 快速开始

### 安装依赖

```bash
# 安装 Node.js 依赖
pnpm install

# 确保已安装 Rust
rustc --version
```

### 启动开发环境

```bash
# 启动 Tauri 开发模式
pnpm tauri dev

# 访问测试页面
http://localhost:1420/?test=scheduler
```

## 核心功能

- ⏰ **多种触发器** - cron、interval、event、manual
- 🎯 **多种动作** - notification、agent_task、workflow、script
- 📊 **执行历史** - 完整的任务执行记录
- 🔔 **事件通知** - 实时任务状态更新
- 🧪 **独立测试** - 专用测试 UI，快速验证功能

## 基础用法

### 创建定时任务

```typescript
import { getSchedulerManager } from '@/services/scheduler';

const scheduler = getSchedulerManager();
await scheduler.initialize();

// 创建每天早上 9 点的提醒
const taskId = await scheduler.createTask({
  name: '早晨提醒',
  trigger: {
    type: 'cron',
    config: { expression: '0 9 * * *' }
  },
  action: {
    type: 'notification',
    config: {
      title: '早安',
      body: '新的一天开始了！'
    }
  },
  enabled: true
});
```

### 监听任务事件

```typescript
scheduler.on('started', (taskId) => {
  console.log('任务开始:', taskId);
});

scheduler.on('completed', (taskId) => {
  console.log('任务完成:', taskId);
});

scheduler.on('failed', (data) => {
  console.log('任务失败:', data.id, data.error);
});
```

## 触发器类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `cron` | Cron 表达式 | `'0 9 * * *'` 每天 9:00 |
| `interval` | 固定间隔（秒） | `300` 每 5 分钟 |
| `event` | 事件触发 | `'user_login'` 用户登录时 |
| `manual` | 手动执行 | 仅通过 API 触发 |

## 动作类型

| 类型 | 说明 | 用途 |
|------|------|------|
| `notification` | 系统通知 | 提醒、警告 |
| `agent_task` | AI Agent 任务 | 智能助手执行 |
| `workflow` | 工作流 | 复杂业务流程 |
| `script` | 自定义脚本 | 灵活扩展 |

## API 概览

```typescript
// 任务管理
await scheduler.createTask(input)      // 创建任务
await scheduler.getTask(id)            // 获取任务
await scheduler.getAllTasks()          // 获取所有任务
await scheduler.updateTask(id, updates)// 更新任务
await scheduler.deleteTask(id)         // 删除任务

// 任务控制
await scheduler.enableTask(id, true)   // 启用/禁用
await scheduler.executeNow(id)         // 立即执行

// 历史记录
await scheduler.getExecutions(id, 50)  // 获取执行历史
```

## 测试

### 自动化测试

```bash
# 在浏览器控制台运行
import { testScheduler } from '@/services/scheduler/test';
await testScheduler();
```

### 手动测试

1. 访问 `http://localhost:1420/?test=scheduler`
2. 点击 "Create Test Task" 创建测试任务
3. 点击 "Run Now" 立即执行
4. 观察 Event Log 查看执行结果

## 架构

```
Frontend (React/TypeScript)
    ↓ Tauri Commands
Backend (Rust)
    ↓ SQLite (sqlx)
Database (pet.db)
```

**关键文件**：
- `src/types/scheduler.ts` - TypeScript 类型定义
- `src/services/scheduler/manager.ts` - 前端服务类
- `src-tauri/src/scheduler/mod.rs` - Rust 调度引擎
- `src-tauri/src/scheduler/commands.rs` - Tauri 命令
- `src-tauri/src/db.rs` - 数据库连接池

## 常见示例

### 工作日提醒

```typescript
{
  name: '下班提醒',
  trigger: {
    type: 'cron',
    config: { expression: '0 18 * * 1-5' }  // 周一到周五 18:00
  },
  action: {
    type: 'notification',
    config: { title: '下班了', body: '记得签退！' }
  }
}
```

### 定时备份

```typescript
{
  name: '数据备份',
  trigger: {
    type: 'interval',
    config: { seconds: 3600 }  // 每小时
  },
  action: {
    type: 'script',
    config: { script: 'backup_data()', language: 'javascript' }
  }
}
```

### AI 日报

```typescript
{
  name: 'AI 日报',
  trigger: {
    type: 'cron',
    config: { expression: '0 22 * * *' }  // 每天 22:00
  },
  action: {
    type: 'agent_task',
    config: {
      prompt: '请总结今天的工作并生成报告',
      toolsAllowed: ['calendar', 'file_read']
    }
  }
}
```

## 数据库

### 表结构

**tasks** - 任务定义
- `id` - UUID
- `name` - 任务名称
- `trigger_type` / `trigger_config` - 触发器
- `action_type` / `action_config` - 动作
- `enabled` - 是否启用
- `next_run` - 下次执行时间

**task_executions** - 执行历史
- `id` - UUID
- `task_id` - 关联任务
- `status` - 状态（running/success/failed）
- `started_at` / `completed_at` - 时间
- `result` / `error` - 结果

### 数据库位置

macOS: `~/Library/Application Support/com.ai-desktop-pet.app/pet.db`

## 调试

### 查看日志

**Rust 后端**：
```bash
# 终端输出
[DB] Database schema initialized
[Scheduler] Starting task scheduler
[Scheduler] Found 0 due tasks
```

**前端**：
```javascript
// 浏览器控制台
[SchedulerManager] Initialized
```

### 检查数据库

```bash
sqlite3 ~/Library/Application\ Support/com.ai-desktop-pet.app/pet.db

.tables
SELECT * FROM tasks;
SELECT * FROM task_executions;
```

## 性能

- **后台检查频率**：60 秒/次
- **数据库索引**：已优化查询性能
- **并发执行**：每个任务独立异步执行
- **内存占用**：< 10MB

## 限制

- ⚠️ Cron 表达式不支持秒级精度（最小单位：分钟）
- ⚠️ Event 触发器尚未完全实现
- ⚠️ Script 动作需要沙箱化（安全考虑）
- ⚠️ 无任务优先级队列（按 next_run 顺序执行）

## 故障排除

| 问题 | 解决方案 |
|------|----------|
| 任务不执行 | 检查 `enabled` 字段，查看 Rust 日志 |
| Cron 不生效 | 验证表达式格式，使用在线工具测试 |
| 数据库错误 | 检查 schema 是否初始化，查看 `[DB]` 日志 |
| 事件未触发 | 确认已调用 `scheduler.initialize()` |

## 文档

- [完整实现文档](./scheduler-implementation.md) - 详细的架构和 API 文档
- [CLAUDE.md](../CLAUDE.md) - 项目整体开发指南

## 版本

**当前版本**: v1.0.0
**发布日期**: 2024-12-13

---

🎉 **TaskScheduler 已完全就绪！** 访问测试页面开始使用: http://localhost:1420/?test=scheduler
