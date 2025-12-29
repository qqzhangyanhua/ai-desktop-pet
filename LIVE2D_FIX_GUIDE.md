# Live2D 显示问题修复指南

## 🚨 问题概述

**症状**：
- 启动后看不到宠物
- 控制台出现错误：
  - `TypeError: undefined is not an object (evaluating 'this.internalModel.width')`
  - `TypeError: null is not an object (evaluating 'this.parent.transform')`

**根本原因**：
1. **Node.js 版本过低**（16.20.0 < 20.19+ 要求）
2. Live2D 渲染错误（可能是 Node.js 兼容性问题的副作用）

---

## ✅ 修复步骤

### 第一步：升级 Node.js（必须）

Vite 7.2.7 要求 Node.js 20.19+ 或 22.12+

```bash
# 方法 1：使用 nvm（推荐）
nvm install 22
nvm use 22
nvm alias default 22

# 方法 2：使用 n
npm install -g n
n 22

# 方法 3：从官网下载
# https://nodejs.org/
```

验证安装：
```bash
node --version  # 应显示 v22.x.x 或 v20.19+
npm --version   # 应自动更新到对应版本
```

---

### 第二步：清理并重装依赖

```bash
# 进入项目目录
cd /Users/zhangyanhua/AI/desk/ai-desktop-pet

# 清理旧依赖
rm -rf node_modules pnpm-lock.yaml

# 重新安装
pnpm install
```

---

### 第三步：重新启动

```bash
pnpm dev:tauri
```

**预期结果**：
- ✅ 没有 Node.js 版本错误
- ✅ Vite 正常启动
- ✅ Live2D 宠物正常显示

---

## 🔍 如果仍不显示宠物

### 1. 运行诊断工具

在浏览器中打开：
```
file:///Users/zhangyanhua/AI/desk/ai-desktop-pet/diagnose-live2d.html
```

或从项目中打开：
```bash
open diagnose-live2d.html
```

诊断工具会检查：
- Live2D 舞台 (`#oml2d-stage`) 是否存在
- Live2D 画布 (`#oml2d-canvas`) 尺寸是否正确
- CSS 样式是否正确（visibility, opacity, z-index）
- 元素位置是否在可视区域内

---

### 2. 检查浏览器控制台

打开主窗口的开发者工具（右键 → 检查元素）：

**正常日志应该显示**：
```
[GlobalLive2D] ✓ oh-my-live2d loaded
[GlobalLive2D] ✓ Instance created
[GlobalLive2D] ⚡ onLoad: success
[GlobalLive2D] ✓ loadModelByIndex(0) resolved
[PetContainer] Live2D ready callback triggered!
```

**如果看到错误**：
- 截图控制台日志
- 查看 Network 标签，确认模型文件加载成功：
  - `/whitecatfree_vts/white-cat.model3.json` (200 OK)
  - 相关纹理文件 (200 OK)

---

### 3. 手动检查 DOM 元素

在控制台运行：
```javascript
// 检查 Live2D 舞台
const stage = document.getElementById('oml2d-stage');
console.log('Stage:', stage);
console.log('Stage rect:', stage?.getBoundingClientRect());
console.log('Stage style:', window.getComputedStyle(stage));

// 检查 Live2D 画布
const canvas = document.getElementById('oml2d-canvas');
console.log('Canvas:', canvas);
console.log('Canvas size:', canvas?.width, 'x', canvas?.height);
console.log('Canvas display size:', canvas?.getBoundingClientRect());

// 强制显示（如果被隐藏）
if (stage) {
  stage.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 300px !important;
    height: 400px !important;
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    z-index: 9999 !important;
    background: rgba(255, 0, 0, 0.1) !important; /* 红色半透明背景用于调试 */
  `;
}
```

---

### 4. 检查模型文件

确认模型文件存在：
```bash
ls -lh /Users/zhangyanhua/AI/desk/ai-desktop-pet/public/whitecatfree_vts/
```

应该看到：
- `white-cat.model3.json` - 模型配置文件
- `*.moc3` - 模型数据文件
- `*.png` - 纹理文件

如果文件缺失，重新下载模型文件。

---

### 5. 临时禁用 Live2D，使用占位符

如果 Live2D 确实无法显示，可以临时禁用：

编辑 `src/stores/configStore.ts`：
```typescript
// 找到 DEFAULT_CONFIG
const DEFAULT_CONFIG: AppConfig = {
  // ...
  live2d: {
    useLive2D: false, // 改为 false
    // ...
  },
  // ...
};
```

这样会显示占位符图形（基于 PixiJS 渲染的简单图形）。

---

## 🐛 常见问题

### Q1: 升级 Node.js 后依赖安装失败

**解决**：
```bash
# 清理 pnpm 缓存
pnpm store prune

# 重装
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Q2: Live2D 舞台存在但看不到模型

**原因**：可能是 z-index 被其他元素覆盖

**解决**：
```javascript
// 在控制台运行，强制提升 z-index
const stage = document.getElementById('oml2d-stage');
if (stage) stage.style.zIndex = '99999';
```

### Q3: 模型加载失败（404 错误）

**原因**：模型路径不对

**检查**：
```bash
# 确认模型文件在 public 目录
ls public/whitecatfree_vts/white-cat.model3.json
```

如果不存在，检查 `src/services/live2d/global-init.ts` 中的 `MODEL_CONFIG.path` 配置。

### Q4: 控制台持续报错但模型已加载

**原因**：oh-my-live2d 内部的竞态问题

**影响**：通常不影响最终显示，可以忽略

**如果实在困扰**：
```javascript
// 全局错误捕获（在 main.tsx 顶部添加）
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason?.message?.includes('internalModel')) {
    console.warn('[Suppressed] Live2D internal error:', e.reason);
    e.preventDefault(); // 阻止错误在控制台显示
  }
});
```

---

## 📊 诊断检查清单

升级 Node.js 后，依次检查：

- [ ] Node.js 版本 >= 20.19 (`node --version`)
- [ ] Vite 正常启动（无版本错误）
- [ ] 浏览器控制台无红色错误
- [ ] `#oml2d-stage` 元素存在
- [ ] `#oml2d-canvas` 尺寸 > 0
- [ ] 模型文件加载成功（Network 标签）
- [ ] `[GlobalLive2D] ✓ loadModelByIndex(0) resolved` 日志出现
- [ ] 可以看到宠物

---

## 📝 报告问题

如果以上步骤都无效，请提供：

1. **Node.js 版本**：`node --version` 输出
2. **诊断工具截图**：`diagnose-live2d.html` 的结果
3. **控制台日志**：完整的浏览器控制台输出
4. **DOM 检查结果**：运行上述 DOM 检查代码的输出
5. **模型文件列表**：`ls -lh public/whitecatfree_vts/` 输出

---

## 🎯 快速修复命令

```bash
# 一键修复（复制整段运行）
nvm install 22 && \
nvm use 22 && \
cd /Users/zhangyanhua/AI/desk/ai-desktop-pet && \
rm -rf node_modules pnpm-lock.yaml && \
pnpm install && \
pnpm dev:tauri
```

**预计时间**：3-5 分钟（取决于网络速度）

---

## ✅ 修复完成标志

当你看到：
1. 终端没有 Node.js 版本错误
2. Vite 启动成功（显示 Local URL）
3. Tauri 窗口打开
4. **可以看到白猫宠物在窗口中**

**恭喜！问题已解决。** 🎉
