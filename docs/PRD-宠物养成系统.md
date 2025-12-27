# 产品需求文档：AI Desktop Pet 养成系统

## 文档信息
- **版本**: v1.0
- **创建日期**: 2025-12-26
- **产品目标**: 将AI对话工具进化为有生命感的桌面伴侣
- **目标用户**: 需要AI助手陪伴的用户，希望建立长期情感连接

---

## 一、产品背景与目标

### 1.1 当前问题
- 宠物只是静态装饰，缺乏状态变化和生命感
- 互动方式单一，仅支持文字对话
- 长期使用缺乏新鲜感和情感连接
- 没有"养成"的成就感和留存动力

### 1.2 产品愿景
打造一个能"成长"的AI伴侣：
- 有情绪状态，会开心、会疲惫、会想念主人
- 能记住用户习惯，从陌生到亲密
- 主动关心用户，而非被动等待指令
- 长期陪伴有意义，而非重复劳动

### 1.3 核心价值主张
**"它不只是工具，而是会成长的伙伴"**

---

## 二、Phase 1：MVP扩展（2周开发周期）

### 2.1 功能1：基础属性系统

#### 2.1.1 核心数据结构
```typescript
interface PetStatus {
  // 核心属性（0-100量纲）
  mood: number;        // 心情值 - 影响表情/动画选择
  energy: number;      // 精力值 - 影响响应速度/睡眠状态
  intimacy: number;    // 亲密度 - 影响对话风格/成长阶段

  // 时间戳元数据
  lastInteraction: Date;     // 上次任意互动时间
  lastFeed: Date;            // 上次喂食时间
  lastPlay: Date;            // 上次玩耍时间

  // 统计数据
  totalInteractions: number; // 累计互动次数
  createdAt: Date;           // 首次创建时间
}
```

#### 2.1.2 属性变化规则

**衰减机制**（基于时间差计算，非定时器）
```typescript
// App启动/互动时计算衰减
function calculateDecay(lastTime: Date, currentTime: Date) {
  const hoursPassed = (currentTime - lastTime) / (1000 * 60 * 60);

  return {
    mood: -Math.min(hoursPassed * 2, 50),      // 每小时-2，最多-50
    energy: -Math.min(hoursPassed * 1.5, 40),  // 每小时-1.5，最多-40
  };
}
```

**属性边界**
- 所有属性范围：0-100
- mood < 20: 进入"沮丧"状态，表情低落
- energy < 20: 进入"睡眠"状态，响应变慢或不响应
- intimacy只增不减，但增长速度受互动频率影响

**属性影响**
- `mood` → Live2D表情选择（happy/normal/sad/sleepy）
- `energy` → 对话响应速度、是否主动说话
- `intimacy` → AI System Prompt调整、解锁功能

#### 2.1.3 数据库Schema
```sql
-- 扩展现有config表或新建pet_status表
CREATE TABLE pet_status (
  id INTEGER PRIMARY KEY,
  mood REAL DEFAULT 80,
  energy REAL DEFAULT 100,
  intimacy REAL DEFAULT 0,
  last_interaction DATETIME,
  last_feed DATETIME,
  last_play DATETIME,
  total_interactions INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 2.1.4 UI展示
**位置**: 悬浮窗口右上角或宠物旁边
**样式**: 精简图标+数值
```
😊 85   ⚡ 72   ❤️ 45
mood   energy  intimacy
```

---

### 2.2 功能2：点击互动系统

#### 2.2.1 互动类型定义
```typescript
type InteractionType = 'pet' | 'feed' | 'play';

interface InteractionConfig {
  type: InteractionType;
  cooldown: number;          // 冷却时间（秒）
  effects: {
    mood: number;            // 属性增量
    energy: number;
    intimacy: number;
  };
  animation: string;         // Live2D动画名
  voiceResponses: string[];  // TTS随机回复
}
```

#### 2.2.2 三种互动设计

| 互动类型 | 触发区域 | 属性效果 | 动画 | 语音回复 | 冷却 |
|---------|---------|---------|------|---------|------|
| **pet**（抚摸） | 头部（上1/3） | mood+10, intimacy+2 | `tap_head` | "好舒服~" / "嘿嘿~" | 60s |
| **feed**（喂食） | 身体（中1/3） | mood+8, energy+15, intimacy+1 | `eat` | "谢谢主人!" / "好好吃!" | 120s |
| **play**（玩耍） | 下半身（下1/3） | mood+12, energy-5, intimacy+3 | `happy` | "好开心!" / "再来一次!" | 90s |

#### 2.2.3 点击区域检测
```typescript
// 在PetContainer.tsx中实现
function getInteractionZone(
  clickX: number,
  clickY: number,
  modelBounds: Bounds
): InteractionType | null {
  const relativeY = clickY / modelBounds.height;

  if (relativeY < 0.33) return 'pet';
  if (relativeY < 0.67) return 'feed';
  return 'play';
}
```

#### 2.2.4 防刷机制
1. **冷却时间**: 每种互动独立冷却（60-120秒）
2. **递减效果**: 5分钟内重复同种互动，效果减半
3. **每日上限**: 每种互动每日最多20次有效

#### 2.2.5 反馈层次设计
```
即时反馈（<100ms）:
├─ Live2D播放动画
├─ 粒子效果（爱心/星星/食物图标）
└─ 点击区域高亮

语音反馈（<500ms）:
└─ TTS播放随机回复

属性反馈（1s）:
├─ 属性值动画变化
└─ +10飘字效果

冷却反馈:
└─ 灰色蒙版 + 倒计时显示
```

---

### 2.3 功能3：心情驱动表情切换

#### 2.3.1 表情映射规则
```typescript
function getMoodEmotion(mood: number, energy: number): EmotionType {
  if (energy < 20) return 'sleepy';  // 优先级1：疲惫
  if (mood >= 70) return 'happy';
  if (mood >= 40) return 'normal';
  if (mood >= 20) return 'sad';
  return 'depressed';  // mood < 20
}
```

#### 2.3.2 表情切换时机
1. **属性变化时**: mood/energy改变 → 重新计算表情
2. **定时检查**: 每30秒检查一次（防止衰减导致表情不更新）
3. **互动触发**: 点击互动后立即切换到对应表情

#### 2.3.3 与现有系统集成
- 修改 `services/live2d/manager.ts` 的 `setEmotion()` 方法
- 在 `PetContainer.tsx` 中订阅 `petStatusStore` 的mood变化
- 保留手动表情切换能力（设置面板）

---

## 三、Phase 2：增强留存（1个月开发周期）

### 3.1 功能4：成长阶段系统

#### 3.1.1 三阶段定义
```typescript
enum GrowthStage {
  STRANGER = 'stranger',   // 陌生期
  FRIEND = 'friend',       // 友好期
  SOULMATE = 'soulmate'    // 亲密期
}

interface StageConfig {
  stage: GrowthStage;
  intimacyRange: [number, number];
  personality: {
    systemPrompt: string;
    responseStyle: string;
    proactivity: number;  // 0-1，主动性
  };
  unlocks: string[];      // 解锁功能列表
}
```

#### 3.1.2 阶段配置表

| 阶段 | Intimacy范围 | AI人格 | 主动性 | 解锁功能 | 升级条件 |
|-----|-------------|--------|--------|---------|---------|
| **STRANGER** | 0-30 | 礼貌但疏离，简短回答 | 0.1 | 基础对话、基础互动 | 互动50次 或 连续7天 |
| **FRIEND** | 31-70 | 友善活泼，会分享想法 | 0.5 | 主动提醒、情绪感知 | 互动300次 或 陪伴30天 |
| **SOULMATE** | 71-100 | 亲密默契，理解习惯 | 0.8 | 深度对话、个性化workflow | 陪伴90天 |

#### 3.1.3 System Prompt动态调整
```typescript
// 在services/llm/chat.ts中注入
function buildSystemPrompt(stage: GrowthStage, intimacy: number): string {
  const basePrompt = "你是用户的AI桌面宠物...";

  const stagePrompts = {
    stranger: "你和用户刚认识，保持礼貌但不要过于亲密。回答简洁专业。",
    friend: "你和用户已经是朋友了，可以活泼一些，偶尔分享你的'想法'。",
    soulmate: "你和用户已经很亲密了，你了解TA的习惯，会主动关心TA。"
  };

  return `${basePrompt}\n\n当前关系阶段：${stage}\n亲密度：${intimacy}\n\n${stagePrompts[stage]}`;
}
```

#### 3.1.4 阶段升级动画
- 触发条件满足 → 播放升级动画（烟花/光效）
- 宠物说："我们现在是朋友了！好开心！"
- 弹出Toast提示解锁的新功能
- 记录到achievements表

---

### 3.2 功能5：智能提醒任务

#### 3.2.1 扩展Scheduler触发器类型

**新增触发器类型**:
```typescript
// 在types/scheduler.ts中扩展
type TriggerType =
  | 'cron'      // 已有：定时触发
  | 'interval'  // 已有：间隔触发
  | 'manual'    // 已有：手动触发
  | 'status'    // 新增：属性触发
  | 'idle'      // 新增：空闲触发
  | 'event';    // 新增：事件触发

interface StatusTrigger {
  type: 'status';
  condition: {
    attribute: 'mood' | 'energy' | 'intimacy';
    operator: '<' | '>' | '==';
    threshold: number;
  };
  checkInterval: number;  // 检查间隔（秒）
}

interface IdleTrigger {
  type: 'idle';
  duration: number;  // 空闲时长（分钟）
}

interface EventTrigger {
  type: 'event';
  event: SystemEvent;
}

type SystemEvent =
  | 'app_opened'
  | 'stage_upgraded'
  | 'achievement_unlocked'
  | 'low_mood'
  | 'long_absence';
```

#### 3.2.2 预设智能任务

**1. 心情低落提醒**
```json
{
  "name": "心情低落关怀",
  "trigger": {
    "type": "status",
    "condition": { "attribute": "mood", "operator": "<", "threshold": 30 },
    "checkInterval": 300
  },
  "action": {
    "type": "notification",
    "title": "主人，我有点不开心...",
    "message": "陪我玩一会儿好吗？",
    "clickAction": "open_interaction_panel"
  }
}
```

**2. 长时间未互动提醒**
```json
{
  "name": "想念主人",
  "trigger": {
    "type": "idle",
    "duration": 120
  },
  "action": {
    "type": "agent_task",
    "prompt": "用可爱的语气告诉主人你想他了，询问是否需要帮助"
  }
}
```

**3. 早晨问候**
```json
{
  "name": "早安问候",
  "trigger": {
    "type": "cron",
    "expression": "0 8 * * *"
  },
  "action": {
    "type": "agent_task",
    "prompt": "根据当前intimacy阶段，用合适的语气向主人说早安"
  }
}
```

**4. 应用打开问候**
```json
{
  "name": "欢迎回来",
  "trigger": {
    "type": "event",
    "event": "app_opened"
  },
  "action": {
    "type": "agent_task",
    "prompt": "检查距离上次见面的时间，用合适的语气问候主人"
  }
}
```

#### 3.2.3 实现要点
- 在 `services/scheduler/manager.ts` 中扩展 `evaluateTrigger()` 方法
- StatusTrigger需要订阅 `petStatusStore` 变化
- IdleTrigger需要监听用户活动事件
- EventTrigger需要新建事件总线（EventEmitter）

---

### 3.3 功能6：每日互动记录/统计

#### 3.3.1 数据库Schema
```sql
-- 每日统计表
CREATE TABLE daily_stats (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,  -- YYYY-MM-DD
  pet_count INTEGER DEFAULT 0,
  feed_count INTEGER DEFAULT 0,
  play_count INTEGER DEFAULT 0,
  chat_count INTEGER DEFAULT 0,
  total_duration INTEGER DEFAULT 0,  -- 互动总时长（秒）
  mood_avg REAL,                     -- 当日平均mood
  energy_avg REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_daily_stats_date ON daily_stats(date);

-- 成就表
CREATE TABLE achievements (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL,  -- 'interaction' | 'duration' | 'intimacy' | 'special'
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  unlock_condition TEXT,  -- JSON格式条件
  unlocked_at DATETIME,
  is_unlocked INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_achievements_unlocked ON achievements(is_unlocked);
```

#### 3.3.2 统计维度
**每日统计**:
- 各类互动次数（pet/feed/play/chat）
- 互动总时长
- 平均属性值

**累计统计**:
- 总陪伴天数
- 总互动次数
- 连续互动天数
- 当前成长阶段

**趋势分析**:
- 近7天互动曲线
- 属性变化趋势

#### 3.3.3 成就系统设计

**成就类别**:
```typescript
interface Achievement {
  id: string;
  type: 'interaction' | 'duration' | 'intimacy' | 'special';
  name: string;
  description: string;
  icon: string;
  condition: AchievementCondition;
  reward?: {
    intimacy?: number;
    unlockSkin?: string;
    unlockFeature?: string;
  };
}

type AchievementCondition =
  | { type: 'total_interactions', count: number }
  | { type: 'consecutive_days', days: number }
  | { type: 'companion_days', days: number }
  | { type: 'intimacy_level', level: number }
  | { type: 'custom', check: () => boolean };
```

**预设成就**:
```typescript
const PRESET_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_meet',
    type: 'special',
    name: '初次见面',
    description: '第一次与宠物互动',
    icon: '👋',
    condition: { type: 'total_interactions', count: 1 },
    reward: { intimacy: 5 }
  },
  {
    id: 'week_companion',
    type: 'duration',
    name: '一周之约',
    description: '连续7天与宠物互动',
    icon: '📅',
    condition: { type: 'consecutive_days', days: 7 },
    reward: { unlockSkin: 'casual_outfit' }
  },
  {
    id: 'hundred_days',
    type: 'duration',
    name: '百日陪伴',
    description: '陪伴宠物100天',
    icon: '🎂',
    condition: { type: 'companion_days', days: 100 },
    reward: { unlockSkin: 'special_anniversary' }
  },
  {
    id: 'become_friend',
    type: 'intimacy',
    name: '成为朋友',
    description: '亲密度达到FRIEND阶段',
    icon: '🤝',
    condition: { type: 'intimacy_level', level: 31 }
  },
  {
    id: 'night_owl',
    type: 'special',
    name: '夜猫子',
    description: '在凌晨2-4点互动10次',
    icon: '🦉',
    condition: { type: 'custom', check: checkNightOwl }
  }
];
```

#### 3.3.4 统计面板UI设计
**位置**: 设置面板新增"统计"标签

**布局**:
```
┌─────────────────────────────────────┐
│ 📊 互动统计                          │
├─────────────────────────────────────┤
│ 今日互动                             │
│ 👆 抚摸 x5   🍔 喂食 x3   🎮 玩耍 x8  │
│ 💬 对话 x12                          │
│                                     │
│ 本周活跃  ⭐⭐⭐⭐⭐○○  5/7天        │
│                                     │
│ 累计陪伴  🎉 42天                    │
│ 总互动    🔢 1,247次                 │
│                                     │
│ 当前阶段  FRIEND (45/70)             │
│ [████████████░░░░░░] 64%            │
├─────────────────────────────────────┤
│ 🏆 成就 (8/20)                       │
│ ✅ 初次见面     ✅ 一周之约           │
│ ✅ 成为朋友     🔒 百日陪伴           │
└─────────────────────────────────────┘
```

---

## 四、Phase 3：差异化功能（长期规划）

### 4.1 功能7：AI协作小任务

#### 4.1.1 设计理念
**拒绝无聊点击游戏，每个任务都是有意义的AI协作**

传统宠物游戏：打工赚钱 → 无脑点击 → 获得货币
AI Desktop Pet：协作任务 → AI辅助完成 → 获得情感价值+实用价值

#### 4.1.2 任务分类
```typescript
interface CollaborationTask {
  id: string;
  category: 'productivity' | 'emotional' | 'creative' | 'learning';
  title: string;
  description: string;
  estimatedTime: number;  // 分钟
  difficulty: 'easy' | 'medium' | 'hard';
  rewards: {
    mood: number;
    intimacy: number;
    achievement?: string;
  };
  requirements?: {
    minIntimacy?: number;
    minStage?: GrowthStage;
  };
  agentConfig: {
    workflow?: string;       // LangGraph workflow
    tools?: string[];        // 需要的tools
    systemPrompt: string;
  };
}
```

#### 4.1.3 任务示例

**生产力任务**
```typescript
{
  id: 'organize_todos',
  category: 'productivity',
  title: '帮我整理今日待办',
  description: '宠物会帮你梳理今天的任务，并按优先级排序',
  estimatedTime: 5,
  difficulty: 'easy',
  rewards: { mood: 10, intimacy: 3 },
  agentConfig: {
    workflow: 'task_organizer',
    tools: ['clipboard', 'file_reader'],
    systemPrompt: '你是一个高效的任务管理助手...'
  }
}
```

**情感任务**
```typescript
{
  id: 'emotional_support',
  category: 'emotional',
  title: '听我吐槽5分钟',
  description: '有时候，我们只是需要一个倾听者',
  estimatedTime: 5,
  difficulty: 'easy',
  rewards: { mood: 15, intimacy: 5 },
  requirements: { minStage: 'FRIEND' },
  agentConfig: {
    systemPrompt: '你是一个善解人意的朋友，专注倾听，适时给予安慰...'
  }
}
```

**创意任务**
```typescript
{
  id: 'story_writing',
  category: 'creative',
  title: '一起写个小故事',
  description: '主人提供开头，宠物续写，轮流创作',
  estimatedTime: 15,
  difficulty: 'medium',
  rewards: { mood: 20, intimacy: 8, achievement: 'creative_writer' },
  requirements: { minStage: 'FRIEND' },
  agentConfig: {
    workflow: 'collaborative_writing',
    systemPrompt: '你是创意写作伙伴，和用户轮流续写故事...'
  }
}
```

**学习任务**
```typescript
{
  id: 'teach_me',
  category: 'learning',
  title: '教我一个新知识',
  description: '宠物从知识库中随机选择一个有趣的知识点教你',
  estimatedTime: 10,
  difficulty: 'medium',
  rewards: { mood: 12, intimacy: 5 },
  requirements: { minIntimacy: 40 },
  agentConfig: {
    tools: ['web_search'],
    systemPrompt: '你是知识分享者，选择一个有趣的知识点，用通俗易懂的方式讲解...'
  }
}
```

#### 4.1.4 任务触发方式
1. **主动推荐**: 宠物根据时间/心情/用户状态推荐任务
2. **任务面板**: 用户主动选择任务列表
3. **日常任务**: 每日刷新3个推荐任务
4. **成就解锁**: 完成特定条件解锁隐藏任务

#### 4.1.5 任务执行流程
```
1. 用户选择任务
   ↓
2. 检查requirements（intimacy/stage）
   ↓
3. 宠物说开场白："好的！让我来帮你..."
   ↓
4. 执行AgentWorkflow（实时显示进度）
   ↓
5. 任务完成 → 属性奖励 + 成就检查
   ↓
6. 宠物反馈："完成啦！开心~"
```

---

### 4.2 功能8：节日/季节主题皮肤

#### 4.2.1 主题系统架构
```typescript
interface ThemeConfig {
  id: string;
  name: string;
  description: string;
  priority: number;  // 优先级，多个主题重叠时选择高优先级

  // 激活条件
  activeCondition: {
    dateRange?: [string, string];  // MM-DD格式，如 ['12-20', '12-26']
    season?: 'spring' | 'summer' | 'autumn' | 'winter';
    customCheck?: () => boolean;   // 自定义条件（如生日）
  };

  // 主题资源
  assets: {
    skinId?: string;           // Live2D皮肤ID
    backgroundMusic?: string;  // 背景音乐
    uiTheme?: {               // UI主题色
      primary: string;
      background: string;
    };
  };

  // 主题互动
  specialInteractions?: {
    [key in InteractionType]?: {
      animation: string;
      voiceResponses: string[];
    };
  };

  // 主题对话
  greetings: string[];         // 问候语
  farewells: string[];         // 告别语
  idleMessages: string[];      // 空闲时说的话
}
```

#### 4.2.2 预设主题

**春节主题（1月20日-2月10日）**
```typescript
{
  id: 'chinese_new_year',
  name: '春节',
  priority: 10,
  activeCondition: {
    dateRange: ['01-20', '02-10']
  },
  assets: {
    skinId: 'spring_festival_outfit',  // 红色唐装
    backgroundMusic: 'happy_new_year.mp3',
    uiTheme: {
      primary: '#FF0000',
      background: '#FFF5E6'
    }
  },
  specialInteractions: {
    pet: {
      animation: 'receive_red_packet',
      voiceResponses: ['恭喜发财！', '新年快乐！']
    }
  },
  greetings: [
    '主人新年好！',
    '恭喜发财，红包拿来！',
    '新的一年也要多多陪我哦~'
  ],
  idleMessages: [
    '今年是什么生肖来着？',
    '春节要吃饺子！',
    '想看春晚...'
  ]
}
```

**圣诞主题（12月20日-12月26日）**
```typescript
{
  id: 'christmas',
  name: '圣诞节',
  priority: 10,
  activeCondition: {
    dateRange: ['12-20', '12-26']
  },
  assets: {
    skinId: 'christmas_outfit',  // 圣诞帽+围巾
    backgroundMusic: 'jingle_bells.mp3'
  },
  greetings: [
    'Merry Christmas!',
    '圣诞快乐！主人有收到礼物吗？',
    '圣诞老人会给我送礼物吗？'
  ]
}
```

**生日主题（用户设置）**
```typescript
{
  id: 'birthday',
  name: '生日特别版',
  priority: 20,  // 最高优先级
  activeCondition: {
    customCheck: () => {
      const today = new Date();
      const birthday = getUserBirthday();  // 从config读取
      return today.getMonth() === birthday.month &&
             today.getDate() === birthday.date;
    }
  },
  assets: {
    skinId: 'birthday_outfit'
  },
  specialInteractions: {
    feed: {
      animation: 'eat_birthday_cake',
      voiceResponses: ['生日快乐！', '许个愿吧！']
    }
  },
  greetings: [
    '生日快乐！主人！',
    '今天是特别的一天！',
    '🎂 为你唱生日歌~'
  ]
}
```

**四季主题（自动切换）**
```typescript
const SEASON_THEMES = [
  {
    id: 'spring',
    name: '春天',
    activeCondition: { season: 'spring' },  // 3-5月
    assets: { skinId: 'spring_sakura' },
    greetings: ['春天来了！', '樱花好美~']
  },
  {
    id: 'summer',
    name: '夏天',
    activeCondition: { season: 'summer' },  // 6-8月
    assets: { skinId: 'summer_beach' },
    greetings: ['好热啊~', '想去海边！']
  },
  {
    id: 'autumn',
    name: '秋天',
    activeCondition: { season: 'autumn' },  // 9-11月
    assets: { skinId: 'autumn_maple' },
    greetings: ['枫叶好美~', '秋天的风好舒服']
  },
  {
    id: 'winter',
    name: '冬天',
    activeCondition: { season: 'winter' },  // 12-2月
    assets: { skinId: 'winter_snow' },
    greetings: ['好冷~', '下雪了吗？']
  }
];
```

#### 4.2.3 主题切换逻辑
```typescript
// services/theme/manager.ts
class ThemeManager {
  private currentTheme: ThemeConfig | null = null;

  // App启动时检查
  async checkAndActivateTheme(): Promise<void> {
    const activeThemes = THEMES.filter(t => this.isThemeActive(t));

    // 按优先级排序，选择最高优先级的主题
    const selectedTheme = activeThemes.sort((a, b) => b.priority - a.priority)[0];

    if (selectedTheme && selectedTheme.id !== this.currentTheme?.id) {
      await this.activateTheme(selectedTheme);
    }
  }

  private isThemeActive(theme: ThemeConfig): boolean {
    const { dateRange, season, customCheck } = theme.activeCondition;

    if (customCheck) return customCheck();
    if (dateRange) return this.isInDateRange(...dateRange);
    if (season) return this.getCurrentSeason() === season;

    return false;
  }

  private async activateTheme(theme: ThemeConfig): Promise<void> {
    // 1. 切换Live2D皮肤
    if (theme.assets.skinId) {
      await skinManager.loadSkin(theme.assets.skinId);
    }

    // 2. 播放主题音乐
    if (theme.assets.backgroundMusic) {
      audioManager.play(theme.assets.backgroundMusic, { loop: true });
    }

    // 3. 应用UI主题
    if (theme.assets.uiTheme) {
      applyUITheme(theme.assets.uiTheme);
    }

    // 4. 更新当前主题
    this.currentTheme = theme;

    // 5. 宠物说主题问候语
    const greeting = theme.greetings[Math.floor(Math.random() * theme.greetings.length)];
    await petSay(greeting);
  }
}
```

#### 4.2.4 主题资源管理
```
public/
├── themes/
│   ├── chinese_new_year/
│   │   ├── skin/          # Live2D模型
│   │   ├── music.mp3
│   │   └── config.json
│   ├── christmas/
│   ├── spring/
│   └── ...
```

#### 4.2.5 用户自定义主题（扩展）
允许用户创建自定义主题：
- 设置生日/纪念日
- 选择专属皮肤
- 自定义问候语
- 上传背景音乐

---

## 五、技术实现架构

### 5.1 目录结构
```
src/
├── types/
│   ├── pet-status.ts        # 新增：宠物状态类型
│   ├── interaction.ts       # 新增：互动类型
│   ├── growth-stage.ts      # 新增：成长阶段类型
│   ├── achievement.ts       # 新增：成就类型
│   ├── task.ts              # 新增：协作任务类型
│   └── theme.ts             # 新增：主题类型
│
├── stores/
│   ├── petStatusStore.ts    # 新增：宠物状态store
│   ├── achievementStore.ts  # 新增：成就store
│   └── themeStore.ts        # 新增：主题store
│
├── services/
│   ├── pet/
│   │   ├── status.ts        # 新增：属性计算/衰减
│   │   ├── interaction.ts   # 新增：互动处理
│   │   └── growth.ts        # 新增：成长阶段逻辑
│   ├── statistics/
│   │   ├── daily.ts         # 新增：每日统计
│   │   └── achievement.ts   # 新增：成就检查
│   ├── task/
│   │   ├── manager.ts       # 新增：任务管理
│   │   └── presets.ts       # 新增：预设任务
│   ├── theme/
│   │   ├── manager.ts       # 新增：主题管理
│   │   └── presets.ts       # 新增：预设主题
│   └── scheduler/
│       └── manager.ts       # 扩展：新触发器类型
│
├── components/
│   ├── pet/
│   │   ├── PetContainer.tsx           # 修改：添加点击检测
│   │   ├── StatusBar.tsx              # 新增：属性显示条
│   │   ├── InteractionFeedback.tsx    # 新增：互动反馈效果
│   │   └── GrowthStageIndicator.tsx   # 新增：成长阶段指示器
│   ├── statistics/
│   │   ├── StatsPanel.tsx             # 新增：统计面板
│   │   ├── AchievementList.tsx        # 新增：成就列表
│   │   └── DailyChart.tsx             # 新增：互动趋势图
│   ├── task/
│   │   ├── TaskPanel.tsx              # 新增：任务面板
│   │   └── TaskCard.tsx               # 新增：任务卡片
│   └── theme/
│       └── ThemeSelector.tsx          # 新增：主题选择器
│
└── hooks/
    ├── usePetStatus.ts       # 新增：宠物状态hook
    ├── useInteraction.ts     # 新增：互动hook
    ├── useAchievement.ts     # 新增：成就hook
    └── useTheme.ts           # 新增：主题hook
```

### 5.2 数据库Schema总览
```sql
-- Phase 1
CREATE TABLE pet_status (
  id INTEGER PRIMARY KEY,
  mood REAL DEFAULT 80,
  energy REAL DEFAULT 100,
  intimacy REAL DEFAULT 0,
  last_interaction DATETIME,
  last_feed DATETIME,
  last_play DATETIME,
  total_interactions INTEGER DEFAULT 0,
  created_at DATETIME,
  updated_at DATETIME
);

-- Phase 2
CREATE TABLE daily_stats (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  pet_count INTEGER DEFAULT 0,
  feed_count INTEGER DEFAULT 0,
  play_count INTEGER DEFAULT 0,
  chat_count INTEGER DEFAULT 0,
  total_duration INTEGER DEFAULT 0,
  mood_avg REAL,
  energy_avg REAL,
  created_at DATETIME
);

CREATE TABLE achievements (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  unlock_condition TEXT,
  unlocked_at DATETIME,
  is_unlocked INTEGER DEFAULT 0,
  created_at DATETIME
);

-- Phase 3
CREATE TABLE collaboration_tasks (
  id INTEGER PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  estimated_time INTEGER,
  difficulty TEXT,
  rewards TEXT,  -- JSON
  requirements TEXT,  -- JSON
  agent_config TEXT,  -- JSON
  is_unlocked INTEGER DEFAULT 1,
  created_at DATETIME
);

CREATE TABLE task_completions (
  id INTEGER PRIMARY KEY,
  task_id INTEGER NOT NULL,
  completed_at DATETIME,
  duration INTEGER,  -- 实际耗时（秒）
  rewards_gained TEXT,  -- JSON
  FOREIGN KEY (task_id) REFERENCES collaboration_tasks(id)
);

CREATE TABLE themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  config TEXT NOT NULL,  -- JSON
  is_active INTEGER DEFAULT 0,
  created_at DATETIME
);
```

### 5.3 关键流程图

#### 5.3.1 应用启动流程
```
App启动
  ↓
1. initDatabase()
  ↓
2. loadConfig()
  ↓
3. loadPetStatus()  ← 新增
  ├─ 计算衰减 (calculateDecay)
  ├─ 更新属性值
  └─ 触发表情更新
  ↓
4. checkTheme()  ← Phase 3新增
  ├─ 检查激活条件
  └─ 切换主题（如果需要）
  ↓
5. initScheduler()
  ├─ 注册智能任务 ← Phase 2扩展
  └─ 开始监听
  ↓
6. 渲染UI
  └─ 宠物说问候语（根据intimacy）
```

#### 5.3.2 互动流程
```
用户点击宠物
  ↓
1. 检测点击区域 (getInteractionZone)
  ├─ 头部 → pet
  ├─ 身体 → feed
  └─ 脚部 → play
  ↓
2. 检查冷却时间
  ├─ 冷却中 → 显示倒计时，终止
  └─ 可用 → 继续
  ↓
3. 执行互动
  ├─ 播放Live2D动画
  ├─ TTS说话
  ├─ 粒子效果
  └─ 更新属性值
  ↓
4. 后续处理
  ├─ 记录到daily_stats
  ├─ 检查成就解锁
  ├─ 检查阶段升级
  └─ 触发表情更新
```

#### 5.3.3 属性衰减流程
```
触发时机：
- App启动
- 用户互动
- 定时检查（每30秒）

计算衰减
  ↓
读取 lastInteraction 时间戳
  ↓
计算时间差（小时）
  ↓
应用衰减公式
  mood -= hoursPassed * 2
  energy -= hoursPassed * 1.5
  ↓
限制最小值 (0)
  ↓
保存到数据库
  ↓
触发UI更新
  ├─ 属性条动画
  └─ 表情切换（如果mood变化大）
```

### 5.4 性能优化策略

1. **属性计算优化**
   - 使用时间差计算而非定时器轮询
   - 属性变化<5时不触发UI更新

2. **Live2D渲染优化**
   - 空闲时降低帧率（60fps → 15fps）
   - 互动时恢复高帧率

3. **数据库查询优化**
   - daily_stats使用date索引
   - 批量写入互动记录（每5分钟一次）

4. **主题资源懒加载**
   - 主题皮肤按需加载，不预加载
   - 背景音乐流式播放

---

## 六、开发排期

### Phase 1 (2周)
**Week 1**:
- Day 1-2: 数据类型定义 + 数据库schema
- Day 3-4: petStatusStore + 属性计算逻辑
- Day 5-7: 点击互动系统 + 反馈效果

**Week 2**:
- Day 1-2: 心情驱动表情切换
- Day 3-4: StatusBar UI组件
- Day 5: 集成测试 + bug修复
- Day 6-7: 文档 + 代码review

### Phase 2 (4周)
**Week 1**:
- 成长阶段系统 + System Prompt动态调整

**Week 2**:
- 扩展Scheduler触发器（status/idle/event）
- 预设智能任务

**Week 3**:
- 统计数据库schema
- 每日统计服务

**Week 4**:
- 成就系统
- 统计面板UI
- 集成测试

### Phase 3 (长期迭代)
**迭代1 (2周)**:
- 任务系统框架
- 5个预设任务

**迭代2 (2周)**:
- 主题系统框架
- 春节+圣诞主题

**迭代3 (按需)**:
- 四季主题
- 生日主题
- 更多协作任务

---

## 七、成功指标

### Phase 1
- ✅ 宠物状态实时响应互动（<100ms）
- ✅ 属性衰减计算准确（误差<5%）
- ✅ 表情切换流畅（无卡顿）

### Phase 2
- ✅ 用户日活提升50%（通过智能提醒）
- ✅ 平均陪伴天数>30天
- ✅ 成就解锁率>60%

### Phase 3
- ✅ 任务完成率>40%
- ✅ 节日主题激活覆盖率>80%
- ✅ 用户自定义主题使用率>20%

---

## 八、风险与挑战

### 技术风险
1. **Live2D动画兼容性**: 不同模型的动画名不统一
   - 缓解：建立标准动画映射表

2. **属性平衡性**: 衰减速度过快/过慢影响体验
   - 缓解：A/B测试找到最佳参数

3. **主题资源大小**: 多个主题可能导致包体积过大
   - 缓解：CDN托管，按需下载

### 产品风险
1. **养成疲劳**: 用户可能觉得属性维护麻烦
   - 缓解：提供"托管模式"（自动维持属性）

2. **功能复杂度**: 过多功能可能导致认知负担
   - 缓解：渐进式解锁，新手引导

3. **长期留存**: 新鲜感过后用户流失
   - 缓解：持续更新主题、任务、成就

---

## 九、附录

### A. 参考资料
- QQ宠物玩法分析
- Tamagotchi养成机制
- Animal Crossing社交系统
- LangGraph Workflow设计

### B. 术语表
- **mood**: 心情值，影响表情和互动反馈
- **energy**: 精力值，影响响应速度和睡眠状态
- **intimacy**: 亲密度，影响AI人格和解锁功能
- **GrowthStage**: 成长阶段，分为stranger/friend/soulmate
- **InteractionType**: 互动类型，包括pet/feed/play
- **CollaborationTask**: AI协作任务，替代传统小游戏

### C. 待讨论问题
1. 属性衰减速度的具体数值（需测试）
2. 成就奖励是否包含实质性功能解锁（待定）
3. 主题资源托管方案（本地 vs CDN）
4. 是否需要"宠物生病"机制（可选）

---

**文档结束**
