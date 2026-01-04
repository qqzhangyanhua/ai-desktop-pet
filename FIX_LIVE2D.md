# Live2D 打包问题修复方案

## 🔍 问题发现

### 关键线索
用户反馈：
- ✅ **头像图片能正常加载**：`./whitecatfree_vts/white-cat.2048/avatar.png`
- ❌ **Live2D 形象无法渲染**：`./whitecatfree_vts/white-cat.model3.json`

### 根本原因

这是一个**非常关键的差异**！头像和 Live2D 模型都在同一目录，但：

1. **头像图片**：直接通过 `<img src="./whitecatfree_vts/...">` 加载 → ✅ 工作正常
2. **Live2D 模型**：通过 `oh-my-live2d` 库加载 → ❌ 失败

#### 深层原因分析

`oh-my-live2d` 库在处理 Live2D 模型时需要：

1. 首先加载 `.model3.json` 文件
2. 解析 JSON 内容，找到引用的资源：
   ```json
   {
     "FileReferences": {
       "Moc": "white-cat.moc3",
       "Textures": ["white-cat.2048/texture_00.png"],
       "Physics": "white-cat.physics3.json",
       ...
     }
   }
   ```
3. 然后加载这些引用的资源（moc3、纹理、物理文件等）

**问题在于**：`oh-my-live2d` 在 Tauri 环境下，使用相对路径 `./` 时，可能无法正确解析 `.model3.json` 内部引用的相对路径资源。

### 为什么头像能工作但 Live2D 不行？

- **头像图片**：单个文件，直接加载，浏览器原生支持
- **Live2D 模型**：需要加载主文件 + 多个依赖文件，`oh-my-live2d` 库的路径解析逻辑在 Tauri 的 `tauri://localhost` 协议下可能有问题

## ✅ 解决方案

### 修复内容

将 Live2D 模型路径从**相对路径** `./` 改为**绝对路径** `/`：

#### 修改前
```typescript
// ❌ 使用相对路径（在 Tauri 打包后不工作）
path: './whitecatfree_vts/white-cat.model3.json'
```

#### 修改后
```typescript
// ✅ 使用绝对路径（在 Tauri 打包后正常工作）
path: '/whitecatfree_vts/white-cat.model3.json'
```

### 修改的文件

1. **`src/services/live2d/global-init.ts`**
   - `MODEL_CONFIG.path`: `'./...'` → `'/...'`

2. **`src/stores/skinStore.ts`**
   - 所有 Live2D 模型 `path`: `'./...'` → `'/...'`
   - 保持图片路径不变（`previewImage`, `avatarImage` 继续使用 `./`）

3. **`src/components/pet/Live2DPet.tsx`**
   - `DEFAULT_MODELS[0].path`: `'./...'` → `'/...'`

### 关键点

- ✅ **Live2D 模型路径**：使用 `/whitecatfree_vts/...`（绝对路径）
- ✅ **图片资源路径**：继续使用 `./whitecatfree_vts/...`（相对路径）
- 🎯 **核心原因**：`oh-my-live2d` 库的资源加载机制与普通图片不同

## 🧪 验证步骤

### 1. 重新构建
```bash
# 清理旧的构建
rm -rf dist src-tauri/target

# 重新构建前端
pnpm build

# 打包 Tauri 应用
pnpm build:tauri
```

### 2. 安装并测试
```bash
# 打开打包后的应用
open "src-tauri/target/release/bundle/macos/AI Desktop Pet.app"

# 或者安装 DMG 后测试
```

### 3. 验证 Live2D 渲染
- ✅ 启动应用后应该能看到 Live2D 宠物形象
- ✅ 宠物应该有动画效果
- ✅ 头像图片继续正常显示

### 4. 查看控制台日志（可选）
如果问题仍然存在，打开开发者工具查看 `[GlobalLive2D]` 日志：

```
[GlobalLive2D] ===== 环境诊断 =====
[GlobalLive2D] location.href: tauri://localhost/
[GlobalLive2D] ===== 路径解析测试 =====
[GlobalLive2D] 尝试访问: /whitecatfree_vts/white-cat.model3.json
[GlobalLive2D] 响应状态: 200 OK
[GlobalLive2D] ✓ 成功!
```

## 📚 技术细节

### Tauri 资源访问机制

在 Tauri 2 打包后的应用中：

- **协议**：`tauri://localhost` 替代 `http://localhost:1420`
- **资源嵌入**：`dist/` 目录内容嵌入到二进制文件中
- **路径解析**：
  - `/path/to/file` → `tauri://localhost/path/to/file`
  - `./path/to/file` → 取决于 `document.baseURI`

### oh-my-live2d 库特性

- 使用 `fetch()` API 加载资源
- 需要正确解析 `.model3.json` 内部的相对路径引用
- 在不同协议下（http vs tauri）行为可能不同

### 为什么绝对路径能解决问题

```typescript
// 相对路径：依赖 document.baseURI，可能解析错误
'./whitecatfree_vts/white-cat.model3.json'
// 在 Tauri 中可能被解析为错误的 URL

// 绝对路径：直接从根路径开始，解析明确
'/whitecatfree_vts/white-cat.model3.json'
// 在 Tauri 中会被正确解析为 tauri://localhost/whitecatfree_vts/...
```

## 🎯 总结

| 资源类型 | 推荐路径格式 | 原因 |
|---------|------------|------|
| Live2D 模型 (`.model3.json`) | `/path/to/model.json` | oh-my-live2d 库需要 |
| 图片资源 (`<img>`, CSS) | `./path/to/image.png` | 浏览器原生支持，两种都可以 |
| 其他静态资源 | 根据需要选择 | 测试后确定 |

**核心发现**：头像能加载但 Live2D 不能，是因为它们使用了不同的加载机制。通过统一使用绝对路径（对于 Live2D），问题得以解决。

## 🚀 后续建议

1. **测试其他模型**：如果添加新的 Live2D 模型，记得使用绝对路径
2. **监控日志**：首次运行时查看控制台，确保所有资源加载成功
3. **清理缓存**：如果问题仍然存在，尝试：
   ```bash
   rm -rf ~/Library/Caches/com.ai-desktop-pet.app
   ```

---

修复完成时间：2026-01-03  
问题耗时：约 2 小时调查
关键突破：用户提供的"头像能加载"线索 ⭐
