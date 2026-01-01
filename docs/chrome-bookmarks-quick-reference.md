# Chrome 书签集成 - 快速参考指南

## 核心概念

### 1. 书签文件位置

| 平台 | 路径 |
|------|------|
| macOS | `~/Library/Application Support/Google/Chrome/Default/Bookmarks` |
| Windows | `%LOCALAPPDATA%\Google\Chrome\User Data\Default\Bookmarks` |
| Linux | `~/.config/google-chrome/Default/Bookmarks` |

### 2. 书签文件格式

Chrome 书签存储为 **JSON 文件**（非 SQLite），包含三个根文件夹：
- `bookmark_bar` - 书签栏
- `other` - 其他书签
- `synced` - 移动书签（同步）

---

## 快速开始

### 安装依赖

```bash
# 已有依赖，无需额外安装
# - @tauri-apps/plugin-fs
# - @tauri-apps/api/path
# - @tauri-apps/plugin-os
# - zod
```

### 使用示例

#### 1. 搜索书签

```typescript
import { chromeBookmarkService } from '@/services/browser/chrome-bookmarks';

// 搜索书签
const results = await chromeBookmarkService.searchBookmarks({
  query: 'react',
  limit: 10,
});

console.log(`找到 ${results.length} 个书签`);
results.forEach(result => {
  console.log(`${result.bookmark.name} - ${result.bookmark.url}`);
  console.log(`得分: ${result.score}`);
});
```

#### 2. 获取所有书签

```typescript
// 获取所有书签（按时间排序）
const allBookmarks = await chromeBookmarkService.getAllBookmarks();

// 获取最近 20 个书签
const recentBookmarks = await chromeBookmarkService.getAllBookmarks({ limit: 20 });
```

#### 3. 通过 ID 或 URL 查找

```typescript
// 通过 ID 查找
const bookmark = await chromeBookmarkService.getBookmarkById('123');

// 通过 URL 查找
const bookmark = await chromeBookmarkService.getBookmarkByUrl('https://github.com');
```

#### 4. 清除缓存

```typescript
// 手动刷新缓存
chromeBookmarkService.clearCache();
```

#### 5. 在 React 组件中使用

```typescript
import { useBookmark } from '@/hooks/useBookmark';

function BookmarkPanel() {
  const { searchBookmarks, loading, error } = useBookmark();
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    const data = await searchBookmarks({ query: 'react', limit: 10 });
    setResults(data);
  };

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;

  return (
    <div>
      <button onClick={handleSearch}>搜索</button>
      {results.map(result => (
        <div key={result.bookmark.id}>
          {result.bookmark.name}
        </div>
      ))}
    </div>
  );
}
```

---

## API 参考

### ChromeBookmarkService

#### 方法

##### `getBookmarks(): Promise<BookmarkIndex>`

获取书签索引（带缓存，TTL 5分钟）。

**返回**：
```typescript
{
  byId: Map<string, FlatBookmark>,
  byUrl: Map<string, FlatBookmark>,
  flatList: FlatBookmark[],
  lastUpdated: Date
}
```

---

##### `searchBookmarks(options): Promise<BookmarkSearchResult[]>`

搜索书签。

**参数**：
```typescript
{
  query: string;      // 搜索关键词
  limit?: number;     // 返回数量上限（默认 10）
  minScore?: number;  // 最低得分阈值（默认 0）
}
```

**返回**：
```typescript
[
  {
    bookmark: FlatBookmark,
    score: number,
    matchType: 'exact_url' | 'exact_title' | 'fuzzy_title' | 'fuzzy_url' | 'path'
  }
]
```

**得分规则**：
- URL 精确包含：+100
- 标题精确匹配：+80
- 标题包含关键词：+50（开头匹配 +10）
- URL 域名匹配：+30
- 路径匹配：+20

---

##### `getAllBookmarks(options?): Promise<FlatBookmark[]>`

获取所有书签（按时间排序）。

**参数**：
```typescript
{
  limit?: number;  // 返回数量上限
}
```

---

##### `getBookmarkById(id: string): Promise<FlatBookmark | undefined>`

通过 ID 获取书签。

---

##### `getBookmarkByUrl(url: string): Promise<FlatBookmark | undefined>`

通过 URL 获取书签。

---

##### `clearCache(): void`

清除内存缓存。

---

### useBookmark Hook

```typescript
const {
  searchBookmarks,   // 搜索书签
  getAllBookmarks,   // 获取所有书签
  refreshCache,      // 刷新缓存
  loading,           // 加载状态
  error,             // 错误信息
} = useBookmark();
```

---

## 类型定义

### FlatBookmark

```typescript
interface FlatBookmark {
  id: string;          // 书签 ID
  name: string;        // 书签标题
  url: string;         // URL
  dateAdded: Date;     // 添加时间
  path: string[];      // 文件夹路径，如 ['书签栏', '开发工具']
  source: 'bookmark_bar' | 'other' | 'synced';  // 来源
}
```

### BookmarkSearchResult

```typescript
interface BookmarkSearchResult {
  bookmark: FlatBookmark;  // 书签详情
  score: number;           // 匹配得分
  matchType: 'exact_url' | 'exact_title' | 'fuzzy_title' | 'fuzzy_url' | 'path';
}
```

### BookmarkIndex

```typescript
interface BookmarkIndex {
  byId: Map<string, FlatBookmark>;    // 按 ID 索引
  byUrl: Map<string, FlatBookmark>;   // 按 URL 索引
  flatList: FlatBookmark[];           // 扁平化列表
  lastUpdated: Date;                  // 最后更新时间
}
```

---

## Agent 工具

### BookmarkSearchTool

在 Agent 聊天中使用：

```
用户: "帮我搜索关于 React 的书签"

Agent 调用:
{
  "name": "search_bookmarks",
  "arguments": {
    "query": "React",
    "limit": 10
  }
}

返回:
找到 3 个书签：

1. **React Documentation**
   URL: https://react.dev
   路径: 书签栏 > 开发工具
   匹配类型: 标题精确匹配
   得分: 80

2. **React GitHub**
   URL: https://github.com/facebook/react
   路径: 书签栏 > GitHub
   匹配类型: URL 精确匹配
   得分: 100

3. **Learn React**
   URL: https://react.dev/learn
   路径: 其他书签
   匹配类型: 标题模糊匹配
   得分: 50
```

### GetBookmarkByIdTool

```
{
  "name": "get_bookmark",
  "arguments": {
    "id": "123"
  }
}
```

### ListRecentBookmarksTool

```
{
  "name": "list_recent_bookmarks",
  "arguments": {
    "limit": 10
  }
}
```

---

## Intent 系统

### 意图类型

#### `search_bookmarks` - 搜索书签

**触发关键词**：
- "书签"
- "收藏"
- "搜索" + "书签"
- "查找" + "书签"

**示例**：
- "我的书签有哪些？"
- "搜索关于 React 的书签"

**处理**：
```typescript
const results = await chromeBookmarkService.searchBookmarks({ query, limit: 5 });

if (results.length === 0) {
  return "没有找到相关书签";
}

if (results.length === 1) {
  // 自动打开
  await open(results[0].bookmark.url);
  return `已为你打开：${results[0].bookmark.name}`;
}

// 多个结果，展示列表
const list = results.map((r, i) => `${i + 1}. ${r.bookmark.name}`).join('\n');
return `找到 ${results.length} 个书签：\n${list}`;
```

---

#### `open_bookmark` - 打开书签

**触发关键词**：
- "打开" + "我的" + [网站名]
- "打开" + [网站名] + "书签"

**示例**：
- "打开我的 GitHub"
- "打开 React 文档"

**处理**：
```typescript
const results = await chromeBookmarkService.searchBookmarks({ query: bookmarkName, limit: 1 });

if (results.length === 0) {
  return "找不到这个书签";
}

await open(results[0].bookmark.url);
return `已打开：${results[0].bookmark.name}`;
```

---

#### `list_bookmarks` - 列出书签

**触发关键词**：
- "我的书签"
- "书签" + "列表"
- "书签" + "有哪些"

**示例**：
- "我的书签"
- "列出我的书签"

**处理**：
```typescript
const bookmarks = await chromeBookmarkService.getAllBookmarks({ limit: 10 });

if (bookmarks.length === 0) {
  return "你还没有添加任何书签";
}

const list = bookmarks.map((b, i) => `${i + 1}. ${b.name}`).join('\n');
return `你的书签（最近 ${bookmarks.length} 个）：\n${list}`;
```

---

## 常见错误

### 错误1: Chrome 未安装

```
错误信息: "Chrome 未安装或书签文件不存在"

解决方案:
- 确认已安装 Chrome
- 检查是否使用 Default 配置文件
- 尝试手动指定书签文件路径
```

### 错误2: 文件被锁定

```
错误信息: "书签文件被 Chrome 锁定"

解决方案:
- 通常不会发生（只读操作）
- 如果发生，关闭 Chrome 后重试
```

### 错误3: 文件格式错误

```
错误信息: "书签文件格式不支持"

解决方案:
- 检查 Chrome 版本
- 确认书签文件未损坏
- 尝试清除缓存: chromeBookmarkService.clearCache()
```

### 错误4: 权限不足

```
错误信息: "读取书签失败: Permission denied"

解决方案:
- 检查 Tauri 权限配置
- 确认 capabilities/default.json 包含:
  - fs:read-text-file
  - path:resolve-home-dir
```

---

## 性能优化

### 缓存策略

```typescript
// 缓存有效期: 5分钟
cacheTTL = 5 * 60 * 1000;

// 缓存命中: < 1ms
// 缓存未命中: ~200ms (首次读取)
```

### 搜索优化

```typescript
// 限制返回结果
searchBookmarks({ query: 'react', limit: 10 });

// 设置最低得分阈值
searchBookmarks({ query: 'react', minScore: 20 });
```

### React 优化

```typescript
// 使用 useCallback 缓存函数
const handleSearch = useCallback(async (query: string) => {
  const results = await searchBookmarks({ query });
  setResults(results);
}, [searchBookmarks]);

// 使用 useMemo 缓存结果
const sortedResults = useMemo(() => {
  return results.sort((a, b) => b.score - a.score);
}, [results]);
```

---

## 调试技巧

### 1. 查看书签文件

```bash
# macOS
cat ~/Library/Application\ Support/Google/Chrome/Default/Bookmarks | jq

# Windows (PowerShell)
Get-Content "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Bookmarks" | ConvertFrom-Json

# Linux
cat ~/.config/google-chrome/Default/Bookmarks | jq
```

### 2. 启用调试日志

```typescript
// 在 ChromeBookmarkService 中添加日志
console.log('[ChromeBookmark] Loading bookmarks...');
console.log('[ChromeBookmark] Found', flatList.length, 'bookmarks');
console.log('[ChromeBookmark] Search query:', query, 'Results:', results.length);
```

### 3. 性能分析

```typescript
// 测量读取时间
console.time('loadBookmarks');
const index = await chromeBookmarkService.getBookmarks();
console.timeEnd('loadBookmarks');

// 测量搜索时间
console.time('searchBookmarks');
const results = await chromeBookmarkService.searchBookmarks({ query: 'react' });
console.timeEnd('searchBookmarks');
```

### 4. 缓存状态检查

```typescript
// 添加缓存状态查询方法
getCacheInfo() {
  return {
    hasCache: this.cache !== null,
    lastLoadTime: this.lastLoadTime,
    age: Date.now() - this.lastLoadTime,
    ttl: this.cacheTTL,
    isValid: (Date.now() - this.lastLoadTime) < this.cacheTTL,
  };
}

// 使用
console.log(chromeBookmarkService.getCacheInfo());
```

---

## 扩展指南

### 支持 Edge 浏览器

```typescript
// src/services/browser/edge-bookmarks.ts

class EdgeBookmarkService extends ChromeBookmarkService {
  protected async getBookmarksPath(): Promise<string> {
    const home = await homeDir();
    const platform = await import('@tauri-apps/plugin-os').then(m => m.platform());

    const paths = {
      macos: `${home}/Library/Application Support/Microsoft Edge/Default/Bookmarks`,
      windows: `${home}/AppData/Local/Microsoft/Edge/User Data/Default/Bookmarks`,
      linux: `${home}/.config/microsoft-edge/Default/Bookmarks`,
    };

    return paths[platform] || paths.linux;
  }
}

export const edgeBookmarkService = new EdgeBookmarkService();
```

### 多浏览器统一接口

```typescript
// src/services/browser/bookmark-manager.ts

class BookmarkManager {
  private services = new Map<string, ChromeBookmarkService>();

  constructor() {
    this.services.set('chrome', chromeBookmarkService);
    this.services.set('edge', edgeBookmarkService);
  }

  async searchAll(query: string): Promise<BookmarkSearchResult[]> {
    const allResults: BookmarkSearchResult[] = [];

    for (const [browser, service] of this.services) {
      try {
        const results = await service.searchBookmarks({ query });
        allResults.push(...results);
      } catch (error) {
        console.warn(`Failed to search ${browser} bookmarks:`, error);
      }
    }

    return allResults.sort((a, b) => b.score - a.score);
  }
}

export const bookmarkManager = new BookmarkManager();
```

---

## 最佳实践

### 1. 错误处理

```typescript
try {
  const results = await chromeBookmarkService.searchBookmarks({ query: 'react' });
  // 处理结果
} catch (error) {
  if ((error as Error).message.includes('未安装')) {
    console.log('请先安装 Chrome');
  } else {
    console.error('搜索失败:', error);
  }
}
```

### 2. 加载状态管理

```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const handleSearch = async () => {
  setLoading(true);
  setError(null);

  try {
    const results = await chromeBookmarkService.searchBookmarks({ query });
    // 处理结果
  } catch (err) {
    setError((err as Error).message);
  } finally {
    setLoading(false);
  }
};
```

### 3. 缓存管理

```typescript
// 在适当的时机清除缓存
useEffect(() => {
  // 组件卸载时清除缓存（可选）
  return () => {
    chromeBookmarkService.clearCache();
  };
}, []);

// 或者提供手动刷新按钮
<button onClick={() => chromeBookmarkService.clearCache()}>
  刷新书签
</button>
```

### 4. 类型安全

```typescript
// ✅ 好的做法
interface SearchFormData {
  query: string;
  limit: number;
}

const handleSubmit = async (data: SearchFormData) => {
  const results = await chromeBookmarkService.searchBookmarks(data);
};

// ❌ 避免
const handleSubmit = async (data: any) => {  // 不要使用 any
  const results = await chromeBookmarkService.searchBookmarks(data);
};
```

---

## Checklist

### 开发前检查

- [ ] 确认 Chrome 已安装
- [ ] 检查 Tauri 权限配置
- [ ] 确认依赖已安装（fs、path、os plugins）

### 代码审查检查

- [ ] 无 `any` 类型
- [ ] 类型定义在 `types/` 目录
- [ ] 单个文件 < 500 行
- [ ] 错误处理完善
- [ ] 添加必要的注释

### 测试检查

- [ ] 能正确读取书签文件
- [ ] 搜索功能正常
- [ ] 缓存生效
- [ ] 错误提示友好
- [ ] 跨平台兼容（macOS/Windows/Linux）

---

## 相关链接

- **技术方案文档**: `docs/chrome-bookmarks-integration.md`
- **任务拆解清单**: `docs/chrome-bookmarks-tasks.md`
- **架构图**: `docs/chrome-bookmarks-architecture.md`
- **Tauri FS Plugin**: https://v2.tauri.app/plugin/file-system/
- **Tauri Opener Plugin**: https://v2.tauri.app/plugin/opener/

---

**文档版本**: 1.0
**最后更新**: 2026-01-01
**维护者**: 开发团队
