# Live2D 打包问题诊断指南

## 问题描述
开发环境 (`pnpm dev`) Live2D 正常渲染，但打包后 (`pnpm build:tauri`) Live2D 无法显示。

## 根本原因分析

### 1. **协议差异**
- **开发环境**: `http://localhost:1420/`
- **生产环境**: `tauri://localhost/`

### 2. **资源路径解析**
在 Tauri 2 中，`frontendDist` 的资源被嵌入到二进制文件中，通过 `tauri://localhost` 协议访问。

相对路径 (`./whitecatfree_vts/...`) 的解析依赖于 `document.baseURI`：
- 开发环境: `http://localhost:1420/` → 正确
- 生产环境: `tauri://localhost/` → **可能有问题**

## 诊断步骤

### 步骤 1: 查看控制台日志

1. 打包应用：
   ```bash
   pnpm build:tauri
   ```

2. 打开应用并打开开发者工具：
   - macOS: 在应用内右键 → "检查元素"
   - 或在代码中添加：
     ```typescript
     // src/main.tsx
     if (import.meta.env.PROD) {
       window.addEventListener('contextmenu', (e) => {
         e.preventDefault();
       });
     }
     ```

3. 查看控制台输出，找到 `[GlobalLive2D]` 开头的日志：
   - 检查 `location.href` 和 `document.baseURI`
   - 查看哪个路径测试成功了
   - 如果所有路径都失败，记录错误信息

### 步骤 2: 使用诊断页面

1. 构建项目：
   ```bash
   pnpm build
   ```

2. 在浏览器中打开诊断页面：
   ```bash
   # 开发环境
   open http://localhost:1420/debug-paths.html
   
   # 或直接打开构建后的文件
   open dist/debug-paths.html
   ```

3. 点击各个测试按钮，查看哪个路径能成功访问

### 步骤 3: 验证文件打包

```bash
# 检查 dist 目录结构
ls -la dist/whitecatfree_vts/

# 应该看到：
# - white-cat.model3.json
# - white-cat.moc3
# - white-cat.physics3.json
# - white-cat.2048/ (目录)
```

## 可能的解决方案

### 方案 A: 使用绝对路径（已尝试 ✗）
```typescript
path: '/whitecatfree_vts/white-cat.model3.json'
```
**问题**: 在 Tauri 生产环境中无法解析

### 方案 B: 使用相对路径（当前方案 ⚠️）
```typescript
path: './whitecatfree_vts/white-cat.model3.json'
```
**问题**: 依赖 `document.baseURI`，可能在某些情况下不工作

### 方案 C: 显式构造完整 URL（推荐尝试）
```typescript
// 在代码中动态构造
const baseUrl = document.baseURI || window.location.origin;
const modelPath = new URL('whitecatfree_vts/white-cat.model3.json', baseUrl).href;
```

### 方案 D: 配置 Vite base（可能的根本解决方案）
在 `vite.config.ts` 中：
```typescript
export default defineConfig(async () => ({
  // 为 Tauri 设置正确的 base
  base: process.env.TAURI_ENV === 'production' ? '' : '/',
  // ... 其他配置
}));
```

### 方案 E: 使用 Tauri 资源协议
修改 Live2D 加载逻辑，在生产环境使用完整的 Tauri 协议：
```typescript
const isTauri = window.__TAURI__ !== undefined;
const basePath = isTauri ? 'tauri://localhost' : '';
const modelPath = `${basePath}/whitecatfree_vts/white-cat.model3.json`;
```

## 当前实现的诊断功能

`global-init.ts` 现在会自动尝试多个路径：
1. `./whitecatfree_vts/white-cat.model3.json` (相对路径)
2. `/whitecatfree_vts/white-cat.model3.json` (绝对路径)
3. `whitecatfree_vts/white-cat.model3.json` (无前缀)
4. `new URL(path, document.baseURI).href` (完整解析)

并会在控制台输出每个路径的尝试结果。

## 下一步行动

1. ✅ 添加了详细的诊断日志
2. ✅ 创建了路径测试工具
3. ⏳ **请运行打包并查看控制台输出**
4. ⏳ 根据控制台日志确定问题
5. ⏳ 实施对应的解决方案

## 调试命令

```bash
# 清理缓存重新构建
rm -rf dist src-tauri/target
pnpm build
pnpm build:tauri

# 查看打包后的二进制文件中嵌入的资源
strings "src-tauri/target/release/bundle/macos/AI Desktop Pet.app/Contents/MacOS/ai-desktop-pet" | grep whitecatfree

# 监听应用日志（macOS）
log stream --predicate 'process == "ai-desktop-pet"' --level debug
```

## 预期的控制台输出

### 成功的情况：
```
[GlobalLive2D] ===== 环境诊断 =====
[GlobalLive2D] location.href: tauri://localhost/
[GlobalLive2D] location.origin: tauri://localhost
[GlobalLive2D] ===== 路径解析测试 =====
[GlobalLive2D] 尝试访问: ./whitecatfree_vts/white-cat.model3.json
[GlobalLive2D] 响应状态: 200 OK
[GlobalLive2D] ✓ 成功! Content-Type: application/json
[GlobalLive2D] ✅ 找到可用路径: tauri://localhost/whitecatfree_vts/white-cat.model3.json
```

### 失败的情况：
```
[GlobalLive2D] ===== 环境诊断 =====
[GlobalLive2D] location.href: tauri://localhost/
[GlobalLive2D] ✗ 错误: Failed to fetch
[GlobalLive2D] ❌ 所有路径尝试均失败！
```

如果看到失败情况，请将完整的控制台输出发送给我。
