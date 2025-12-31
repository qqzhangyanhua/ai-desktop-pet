# Icon 显示问题修复

## 问题
重启后成就 icon 不显示，显示为空。

## 原因
`import * as LucideIcons from 'lucide-react'` 在某些构建配置下无法正确获取所有 icons。

## 解决方案
创建显式的 icon 映射表，避免动态导入问题。

## 已修改的文件

1. **新增**: `src/utils/achievement-icons.ts`
   - 显式导入所有需要的 Lucide icons
   - 创建 `ACHIEVEMENT_ICON_MAP` 映射表
   - 提供 `getAchievementIcon()` 函数

2. **修改**: `src/components/toast/AchievementToast.tsx`
   - 移除动态 icon 加载
   - 使用 `getAchievementIcon()` 获取 icon

3. **修改**: `src/components/settings/StatsPanel.tsx`
   - 移除动态 icon 加载
   - 使用 `getAchievementIcon()` 获取 icon

## 验证步骤

1. **重新构建应用**:
   ```bash
   pnpm vite build
   ```

2. **启动应用**:
   ```bash
   pnpm tauri dev
   ```

3. **检查浏览器控制台**:
   - 打开开发者工具 (Cmd+Option+I)
   - 查看是否有 `[AchievementIcons] Icon not found` 警告
   - 如果有，说明数据库中的 icon 名称与代码不匹配

4. **验证显示**:
   - 打开 设置 → 统计面板 → 成就
   - 确认所有成就显示 icon（不是空白）
   - Icon 应该在彩色背景圆圈中显示

## 调试信息

如果 icon 仍然不显示，检查控制台输出：

```javascript
// 应该看到：
[AchievementIcons] Icon not found: "SomeIconName"
[AchievementIcons] Available icons: ['Hand', 'HandHeart', ...]
```

如果看到这个警告，说明数据库中的 icon 名称不正确。

## 常见问题

### Q: Icon 仍然不显示
A: 检查浏览器控制台错误，可能是：
1. 构建缓存问题 - 删除 `dist/` 目录重新构建
2. Icon 名称不匹配 - 查看控制台警告
3. 组件未重新渲染 - 强制刷新页面 (Cmd+Shift+R)

### Q: 某些 icon 显示，某些不显示
A: 数据库中某些成就的 icon 名称可能不正确。运行：
```bash
sqlite3 ~/Library/Application\ Support/com.ai-desktop-pet.app/pet.db \
  "SELECT id, icon FROM achievements WHERE icon NOT IN ('Hand','HandHeart','Medal','Utensils','Gamepad2','MessageSquare','Star','Trophy','Sprout','Leaf','TreeDeciduous','TreePine','Calendar','Heart','Snowflake','Users','HeartHandshake','Sparkles','MessagesSquare','Target')"
```

### Q: 如何添加新的 icon
A: 在 `src/utils/achievement-icons.ts` 中：
1. 从 `lucide-react` 导入新 icon
2. 添加到 `ACHIEVEMENT_ICON_MAP`
3. 在数据库中使用相同的名称

## 下一步

重新启动应用后，打开统计面板查看效果。如果仍有问题，请提供浏览器控制台的完整错误信息。
