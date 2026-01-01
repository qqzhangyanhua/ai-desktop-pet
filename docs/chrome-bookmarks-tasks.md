# Chrome 书签集成 - 任务拆解清单

## 项目概述

**目标**：在 AI Desktop Pet 的聊天窗口中集成 Chrome 书签功能，支持搜索和快速打开。

**技术方案文档**：`docs/chrome-bookmarks-integration.md`

---

## 任务依赖关系图

```
T1 (类型定义)
    ├── T2 (核心服务)
    │     ├── T3 (Agent 工具)
    │     ├── T4 (Intent 集成)
    │     └── T5 (React Hooks)
    │           └── T6 (UI 集成测试)
    └── T7 (单元测试)
```

---

## MVP 任务清单（第一阶段）

### T1: 类型定义

**文件**：`src/types/bookmark.ts`

**优先级**：P0（最高）

**预估时间**：0.5小时

**依赖**：无

**任务描述**：
定义 Chrome 书签相关的 TypeScript 类型，包括：
- `ChromeBookmarkNode` - Chrome 原始书签节点
- `ChromeBookmarksFile` - 书签文件根结构
- `FlatBookmark` - 扁平化的书签项
- `BookmarkIndex` - 书签索引
- `BookmarkSearchResult` - 搜索结果
- `BookmarkSearchOptions` - 搜索参数

**验收标准**：
- [ ] 所有类型定义清晰，无 `any` 类型
- [ ] 添加详细的 JSDoc 注释
- [ ] TypeScript 编译通过
- [ ] 导出到 `src/types/index.ts`

**代码骨架**：
```typescript
// src/types/bookmark.ts

/** Chrome 原始书签节点 */
export interface ChromeBookmarkNode {
  id: string;
  name: string;
  type: 'url' | 'folder';
  url?: string;
  date_added?: string;
  children?: ChromeBookmarkNode[];
}

/** Chrome 书签文件根结构 */
export interface ChromeBookmarksFile {
  version: number;
  checksum: string;
  roots: {
    bookmark_bar: ChromeBookmarkNode;
    other: ChromeBookmarkNode;
    synced: ChromeBookmarkNode;
  };
}

// ... 其他类型定义
```

---

### T2: Chrome 书签核心服务

**文件**：`src/services/browser/chrome-bookmarks.ts`

**优先级**：P0

**预估时间**：4-6小时

**依赖**：T1

**任务描述**：
实现 `ChromeBookmarkService` 类，提供以下功能：
1. 跨平台路径检测（macOS/Windows/Linux）
2. 读取和解析 Chrome 书签 JSON 文件
3. 扁平化书签树结构
4. 建立搜索索引（byId, byUrl, flatList）
5. 搜索算法（关键词匹配 + 评分排序）
6. 内存缓存（5分钟 TTL）

**实现要点**：
- 使用 `@tauri-apps/plugin-fs` 的 `readTextFile`
- 使用 `@tauri-apps/api/path` 的 `homeDir`
- 使用 `@tauri-apps/plugin-os` 的 `platform()`
- 使用 `zod` 验证书签文件格式
- 缓存策略：内存缓存 + 时间戳判断

**验收标准**：
- [ ] 能正确读取本地 Chrome 书签文件
- [ ] 跨平台路径检测正常（macOS/Windows/Linux）
- [ ] 扁平化逻辑正确（递归遍历文件夹树）
- [ ] 搜索算法准确（关键词匹配 + 得分排序）
- [ ] 缓存生效（5分钟内不重复读取文件）
- [ ] 错误处理完善（文件不存在、格式错误、权限不足）
- [ ] 代码行数 < 400 行

**测试方法**：
```typescript
// 手动测试
const service = new ChromeBookmarkService();
const index = await service.getBookmarks();
console.log('总书签数:', index.flatList.length);

const results = await service.searchBookmarks({ query: 'github', limit: 5 });
console.log('搜索结果:', results);
```

---

### T3: Agent 工具集成

**文件**：`src/services/agent/tools/bookmark.ts`

**优先级**：P1

**预估时间**：2-3小时

**依赖**：T1, T2

**任务描述**：
创建 3 个 Agent 工具类：
1. `BookmarkSearchTool` - 搜索书签
2. `GetBookmarkByIdTool` - 通过 ID 获取书签
3. `ListRecentBookmarksTool` - 列出最近书签

**实现要点**：
- 继承 `BaseTool` 基类
- 定义 JSON Schema 参数
- 实现 `execute()` 方法
- 格式化返回结果（友好的文本格式）

**注册到工具链**：
修改 `src/services/agent/tools/index.ts`：
```typescript
import { BookmarkSearchTool, GetBookmarkByIdTool, ListRecentBookmarksTool } from './bookmark';

export function createBuiltInTools(): BaseTool[] {
  return [
    // ... 现有工具
    new BookmarkSearchTool(),
    new GetBookmarkByIdTool(),
    new ListRecentBookmarksTool(),
  ];
}
```

**验收标准**：
- [ ] 3 个工具类实现完整
- [ ] 在 Agent 聊天中能调用工具
- [ ] 返回结果格式清晰（Markdown 格式）
- [ ] 错误处理完善
- [ ] 代码行数 < 200 行

**测试方法**：
在聊天中输入："帮我搜索书签 GitHub"
Agent 应该自动调用 `BookmarkSearchTool` 并返回结果。

---

### T4: Intent 系统集成

**文件**：`src/services/intent/bookmark-intent.ts`

**优先级**：P1

**预估时间**：2-3小时

**依赖**：T2

**任务描述**：
1. 创建 `handleBookmarkIntent` 函数
2. 支持 3 种意图：
   - `search_bookmarks` - 搜索书签
   - `open_bookmark` - 打开书签
   - `list_bookmarks` - 列出书签
3. 修改 `src/services/intent/recognizer.ts`，添加书签意图识别规则

**意图识别规则**：
- 关键词：书签、收藏、打开我的
- 模式：打开 + [网站名]
- 示例：
  - "我的书签" → `list_bookmarks`
  - "打开我的 GitHub" → `open_bookmark`
  - "搜索书签 React" → `search_bookmarks`

**验收标准**：
- [ ] 意图识别准确率 > 90%
- [ ] 快速响应（不走 Agent，直接返回结果）
- [ ] 只有一个搜索结果时自动打开
- [ ] 多个结果时展示列表供用户选择
- [ ] 友好的用户提示语
- [ ] 代码行数 < 150 行

**测试用例**：
| 用户输入 | 预期意图 | 预期行为 |
|---------|---------|---------|
| "我的书签" | `list_bookmarks` | 展示书签列表 |
| "打开我的 GitHub" | `open_bookmark` | 搜索并打开 GitHub 书签 |
| "搜索关于 React 的书签" | `search_bookmarks` | 展示搜索结果 |

---

### T5: React Hooks 封装

**文件**：`src/hooks/useBookmark.ts`

**优先级**：P2

**预估时间**：1-2小时

**依赖**：T2

**任务描述**：
创建 `useBookmark` Hook，封装书签服务调用，提供：
- `searchBookmarks` - 搜索书签
- `getAllBookmarks` - 获取所有书签
- `refreshCache` - 刷新缓存
- `loading` - 加载状态
- `error` - 错误信息

**实现要点**：
- 使用 `useState` 管理加载和错误状态
- 使用 `useCallback` 缓存函数引用
- 提供友好的错误处理

**验收标准**：
- [ ] Hook 接口清晰易用
- [ ] 加载状态正确
- [ ] 错误处理完善
- [ ] TypeScript 类型完整
- [ ] 代码行数 < 100 行

**使用示例**：
```typescript
function BookmarkPanel() {
  const { searchBookmarks, loading, error } = useBookmark();

  const handleSearch = async () => {
    const results = await searchBookmarks({ query: 'react', limit: 10 });
    console.log(results);
  };

  return <div>...</div>;
}
```

---

### T6: 集成测试

**优先级**：P2

**预估时间**：1-2小时

**依赖**：T3, T4, T5

**任务描述**：
手动测试完整流程，确保各模块集成正常。

**测试场景**：

1. **场景1：首次使用**
   - 启动应用
   - 在聊天中输入："我的书签"
   - 预期：返回书签列表（或提示 Chrome 未安装）

2. **场景2：搜索书签**
   - 输入："搜索书签 GitHub"
   - 预期：返回包含 "GitHub" 的书签

3. **场景3：打开书签**
   - 输入："打开我收藏的 GitHub"
   - 预期：
     - 如果只有一个结果 → 直接打开
     - 如果多个结果 → 展示列表供选择

4. **场景4：缓存测试**
   - 第一次搜索
   - 等待 1 分钟
   - 再次搜索
   - 预期：第二次搜索应该从缓存返回（< 10ms）

5. **场景5：错误处理**
   - 在没有 Chrome 的环境测试
   - 预期：友好的错误提示

6. **场景6：跨平台测试**
   - macOS：本地测试
   - Windows：虚拟机或远程测试
   - Linux：Docker 容器测试

**验收标准**：
- [ ] 所有测试场景通过
- [ ] 无明显 bug
- [ ] 用户体验流畅
- [ ] 错误提示友好

---

### T7: 单元测试（可选）

**文件**：`src/services/browser/__tests__/chrome-bookmarks.test.ts`

**优先级**：P3

**预估时间**：2-3小时

**依赖**：T2

**任务描述**：
为 `ChromeBookmarkService` 编写单元测试，覆盖核心逻辑。

**测试用例**：
1. 书签文件解析
2. 扁平化逻辑
3. 搜索算法
4. 缓存机制
5. 错误处理

**验收标准**：
- [ ] 测试覆盖率 > 80%
- [ ] 所有测试通过
- [ ] 使用 mock 数据（避免依赖真实文件）

---

## 增强功能任务（第二阶段，可选）

### E1: 书签浏览面板

**文件**：`src/components/settings/BookmarkSettings.tsx`

**优先级**：P3

**预估时间**：4-6小时

**任务描述**：
在设置中心添加书签管理面板，包括：
- 书签树可视化展示
- 搜索框（实时搜索）
- 快速打开按钮
- 刷新缓存按钮
- 统计信息（总书签数、最近添加等）

**UI 设计**：
```
┌─────────────────────────────────────┐
│  书签管理                            │
├─────────────────────────────────────┤
│  [搜索框]                  [刷新]    │
├─────────────────────────────────────┤
│  📁 书签栏 (15)                      │
│    🔗 GitHub                         │
│    🔗 Google                         │
│    📁 开发工具 (8)                   │
│       🔗 VS Code                     │
│       🔗 React Docs                  │
│  📁 其他书签 (3)                     │
├─────────────────────────────────────┤
│  统计: 总计 23 个书签                │
└─────────────────────────────────────┘
```

---

### E2: Edge 浏览器支持

**文件**：`src/services/browser/edge-bookmarks.ts`

**优先级**：P3

**预估时间**：2-3小时

**任务描述**：
Edge 使用与 Chrome 相同的书签格式，只需修改文件路径：
- macOS: `~/Library/Application Support/Microsoft Edge/Default/Bookmarks`
- Windows: `%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Bookmarks`
- Linux: `~/.config/microsoft-edge/Default/Bookmarks`

**实现方式**：
1. 创建 `BrowserBookmarkService` 基类
2. `ChromeBookmarkService` 和 `EdgeBookmarkService` 继承
3. 在设置中让用户选择浏览器

---

### E3: 智能推荐

**文件**：`src/services/intent/bookmark-recommendation.ts`

**优先级**：P4

**预估时间**：3-4小时

**任务描述**：
基于聊天上下文推荐相关书签：
- 用户提到 "React" → 推荐 React 相关书签
- 用户说 "学习" → 推荐教程类书签
- 学习用户常用书签，主动推荐

**实现思路**：
1. 分析聊天内容关键词
2. 在书签中搜索相关内容
3. 在合适时机主动推荐

---

## 高级功能任务（第三阶段，未来规划）

### A1: 文件监听（实时同步）

**依赖**：需要 Tauri fs watch API

**预估时间**：2-3小时

---

### A2: 多 Profile 支持

**预估时间**：3-4小时

---

### A3: 书签编辑功能

**风险**：需要写回 JSON 文件，处理文件锁和格式兼容性

**预估时间**：6-8小时

---

## 时间估算

### MVP（第一阶段）

| 任务 | 预估时间 |
|------|---------|
| T1 | 0.5h |
| T2 | 4-6h |
| T3 | 2-3h |
| T4 | 2-3h |
| T5 | 1-2h |
| T6 | 1-2h |
| T7 | 2-3h（可选） |
| **总计** | **13-19小时** |

**建议排期**：2-3 天（每天 6-8 小时工作量）

### 增强功能（第二阶段）

| 任务 | 预估时间 |
|------|---------|
| E1 | 4-6h |
| E2 | 2-3h |
| E3 | 3-4h |
| **总计** | **9-13小时** |

**建议排期**：1-2 天

---

## 风险和缓解措施

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| Chrome 未安装 | 中 | 中 | 友好错误提示 + 支持多浏览器 |
| 书签文件格式变更 | 低 | 高 | Zod 验证 + 版本检测 |
| 跨平台路径问题 | 中 | 中 | 充分测试 + 降级处理 |
| 性能问题 | 低 | 低 | 缓存 + 性能监控 |

---

## 验收清单

### 功能验收

- [ ] 能读取本地 Chrome 书签
- [ ] 搜索功能正常（关键词匹配准确）
- [ ] 打开书签功能正常
- [ ] Intent 识别准确
- [ ] Agent 工具调用成功
- [ ] 缓存生效（性能 < 100ms）
- [ ] 跨平台兼容（macOS/Windows/Linux）

### 代码质量验收

- [ ] 无 `any` 类型
- [ ] 类型定义在 `types/` 目录
- [ ] 单个文件 < 500 行
- [ ] 符合现有架构规范
- [ ] 错误处理完善
- [ ] 代码注释清晰

### 用户体验验收

- [ ] 响应速度 < 200ms
- [ ] 错误提示友好
- [ ] 操作流程流畅
- [ ] 搜索结果准确

---

## 下一步行动

1. **审核技术方案**：Review `docs/chrome-bookmarks-integration.md`
2. **确认需求**：与产品/用户确认功能优先级
3. **开始开发**：从 T1 开始，按依赖顺序逐步实现
4. **持续测试**：每完成一个任务立即测试
5. **文档更新**：完成后更新 `CLAUDE.md` 和用户文档

---

**文档版本**: 1.0
**创建日期**: 2026-01-01
**预计完成**: 2026-01-04
**负责人**: 开发团队
