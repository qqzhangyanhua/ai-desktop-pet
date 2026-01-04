# Live2D 在 Tauri 打包后不显示问题分析

## 问题现象
- `pnpm dev` (http://localhost:1420) - Live2D 正常显示
- `pnpm build:tauri` 打包后 (tauri://localhost) - Live2D 不显示

## 已确认的事实

### 1. 资源可访问 ✅
```
[GlobalLive2D] 响应状态: 200 OK
[GlobalLive2D] 文件大小: 849 bytes
```
模型 JSON 文件可以正常 fetch。

### 2. 动态 import 失败 ❌
```
[GlobalLive2D] ❌ oh-my-live2d 模块导入失败: {}
```
`import('oh-my-live2d')` 在 `tauri://` 协议下失败。

### 3. 静态 import 导致应用无法启动 ❌
将动态 import 改为静态 import 后，整个应用无法显示。

### 4. IPC 协议警告
```
IPC custom protocol failed, Tauri will now use the postMessage interface instead {}
```
这是 Tauri 内部的 IPC 回退，可能与问题相关。

## 根本原因分析

### oh-my-live2d 的依赖链
```
oh-my-live2d
├── pixi-live2d-display (0.4.0)
├── pixi.js (6.5.10)
└── Cubism SDK (内嵌 WASM)
```

### 问题根源

`oh-my-live2d` 内部使用了 **Cubism SDK (WASM)**，该 SDK 在初始化时需要：
1. 确定当前页面的 base URL
2. 加载 WASM 二进制文件

在 `tauri://localhost` 协议下：
1. Cubism WASM 可能无法正确解析 base URL
2. WASM 文件的加载路径可能不正确
3. 某些安全检查可能因非标准协议而失败

### 源码证据

```javascript
// oh-my-live2d/dist/index.js 第 666 行
G ? Ze = self.location.href : document.currentScript && (Ze = document.currentScript.src)
```

```javascript
// 第 9547 行
if (t === void 0 && (t = globalThis.location), i.indexOf("data:") === 0)
```

```javascript
// 第 6622 行
return (i = document.baseURI) !== null && i !== void 0 ? i : window.location.href;
```

这些代码依赖 `location.href` 和 `document.baseURI`，在 `tauri://` 协议下可能表现不一致。

## 解决方案

### 方案 1: 使用 Tauri 的 HTTP 服务（推荐）
在 Tauri 中启用内置 HTTP 服务，使用 `http://localhost:xxx` 而不是 `tauri://`。

### 方案 2: 使用 CDN 版本的 oh-my-live2d
从 unpkg/cdnjs 直接加载，绕过模块打包。

### 方案 3: 使用 pixi-live2d-display 直接调用
绕过 oh-my-live2d，直接使用底层的 pixi-live2d-display 库。

### 方案 4: 回退到简单的 GIF/CSS 动画
如果 Live2D 在 Tauri 中无法稳定工作，考虑使用简单的动画方案。

## 下一步行动

1. 先回滚代码到可工作状态
2. 尝试方案 1（Tauri HTTP 服务）
3. 如果方案 1 不行，尝试方案 2
