# 快速测试指南

## 测试修复是否成功

### 方法 1：直接测试打包应用（推荐）

```bash
# 1. 重新打包
pnpm build:tauri

# 2. 打开应用
open "src-tauri/target/release/bundle/macos/AI Desktop Pet.app"

# 3. 观察：
#    - Live2D 宠物是否出现？
#    - 宠物是否有动画？
#    - 头像是否正常显示？
```

### 方法 2：查看开发环境

```bash
# 确保开发环境仍然正常
pnpm dev

# 访问 http://localhost:1420
# 检查 Live2D 是否正常工作
```

## 如果仍然有问题

### 查看控制台日志

1. 打开打包后的应用
2. 右键点击任意位置 → "检查元素"（或使用快捷键）
3. 切换到 Console 标签页
4. 查找 `[GlobalLive2D]` 开头的日志
5. 将日志信息反馈给我

### 预期的成功日志

```
[GlobalLive2D] ===== 环境诊断 =====
[GlobalLive2D] location.href: tauri://localhost/
[GlobalLive2D] location.origin: tauri://localhost
[GlobalLive2D] Model path (original): /whitecatfree_vts/white-cat.model3.json
[GlobalLive2D] ===== 路径解析测试 =====
[GlobalLive2D] 尝试访问: /whitecatfree_vts/white-cat.model3.json
[GlobalLive2D] 响应状态: 200 OK
[GlobalLive2D] ✓ 成功! Content-Type: application/json
[GlobalLive2D] ✅ 找到可用路径: tauri://localhost/whitecatfree_vts/white-cat.model3.json
[GlobalLive2D] ===== 诊断完成 =====
[GlobalLive2D] Loading oh-my-live2d...
[GlobalLive2D] ✓ oh-my-live2d loaded
[GlobalLive2D] ✓ Instance created
```

### 清理缓存（如果需要）

```bash
# 清理构建缓存
rm -rf dist src-tauri/target

# 清理应用缓存（macOS）
rm -rf ~/Library/Caches/com.ai-desktop-pet.app
rm -rf ~/Library/Application\ Support/com.ai-desktop-pet.app

# 重新构建
pnpm build
pnpm build:tauri
```

## 主要修改总结

✅ **已修改**：Live2D 模型路径从 `./` 改为 `/`
✅ **未修改**：图片资源路径保持 `./`（因为能正常工作）
✅ **原因**：oh-my-live2d 库在 Tauri 环境需要绝对路径

## 快速验证命令

```bash
# 一键测试
pnpm build && pnpm build:tauri && open "src-tauri/target/release/bundle/macos/AI Desktop Pet.app"
```
