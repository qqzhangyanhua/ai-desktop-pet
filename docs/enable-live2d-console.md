# 在浏览器控制台中快速启用 Live2D

由于 test.html 可以正常渲染 Live2D，说明功能完全正常，只需要在配置中启用即可。

## 方法一：使用浏览器控制台（最快）

1. **运行应用**
   ```bash
   pnpm dev:tauri
   ```

2. **打开开发者工具**
   - 按 `F12` 或右键选择"检查"
   - 切换到 **Console（控制台）** 标签

3. **粘贴并执行以下代码**

```javascript
(async function enableLive2D() {
  console.log('🔧 开始启用 Live2D...');
  
  try {
    // 动态导入必要的模块
    const { useConfigStore } = await import('./src/stores/configStore.js');
    
    // 获取 store 实例
    const store = useConfigStore.getState();
    
    console.log('✓ 当前配置：', {
      'live2d.useLive2D': store.config.live2d.useLive2D,
      'useLive2D': store.config.useLive2D
    });
    
    // 更新配置
    store.setConfig({
      live2d: {
        ...store.config.live2d,
        useLive2D: true,
      },
      useLive2D: true,
    });
    
    console.log('✓ 配置已更新');
    
    // 保存到数据库
    await store.saveConfig();
    
    console.log('✓ 配置已保存到数据库');
    console.log('\n✨ Live2D 已启用！');
    console.log('\n📋 下一步：');
    console.log('   1. 关闭应用');
    console.log('   2. 重新运行 pnpm dev:tauri');
    console.log('   3. 等待 2-3 秒让 Live2D 加载');
    console.log('\n💡 查看加载日志：');
    console.log('   在控制台搜索 "[Live2DManager]"');
    
  } catch (error) {
    console.error('❌ 启用失败：', error);
    console.error('\n请尝试方法二：通过设置界面启用');
  }
})();
```

## 方法二：通过设置界面启用

1. **打开设置**
   - 右键点击宠物
   - 选择"设置"

2. **启用 Live2D**
   - 进入"外观"标签
   - 找到"启用 Live2D"选项
   - 勾选该复选框

3. **保存并重启**
   - 点击"保存"按钮
   - 关闭应用
   - 重新运行 `pnpm dev:tauri`

## 方法三：修改默认配置（开发模式）

如果要让 Live2D 默认启用，可以修改代码：

**文件：** `src/types/config.ts`

```typescript
export const DEFAULT_CONFIG: AppConfig = {
  // ... 其他配置
  live2d: {
    useLive2D: true,  // 改为 true
    currentModel: 'white-cat',
    modelScale: 1.0,
  },
  // ... 其他配置
  useLive2D: true,  // 改为 true
};
```

修改后重新启动应用即可。

## 验证 Live2D 是否加载成功

### 1. 查看控制台日志

在浏览器开发者工具的 Console 标签中，应该看到类似的日志：

```
[Live2DManager] Starting initialization with models: ...
[Live2DManager] Loading oh-my-live2d...
[Live2DManager] oh-my-live2d loaded successfully
[Live2DManager] DOM already ready, readyState: complete
[Live2DManager] Instance created: true
[Live2DManager] onLoad callback triggered with status: success
[Live2DManager] Model loaded successfully!
```

### 2. 查看网络请求

切换到 **Network（网络）** 标签：

1. 在过滤框中输入 `white-cat`
2. 应该看到以下请求（状态码 200）：
   - `white-cat.model3.json`
   - `white-cat.moc3`
   - `texture_00.png`
   - 各种 `.exp3.json` 表情文件

### 3. 视觉确认

- ❌ **未启用：** 显示蓝色圆形占位符
- ✅ **已启用：** 显示白色小猫 Live2D 模型

## 常见问题

### Q: 控制台脚本报错

**解决方案：** 使用方法二通过设置界面启用

### Q: 启用后仍显示占位符

**检查步骤：**

1. **确认配置已保存**
   ```javascript
   // 在控制台执行
   import('./src/stores/configStore.js').then(m => {
     const store = m.useConfigStore.getState();
     console.log('Live2D 启用状态：', store.config.live2d.useLive2D);
   });
   ```

2. **确认已重启应用**
   - Live2D 初始化需要在应用启动时进行
   - 必须完全关闭后重新启动

3. **查看错误日志**
   - 打开 F12 控制台
   - 查看是否有红色错误信息
   - 搜索 `[Live2DManager]` 相关日志

### Q: 模型加载很慢

这是正常的，首次加载需要：
- 下载模型文件（~220KB）
- 下载贴图文件
- 解析和初始化

通常需要 2-5 秒，请耐心等待。

### Q: 如何切换回 Canvas 渲染？

重复上述步骤，将 `useLive2D` 改为 `false` 即可。

## 需要帮助？

如果以上方法都无法解决问题：

1. **查看完整文档**
   - `docs/live2d-setup-guide.md` - 详细使用指南
   - `docs/live2d-fix-summary.md` - 问题修复总结

2. **使用测试页面**
   - 访问 `http://localhost:1420/test.html`
   - 验证 Live2D 基础功能是否正常

3. **提交 Issue**
   - 附上控制台日志截图
   - 附上 Network 标签截图
   - 说明具体的错误信息
