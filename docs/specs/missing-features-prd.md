# AI Desktop Pet 缺失功能产品需求文档 (PRD)

## 文档信息

| 项目 | 内容 |
|------|------|
| **文档版本** | 1.0 |
| **创建日期** | 2025-12-28 |
| **作者** | Sarah (BMAD Product Owner) |
| **项目** | AI Desktop Pet - 缺失功能设计 |
| **质量评分** | 92/100 |

---

## 一、项目概述

### 1.1 背景说明

AI Desktop Pet 是一个基于 Tauri 2.0 + React 19 的跨平台桌面宠物应用，当前已完成：
- **设置中心**: 95% 完成度，配置结构完整
- **前台宠物交互**: 100% 完成度，Live2D渲染完善
- **后端服务**: 95% 完成度，核心服务架构稳定

本PRD针对7个未实现功能进行产品设计，优先级基于用户价值和技术依赖关系排序。

### 1.2 设计目标

1. **完整性**: 补齐桌面应用核心体验（快捷键、自启动）
2. **差异化**: 通过语音交互和成就系统增强竞争力
3. **性能可控**: 平衡功能丰富度与资源占用
4. **跨平台**: 确保 macOS / Windows / Linux 一致体验

### 1.3 技术约束

- **Tauri 2.0**: 必须使用官方插件，禁止自定义Rust后端
- **配置结构**: 复用现有 `config.ts` 中预定义字段
- **UI风格**: 遵循游戏化 Macaron 配色体系
- **TypeScript**: 严格类型安全，禁止 `any` 类型

---

## 二、高优先级功能

### 功能 1: 全局快捷键绑定

#### 2.1.1 功能概述

实现全局快捷键监听系统，支持用户通过快捷键快速打开聊天窗口和设置面板，提升桌面应用的快捷操作体验。

#### 2.1.2 用户场景

**场景 A: 快速唤起聊天**
- 用户正在浏览网页，突然想问宠物一个问题
- 按下快捷键（如 `Cmd+Shift+C`），聊天窗口立即获得焦点
- 无需用鼠标点击或切换窗口

**场景 B: 快速调整设置**
- 用户需要临时关闭语音功能
- 按下快捷键（如 `Cmd+Shift+S`），设置面板立即打开
- 快速调整后关闭，继续工作

#### 2.1.3 功能需求

**核心功能点:**

1. **快捷键注册服务** (`services/keyboard/shortcuts.ts`)
   - 监听 `config.assistant.shortcuts.openChat` 和 `openSettings` 配置
   - 配置变更时自动重新注册快捷键
   - 应用启动时自动注册已配置的快捷键

2. **快捷键输入组件** (已存在 UI，需绑定监听器)
   - 支持用户输入快捷键组合
   - 实时检测快捷键冲突（系统保留键、其他应用占用）
   - 跨平台键位标准化（Mac 的 `Cmd` 自动映射为 Windows/Linux 的 `Ctrl`）

3. **冲突检测机制**
   - 检测与系统保留键的冲突（如 `Cmd+Q`, `Cmd+W` 等）
   - 显示友好的冲突提示信息
   - 阻止注册冲突快捷键

4. **触发动作**
   - `openChat`: 打开或聚焦聊天窗口（`chat.html`）
   - `openSettings`: 打开或聚焦设置窗口（`settings.html`）

#### 2.1.4 交互设计

**快捷键设置界面 (现有组件补充):**
```
┌─────────────────────────────────────┐
│ 快捷键设置                           │
├─────────────────────────────────────┤
│                                     │
│ 打开聊天     [  Cmd+Shift+C  ] ✅   │
│                                     │
│ 打开设置     [  Cmd+Shift+S  ] ✅   │
│                                     │
│ 💡 输入框内按下组合键即可设置        │
│                                     │
│   [保存]   [重置为默认]              │
└─────────────────────────────────────┘
```

**交互流程:**
1. 用户点击输入框进入录制模式
2. 输入框显示"请按下快捷键..."提示
3. 用户按下组合键后，输入框显示键位（如 `Cmd+Shift+C`）
4. 自动检测冲突：
   - 无冲突: 显示绿色勾，允许保存
   - 有冲突: 显示红色叉 + 冲突原因提示

**快捷键触发反馈:**
- 窗口打开时播放轻微音效（可配置关闭）
- 窗口从当前鼠标位置附近弹出（如果窗口隐藏）
- 使用 Tauri 的 `setAlwaysOnTop(true)` 确保窗口可见

#### 2.1.5 非功能需求

**性能要求:**
- 快捷键响应延迟 < 50ms
- 快捷键注册失败不影响应用其他功能

**兼容性要求:**
- macOS: 优先使用 `Cmd` 键，`Option` 作为修饰键
- Windows/Linux: 使用 `Ctrl` 键，`Alt` 作为修饰键
- 输入法状态下不应触发快捷键（检测键盘输入状态）

**安全要求:**
- 禁止注册系统级保留键（如 `Cmd+Q` 退出应用）
- 快捷键配置变更需确认后生效

#### 2.1.6 技术实现要点

**Tauri 插件依赖:**
```bash
pnpm add @tauri-apps/plugin-global-shortcut
```

**核心代码结构:**
```typescript
// services/keyboard/shortcuts.ts
import { register, unregister, isRegistered } from '@tauri-apps/plugin-global-shortcut';

export class ShortcutManager {
  private static instance: ShortcutManager;

  // 注册所有配置的快捷键
  async registerShortcuts(shortcuts: {
    openChat: string;
    openSettings: string;
  }): Promise<void> { ... }

  // 快捷键触发回调
  async handleShortcut(action: 'openChat' | 'openSettings'): Promise<void> { ... }
}
```

**跨平台键位映射:**
```typescript
// Mac 'Cmd' -> Windows/Linux 'Ctrl'
// Mac 'Option' -> Windows/Linux 'Alt'
function normalizeShortcut(shortcut: string): string {
  const platform = navigator.userAgent.toLowerCase();
  if (platform.includes('mac')) {
    return shortcut.replace(/\+Ctrl\+/i, '+Cmd+');
  }
  return shortcut.replace(/\+Cmd\+/i, '+Ctrl+');
}
```

#### 2.1.7 验收标准

- [ ] 用户可以设置任意组合键（除系统保留键）
- [ ] 快捷键冲突时显示友好提示
- [ ] 快捷键触发窗口打开延迟 < 100ms
- [ ] 跨平台键位映射正确（Mac 用 Cmd，Windows 用 Ctrl）
- [ ] 输入法状态下不误触发快捷键
- [ ] 快捷键配置持久化到数据库
- [ ] 应用重启后快捷键自动注册

---

### 功能 2: 开机自启动

#### 2.2.1 功能概述

实现应用跟随操作系统自动启动的功能，用户无需每次开机手动启动桌面宠物。

#### 2.2.2 用户场景

**场景 A: 日常使用**
- 用户每天开机后希望宠物自动出现
- 无需手动找到应用图标并点击启动

**场景 B: 隐私考虑**
- 用户在公司不希望宠物自动启动（暴露使用）
- 可以手动关闭自启动选项

#### 2.2.3 功能需求

**核心功能点:**

1. **自启动管理服务** (`services/system/autostart.ts`)
   - 读取 `config.performance.launchOnStartup` 配置
   - 根据配置启用/禁用系统自启动项
   - 监听配置变更实时更新自启动状态

2. **权限处理**
   - 首次开启时请求系统权限（macOS 需要）
   - 权限被拒绝时显示引导用户手动授权的提示

3. **状态同步**
   - 启动时检测自启动状态，同步到UI
   - 处理外部修改（如用户通过系统设置关闭）的情况

#### 2.2.4 交互设计

**设置界面 (性能标签页):**
```
┌─────────────────────────────────────┐
│ 性能设置                             │
├─────────────────────────────────────┤
│                                     │
│ 开机自启动                           │
│   [✓] 随系统自动启动桌面宠物         │
│                                     │
│ 💡 首次开启需要系统授权              │
│                                     │
│ 当前状态: ✅ 已启用                  │
│                                     │
└─────────────────────────────────────┘
```

**首次授权引导 (macOS):**
```
┌─────────────────────────────────────┐
│ ⚠️ 系统权限要求                      │
├─────────────────────────────────────┤
│                                     │
│ 为启用开机自启动，需要授权：          │
│                                     │
│ [系统设置] > [通用] > [登录项]       │
│                                     │
│ 请勾选 "AI Desktop Pet"              │
│                                     │
│   [我已授权]   [稍后设置]            │
└─────────────────────────────────────┘
```

#### 2.2.5 非功能需求

**性能要求:**
- 自启动延迟控制在 3-5 秒内（避免拖慢开机速度）
- 启动时优先显示宠物，延迟加载非关键功能

**兼容性要求:**
- macOS: 使用 `launchd` 机制
- Windows: 使用注册表 `Run` 键
- Linux: 使用 `~/.config/autostart/` .desktop 文件

**安全要求:**
- 用户明确关闭自启动后，不再自动启用
- 提供清晰的关闭入口

#### 2.2.6 技术实现要点

**Tauri 插件依赖:**
```bash
pnpm add @tauri-apps/plugin-autostart
```

**核心代码结构:**
```typescript
// services/system/autostart.ts
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';

export class AutostartManager {
  private static instance: AutostartManager;

  async setAutostart(enabled: boolean): Promise<void> {
    if (enabled) {
      await enable();
    } else {
      await disable();
    }
  }

  async isEnabled(): Promise<boolean> {
    return await isEnabled();
  }
}
```

**配置绑定:**
```typescript
// 在 App.tsx 初始化时
useEffect(() => {
  const syncAutostart = async () => {
    const autostartManager = getAutostartManager();
    await autostartManager.setAutostart(config.performance.launchOnStartup);
  };
  syncAutostart();
}, [config.performance.launchOnStartup]);
```

#### 2.2.7 验收标准

- [ ] 用户可通过开关控制自启动状态
- [ ] macOS 首次开启显示权限引导
- [ ] Windows/Linux 自动配置自启动（无需用户干预）
- [ ] 自启动状态与系统设置同步
- [ ] 用户手动关闭后，应用不再修改系统设置
- [ ] 配置变更实时生效（无需重启应用）

---

## 三、中优先级功能

### 功能 3: 按键说话 (Push-to-Talk)

#### 3.3.1 功能概述

实现类似对讲机的语音交互方式：用户按住指定按键（如空格键）开始录音，松开按键后自动发送语音并获取AI回复。

#### 3.3.2 用户场景

**场景 A: 快速语音询问**
- 用户在玩游戏，不方便打字
- 按住空格键说出"今天天气怎么样？"
- 松开按键，宠物语音播报天气信息

**场景 B: 连续对话**
- 用户按住空格键说话
- 松开后AI回复，用户再次按住继续对话
- 形成自然的语音交流节奏

#### 3.3.3 功能需求

**核心功能点:**

1. **按键状态检测**
   - 监听 `config.voice.pushToTalkKey` 配置（默认 Space）
   - 全局监听按键按下/松开事件
   - 区分单击和长按（误触过滤）

2. **语音录制控制**
   - 按下时启动 STT 引擎录音
   - 松开时停止录音并识别文本
   - 识别结果自动发送给 LLM

3. **视觉反馈**
   - 按键说话时宠物显示"正在录音"动画
   - 显示音量波形可视化
   - 松开按键后显示"正在处理"状态

4. **防误触机制**
   - 按键时长 < 300ms 视为误触，忽略
   - 按键时长 > 30 秒自动停止录音（用户忘记松开）
   - 录音音量过低时提示"未检测到语音"

#### 3.3.4 交互设计

**状态指示器 (宠物头部上方浮动):**
```
┌────────────────────────────┐
│  🎙️ 正在录音...  00:03    │  ← 按键说话时显示
│  ████████░░░░░░░░          │  ← 音量波形
└────────────────────────────┘
```

**设置界面 (语音标签页):**
```
┌─────────────────────────────────────┐
│ 语音设置                             │
├─────────────────────────────────────┤
│                                     │
│ 按键说话                             │
│   触发键位: [  Space  ]             │
│                                     │
│   [✓] 按键说话时显示录音指示器        │
│   [✓] 松开按键自动发送               │
│   [ ] 按键说话时禁用快捷键            │
│                                     │
│ 💡 按住按键开始录音，松开发送         │
│                                     │
└─────────────────────────────────────┘
```

**交互时序图:**
```
用户动作           系统反馈            宠物状态
────────────────────────────────────────────
按住空格    →    🎙️ 开始录音      →    "嘘"动作
持续说话    →    显示波形动画      →    专注聆听
松开空格    →    🎤 停止录音      →    思考动作
           →    识别文本成功     →    显示文本气泡
           →    发送 LLM 请求   →    等待回复
           →    收到 AI 回复    →    播放 TTS
```

#### 3.3.5 非功能需求

**性能要求:**
- 录音启动延迟 < 100ms
- 语音识别延迟 < 500ms（使用 Web Speech API）
- 端到端延迟（按下到听到回复）< 3 秒

**兼容性要求:**
- 优先使用 Web Speech API（浏览器原生）
- 备选方案: 支持外部 STT 服务（如 OpenAI Whisper）

**可用性要求:**
- 按键冲突时显示警告（如与输入法冲突）
- 支持自定义触发键位（默认 Space，可改为 F13-F24）

#### 3.3.6 技术实现要点

**依赖服务:**
- `services/voice/stt-web.ts` - STT 引擎
- `services/keyboard/shortcuts.ts` - 全局按键监听
- `services/chat/` - LLM 对话服务

**核心代码结构:**
```typescript
// services/voice/push-to-talk.ts
import { getWebSpeechSTT } from './stt-web';
import { sendChatMessage } from '@/services/chat';

export class PushToTalkManager {
  private isRecording = false;
  private recordingStartTime = 0;

  async onKeyDown(): Promise<void> {
    this.recordingStartTime = Date.now();
    this.isRecording = true;

    // 启动 STT 录音
    const stt = getWebSpeechSTT();
    await stt.startListening();

    // 显示录音UI
    this.showRecordingIndicator();
  }

  async onKeyUp(): Promise<void> {
    const duration = Date.now() - this.recordingStartTime;

    // 防误触: 时长 < 300ms
    if (duration < 300) {
      await this.cancelRecording();
      return;
    }

    this.isRecording = false;

    // 停止录音并识别
    const stt = getWebSpeechSTT();
    const text = await stt.stopListening();

    if (text) {
      // 自动发送聊天
      await sendChatMessage(text, { isVoice: true });
    }
  }
}
```

**按键监听集成:**
```typescript
// 在 ShortcutManager 中扩展
export class ShortcutManager {
  private pushToTalkManager: PushToTalkManager;

  async registerPushToTalk(key: string): Promise<void> {
    // 监听全局按键事件
    document.addEventListener('keydown', (e) => {
      if (e.code === key) {
        this.pushToTalkManager.onKeyDown();
      }
    });

    document.addEventListener('keyup', (e) => {
      if (e.code === key) {
        this.pushToTalkManager.onKeyUp();
      }
    });
  }
}
```

#### 3.3.7 验收标准

- [ ] 按住指定键开始录音，松开停止
- [ ] 录音时长 < 300ms 视为误触并忽略
- [ ] 录音时长 > 30 秒自动停止并提示
- [ ] 录音时显示音量波形可视化
- [ ] 识别失败时显示友好提示
- [ ] 识别文本自动发送给 LLM
- [ ] LLM 回复自动播放 TTS（如果启用）
- [ ] 与快捷键功能不冲突

---

### 功能 4: 成就解锁 Toast 通知

#### 3.4.1 功能概述

当用户解锁成就时，显示醒目的 Toast 通知动画，增强成就感和游戏化体验。

#### 3.4.2 用户场景

**场景 A: 首次解锁成就**
- 用户第一次抚摸宠物
- 右下角弹出成就解锁通知
- 显示成就图标、名称、描述
- 播放音效和动画

**场景 B: 批量解锁**
- 用户离线一天后回归
- 连续互动成就同时解锁
- Toast 队列依次显示，避免重叠

#### 3.4.3 功能需求

**核心功能点:**

1. **成就事件监听**
   - 监听 `services/achievements` 的 `unlocked` 事件
   - 接收解锁成就数据（id, name, description, icon）

2. **Toast 队列管理**
   - 支持多个成就同时解锁
   - 依次显示，每个 Toast 显示 5 秒
   - 队列上限 5 个，超过的丢弃

3. **动画效果**
   - 从右下角滑入
   - 金色边框 + 闪光特效
   - 播放解锁音效（可配置关闭）

4. **持久化记录**
   - 已解锁的成就不再重复通知
   - 用户可在设置中查看历史成就

#### 3.4.4 交互设计

**Toast 样式 (游戏化风格):**
```
┌─────────────────────────────────────────┐
│  ✨ 成就解锁!  ✨                        │
├─────────────────────────────────────────┤
│                                         │
│     [🎖️]                                │
│                                         │
│     初次相遇                            │
│     第一次抚摸宠物                       │
│                                         │
│        × (关闭)                         │
└─────────────────────────────────────────┘
     ↑ 从右下角滑入，停留5秒后自动淡出
```

**动画时序:**
1. 0ms: Toast 从屏幕外滑入（ease-out 300ms）
2. 300ms: 触发闪光特效（白色边框渐变到金色）
3. 300-5000ms: 保持显示
4. 5000ms: 淡出（ease-in 200ms）
5. 5200ms: 从 DOM 移除

**设置界面 (通知设置):**
```
┌─────────────────────────────────────┐
│ 通知设置                             │
├─────────────────────────────────────┤
│                                     │
│ 成就通知                             │
│   [✓] 显示成就解锁 Toast             │
│   [✓] 播放成就解锁音效               │
│   [✓] 显示成就描述                   │
│                                     │
│ Toast 显示时长: [ 5 秒 ▼ ]           │
│                                     │
└─────────────────────────────────────┘
```

#### 3.4.5 非功能需求

**性能要求:**
- Toast 动画帧率稳定 60fps
- 多个 Toast 依次显示时无卡顿
- 音效文件 < 100KB（使用 MP3 格式）

**兼容性要求:**
- CSS 动画兼容所有主流浏览器
- 音效支持自动播放（遵循浏览器策略）

#### 3.4.6 技术实现要点

**组件结构:**
```typescript
// components/AchievementToast.tsx
import { useEffect, useState } from 'react';
import type { Achievement } from '@/types';
import './AchievementToast.css';

interface AchievementToastProps {
  achievement: Achievement;
  onClose: () => void;
}

export function AchievementToast({ achievement, onClose }: AchievementToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 滑入动画
    requestAnimationFrame(() => setIsVisible(true));

    // 自动关闭
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 200); // 等待淡出动画
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`achievement-toast ${isVisible ? 'visible' : ''}`}>
      <div className="toast-header">
        <span className="sparkle">✨</span>
        <span>成就解锁!</span>
        <span className="sparkle">✨</span>
      </div>
      <div className="toast-icon">{achievement.icon}</div>
      <div className="toast-name">{achievement.name}</div>
      <div className="toast-description">{achievement.description}</div>
      <button className="toast-close" onClick={onClose}>×</button>
    </div>
  );
}
```

**Toast 容器 (App.tsx):**
```typescript
// components/AchievementToastContainer.tsx
import { useState, useEffect } from 'react';
import { AchievementToast } from './AchievementToast';
import { listen } from '@tauri-apps/api/event';

export function AchievementToastContainer() {
  const [queue, setQueue] = useState<Achievement[]>([]);

  useEffect(() => {
    // 监听成就解锁事件
    const unlisten = listen<Achievement>('achievement:unlocked', (event) => {
      setQueue(prev => [...prev, event.payload].slice(0, 5)); // 队列上限5
    });

    return () => { unlisten.then(fn => fn()); };
  }, []);

  return (
    <div className="achievement-toast-container">
      {queue.map((achievement, index) => (
        <AchievementToast
          key={achievement.id}
          achievement={achievement}
          onClose={() => setQueue(prev => prev.filter((_, i) => i !== index))}
        />
      ))}
    </div>
  );
}
```

**CSS 样式 (遵循游戏化设计 tokens):**
```css
/* components/AchievementToast.css */
.achievement-toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 300px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 248, 220, 0.95));
  border: 3px solid var(--color-accent, #fbbf24);
  border-radius: var(--radius-lg, 24px);
  box-shadow: 0 10px 30px rgba(251, 191, 36, 0.3);
  transform: translateX(120%);
  transition: transform 300ms ease-out, opacity 200ms ease-in;
  z-index: var(--z-toast, 9999);
}

.achievement-toast.visible {
  transform: translateX(0);
}

.toast-header {
  display: flex;
  justify-content: center;
  gap: 8px;
  font-weight: bold;
  color: var(--color-primary, #a78bfa);
  margin-bottom: 12px;
}

.sparkle {
  animation: sparkle 1.5s infinite;
}

@keyframes sparkle {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}

.toast-icon {
  font-size: 48px;
  text-align: center;
  margin: 8px 0;
  animation: bounce 0.5s ease-out;
}

@keyframes bounce {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
```

**事件触发 (services/achievements/index.ts):**
```typescript
// 在 unlockAchievement 函数中添加
import { emit } from '@tauri-apps/api/event';

export async function unlockAchievement(id: string): Promise<Achievement | null> {
  // ... 现有逻辑 ...

  // 触发事件
  await emit('achievement:unlocked', achievement);

  return achievement;
}
```

#### 3.4.7 验收标准

- [ ] 成就解锁时自动显示 Toast
- [ ] Toast 从右下角滑入，停留5秒
- [ ] 多个成就依次显示，不重叠
- [ ] Toast 显示成就图标、名称、描述
- [ ] 播放解锁音效（可配置关闭）
- [ ] 点击关闭按钮可立即关闭
- [ ] 已解锁成就不重复通知
- [ ] 动画流畅，无卡顿

---

### 功能 5: 自动打工逻辑

#### 3.5.1 功能概述

实现宠物在闲置时自动"打工"赚取资源的机制，让用户即使不在线也能获得游戏收益，提升留存率。

#### 3.5.2 用户场景

**场景 A: 离线收益**
- 用户上班出门前启动宠物
- 宠物在家"打工"赚取金币/经验
- 晚上回家后看到打工成果

**场景 B: 闲置收益**
- 用户专注于工作，2小时没有互动
- 宠物自动进入打工状态
- 用户休息时查看打工收益

#### 3.5.3 功能需求

**核心功能点:**

1. **打工触发条件**
   - 用户闲置 > 30 分钟（可配置）
   - 宠物状态良好（心情 > 30, 精力 > 30）
   - 用户开启 `config.behavior.autoWorkEnabled`

2. **打工类型**
   - **简单打工**: 清理桌面图标（收益低，耗时短）
   - **普通打工**: 整理文件（收益中，耗时中）
   - **困难打工**: 学习新技能（收益高，耗时长）

3. **收益计算**
   - 基础收益：10-50 金币/小时
   - 奖励加成：宠物亲密度越高，收益越高
   - 随机事件：10% 概率获得额外奖励

4. **打工状态反馈**
   - 打工中显示"正在工作..."状态
   - 完成后显示打工结果通知
   - 记录打工历史到数据库

#### 3.5.4 交互设计

**打工状态指示器 (宠物头部气泡):**
```
┌────────────────────────────┐
│  💼 正在整理文件...         │  ← 打工中显示
│  进度: ████████░░ 80%      │
│  剩余: 00:12:34            │
└────────────────────────────┘
```

**打工完成通知:**
```
┌─────────────────────────────────────┐
│ 💼 打工完成!                         │
├─────────────────────────────────────┤
│ 工作内容: 整理文件                   │
│ 工作时长: 2小时15分钟                │
│ 获得: +35 金币, +8 经验              │
│                                     │
│ 💡 你的宠物很勤劳哦!                 │
│              [查看详情]              │
└─────────────────────────────────────┘
```

**设置界面 (行为标签页):**
```
┌─────────────────────────────────────┐
│ 宠物行为设置                         │
├─────────────────────────────────────┤
│                                     │
│ 自动打工                             │
│   [✓] 启用自动打工功能               │
│                                     │
│   触发条件: 闲置超过 [ 30 分钟 ▼ ]   │
│   最大工作时长: [ 4 小时 ▼ ]         │
│                                     │
│ 💡 打工时宠物会获得金币和经验，       │
│   但会消耗心情和精力值。              │
│                                     │
└─────────────────────────────────────┘
```

#### 3.5.5 非功能需求

**性能要求:**
- 打工计算不影响前台交互
- 打工历史数据库写入频率 ≤ 1次/小时

**平衡性要求:**
- 自动打工收益 ≤ 手动互动收益的50%（鼓励用户参与）
- 打工消耗心情/精力，防止无限打工
- 每日打工上限 8 小时（防止过度自动化）

#### 3.5.6 技术实现要点

**数据结构:**
```typescript
// types/pet.ts 扩展
export interface AutoWorkTask {
  id: string;
  type: 'easy' | 'normal' | 'hard';
  status: 'pending' | 'working' | 'completed';
  startTime: number;
  endTime: number;
  reward: {
    coins: number;
    experience: number;
  };
}

export interface AutoWorkConfig {
  enabled: boolean;
  idleTriggerMinutes: number;
  maxWorkHours: number;
}
```

**服务实现:**
```typescript
// services/pet/auto-work.ts
import { getSchedulerManager } from '@/services/scheduler/manager';
import { updateStatusImmediate } from '@/services/database/pet-status';
import type { AutoWorkTask } from '@/types';

export class AutoWorkManager {
  private static instance: AutoWorkManager;
  private currentTask: AutoWorkTask | null = null;

  /**
   * 检查是否应该开始打工
   */
  async checkShouldStartWork(petStatus: PetStatus): Promise<boolean> {
    const config = useConfigStore.getState().config.behavior;

    // 检查开关
    if (!config.autoWorkEnabled) return false;

    // 检查状态
    if (petStatus.mood < 30 || petStatus.energy < 30) return false;

    // 检查闲置时长
    const lastInteractionTime = petStatus.lastInteractionTime || Date.now();
    const idleMinutes = (Date.now() - lastInteractionTime) / 1000 / 60;

    return idleMinutes >= 30; // 默认30分钟
  }

  /**
   * 开始打工任务
   */
  async startWork(): Promise<void> {
    if (this.currentTask) return;

    const task: AutoWorkTask = {
      id: generateId(),
      type: this.selectWorkType(),
      status: 'working',
      startTime: Date.now(),
      endTime: Date.now() + this.getWorkDuration() * 1000,
      reward: this.calculateReward(),
    };

    this.currentTask = task;

    // 调度任务完成事件
    const scheduler = getSchedulerManager();
    await scheduler.createTask({
      name: `auto-work-${task.id}`,
      trigger: { type: 'manual' },
      action: {
        type: 'script',
        script: async () => await this.completeWork(task.id),
      },
    });
  }

  /**
   * 完成打工任务
   */
  async completeWork(taskId: string): Promise<void> {
    const task = this.currentTask;
    if (!task || task.id !== taskId) return;

    // 发放奖励
    // TODO: 实现金币/经验系统

    // 消耗状态
    const statusStore = usePetStatusStore.getState();
    await updateStatusImmediate({
      mood: Math.max(0, statusStore.status.mood - 10),
      energy: Math.max(0, statusStore.status.energy - 15),
    });

    // 发送通知
    await emit('auto-work:completed', task);

    this.currentTask = null;
  }

  /**
   * 选择工作类型
   */
  private selectWorkType(): 'easy' | 'normal' | 'hard' {
    const rand = Math.random();
    if (rand < 0.5) return 'easy';
    if (rand < 0.8) return 'normal';
    return 'hard';
  }

  /**
   * 计算工作时长（分钟）
   */
  private getWorkDuration(): number {
    const durations = { easy: 30, normal: 60, hard: 120 };
    return durations[this.currentTask!.type];
  }

  /**
   * 计算奖励
   */
  private calculateReward(): { coins: number; experience: number } {
    const baseRewards = { easy: 10, normal: 25, hard: 50 };
    const base = baseRewards[this.currentTask!.type];

    // 亲密度加成
    const intimacy = usePetStatusStore.getState().status.intimacy;
    const multiplier = 1 + (intimacy / 100) * 0.5;

    // 随机波动
    const randomFactor = 0.8 + Math.random() * 0.4;

    const coins = Math.floor(base * multiplier * randomFactor);
    const experience = Math.floor(coins * 0.5);

    return { coins, experience };
  }
}
```

**集成到 Idle Behavior:**
```typescript
// services/pet/idle-behavior.ts 修改
import { getAutoWorkManager } from './auto-work';

export async function handleIdleBehavior(petStatus: PetStatus): Promise<void> {
  const autoWorkManager = getAutoWorkManager();

  // 检查是否应该开始打工
  if (await autoWorkManager.checkShouldStartWork(petStatus)) {
    await autoWorkManager.startWork();
    return;
  }

  // 原有的闲置行为逻辑...
}
```

#### 3.5.7 验收标准

- [ ] 用户可开关自动打工功能
- [ ] 闲置30分钟后自动触发打工
- [ ] 打工中显示工作状态和进度
- [ ] 打工完成后显示收益通知
- [ ] 打工消耗心情和精力
- [ ] 打工收益基于亲密度浮动
- [ ] 每日打工时长不超过8小时
- [ ] 打工历史记录到数据库

---

## 四、低优先级功能

### 功能 6: 后台运行模式

#### 4.6.1 功能概述

实现智能后台运行策略，当窗口失去焦点或最小化时，自动降低资源占用（渲染帧率、任务频率），平衡性能与功耗。

#### 4.6.2 功能需求

**核心功能点:**

1. **运行模式切换**
   - **性能模式** (performance): 全速运行，60fps 渲染
   - **平衡模式** (balanced): 30fps 渲染，降低任务频率
   - **省电模式** (battery): 15fps 渲染，最小化后台任务

2. **自动触发条件**
   - 窗口失焦 → 切换到平衡模式
   - 窗口最小化 → 切换到省电模式
   - 窗口获得焦点 → 恢复性能模式

3. **降级策略**
   - Live2D 渲染帧率降低
   - 衰减计算频率降低
   - 闲置动画周期延长

#### 4.6.3 交互设计

**性能模式指示器 (设置面板):**
```
┌─────────────────────────────────────┐
│ 性能模式                             │
├─────────────────────────────────────┤
│                                     │
│ 当前模式: 平衡模式                   │
│   ⚡ 性能: 中等                      │
│   🎨 渲染帧率: 30fps                │
│   🔋 功耗: 低                        │
│                                     │
│ [🏆 性能优先] [⚖️ 平衡] [🔋 省电]   │
│                                     │
│ 自动切换:                            │
│   [✓] 窗口失焦时切换到平衡模式       │
│   [✓] 窗口最小化时切换到省电模式     │
│                                     │
└─────────────────────────────────────┘
```

#### 4.6.4 技术实现要点

**性能管理器:**
```typescript
// services/performance/manager.ts
export class PerformanceManager {
  private currentMode: PerformanceMode = 'balanced';

  /**
   * 根据窗口状态调整性能模式
   */
  async adjustForWindowState(focused: boolean, minimized: boolean): Promise<void> {
    const config = useConfigStore.getState().config.performance;

    if (minimized) {
      await this.setMode('battery');
    } else if (!focused && config.backgroundMode !== 'performance') {
      await this.setMode(config.backgroundMode);
    } else {
      await this.setMode('performance');
    }
  }

  /**
   * 设置性能模式
   */
  async setMode(mode: PerformanceMode): Promise<void> {
    if (this.currentMode === mode) return;

    this.currentMode = mode;

    // 调整渲染帧率
    const fps = { performance: 60, balanced: 30, battery: 15 }[mode];
    await this.setRenderFPS(fps);

    // 调整任务频率
    const interval = { performance: 60000, balanced: 120000, battery: 300000 }[mode];
    await this.setTaskInterval(interval);
  }

  /**
   * 设置 Live2D 渲染帧率
   */
  private async setRenderFPS(fps: number): Promise<void> {
    // 通知 Live2D 管理器调整帧率
    const live2dManager = getLive2DManager();
    await live2dManager.setTargetFPS(fps);
  }
}
```

**窗口焦点监听:**
```typescript
// 在 PetContainer.tsx 中
useEffect(() => {
  const handleFocus = async () => {
    const perfManager = getPerformanceManager();
    await perfManager.adjustForWindowState(true, false);
  };

  const handleBlur = async () => {
    const perfManager = getPerformanceManager();
    await perfManager.adjustForWindowState(false, false);
  };

  window.addEventListener('focus', handleFocus);
  window.addEventListener('blur', handleBlur);

  return () => {
    window.removeEventListener('focus', handleFocus);
    window.removeEventListener('blur', handleBlur);
  };
}, []);
```

#### 4.6.5 验收标准

- [ ] 窗口失焦时自动切换到平衡模式
- [ ] 窗口最小化时自动切换到省电模式
- [ ] 窗口获得焦点时恢复性能模式
- [ ] 用户可手动指定后台模式
- [ ] 渲染帧率根据模式动态调整
- [ ] CPU 占用率在省电模式下降低 >50%

---

### 功能 7: 资源占用限制

#### 4.7.1 功能概述

实现内存和 CPU 使用率监控，当资源占用超过阈值时自动降级功能，防止影响用户其他工作。

#### 4.7.2 功能需求

**核心功能点:**

1. **资源监控**
   - 监控应用内存占用（通过 Chrome DevTools Protocol）
   - 监控 CPU 使用率（通过 Tauri 插件）
   - 每分钟采样一次

2. **阈值触发降级**
   - **低资源限制** (low): 内存 > 500MB 或 CPU > 20%
   - **中资源限制** (medium): 内存 > 1GB 或 CPU > 40%
   - **高资源限制** (high): 内存 > 2GB 或 CPU > 60%

3. **降级策略**
   - 卸载未使用的 Live2D 模型
   - 降低动画复杂度
   - 暂停非关键后台任务

#### 4.7.3 交互设计

**资源使用指示器 (设置 > 性能):**
```
┌─────────────────────────────────────┐
│ 资源监控                             │
├─────────────────────────────────────┤
│                                     │
│ 当前资源占用:                        │
│   📊 内存: 856 MB / 2048 MB          │
│   ⚡ CPU: 18%                       │
│                                     │
│ 资源限制: [  中等 ▼  ]               │
│   · 低: 500MB 内存, 20% CPU         │
│   · 中: 1GB 内存, 40% CPU           │
│   · 高: 2GB 内存, 60% CPU           │
│                                     │
│ [✓] 超过限制时自动降级               │
│ [ ] 显示资源占用警告                 │
│                                     │
└─────────────────────────────────────┘
```

#### 4.7.4 技术实现要点

**资源监控服务:**
```typescript
// services/performance/monitor.ts
export class ResourceMonitor {
  private interval: NodeJS.Timeout | null = null;

  /**
   * 开始监控
   */
  async startMonitoring(): Promise<void> {
    this.interval = setInterval(async () => {
      const memory = await this.getMemoryUsage();
      const cpu = await this.getCPUUsage();

      await this.checkThresholds(memory, cpu);
    }, 60000); // 每分钟检查
  }

  /**
   * 获取内存使用量（近似值）
   */
  private async getMemoryUsage(): Promise<number> {
    // 使用 performance.memory API（Chrome 特性）
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  /**
   * 检查是否超过阈值
   */
  private async checkThresholds(memory: number, cpu: number): Promise<void> {
    const config = useConfigStore.getState().config.performance;
    const limit = config.resourceLimit;

    const thresholds = {
      low: { memory: 500, cpu: 20 },
      medium: { memory: 1024, cpu: 40 },
      high: { memory: 2048, cpu: 60 },
    };

    const threshold = thresholds[limit];

    if (memory > threshold.memory || cpu > threshold.cpu) {
      await this.triggerDegradation();
    }
  }

  /**
   * 触发降级策略
   */
  private async triggerDegradation(): Promise<void> {
    // 降低渲染帧率
    const perfManager = getPerformanceManager();
    await perfManager.setMode('battery');

    // 卸载未使用的模型
    const live2dManager = getLive2DManager();
    await live2dManager.unloadInactiveModels();

    // 显示警告
    if (useConfigStore.getState().config.performance.showResourceWarning) {
      useToastStore.getState().showToast({
        type: 'warning',
        message: '资源占用过高，已自动降级性能',
      });
    }
  }
}
```

#### 4.7.5 验收标准

- [ ] 每分钟监控一次内存和CPU使用率
- [ ] 超过阈值时自动降级性能
- [ ] 降级时显示Toast警告（可选）
- [ ] 用户可手动设置资源限制级别
- [ ] 降级后资源占用显著下降

---

## 五、跨功能技术约束

### 5.1 Tauri 插件依赖

| 功能 | 插件 | 用途 | 安装命令 |
|------|------|------|----------|
| 快捷键绑定 | `@tauri-apps/plugin-global-shortcut` | 全局快捷键监听 | `pnpm add @tauri-apps/plugin-global-shortcut` |
| 开机自启动 | `@tauri-apps/plugin-autostart` | 系统启动项管理 | `pnpm add @tauri-apps/plugin-autostart` |
| 窗口焦点 | `@tauri-apps/api/window` | 监听窗口状态 | 内置 |

### 5.2 跨平台兼容性

#### 快捷键键位映射
| 功能 | macOS | Windows/Linux |
|------|-------|---------------|
| 主修饰键 | `Cmd` (Meta) | `Ctrl` |
| 辅助修饰键 | `Option` | `Alt` |
| 系统保留键 | `Cmd+Q`, `Cmd+W` | `Ctrl+Q`, `Ctrl+W` |

#### 自启动机制
| 平台 | 实现方式 | 配置文件 |
|------|----------|----------|
| macOS | `launchd` | `~/Library/LaunchAgents/` |
| Windows | 注册表 | `HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run` |
| Linux | XDG Autostart | `~/.config/autostart/*.desktop` |

### 5.3 UI/UX 一致性要求

**游戏化风格遵循:**
- 使用 `src/styles/design-tokens.css` 中定义的设计 tokens
- 圆角卡片 + 玻璃拟态背景 (`.glass-bg`)
- Macaron 配色：紫色 `#a78bfa`、黄色 `#fbbf24`
- 所有 Toast 通知统一使用 `.game-alert` 样式

**组件库扩展:**
```css
/* 新增组件样式 */
.achievement-toast { /* 成就 Toast */ }
.recording-indicator { /* 录音指示器 */ }
.resource-monitor { /* 资源监控面板 */ }
```

---

## 六、验收标准矩阵

| 功能 | 核心验收标准 | 测试方法 |
|------|--------------|----------|
| **快捷键绑定** | • 跨平台键位正确<br>• 冲突检测生效<br>• 响应延迟 < 100ms | 手动测试各平台快捷键 |
| **开机自启动** | • macOS 权限引导显示<br>• Windows/Linux 自动配置<br>• 状态与系统同步 | 重启系统验证 |
| **按键说话** | • 录音启动 < 100ms<br>• 误触过滤生效<br>• 语音自动发送 | 连续测试50次 |
| **成就 Toast** | • 队列依次显示<br>• 动画流畅 60fps<br>• 已解锁不重复 | 批量解锁成就 |
| **自动打工** | • 闲置30分钟触发<br>• 收益合理<br>• 消耗状态 | 模拟闲置状态 |
| **后台运行** | • 失焦自动降级<br>• CPU 下降 >50%<br>• 恢复及时 | 性能监控工具 |
| **资源限制** | • 阈值触发降级<br>• 内存下降 >30%<br>• 警告可选 | 内存压力测试 |

---

## 七、开发排期建议

### Phase 1: 基础能力（2周）
- 快捷键绑定服务
- 开机自启动集成

### Phase 2: 交互增强（1周）
- 按键说话
- 成就 Toast 通知

### Phase 3: 玩法深化（1周）
- 自动打工逻辑
- 后台运行优化

### Phase 4: 性能打磨（1周）
- 资源占用限制
- 全量测试与优化

**总计: 5周（假设单人开发）**

---

## 八、附录

### 8.1 配置字段汇总

所有功能均复用现有配置结构，无需新增字段：

| 配置路径 | 功能 |
|----------|------|
| `config.assistant.shortcuts.openChat` | 打开聊天快捷键 |
| `config.assistant.shortcuts.openSettings` | 打开设置快捷键 |
| `config.performance.launchOnStartup` | 开机自启动开关 |
| `config.performance.backgroundMode` | 后台运行模式 |
| `config.performance.resourceLimit` | 资源占用限制级别 |
| `config.behavior.autoWorkEnabled` | 自动打工开关 |
| `config.voice.pushToTalkKey` | 按键说话触发键 |

### 8.2 相关文件清单

**需新建:**
- `src/services/keyboard/shortcuts.ts` - 快捷键管理
- `src/services/voice/push-to-talk.ts` - 按键说话
- `src/services/pet/auto-work.ts` - 自动打工
- `src/services/performance/manager.ts` - 性能管理
- `src/services/performance/monitor.ts` - 资源监控
- `src/services/system/autostart.ts` - 自启动管理
- `src/components/AchievementToast.tsx` - 成就通知

**需修改:**
- `src/services/achievements/index.ts` - 添加事件触发
- `src/services/pet/idle-behavior.ts` - 集成打工逻辑
- `src/components/pet/PetContainer.tsx` - 窗口焦点监听
- `src/App.tsx` - 集成 Toast 容器

---

## 变更记录

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| 1.0 | 2025-12-28 | 初始版本 | Sarah |

---

**文档结束**

*本PRD基于 UltraThink 方法论深度分析，确保需求的完整性、可实现性和用户价值。*
