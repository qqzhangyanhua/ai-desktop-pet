# PetCore Migration Guide
# PetCore 迁移指南

## Overview
本文档说明如何从旧的 Pet Status 系统迁移到新的 PetCore 系统。

## What Changed

### Before (旧系统)
```typescript
// 分散的状态管理
interface PetStatus {
  lastInteraction: number;
  lastFeed: number | null;      // ❌ 冗余字段
  lastPlay: number | null;      // ❌ 冗余字段
  totalInteractions: number;
  // ...
}

// 分散的互动处理
handleInteraction(type, status) {
  // 检查冷却 - 需要查看不同字段
  const lastTime = getLastInteractionTime(type, status);
  // ...
}
```

### After (新系统 - PetCore)
```typescript
// 统一的状态管理
interface PetCoreState {
  timestamps: {
    lastInteraction: number;    // ✅ 统一管理
  };
  care: {
    totalInteractions: number;
    // ...
  };
}

// 事件驱动的状态机
stateManager.dispatch({
  type: 'INTERACTION',
  payload: { type: 'pet' }
});
```

## Migration Steps

### Step 1: Database Migration
运行数据库迁移以创建 `interaction_history` 表：

```typescript
import { runMigration } from '@/services/database/migrations/003-create-interaction-history';

await runMigration();
```

这将：
1. 创建 `interaction_history` 表
2. 移除 `pet_status` 表中的 `last_feed` 和 `last_play` 字段
3. 创建索引以提升查询性能

### Step 2: Update Imports

**Before:**
```typescript
import { handleInteraction } from '@/services/pet/interaction';
import { usePetStatusStore } from '@/stores/petStatusStore';
```

**After:**
```typescript
// 推荐：使用新的 PetCore
import { handleInteractionNew } from '@/services/pet-core/interaction-handler';
import { petCoreService } from '@/services/pet-core';

// 兼容性：继续使用旧接口（内部已升级到PetCore）
import { handleInteraction } from '@/services/pet/interaction';
```

### Step 3: Update Code

#### Option A: 使用新的 PetCore API（推荐）

```typescript
// 初始化 PetCore
await petCoreService.initialize();

// 处理互动
const result = await handleInteractionNew('pet');
if (result.success) {
  console.log('New mood:', result.newStatus.mood);
  console.log('Animation:', result.animation);
}

// 获取当前状态
const state = petCoreService.getState();
console.log('Current mood:', state.care.mood);

// 订阅状态变更
const unsubscribe = petCoreService.subscribe((oldState, newState) => {
  console.log('Mood changed:', oldState.care.mood, '->', newState.care.mood);
});
```

#### Option B: 继续使用旧接口（向后兼容）

旧的 `handleInteraction` 函数仍然可用，内部已升级到使用 PetCore：

```typescript
import { handleInteraction } from '@/services/pet/interaction';
import { usePetStatusStore } from '@/stores/petStatusStore';

const result = await handleInteraction('pet', status);
if (result.success) {
  // 更新状态
  usePetStatusStore.getState().updateStatusImmediate(result.newStatus);
}
```

### Step 4: Update Components

#### PetContainer.tsx

**Before:**
```typescript
const handlePetClick = async () => {
  const status = usePetStatusStore.getState().status;
  const result = await handleInteraction('pet', status);

  if (result.success) {
    // 更新状态
    usePetStatusStore.getState().updateStatusImmediate(result.newStatus);

    // 播放动画
    playAnimation(result.animation);
  }
};
```

**After:**
```typescript
const handlePetClick = async () => {
  const result = await handleInteractionNew('pet');

  if (result.success) {
    // 更新状态（向后兼容）
    usePetStatusStore.getState().updateStatusImmediate(result.newStatus);

    // 播放动画
    playAnimation(result.animation);
  }
};
```

### Step 5: Remove Redundant Code

删除所有直接访问 `lastFeed` 和 `lastPlay` 的代码：

**❌ Remove:**
```typescript
// 这些字段不再存在
status.lastFeed
status.lastPlay

// 这些函数也不再需要
getLastInteractionTime(type, status)
```

**✅ Use instead:**
```typescript
// 使用统一的时间戳
state.timestamps.lastInteraction

// 使用互动历史表查询特定类型的互动
import { getInteractionHistory } from '@/services/pet-core';
```

## API Reference

### New PetCore API

#### Core Service
```typescript
// 获取实例
const petCore = petCoreService;

// 初始化
await petCore.initialize();

// 获取状态
const state = petCore.getState();

// 订阅状态变更
const unsubscribe = petCore.subscribe((oldState, newState, event) => {
  // 处理状态变更
});
```

#### Interaction Handling
```typescript
// 处理互动
const result = await handleInteractionNew('pet' | 'feed' | 'play');

// 检查冷却
const cooldown = checkCooldown('pet');
console.log(cooldown.onCooldown, cooldown.remaining);

// 获取所有冷却
const cooldowns = getAllCooldowns();
console.log(cooldowns.pet, cooldowns.feed, cooldowns.play);

// 检查是否有可用互动
const available = hasAvailableInteraction();

// 获取推荐互动
const recommended = getRecommendedInteraction();
```

#### Decay System
```typescript
// 应用衰减
await applyDecay();
```

### Legacy Compatibility API

旧的 API 仍然可用，内部已升级：

```typescript
import {
  handleInteraction,
  getInteractionConfig,
  getAllCooldowns,
  hasAvailableInteraction,
  getRecommendedInteraction,
} from '@/services/pet/interaction';
```

## Benefits of PetCore

1. **Eliminated Redundancy**
   - No more `lastFeed` / `lastPlay` fields
   - Unified timestamp management
   - Cleaner database schema

2. **State Machine Pattern**
   - Explicit state transitions
   - Easier to reason about state changes
   - Better testability

3. **Event-Driven Architecture**
   - Subscribe to state changes
   - Decoupled components
   - Better separation of concerns

4. **Better Data Model**
   - `interaction_history` table for detailed tracking
   - More flexible query capabilities
   - Better analytics potential

5. **Backward Compatibility**
   - Old APIs still work
   - Gradual migration path
   - No breaking changes

## Testing

运行单元测试：

```bash
pnpm test src/services/pet-core/__tests__/state-manager.test.ts
```

## Rollback

如果需要回滚到旧系统：

```typescript
import { rollbackMigration } from '@/services/database/migrations/003-create-interaction-history';

await rollbackMigration();
```

**注意：** 回滚会丢失所有互动历史数据。

## Timeline

- **Week 1-2**: PetCore implementation (Done)
- **Week 3-4**: Migration and integration
- **Week 5-6**: Full adoption
- **Week 7-8**: Remove legacy code

## Support

如有问题，请查看：
- 单元测试：`src/services/pet-core/__tests__/`
- 源码：`src/services/pet-core/`
- 文档：`docs/ARCHITECTURE/`
