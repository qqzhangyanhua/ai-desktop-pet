# 技术设计文档：AI Desktop Pet 主动关怀系统强化

## 文档信息
- **版本**: v1.0
- **创建日期**: 2025-01-01
- **关联需求**: requirements.md v2.0
- **技术栈**: React 19 + TypeScript + Zustand + Tauri 2.0
- **架构原则**: 模块化、可扩展、高性能、隐私优先

---

## 一、系统架构设计

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Proactive Care System                    │
├─────────────────────────────────────────────────────────────┤
│  UI Layer (React Components)                               │
│  ├── CareNotificationPanel                                 │
│  ├── HealthDashboard                                       │
│  ├── PersonalizationSettings                               │
│  └── CareHistoryView                                       │
├─────────────────────────────────────────────────────────────┤
│  State Management (Zustand Stores)                         │
│  ├── proactiveCareStore (NEW)                             │
│  ├── careStore (ENHANCED)                                  │
│  ├── assistantStore (ENHANCED)                            │
│  └── userProfileStore (NEW)                               │
├─────────────────────────────────────────────────────────────┤
│  Service Layer                                             │
│  ├── ProactiveCareEngine (NEW)                            │
│  ├── StatePerceptionService (NEW)                         │
│  ├── PersonalizationEngine (NEW)                          │
│  ├── HealthMonitorService (NEW)                           │
│  ├── EmotionalSupportService (NEW)                        │
│  └── CareEffectivenessAnalyzer (NEW)                      │
├─────────────────────────────────────────────────────────────┤
│  Enhanced Emotion Engine                                   │
│  ├── BehaviorAnalyzer (ENHANCED)                          │
│  ├── SentimentAnalyzer (ENHANCED)                         │
│  ├── CareEngine (ENHANCED)                                │
│  └── EmotionMemory (ENHANCED)                             │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                │
│  ├── SQLite Database (User Profiles, Care History)        │
│  ├── Local Storage (Preferences, Settings)                │
│  └── Memory Cache (Real-time State)                       │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 核心模块设计

#### A. ProactiveCareEngine (主动关怀引擎)
```typescript
interface ProactiveCareEngine {
  // 状态感知
  perceiveUserState(): UserState;
  
  // 关怀机会检测
  detectCareOpportunities(): CareOpportunity[];
  
  // 个性化关怀生成
  generatePersonalizedCare(opportunity: CareOpportunity): CareMessage;
  
  // 关怀执行
  executeCare(message: CareMessage): Promise<CareResult>;
  
  // 效果评估
  evaluateEffectiveness(result: CareResult): EffectivenessScore;
}
```

#### B. StatePerceptionService (状态感知服务)
```typescript
interface StatePerceptionService {
  // 工作状态检测
  detectWorkState(): WorkState;
  
  // 情绪状态分析
  analyzeEmotionalState(): EmotionalState;
  
  // 环境感知
  perceiveEnvironment(): EnvironmentContext;
  
  // 健康指标监控
  monitorHealthMetrics(): HealthMetrics;
}
```

#### C. PersonalizationEngine (个性化引擎)
```typescript
interface PersonalizationEngine {
  // 用户画像构建
  buildUserProfile(): UserProfile;
  
  // 偏好学习
  learnPreferences(feedback: UserFeedback): void;
  
  // 关怀策略个性化
  personalizeStrategy(baseStrategy: CareStrategy): PersonalizedStrategy;
  
  // 预测性关怀
  predictCareNeeds(): PredictedNeeds[];
}
```

---

## 二、数据模型设计

### 2.1 核心数据结构

#### A. 用户状态模型
```typescript
interface UserState {
  // 工作状态
  workState: {
    isWorking: boolean;
    workDuration: number; // 分钟
    lastBreakTime: number; // 时间戳
    focusLevel: number; // 0-1
    stressLevel: number; // 0-1
    productivityLevel: number; // 0-1
  };
  
  // 情绪状态
  emotionalState: {
    currentEmotion: EmotionType;
    emotionIntensity: number; // 0-1
    moodTrend: 'improving' | 'stable' | 'declining';
    lastEmotionChange: number; // 时间戳
  };
  
  // 健康状态
  healthState: {
    eyeStrainLevel: number; // 0-1
    postureScore: number; // 0-1
    hydrationLevel: number; // 0-1
    energyLevel: number; // 0-1
    lastHealthCheck: number; // 时间戳
  };
  
  // 环境上下文
  environment: {
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    isWorkingHours: boolean;
    isWeekend: boolean;
    ambientLight: 'bright' | 'normal' | 'dim';
  };
}
```

#### B. 关怀机会模型
```typescript
interface CareOpportunity {
  id: string;
  type: CareType;
  priority: number; // 1-10
  urgency: 'low' | 'medium' | 'high' | 'critical';
  
  // 触发条件
  trigger: {
    condition: string;
    actualValue: number;
    threshold: number;
    confidence: number; // 0-1
  };
  
  // 关怀内容
  care: {
    title: string;
    message: string;
    actionType: 'notification' | 'suggestion' | 'intervention';
    tone: 'gentle' | 'urgent' | 'supportive' | 'celebratory';
    duration: number; // 预期持续时间（秒）
  };
  
  // 个性化信息
  personalization: {
    userPreference: number; // 0-1，用户对此类关怀的偏好
    historicalEffectiveness: number; // 0-1，历史效果
    adaptedContent: boolean; // 是否已个性化
  };
  
  // 元数据
  metadata: {
    detectedAt: number;
    expiresAt: number;
    relatedData: Record<string, any>;
  };
}
```

#### C. 用户画像模型
```typescript
interface UserProfile {
  // 基本信息
  basic: {
    userId: string;
    createdAt: number;
    lastUpdated: number;
    profileVersion: string;
  };
  
  // 工作习惯
  workHabits: {
    typicalWorkHours: { start: number; end: number };
    averageWorkDuration: number; // 分钟
    preferredBreakInterval: number; // 分钟
    workIntensityPattern: number[]; // 24小时强度分布
    productiveTimeSlots: Array<{ start: number; end: number }>;
  };
  
  // 关怀偏好
  carePreferences: {
    preferredCareTypes: CareType[];
    dislikedCareTypes: CareType[];
    preferredTone: 'gentle' | 'direct' | 'playful' | 'professional';
    notificationFrequency: 'low' | 'medium' | 'high';
    quietHours: { start: number; end: number };
  };
  
  // 健康关注点
  healthFocus: {
    primaryConcerns: ('eye_health' | 'posture' | 'hydration' | 'mental_health')[];
    healthGoals: string[];
    currentHealthScore: number; // 0-1
    improvementAreas: string[];
  };
  
  // 学习数据
  learningData: {
    responsePatterns: Record<CareType, {
      acceptanceRate: number;
      averageRating: number;
      lastResponse: 'accepted' | 'dismissed' | 'ignored';
      responseTime: number; // 平均响应时间
    }>;
    
    behaviorPatterns: {
      dailyRoutine: Array<{ time: number; activity: string }>;
      stressPatterns: Array<{ trigger: string; intensity: number }>;
      recoveryPatterns: Array<{ method: string; effectiveness: number }>;
    };
    
    adaptationHistory: Array<{
      timestamp: number;
      change: string;
      reason: string;
      effectiveness: number;
    }>;
  };
}
```

### 2.2 数据库设计

#### A. 表结构设计
```sql
-- 用户画像表
CREATE TABLE user_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  profile_data TEXT NOT NULL, -- JSON格式的UserProfile
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 关怀历史表
CREATE TABLE care_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  opportunity_id TEXT NOT NULL,
  care_type TEXT NOT NULL,
  priority INTEGER NOT NULL,
  message TEXT NOT NULL,
  response TEXT, -- 'accepted', 'dismissed', 'ignored'
  rating INTEGER, -- 1-5
  effectiveness_score REAL,
  created_at INTEGER NOT NULL,
  responded_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES user_profiles(user_id)
);

-- 状态快照表
CREATE TABLE state_snapshots (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  state_data TEXT NOT NULL, -- JSON格式的UserState
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user_profiles(user_id)
);

-- 学习数据表
CREATE TABLE learning_data (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  data_type TEXT NOT NULL, -- 'preference', 'pattern', 'adaptation'
  data_content TEXT NOT NULL, -- JSON格式
  confidence REAL NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user_profiles(user_id)
);
```

---

## 三、服务层设计

### 3.1 ProactiveCareEngine 实现

```typescript
export class ProactiveCareEngine {
  private statePerception: StatePerceptionService;
  private personalization: PersonalizationEngine;
  private healthMonitor: HealthMonitorService;
  private emotionalSupport: EmotionalSupportService;
  private effectiveness: CareEffectivenessAnalyzer;
  
  constructor() {
    this.statePerception = new StatePerceptionService();
    this.personalization = new PersonalizationEngine();
    this.healthMonitor = new HealthMonitorService();
    this.emotionalSupport = new EmotionalSupportService();
    this.effectiveness = new CareEffectivenessAnalyzer();
  }
  
  /**
   * 主循环：检测并执行关怀
   */
  async runCareLoop(): Promise<void> {
    try {
      // 1. 感知用户状态
      const userState = await this.perceiveUserState();
      
      // 2. 检测关怀机会
      const opportunities = await this.detectCareOpportunities(userState);
      
      // 3. 筛选和排序
      const prioritizedOpportunities = this.prioritizeOpportunities(opportunities);
      
      // 4. 执行关怀
      for (const opportunity of prioritizedOpportunities) {
        if (await this.shouldExecuteCare(opportunity)) {
          await this.executeCare(opportunity);
        }
      }
      
      // 5. 更新学习数据
      await this.updateLearningData(userState, opportunities);
      
    } catch (error) {
      console.error('[ProactiveCareEngine] Error in care loop:', error);
    }
  }
  
  /**
   * 感知用户状态
   */
  private async perceiveUserState(): Promise<UserState> {
    const [workState, emotionalState, healthState, environment] = await Promise.all([
      this.statePerception.detectWorkState(),
      this.statePerception.analyzeEmotionalState(),
      this.healthMonitor.getCurrentHealthState(),
      this.statePerception.perceiveEnvironment(),
    ]);
    
    return {
      workState,
      emotionalState,
      healthState,
      environment,
    };
  }
  
  /**
   * 检测关怀机会
   */
  private async detectCareOpportunities(userState: UserState): Promise<CareOpportunity[]> {
    const opportunities: CareOpportunity[] = [];
    
    // 健康关怀检测
    opportunities.push(...await this.healthMonitor.detectHealthOpportunities(userState));
    
    // 情绪支持检测
    opportunities.push(...await this.emotionalSupport.detectEmotionalOpportunities(userState));
    
    // 工作效率关怀检测
    opportunities.push(...await this.detectProductivityOpportunities(userState));
    
    // 个性化机会检测
    opportunities.push(...await this.personalization.detectPersonalizedOpportunities(userState));
    
    return opportunities;
  }
  
  /**
   * 执行关怀
   */
  private async executeCare(opportunity: CareOpportunity): Promise<CareResult> {
    // 生成个性化关怀消息
    const personalizedMessage = await this.personalization.personalizeMessage(opportunity);
    
    // 选择合适的展示方式
    const displayMethod = this.selectDisplayMethod(opportunity);
    
    // 执行关怀
    const result = await this.displayCare(personalizedMessage, displayMethod);
    
    // 记录关怀历史
    await this.recordCareHistory(opportunity, result);
    
    return result;
  }
}
```

### 3.2 StatePerceptionService 实现

```typescript
export class StatePerceptionService {
  private behaviorAnalyzer: BehaviorAnalyzer;
  private sentimentAnalyzer: SentimentAnalyzer;
  
  constructor() {
    this.behaviorAnalyzer = getBehaviorAnalyzer();
    this.sentimentAnalyzer = getSentimentAnalyzer();
  }
  
  /**
   * 检测工作状态
   */
  async detectWorkState(): Promise<WorkState> {
    // 获取系统活动数据
    const activityData = await this.getSystemActivityData();
    
    // 分析行为模式
    const behaviorPattern = this.behaviorAnalyzer.analyze(activityData);
    
    // 计算工作状态指标
    return {
      isWorking: this.isCurrentlyWorking(activityData),
      workDuration: this.calculateWorkDuration(activityData),
      lastBreakTime: this.getLastBreakTime(activityData),
      focusLevel: behaviorPattern.characteristics.focusLevel,
      stressLevel: behaviorPattern.characteristics.stressLevel,
      productivityLevel: behaviorPattern.characteristics.productivityLevel,
    };
  }
  
  /**
   * 分析情绪状态
   */
  async analyzeEmotionalState(): Promise<EmotionalState> {
    // 获取最近的对话记录
    const recentConversations = await this.getRecentConversations();
    
    // 分析情绪趋势
    const emotionTrend = await this.analyzeEmotionTrend(recentConversations);
    
    // 获取当前情绪
    const currentEmotion = await this.getCurrentEmotion();
    
    return {
      currentEmotion: currentEmotion.emotion,
      emotionIntensity: currentEmotion.intensity,
      moodTrend: emotionTrend,
      lastEmotionChange: currentEmotion.timestamp,
    };
  }
  
  /**
   * 感知环境上下文
   */
  async perceiveEnvironment(): Promise<EnvironmentContext> {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    
    return {
      timeOfDay: this.getTimeOfDay(hour),
      isWorkingHours: this.isWorkingHours(hour, dayOfWeek),
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      ambientLight: await this.detectAmbientLight(),
    };
  }
  
  /**
   * 获取系统活动数据
   */
  private async getSystemActivityData(): Promise<BehaviorData> {
    // 通过Tauri调用系统API获取活动数据
    // 这里需要实现具体的系统调用
    return {
      typingSpeed: 0,
      activeHours: [],
      appUsage: [],
      breakInterval: 0,
      workDuration: 0,
      mouseMovements: 0,
      windowSwitches: 0,
    };
  }
}
```

### 3.3 PersonalizationEngine 实现

```typescript
export class PersonalizationEngine {
  private userProfileStore: UserProfileStore;
  private mlModel: PersonalizationMLModel;
  
  constructor() {
    this.userProfileStore = getUserProfileStore();
    this.mlModel = new PersonalizationMLModel();
  }
  
  /**
   * 构建用户画像
   */
  async buildUserProfile(): Promise<UserProfile> {
    const existingProfile = await this.userProfileStore.getProfile();
    
    if (existingProfile) {
      return await this.updateUserProfile(existingProfile);
    }
    
    return await this.createInitialProfile();
  }
  
  /**
   * 学习用户偏好
   */
  async learnPreferences(feedback: UserFeedback): Promise<void> {
    // 更新响应模式
    await this.updateResponsePatterns(feedback);
    
    // 调整关怀策略
    await this.adjustCareStrategy(feedback);
    
    // 更新ML模型
    await this.mlModel.updateWithFeedback(feedback);
    
    // 保存学习数据
    await this.saveLearningData(feedback);
  }
  
  /**
   * 个性化关怀策略
   */
  async personalizeStrategy(baseStrategy: CareStrategy): Promise<PersonalizedStrategy> {
    const userProfile = await this.buildUserProfile();
    
    // 根据用户偏好调整
    const adjustedStrategy = this.adjustForPreferences(baseStrategy, userProfile);
    
    // 根据历史效果优化
    const optimizedStrategy = await this.optimizeForEffectiveness(adjustedStrategy, userProfile);
    
    // 应用ML模型预测
    const predictedStrategy = await this.mlModel.predict(optimizedStrategy, userProfile);
    
    return predictedStrategy;
  }
  
  /**
   * 预测关怀需求
   */
  async predictCareNeeds(): Promise<PredictedNeeds[]> {
    const userProfile = await this.buildUserProfile();
    const currentState = await this.getCurrentUserState();
    
    // 基于历史模式预测
    const patternBasedPredictions = this.predictFromPatterns(userProfile, currentState);
    
    // 基于ML模型预测
    const mlPredictions = await this.mlModel.predictNeeds(userProfile, currentState);
    
    // 合并和排序预测结果
    return this.mergePredictions(patternBasedPredictions, mlPredictions);
  }
}
```

---

## 四、状态管理设计

### 4.1 ProactiveCareStore

```typescript
interface ProactiveCareStore {
  // 当前状态
  currentUserState: UserState | null;
  isMonitoring: boolean;
  lastStateUpdate: number;
  
  // 关怀机会
  activeOpportunities: CareOpportunity[];
  pendingCares: CareMessage[];
  careHistory: CareHistoryItem[];
  
  // 配置
  config: ProactiveCareConfig;
  userProfile: UserProfile | null;
  
  // 统计数据
  statistics: {
    totalCares: number;
    acceptedCares: number;
    dismissedCares: number;
    averageRating: number;
    effectivenessScore: number;
  };
  
  // Actions
  startMonitoring: () => void;
  stopMonitoring: () => void;
  updateUserState: (state: UserState) => void;
  addCareOpportunity: (opportunity: CareOpportunity) => void;
  executeCare: (opportunityId: string) => Promise<void>;
  recordFeedback: (careId: string, feedback: UserFeedback) => void;
  updateConfig: (config: Partial<ProactiveCareConfig>) => void;
  loadUserProfile: () => Promise<void>;
  saveUserProfile: (profile: UserProfile) => Promise<void>;
}
```

### 4.2 Enhanced CareStore

```typescript
// 扩展现有的 CareStore
interface EnhancedCareStore extends CareStore {
  // 新增：主动关怀相关
  proactiveCareEnabled: boolean;
  lastProactiveCare: number;
  careFrequencyLimit: number;
  
  // 新增：健康监控
  healthMetrics: {
    eyeStrainLevel: number;
    postureScore: number;
    hydrationReminders: number;
    breakReminders: number;
  };
  
  // 新增：情绪支持
  emotionalSupport: {
    lastEmotionalCheck: number;
    supportSessionsToday: number;
    moodTrend: 'improving' | 'stable' | 'declining';
  };
  
  // 新增方法
  enableProactiveCare: () => void;
  disableProactiveCare: () => void;
  updateHealthMetrics: (metrics: Partial<HealthMetrics>) => void;
  recordEmotionalSupport: (type: string, effectiveness: number) => void;
  getPersonalizedCareRecommendations: () => CareRecommendation[];
}
```

---

## 五、UI组件设计

### 5.1 核心组件架构

```typescript
// 主动关怀通知面板
interface CareNotificationPanelProps {
  opportunity: CareOpportunity;
  onAccept: (opportunityId: string) => void;
  onDismiss: (opportunityId: string) => void;
  onRate: (opportunityId: string, rating: number) => void;
}

// 健康仪表板
interface HealthDashboardProps {
  healthMetrics: HealthMetrics;
  recommendations: HealthRecommendation[];
  onStartHealthSession: (type: string) => void;
}

// 个性化设置面板
interface PersonalizationSettingsProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: Partial<UserProfile>) => void;
  onToggleCareType: (careType: CareType, enabled: boolean) => void;
}

// 关怀历史视图
interface CareHistoryViewProps {
  history: CareHistoryItem[];
  statistics: CareStatistics;
  onExportData: () => void;
}
```

### 5.2 组件实现示例

```typescript
// CareNotificationPanel.tsx
export const CareNotificationPanel: React.FC<CareNotificationPanelProps> = ({
  opportunity,
  onAccept,
  onDismiss,
  onRate,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [rating, setRating] = useState(0);
  const [showRating, setShowRating] = useState(false);
  
  const handleAccept = () => {
    onAccept(opportunity.id);
    setShowRating(true);
  };
  
  const handleDismiss = () => {
    onDismiss(opportunity.id);
    setIsVisible(false);
  };
  
  const handleRate = (newRating: number) => {
    setRating(newRating);
    onRate(opportunity.id, newRating);
    setIsVisible(false);
  };
  
  if (!isVisible) return null;
  
  return (
    <div className={`care-notification ${opportunity.urgency}`}>
      <div className="care-header">
        <h3>{opportunity.care.title}</h3>
        <span className="care-priority">优先级: {opportunity.priority}</span>
      </div>
      
      <div className="care-content">
        <p>{opportunity.care.message}</p>
      </div>
      
      {!showRating ? (
        <div className="care-actions">
          <button onClick={handleAccept} className="accept-btn">
            接受建议
          </button>
          <button onClick={handleDismiss} className="dismiss-btn">
            暂时忽略
          </button>
        </div>
      ) : (
        <div className="care-rating">
          <p>这个建议对你有帮助吗？</p>
          <div className="rating-stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleRate(star)}
                className={`star ${rating >= star ? 'active' : ''}`}
              >
                ⭐
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## 六、性能优化设计

### 6.1 状态感知优化

```typescript
// 防抖和节流机制
class OptimizedStatePerception {
  private stateCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 30000; // 30秒缓存
  
  // 防抖状态更新
  private debouncedStateUpdate = debounce(
    (state: UserState) => this.updateState(state),
    2000
  );
  
  // 节流系统调用
  private throttledSystemCall = throttle(
    () => this.getSystemData(),
    5000
  );
  
  async perceiveState(): Promise<UserState> {
    // 检查缓存
    const cached = this.getCachedState();
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    
    // 获取新状态
    const newState = await this.throttledSystemCall();
    
    // 更新缓存
    this.stateCache.set('current', {
      data: newState,
      timestamp: Date.now(),
    });
    
    return newState;
  }
}
```

### 6.2 数据库优化

```typescript
// 批量操作和索引优化
class OptimizedDatabase {
  private batchOperations: Array<() => Promise<void>> = [];
  private readonly BATCH_SIZE = 50;
  
  // 批量插入关怀历史
  async batchInsertCareHistory(records: CareHistoryItem[]): Promise<void> {
    const chunks = this.chunkArray(records, this.BATCH_SIZE);
    
    for (const chunk of chunks) {
      await this.db.transaction(async (tx) => {
        for (const record of chunk) {
          await tx.run(
            'INSERT INTO care_history (...) VALUES (...)',
            record
          );
        }
      });
    }
  }
  
  // 索引优化查询
  async getRecentCareHistory(userId: string, days: number): Promise<CareHistoryItem[]> {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    
    return await this.db.all(`
      SELECT * FROM care_history 
      WHERE user_id = ? AND created_at > ?
      ORDER BY created_at DESC
      LIMIT 1000
    `, [userId, cutoff]);
  }
}
```

### 6.3 内存管理

```typescript
// 智能缓存管理
class MemoryManager {
  private cache = new LRUCache<string, any>({
    max: 1000,
    ttl: 1000 * 60 * 10, // 10分钟TTL
  });
  
  private memoryUsage = {
    userStates: new WeakMap(),
    careOpportunities: new Set(),
    learningData: new Map(),
  };
  
  // 定期清理
  startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupExpiredData();
      this.optimizeMemoryUsage();
    }, 60000); // 每分钟清理一次
  }
  
  private cleanupExpiredData(): void {
    const now = Date.now();
    
    // 清理过期的关怀机会
    for (const opportunity of this.memoryUsage.careOpportunities) {
      if (opportunity.metadata.expiresAt < now) {
        this.memoryUsage.careOpportunities.delete(opportunity);
      }
    }
  }
}
```

---

## 七、安全与隐私设计

### 7.1 数据加密

```typescript
// 敏感数据加密
class DataEncryption {
  private readonly algorithm = 'aes-256-gcm';
  private key: Buffer;
  
  constructor() {
    this.key = this.deriveKey();
  }
  
  // 加密用户画像
  encryptUserProfile(profile: UserProfile): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.key);
    cipher.setAAD(Buffer.from('user_profile'));
    
    let encrypted = cipher.update(JSON.stringify(profile), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return JSON.stringify({
      iv: iv.toString('hex'),
      encrypted,
      authTag: authTag.toString('hex'),
    });
  }
  
  // 解密用户画像
  decryptUserProfile(encryptedData: string): UserProfile {
    const { iv, encrypted, authTag } = JSON.parse(encryptedData);
    
    const decipher = crypto.createDecipher(this.algorithm, this.key);
    decipher.setAAD(Buffer.from('user_profile'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }
}
```

### 7.2 权限控制

```typescript
// 权限管理
class PermissionManager {
  private permissions = new Map<string, boolean>();
  
  // 请求系统权限
  async requestSystemPermissions(): Promise<void> {
    const requiredPermissions = [
      'system_activity',
      'screen_time',
      'app_usage',
      'camera_optional',
      'microphone_optional',
    ];
    
    for (const permission of requiredPermissions) {
      const granted = await this.requestPermission(permission);
      this.permissions.set(permission, granted);
    }
  }
  
  // 检查权限
  hasPermission(permission: string): boolean {
    return this.permissions.get(permission) ?? false;
  }
  
  // 优雅降级
  getAvailableFeatures(): string[] {
    const features: string[] = [];
    
    if (this.hasPermission('system_activity')) {
      features.push('work_state_detection');
    }
    
    if (this.hasPermission('camera_optional')) {
      features.push('posture_detection');
    }
    
    // 基础功能始终可用
    features.push('basic_care', 'emotion_support', 'manual_reminders');
    
    return features;
  }
}
```

---

## 八、测试策略

### 8.1 单元测试

```typescript
// 关怀引擎测试
describe('ProactiveCareEngine', () => {
  let engine: ProactiveCareEngine;
  
  beforeEach(() => {
    engine = new ProactiveCareEngine();
  });
  
  describe('detectCareOpportunities', () => {
    it('should detect high stress opportunity', async () => {
      const userState: UserState = {
        workState: { stressLevel: 0.8, workDuration: 480 },
        // ... other state
      };
      
      const opportunities = await engine.detectCareOpportunities(userState);
      
      expect(opportunities).toHaveLength(1);
      expect(opportunities[0].type).toBe('high_stress');
      expect(opportunities[0].priority).toBeGreaterThan(7);
    });
    
    it('should not detect opportunities during quiet hours', async () => {
      const userState: UserState = {
        environment: { timeOfDay: 'night' },
        // ... other state
      };
      
      const opportunities = await engine.detectCareOpportunities(userState);
      
      expect(opportunities).toHaveLength(0);
    });
  });
});
```

### 8.2 集成测试

```typescript
// 端到端关怀流程测试
describe('Care Flow Integration', () => {
  it('should complete full care cycle', async () => {
    // 1. 模拟用户状态
    const mockState = createMockUserState({ stressLevel: 0.9 });
    
    // 2. 触发关怀检测
    const opportunities = await careEngine.detectOpportunities(mockState);
    
    // 3. 执行关怀
    const result = await careEngine.executeCare(opportunities[0]);
    
    // 4. 验证结果
    expect(result.success).toBe(true);
    expect(result.message).toContain('压力');
    
    // 5. 验证数据持久化
    const history = await database.getCareHistory();
    expect(history).toHaveLength(1);
  });
});
```

### 8.3 性能测试

```typescript
// 性能基准测试
describe('Performance Benchmarks', () => {
  it('should detect opportunities within 2 seconds', async () => {
    const start = Date.now();
    
    const opportunities = await careEngine.detectOpportunities(mockUserState);
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
  });
  
  it('should handle 1000 concurrent state updates', async () => {
    const promises = Array.from({ length: 1000 }, () =>
      statePerception.perceiveState()
    );
    
    const results = await Promise.all(promises);
    
    expect(results).toHaveLength(1000);
    expect(results.every(r => r !== null)).toBe(true);
  });
});
```

---

## 九、部署与监控

### 9.1 部署配置

```typescript
// 生产环境配置
const PRODUCTION_CONFIG = {
  care: {
    enabled: true,
    minIntervalMinutes: 15,
    maxNotificationsPerHour: 3,
  },
  
  performance: {
    stateUpdateInterval: 30000, // 30秒
    cacheSize: 1000,
    batchSize: 50,
  },
  
  privacy: {
    dataRetentionDays: 90,
    encryptionEnabled: true,
    anonymizeData: true,
  },
  
  monitoring: {
    errorReporting: true,
    performanceMetrics: true,
    userAnalytics: false, // 隐私优先
  },
};
```

### 9.2 监控指标

```typescript
// 关键指标监控
interface MonitoringMetrics {
  // 功能指标
  careOpportunitiesDetected: number;
  careAcceptanceRate: number;
  averageResponseTime: number;
  userSatisfactionScore: number;
  
  // 性能指标
  stateDetectionLatency: number;
  memoryUsage: number;
  cpuUsage: number;
  databaseQueryTime: number;
  
  // 错误指标
  errorRate: number;
  crashCount: number;
  permissionDenialRate: number;
  
  // 业务指标
  dailyActiveUsers: number;
  featureUsageRate: Record<string, number>;
  retentionRate: number;
}
```

---

## 十、迁移计划

### 10.1 现有系统兼容性

```typescript
// 向后兼容适配器
class BackwardCompatibilityAdapter {
  // 适配现有的 CareStore
  adaptExistingCareStore(oldStore: CareStore): EnhancedCareStore {
    return {
      ...oldStore,
      
      // 新增字段的默认值
      proactiveCareEnabled: true,
      lastProactiveCare: 0,
      careFrequencyLimit: 3,
      
      healthMetrics: {
        eyeStrainLevel: 0,
        postureScore: 1,
        hydrationReminders: 0,
        breakReminders: 0,
      },
      
      emotionalSupport: {
        lastEmotionalCheck: 0,
        supportSessionsToday: 0,
        moodTrend: 'stable',
      },
      
      // 新增方法的实现
      enableProactiveCare: () => { /* 实现 */ },
      disableProactiveCare: () => { /* 实现 */ },
      updateHealthMetrics: () => { /* 实现 */ },
      recordEmotionalSupport: () => { /* 实现 */ },
      getPersonalizedCareRecommendations: () => [],
    };
  }
}
```

### 10.2 数据迁移

```typescript
// 数据迁移脚本
class DataMigration {
  async migrateToV2(): Promise<void> {
    console.log('开始数据迁移到 v2.0...');
    
    // 1. 创建新表
    await this.createNewTables();
    
    // 2. 迁移现有数据
    await this.migrateExistingData();
    
    // 3. 创建默认用户画像
    await this.createDefaultUserProfiles();
    
    // 4. 验证迁移结果
    await this.validateMigration();
    
    console.log('数据迁移完成！');
  }
  
  private async migrateExistingData(): Promise<void> {
    // 迁移关怀历史
    const oldCareData = await this.getOldCareData();
    for (const record of oldCareData) {
      await this.insertNewCareRecord(this.transformCareRecord(record));
    }
    
    // 迁移用户偏好
    const oldPreferences = await this.getOldPreferences();
    for (const pref of oldPreferences) {
      await this.insertUserProfile(this.transformToUserProfile(pref));
    }
  }
}
```

---

## 总结

本技术设计文档详细规划了AI Desktop Pet主动关怀系统的强化方案，包括：

1. **模块化架构**：清晰的分层设计，便于维护和扩展
2. **智能感知**：多维度用户状态检测和分析
3. **个性化引擎**：基于机器学习的用户画像和偏好学习
4. **性能优化**：缓存、防抖、批处理等优化策略
5. **隐私安全**：本地存储、数据加密、权限控制
6. **向后兼容**：平滑迁移现有系统

该设计确保了系统的可扩展性、性能和用户体验，为实现真正智能的主动关怀奠定了坚实的技术基础。
