# 宠物状态动态性分析报告

## 问题发现

### ❌ 当前问题：GameSettingsWindow 中的数据**不是实时动态的**

在 `src/components/settings/GameSettingsWindow.tsx:64-65` 中：

```typescript
const { status: petStatus, getStageProgress } = usePetStatusStore();
const stageProgress = getStageProgress();
```

**问题**：
1. `stageProgress` 只在组件渲染时计算一次
2. 即使 `petStatus` 在后台发生变化（衰减、互动），`stageProgress` 不会自动重新计算
3. 用户在设置窗口中看到的心情、精力、亲密度、阶段进度都是**打开窗口时的快照**

---

## 算法逻辑检查

### ✅ 1. 心情和精力衰减算法 (src/services/pet/status.ts:52-82)

**衰减配置**：
```typescript
const DEFAULT_DECAY_CONFIG = {
  moodPerHour: 2,        // 每小时心情衰减 2 点
  energyPerHour: 1.5,    // 每小时精力衰减 1.5 点
  maxMoodDecay: 50,      // 心情最大衰减 50 点
  maxEnergyDecay: 40,    // 精力最大衰减 40 点
}
```

**计算公式**：
```typescript
const hoursPassed = (currentTime - lastTime) / (1000 * 60 * 60);
mood_decay = -Math.min(hoursPassed * 2, 50);
energy_decay = -Math.min(hoursPassed * 1.5, 40);
```

**缓存机制**：
- 缓存时长：60秒
- 避免重复计算相同时间戳的衰减

**触发机制**：
- `usePetStatus` hook 每 **30 秒**检查一次衰减 (src/hooks/usePetStatus.ts:62-78)
- 仅当变化 > 1 时才写入数据库（减少 I/O）

### ✅ 2. 亲密度增长算法 (src/services/pet/interaction.ts:21-54)

**互动效果配置**：

| 互动类型 | 心情 | 精力 | 亲密度 | 冷却时间 |
|---------|------|------|--------|---------|
| 抚摸 (pet) | +10 | 0 | +2 | 60秒 |
| 喂食 (feed) | +8 | +15 | +1 | 120秒 |
| 玩耍 (play) | +12 | -5 | +3 | 90秒 |

**边界检查**：
```typescript
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
```
- 心情、精力、亲密度都被限制在 0-100 范围内

### ✅ 3. 成长阶段算法 (src/services/pet/growth.ts:16-94)

**阶段配置**：

| 阶段 | 亲密度范围 | 名称 | 特性 |
|------|-----------|------|------|
| STRANGER | 0-30 | 陌生期 | 礼貌疏离、简短回答、主动性 0.1 |
| FRIEND | 31-70 | 友好期 | 友善活泼、分享想法、主动性 0.5 |
| SOULMATE | 71-100 | 亲密期 | 亲密默契、理解习惯、主动性 0.8 |

**阶段判定算法** (src/services/pet/growth.ts:76-94)：
```typescript
export function getCurrentStage(intimacy: number): GrowthStage {
  const clampedIntimacy = Math.max(0, Math.min(100, intimacy));

  // 线性查找，匹配亲密度范围
  for (const stage of [STRANGER, FRIEND, SOULMATE]) {
    const [min, max] = STAGE_CONFIGS[stage].intimacyRange;
    if (clampedIntimacy >= min && clampedIntimacy <= max) {
      return stage;
    }
  }
  return STRANGER;
}
```

**阶段进度计算** (src/services/pet/growth.ts:153-184)：
```typescript
export function calculateStageProgress(intimacy: number): StageProgress {
  const currentStage = getCurrentStage(intimacy);
  const [minIntimacy, maxIntimacy] = STAGE_CONFIGS[currentStage].intimacyRange;

  // 当前阶段内的进度百分比
  const rangeSize = maxIntimacy - minIntimacy;
  const progressInRange = intimacy - minIntimacy;
  const progressPercent = (progressInRange / rangeSize) * 100;

  // 距离下一阶段的亲密度
  const intimacyToNext = nextStage ? nextStage.intimacyRange[0] - intimacy : null;

  return { currentStage, config, intimacy, progressPercent, intimacyToNext, nextStage };
}
```

**升级检测** (src/services/pet/growth.ts:131-146)：
```typescript
export function checkStageUpgrade(oldIntimacy: number, newIntimacy: number) {
  const oldStage = getCurrentStage(oldIntimacy);
  const newStage = getCurrentStage(newIntimacy);

  if (oldStage !== newStage) {
    return { fromStage: oldStage, toStage: newStage };
  }
  return null;
}
```

---

## 数据流分析

### 数据更新路径

```
用户互动
  ↓
handleInteraction (services/pet/interaction.ts)
  ↓
applyInteractionEffects (增加心情/精力/亲密度)
  ↓
updateStatusImmediate (petStatusStore)
  ↓
数据库写入 + Zustand store 更新
  ↓
React 组件重新渲染（仅当订阅该状态的组件）
```

### 衰减更新路径

```
usePetStatus hook (每30秒)
  ↓
applyDecay (计算衰减)
  ↓
updateStatus (petStatusStore, 防抖5秒)
  ↓
数据库写入 + Zustand store 更新
  ↓
React 组件重新渲染
```

### 🔴 GameSettingsWindow 的问题

```typescript
// ❌ 问题代码
export function GameSettingsWindow() {
  const { status: petStatus, getStageProgress } = usePetStatusStore();
  const stageProgress = getStageProgress(); // 只计算一次！

  // ...

  return (
    <div>
      <span>{stageProgress.config.name}</span> {/* 永远显示初始值 */}
      <span>{Math.round(petStatus.mood)}/100</span> {/* 会实时更新 */}
    </div>
  );
}
```

**问题分析**：
1. `petStatus` 是响应式的（来自 Zustand store），会随 store 变化而更新
2. **但 `stageProgress` 只在组件初始化时调用 `getStageProgress()` 计算一次**
3. 当 `petStatus.intimacy` 变化时，`stageProgress` 不会自动重新计算

**实际效果**：
- ✅ 心情值会实时更新（直接读取 `petStatus.mood`）
- ✅ 精力值会实时更新（直接读取 `petStatus.energy`）
- ❌ 阶段名称**不会**更新（读取缓存的 `stageProgress.config.name`）
- ❌ 亲密度进度条**不会**更新（读取缓存的 `stageProgress.progressPercent`）

---

## 修复方案

### 方案 1：使用 useMemo 重新计算 (推荐)

```typescript
export function GameSettingsWindow() {
  const { status: petStatus, getStageProgress } = usePetStatusStore();

  // ✅ 当 petStatus.intimacy 变化时自动重新计算
  const stageProgress = useMemo(() => {
    return getStageProgress();
  }, [petStatus.intimacy]); // 依赖亲密度

  // 或者直接调用服务层函数
  const stageProgress = useMemo(() => {
    return calculateStageProgress(petStatus.intimacy);
  }, [petStatus.intimacy]);

  // ...
}
```

### 方案 2：在 Store 中添加计算属性

修改 `src/stores/petStatusStore.ts`：

```typescript
export const usePetStatusStore = create<PetStatusStore>((set, get) => ({
  // ...现有代码

  // ✅ 添加自动计算的 stageProgress getter
  getStageProgress: () => {
    const { status } = get();
    return calculateStageProgress(status.intimacy);
  },
}));
```

这样每次调用 `getStageProgress()` 都会基于最新的 `status.intimacy` 重新计算。

---

## 性能考量

### 当前性能特征

1. **衰减计算缓存**：
   - 缓存 60 秒，避免重复计算
   - 适合高频调用场景

2. **数据库写入防抖**：
   - 5 秒防抖，减少 I/O
   - 仅当变化 > 1 时写入

3. **计算复杂度**：
   - `calculateStageProgress`：O(1) - 简单算术运算
   - `getCurrentStage`：O(3) - 最多 3 次循环
   - 性能开销极小，可以每次渲染时重新计算

### 建议

✅ **使用 useMemo 方案**，因为：
1. 计算成本极低（几微秒）
2. 保证数据一致性
3. 代码清晰易懂
4. 不需要修改 Store 结构

---

## 总结

### 算法逻辑评估

| 模块 | 状态 | 评价 |
|------|------|------|
| 衰减算法 | ✅ 正确 | 公式合理，边界处理完善 |
| 互动算法 | ✅ 正确 | 冷却、效果、范围限制都正确 |
| 成长阶段 | ✅ 正确 | 阶段判定、进度计算逻辑清晰 |
| 数据更新 | ✅ 正确 | Store → DB 流程正确，有防抖优化 |

### UI 显示问题

| 数据项 | 当前状态 | 问题 |
|--------|---------|------|
| 心情值 | ✅ 动态 | 直接读取 petStatus.mood |
| 精力值 | ✅ 动态 | 直接读取 petStatus.energy |
| 亲密度值 | ✅ 动态 | 直接读取 petStatus.intimacy (通过 stageProgress.intimacy) |
| 阶段名称 | ❌ 静态 | 缓存了初始的 stageProgress |
| 进度条 | ❌ 静态 | 缓存了初始的 progressPercent |

### 修复优先级

🔴 **P0 - 必须修复**：
- GameSettingsWindow 中的 `stageProgress` 需要使用 useMemo 响应式计算

🟡 **P1 - 建议优化**：
- 考虑添加实时刷新指示器，让用户知道数据是动态的
- 在设置窗口添加"刷新"按钮（虽然理论上不需要）

🟢 **P2 - 可选增强**：
- 添加阶段升级动画效果
- 添加进度条动画过渡
