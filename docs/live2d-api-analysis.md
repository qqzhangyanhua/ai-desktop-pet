# Live2D API 调研分析文档

**日期**: 2025-12-26
**版本**: oh-my-live2d ^0.19.3
**分析者**: Claude Code

---

## 1. 现有集成概览

### 1.1 技术栈

- **Live2D 库**: `oh-my-live2d` v0.19.3
- **渲染引擎**: PixiJS v8.14.3
- **架构模式**: Singleton Manager + React Hook
- **状态管理**: Zustand (petStore)

### 1.2 文件结构

```
src/
├── services/live2d/
│   └── manager.ts          # Live2DManager 单例服务
├── hooks/
│   └── useLive2D.ts        # React Hook 封装
├── components/pet/
│   ├── Live2DPet.tsx       # Live2D 组件集成
│   └── PetCanvas.tsx       # Canvas 容器 (未读取)
└── types/
    ├── live2d.ts           # Live2D 类型定义
    └── pet.ts              # EmotionType 定义
```

---

## 2. `triggerEmotion()` 当前实现分析

### 2.1 方法签名

**文件**: `src/services/live2d/manager.ts:198-204`

```typescript
triggerEmotion(emotion: EmotionType): void {
  const motionGroup = this.emotionMapping[emotion] || 'idle';
  // OhMyLive2D doesn't expose direct motion control
  // We'll use tips as visual feedback for now
  // In production, we'd need to access the underlying Live2D model
  console.log(`Triggering emotion: ${emotion} -> motion: ${motionGroup}`);
}
```

### 2.2 关键发现

#### ❌ **当前状态: 未完全实现**

1. **无实际动画触发**:
   - 仅打印日志，未调用任何 Live2D 动作 API
   - 注释表明 `oh-my-live2d` 不暴露直接的动作控制

2. **emotion → motion 映射已存在**:
   ```typescript
   const DEFAULT_EMOTION_MAPPING: Live2DEmotionMapping = {
     happy: 'tap_body',
     sad: 'idle',
     angry: 'shake',
     surprised: 'flick_head',
     thinking: 'idle',
     neutral: 'idle',
     excited: 'tap_body',
     confused: 'shake',
   };
   ```

3. **EmotionType 定义**:
   ```typescript
   // src/types/pet.ts:3
   export type EmotionType =
     | 'happy'
     | 'thinking'
     | 'confused'
     | 'surprised'
     | 'neutral'
     | 'sad'
     | 'excited';
   ```

   **注意**: `Live2DEmotionMapping` 包含 `'angry'`，但 `EmotionType` 中缺少此类型。

---

## 3. oh-my-live2d API 能力分析

### 3.1 暴露的 API

根据 `manager.ts` 中 `Oml2dInstance` 接口定义 (lines 8-25)：

```typescript
interface Oml2dInstance {
  version: string;
  modelIndex: number;

  // 模型切换
  loadNextModel: () => Promise<void>;
  loadModelByIndex: (index: number) => Promise<void>;
  loadModelByName: (name: string) => Promise<void>;
  loadNextModelClothes: () => Promise<void>;

  // 消息提示
  tipsMessage: (message: string, duration: number, priority: number) => void;
  clearTips: () => void;

  // 舞台控制
  stageSlideIn: () => Promise<void>;
  stageSlideOut: () => Promise<void>;

  // 事件回调
  onLoad: (callback: (status: string) => void) => void;
  onStageSlideIn: (callback: () => void) => void;
  onStageSlideOut: (callback: () => void) => void;

  options: {
    models: Live2DModelConfig[];
  };
}
```

### 3.2 **缺失的动作控制 API**

oh-my-live2d **不暴露**以下关键能力：

- ❌ `playMotion(group: string, index: number)` - 播放指定动作
- ❌ `setExpression(name: string)` - 设置表情
- ❌ `getMotionGroups()` - 获取可用动作组
- ❌ `getExpressions()` - 获取可用表情
- ❌ 直接访问底层 Live2D Model 实例

### 3.3 变通方案: `tipsMessage` 作为视觉反馈

当前实现使用 `tipsMessage()` 作为"伪"情绪表达：

**文件**: `manager.ts:173-181`

```typescript
showMessage(message: string, duration: number = 3000, priority: number = 5): void {
  if (!this.instance) return;
  this.instance.tipsMessage(message, duration, priority);
}
```

**使用示例** (`manager.ts:207-259`):

```typescript
playAction(action: PetActionType): void {
  switch (action) {
    case 'feed':
      this.instance.tipsMessage('咔嚓咔嚓吃苹果~', 2800, 6);
      break;
    case 'play':
      this.instance.tipsMessage('小游戏时间！', 2600, 6);
      break;
    // ...其他动作
  }
}
```

---

## 4. 架构集成分析

### 4.1 数据流

```
PetStatus (mood/energy)
    ↓
[未实现] getMoodEmotion(mood, energy)
    ↓
EmotionType ('happy', 'sad', ...)
    ↓
Live2DManager.triggerEmotion(emotion)
    ↓
emotionMapping[emotion] → motionGroup
    ↓
[当前] console.log
[理想] Live2D Model.playMotion(motionGroup)
```

### 4.2 已有的集成点

#### 4.2.1 React Hook (`useLive2D.ts`)

```typescript
const triggerEmotion = useCallback((emotion: EmotionType) => {
  const manager = getLive2DManager();
  manager.triggerEmotion(emotion);
}, []);
```

- ✅ Hook 已准备好
- ✅ 自动状态管理
- ❌ 底层实现未完成

#### 4.2.2 组件集成 (`Live2DPet.tsx`)

```typescript
const { emotion } = usePetStore();
const { triggerEmotion } = useLive2D({ ... });

useEffect(() => {
  if (isReady && emotion) {
    triggerEmotion(emotion);
  }
}, [emotion, isReady, triggerEmotion]);
```

- ✅ 响应 petStore.emotion 变化
- ✅ 自动触发情绪更新
- ❌ 无实际动画效果

---

## 5. 技术限制与挑战

### 5.1 oh-my-live2d 的封装层次过高

**问题**:
- oh-my-live2d 设计为**开箱即用的组件库**，而非底层 API
- 主要用于快速集成，不提供精细控制

**证据**:
- `manager.ts:200-203` 注释明确指出限制
- GitHub Issues 可能有类似需求讨论

### 5.2 需要访问底层 PixiJS-Live2D-Display

**技术路径**:

```
oh-my-live2d
    ↓ (内部依赖)
pixi-live2d-display
    ↓ (内部依赖)
Live2D Cubism Core
```

**可能方案**:
1. Fork oh-my-live2d 暴露底层实例
2. 直接使用 `pixi-live2d-display` (放弃 oh-my-live2d)
3. 通过 DOM 事件模拟点击触发内置动作

---

## 6. mood → emotion 映射需求

### 6.1 输入参数

根据 `types/pet-status.ts`:

```typescript
interface PetStatus {
  mood: number;      // 0-100
  energy: number;    // 0-100
  intimacy: number;  // 0-100
  // ...
}
```

### 6.2 输出类型

```typescript
type EmotionType =
  | 'happy'      // 心情高
  | 'sad'        // 心情低
  | 'excited'    // 心情高 + 精力高
  | 'thinking'   // 中等状态
  | 'confused'   // 心情低 + 精力低
  | 'surprised'  // 亲密度提升时
  | 'neutral';   // 默认状态
```

### 6.3 映射规则设计建议

基于 `task.md` PRD (lines 1180-1203):

```typescript
export function getMoodEmotion(mood: number, energy: number): EmotionType {
  // 优先级1: 极端情绪
  if (mood >= 80 && energy >= 70) return 'excited';   // 开心且充满活力
  if (mood <= 20 && energy <= 30) return 'confused';  // 沮丧且疲惫

  // 优先级2: 心情主导
  if (mood >= 70) return 'happy';
  if (mood <= 30) return 'sad';

  // 优先级3: 中性状态
  if (energy <= 40) return 'thinking';  // 疲惫时深思
  return 'neutral';                      // 默认平静
}
```

---

## 7. 当前系统的动作音效机制

### 7.1 `playActionSound()` 实现

**文件**: `manager.ts:262-293`

```typescript
private playActionSound(action: PetActionType): void {
  const url = this.actionAudio[action];

  if (url) {
    // 播放预设音效文件
    const audio = new Audio(url);
    void audio.play();
    return;
  }

  // 兜底: Web Audio API 生成 0.2s 提示音
  const ctx = this.audioContext || new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 880;
  gain.gain.value = 0.08;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.2);
}
```

**特点**:
- ✅ 支持自定义音效文件绑定 (`setActionAudio`)
- ✅ 兜底方案: 自动生成短提示音
- ✅ 防止播放失败崩溃 (`catch`)

---

## 8. 建议的实现路径

### 8.1 短期方案 (1-2小时)

**仅实现 mood → emotion 映射，暂不修改 Live2D 动画**

**文件**: `src/services/pet/emotion.ts`

```typescript
import type { PetStatus, EmotionType } from '@/types';

export function getMoodEmotion(
  mood: number,
  energy: number
): EmotionType {
  if (mood >= 80 && energy >= 70) return 'excited';
  if (mood <= 20 && energy <= 30) return 'confused';
  if (mood >= 70) return 'happy';
  if (mood <= 30) return 'sad';
  if (energy <= 40) return 'thinking';
  return 'neutral';
}

export function shouldUpdateEmotion(
  currentEmotion: EmotionType,
  newEmotion: EmotionType
): boolean {
  // 防抖: 相同情绪不更新
  if (currentEmotion === newEmotion) return false;

  // 优先级表: 某些情绪更重要
  const priority: Record<EmotionType, number> = {
    excited: 5,
    confused: 5,
    happy: 4,
    sad: 4,
    surprised: 3,
    thinking: 2,
    neutral: 1,
  };

  // 只有更高优先级才更新
  return priority[newEmotion] >= priority[currentEmotion];
}
```

**集成点**:
- `usePetStatus.ts` 中定时检查 mood/energy
- 计算新 emotion 并更新 `petStore.setEmotion()`
- Live2DPet 组件自动响应

### 8.2 中期方案 (4-8小时)

**探索 oh-my-live2d 源码，尝试访问底层实例**

1. 检查 `node_modules/oh-my-live2d` 源码
2. 查找是否有 `__internal__` 或 `_model` 属性
3. 尝试类型断言访问:
   ```typescript
   const internal = (this.instance as any).__internal__;
   if (internal?.model?.playMotion) {
     internal.model.playMotion('TapBody', 0);
   }
   ```

### 8.3 长期方案 (1-2天)

**迁移到 pixi-live2d-display 直接控制**

1. 移除 oh-my-live2d 依赖
2. 使用 `@guansss/pixi-live2d-display` 直接集成
3. 完全控制动作、表情、参数

**参考文档**:
- https://github.com/guansss/pixi-live2d-display

---

## 9. 类型不一致问题

### 9.1 发现的问题

**`Live2DEmotionMapping` 包含 `'angry'`**:

```typescript
// src/types/live2d.ts:30-39
export interface Live2DEmotionMapping {
  happy: string;
  sad: string;
  angry: string;      // ❌ EmotionType 中不存在
  surprised: string;
  thinking: string;
  neutral: string;
  excited: string;
  confused: string;
}
```

**但 `EmotionType` 无 `'angry'`**:

```typescript
// src/types/pet.ts:3
export type EmotionType =
  | 'happy'
  | 'thinking'
  | 'confused'
  | 'surprised'
  | 'neutral'
  | 'sad'
  | 'excited';
  // ❌ 缺少 'angry'
```

### 9.2 建议修复

**选项 1: 添加 `'angry'` 到 `EmotionType`**

```typescript
export type EmotionType =
  | 'happy'
  | 'thinking'
  | 'confused'
  | 'surprised'
  | 'neutral'
  | 'sad'
  | 'excited'
  | 'angry';  // 新增
```

**选项 2: 从 `Live2DEmotionMapping` 删除 `angry`**

修改 `DEFAULT_EMOTION_MAPPING` (manager.ts:28-37):

```typescript
const DEFAULT_EMOTION_MAPPING: Live2DEmotionMapping = {
  happy: 'tap_body',
  sad: 'idle',
  // angry: 'shake',  // 删除
  surprised: 'flick_head',
  thinking: 'idle',
  neutral: 'idle',
  excited: 'tap_body',
  confused: 'shake',
};
```

**推荐**: 选项 1 - 添加 `'angry'` 类型，因为负面情绪是宠物养成的重要状态。

---

## 10. T4.2 任务实现建议

### 10.1 任务目标

根据 `task.md` T4.2 (lines 1127-1260):

**文件**: `src/services/pet/emotion.ts`

**功能**:
1. `getMoodEmotion(mood, energy): EmotionType` - 核心映射逻辑
2. `shouldUpdateEmotion(current, new): boolean` - 防抖优化
3. 边界测试用例

### 10.2 实现优先级

#### Phase 1: 纯逻辑实现 ✅ **立即可做**
- 创建 `emotion.ts` 服务
- 实现映射函数
- 添加单元测试 (可选)

#### Phase 2: 集成到 usePetStatus ✅ **立即可做**
- 在 `usePetStatus.ts` 定时检查中调用
- 更新 `petStore.setEmotion()`
- 无需等待 Live2D 动画实现

#### Phase 3: Live2D 动画增强 ⏸️ **待后续优化**
- 需要解决 oh-my-live2d API 限制
- 可作为独立 Sprint 处理

---

## 11. 总结与结论

### 11.1 核心发现

1. ✅ **架构已完备**: Manager → Hook → Component 集成链路清晰
2. ✅ **类型系统完善**: EmotionType、Live2DState 已定义
3. ❌ **动画控制缺失**: `triggerEmotion()` 仅为占位实现
4. ⚠️ **API 限制**: oh-my-live2d 不暴露底层动作控制
5. ✅ **音效系统健全**: 支持自定义音频 + 兜底生成

### 11.2 T4.2 可独立实现

**无需等待 Live2D 动画解决方案**，可以先完成：

- mood → emotion 映射逻辑 ✅
- 状态更新机制 ✅
- 防抖优化 ✅

即使 Live2D 模型不播放对应动作，情绪状态仍会正确计算和存储，为未来动画实现奠定基础。

### 11.3 风险与建议

**风险**:
- oh-my-live2d 可能永久无法支持精细动作控制
- 需要评估迁移到 pixi-live2d-display 的成本

**建议**:
1. **先实现 T4.2 逻辑层** (本 Sprint 完成)
2. **创建 Live2D 动画增强 Backlog** (未来 Sprint)
3. **记录 API 限制为技术债务** (docs/technical-debt.md)

---

**调研完成时间**: 2025-12-26
**下一步**: 执行 T4.2 - 实现 `services/pet/emotion.ts`
