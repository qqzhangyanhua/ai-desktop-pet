# ADR-001: PetCore Architecture Design
# 架构决策记录：PetCore 架构设计

## Status
Accepted

## Context
原有的宠物状态管理系统存在以下问题：
1. 数据库设计冗余（`lastFeed` 和 `lastPlay` 字段）
2. 状态管理分散在多个文件和组件中
3. 缺乏统一的状态转换规则
4. 冷却检查逻辑分散

## Decision

### 1. 采用状态机模式管理宠物状态

**选择状态机的原因：**
- 明确的状态转换规则
- 易于理解和维护
- 更好的测试性
- 符合 Linus Torvalds 的"好品味"原则：消除特殊情况

**实现方式：**
```typescript
class StateManager {
  dispatch(event: StateTransitionEvent): void {
    const newState = this.transition(oldState, event);
    if (newState !== oldState) {
      this.state = newState;
      this.notifyListeners(oldState, newState, event);
    }
  }
}
```

### 2. 统一时间戳管理

**问题：**
原有设计使用分散的 `lastInteraction`, `lastFeed`, `lastPlay` 字段。

**解决方案：**
```typescript
interface PetCoreState {
  timestamps: {
    lastInteraction: number;  // 统一管理所有互动
    lastDecayApplied: number;
    createdAt: number;
  };
}
```

**优点：**
- 消除数据冗余
- 简化数据库模式
- 更容易查询和索引

### 3. 引入 interaction_history 表

**设计：**
```sql
CREATE TABLE interaction_history (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,           -- 'pet' | 'feed' | 'play' | 'chat'
  timestamp INTEGER NOT NULL,
  intensity INTEGER,
  mood_change REAL,
  energy_change REAL,
  intimacy_change REAL,
  context TEXT                  -- JSON格式的额外信息
);
```

**替代方案考虑：**

| 方案 | 优点 | 缺点 | 决策 |
|------|------|------|------|
| 分散字段 (lastFeed等) | 实现简单 | 数据冗余、难以查询 | ❌ 拒绝 |
| 统一时间戳 + 历史表 | 灵活、可查询 | 需要迁移 | ✅ 选择 |
| 仅历史表 | 最灵活 | 查询当前状态复杂 | ❌ 过度设计 |

### 4. 单例模式的 PetCore Service

**实现：**
```typescript
class PetCoreService {
  private static instance: PetCoreService | null = null;

  static getInstance(): PetCoreService {
    if (!PetCoreService.instance) {
      PetCoreService.instance = new PetCoreService();
    }
    return PetCoreService.instance;
  }
}
```

**原因：**
- 全局唯一状态管理
- 避免多个实例状态不一致
- 简化组件集成

### 5. 事件驱动的状态变更通知

**实现：**
```typescript
type StateChangeListener = (
  oldState: PetCoreState,
  newState: PetCoreState,
  event: StateTransitionEvent
) => void;

subscribe(listener: StateChangeListener): () => void {
  this.listeners.add(listener);
  return () => this.listeners.delete(listener);
}
```

**优点：**
- 解耦组件
- 响应式更新
- 易于扩展新功能

## Implications

### Positive
1. **代码质量提升**
   - 消除特殊情况
   - 单一职责原则
   - 更好的可测试性

2. **数据库优化**
   - 减少冗余字段
   - 更好的查询性能
   - 更灵活的历史追踪

3. **可维护性**
   - 统一的状态管理入口
   - 清晰的状态转换规则
   - 易于调试和扩展

4. **向后兼容**
   - 旧API仍然可用
   - 渐进式迁移
   - 无破坏性变更

### Negative
1. **迁移成本**
   - 需要数据库迁移
   - 需要更新部分代码
   - 短期复杂度增加

2. **学习曲线**
   - 状态机概念
   - 新的API
   - 事件驱动模式

3. **测试成本**
   - 需要编写新测试
   - 需要验证迁移过程

## Testing Strategy

1. **单元测试**
   - StateManager 状态转换
   - PetCoreService 方法
   - 边界条件处理

2. **集成测试**
   - 数据库操作
   - 状态变更通知
   - 冷却检查逻辑

3. **迁移测试**
   - 数据迁移正确性
   - 向后兼容性
   - 回滚机制

## Migration Plan

### Phase 1: 基础设施 (Week 1-2)
- [x] 创建 PetCore 类型定义
- [x] 实现 StateManager
- [x] 实现 PetCore Service
- [x] 创建数据库迁移脚本

### Phase 2: 集成 (Week 3-4)
- [ ] 集成到现有组件
- [ ] 保持向后兼容
- [ ] 更新文档

### Phase 3: 迁移 (Week 5-6)
- [ ] 运行数据库迁移
- [ ] 更新生产代码
- [ ] 移除冗余字段访问

### Phase 4: 清理 (Week 7-8)
- [ ] 删除旧代码
- [ ] 更新API文档
- [ ] 性能优化

## Monitoring

迁移过程中需要监控：
1. 状态变更正确性
2. 数据库查询性能
3. 内存使用情况
4. 向后兼容性

## Rollback Plan

如果迁移失败：
1. 运行 `rollbackMigration()`
2. 恢复使用旧API
3. 分析问题并重新规划

## Related Documents

- PetCore Migration Guide
- StateManager API Documentation
- Database Schema Documentation
- Testing Guidelines

## Decision Makers

- 架构师
- 技术负责人
- 开发团队

## Date

2025-12-28
