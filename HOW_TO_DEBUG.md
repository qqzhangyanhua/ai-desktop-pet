# 如何在 Tauri 应用中查看控制台日志

## 方法 1：使用快捷键（最简单）⭐

在打开的应用窗口中，按以下快捷键：

### macOS
- **Command + Option + I** (⌘ + ⌥ + I)
- 或 **Command + Shift + I** (⌘ + ⇧ + I)

### Windows/Linux
- **Ctrl + Shift + I**
- 或 **F12**

## 方法 2：右键菜单

1. 在应用窗口中**右键点击**任意位置
2. 选择 **"检查元素"** 或 **"Inspect Element"**
3. 开发者工具会在窗口底部或侧边打开

## 方法 3：通过代码添加开发者工具按钮

如果上述方法不工作，我可以在应用中添加一个按钮来打开开发者工具。

## 方法 4：查看终端输出

在构建时的终端中也会有一些日志输出：

```bash
# 查看构建日志
pnpm build:tauri

# 运行时日志会在终端显示
```

## 方法 5：使用 macOS Console.app

1. 打开 **Console.app**（在 Applications/Utilities 中）
2. 在左侧选择你的 Mac
3. 在搜索框中输入：`ai-desktop-pet`
4. 运行应用，查看实时日志

## 查看日志的步骤

### 1. 打开开发者工具后

1. 点击 **Console** 标签页
2. 在过滤框中输入：`[GlobalLive2D]`
3. 查看所有 Live2D 相关的日志

### 2. 需要查找的关键信息

#### ✅ 成功的日志应该是：
```
[GlobalLive2D] ===== 环境诊断 =====
[GlobalLive2D] location.href: tauri://localhost/
[GlobalLive2D] location.origin: tauri://localhost
[GlobalLive2D] Model path (original): /whitecatfree_vts/white-cat.model3.json
[GlobalLive2D] ===== 路径解析测试 =====
[GlobalLive2D] 尝试访问: /whitecatfree_vts/white-cat.model3.json
[GlobalLive2D] 响应状态: 200 OK
[GlobalLive2D] ✓ 成功! Content-Type: application/json
[GlobalLive2D] 文件大小: 849 bytes
[GlobalLive2D] ✅ 找到可用路径: tauri://localhost/whitecatfree_vts/white-cat.model3.json
```

#### ❌ 失败的日志可能是：
```
[GlobalLive2D] ✗ 失败: 404 Not Found
[GlobalLive2D] ✗ 错误: Failed to fetch
[GlobalLive2D] ❌ 所有路径尝试均失败！
```

### 3. 截图或复制日志

- 在 Console 中，右键点击日志 → **Save Selected** 保存日志
- 或者直接截图发送给我

## 临时调试方案：添加可视化日志

如果开发者工具无法打开，我可以在应用界面上显示日志。让我知道是否需要这个功能。

## 快速测试命令

```bash
# 1. 确保最新代码已构建
pnpm build

# 2. 在开发模式下测试（可以直接看到控制台）
pnpm dev

# 3. 在浏览器中访问
open http://localhost:1420

# 4. 打开浏览器的开发者工具（F12 或 Cmd+Opt+I）
# 5. 查看 Console 标签页
```

## 如果开发者工具无法打开

### 检查 Tauri 配置

确保 `src-tauri/tauri.conf.json` 中没有禁用开发者工具：

```json
{
  "app": {
    "windows": [
      {
        // 确保没有 "devtools": false
      }
    ]
  }
}
```

### 使用开发模式

开发模式默认启用开发者工具：

```bash
# 使用开发模式运行
pnpm dev:tauri
```

在开发模式下，开发者工具会自动打开或更容易访问。

## 需要帮助？

如果以上方法都不工作，请告诉我：
1. 您使用的操作系统（macOS/Windows/Linux）
2. 是否能看到应用窗口
3. 右键点击时是否有菜单出现
4. 按快捷键时是否有任何反应

我可以帮您添加其他调试方法！
