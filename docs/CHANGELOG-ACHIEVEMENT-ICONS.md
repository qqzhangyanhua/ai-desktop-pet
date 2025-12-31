# 成就系统 Emoji → Icon 迁移完成

## 执行摘要

已将成就系统中的所有 emoji 图标替换为 Lucide React icons，符合项目规范。

## 变更清单

### ✅ 已完成的修改

1. **类型定义** (`src/types/statistics.ts`)
   - 更新 `Achievement.icon` 字段注释为 "Lucide React icon 名称"

2. **预设成就定义** (`src/services/achievements/index.ts`)
   - 21个成就的 emoji 全部替换为 Lucide icon 名称
   - 映射表：见 `docs/MIGRATION-ACHIEVEMENTS-ICONS.md`

3. **Toast 通知组件** (`src/components/toast/AchievementToast.tsx`)
   - 添加动态 icon 加载函数 `getDynamicIcon()`
   - 将 emoji 渲染改为动态 Lucide icon 组件渲染

4. **统计面板组件** (`src/components/settings/StatsPanel.tsx`)
   - 添加动态 icon 加载函数 `getDynamicIcon()`
   - 成就卡片改用 icon 组件渲染，带背景色块

5. **数据库迁移工具** (`src/services/database/migrate-achievements.ts`)
   - `migrateAchievementIcons()` - 从 emoji 迁移到 icon 名称
   - `cleanAllAchievements()` - 清理所有成就数据
   - `validateAchievementIcons()` - 验证 icon 名称有效性

6. **迁移指南** (`docs/MIGRATION-ACHIEVEMENTS-ICONS.md`)
   - 详细的用户迁移说明
   - 三种迁移方法（清理/迁移/备份恢复）

7. **验证脚本** (`src/services/achievements/validate-icons.ts`)
   - 验证所有预设 icon 名称是否有效

## 用户操作指南

### 对于开发者

**立即需要做的事**：

1. **清理旧数据**（三选一）：

   **方法 A：清理重置（推荐）**
   ```javascript
   // 在浏览器控制台执行
   import { cleanAllAchievements } from '@/services/database/migrate-achievements';
   await cleanAllAchievements();
   ```
   然后重启应用，成就会自动重新初始化。

   **方法 B：迁移保留**
   ```javascript
   // 在浏览器控制台执行
   import { migrateAchievementIcons } from '@/services/database/migrate-achievements';
   await migrateAchievementIcons();
   ```
   已解锁成就状态会保留。

   **方法 C：不操作**
   继续使用旧数据，但成就可能不显示图标（因为 emoji 字符串不是有效的 icon 名称）。

2. **验证迁移**：
   - 打开设置 → 统计面板 → 成就标签
   - 确认所有成就显示为 icon 而非 emoji
   - 检查浏览器控制台无错误

### 对于最终用户

**如果是全新安装**：
- 无需任何操作，成就系统会自动使用新 icon

**如果是已有数据**：
- 建议在设置 → 数据管理 → 导出数据（备份）
- 然后在设置 → 数据管理 → 清理成就数据（未来可能添加）
- 或等待下次应用更新时自动迁移

## 技术细节

### Icon 映射逻辑

```typescript
// 动态获取 Lucide icon 组件
function getDynamicIcon(iconName: string): React.ComponentType<{ className?: string }> | null {
  const Icon = (LucideIcons as Record<string, unknown>)[iconName];
  if (Icon && typeof Icon === 'function') {
    return Icon as React.ComponentType<{ className?: string }>;
  }
  return null;
}
```

### 渲染示例

**Before (Emoji)**:
```tsx
<span className="achievement-icon">{achievement.icon}</span>
```

**After (Lucide Icon)**:
```tsx
{AchievementIcon && (
  <AchievementIcon className="w-6 h-6 text-amber-600" />
)}
```

## 测试清单

- [ ] TypeScript 编译无错误（我们修改的文件）
- [ ] 成就 Toast 通知显示 icon 正常
- [ ] 统计面板成就卡片显示 icon 正常
- [ ] 已解锁/未解锁状态 icon 样式区分明显
- [ ] 数据库迁移工具正常运行
- [ ] 迁移后已解锁成就状态保持不变（方法 B）

## 注意事项

### ⚠️ 破坏性变更

- **数据库 Schema 未改变**，但 `icon` 字段内容格式变化
- 旧版本应用读取新数据会显示 icon 名称文本而非图标
- 新版本应用读取旧数据（emoji）会不显示图标

### 🔒 向后兼容策略

如果需要保持向后兼容，可以在 `getDynamicIcon()` 中添加 emoji fallback：

```typescript
function getDynamicIcon(iconName: string) {
  // 尝试加载 Lucide icon
  const Icon = (LucideIcons as Record<string, unknown>)[iconName];
  if (Icon && typeof Icon === 'function') {
    return Icon;
  }

  // Fallback: 如果是 emoji，返回一个渲染 emoji 的组件
  if (/[\u{1F300}-\u{1F9FF}]/u.test(iconName)) {
    return ({ className }: { className?: string }) => (
      <span className={className}>{iconName}</span>
    );
  }

  return null;
}
```

但**不推荐**使用 fallback，应彻底迁移。

## 后续维护

### 添加新成就时

1. 访问 [Lucide Icons](https://lucide.dev/icons) 选择合适的 icon
2. 使用 PascalCase 名称（如 `HandHeart`）
3. 在 `PRESET_ACHIEVEMENTS` 中添加定义
4. 运行验证脚本确认：
   ```bash
   pnpm exec tsx src/services/achievements/validate-icons.ts
   ```

### 禁止事项

- ❌ **禁止**在成就系统中使用 emoji
- ❌ **禁止**使用图片 URL（除非特殊需求）
- ❌ **禁止**使用 kebab-case icon 名称（如 `hand-heart`）

## 文件清单

### 修改的文件
- `src/types/statistics.ts`
- `src/services/achievements/index.ts`
- `src/components/toast/AchievementToast.tsx`
- `src/components/settings/StatsPanel.tsx`
- `src/services/database/index.ts`

### 新增的文件
- `src/services/database/migrate-achievements.ts`
- `src/services/achievements/validate-icons.ts`
- `docs/MIGRATION-ACHIEVEMENTS-ICONS.md`

## 相关链接

- [Lucide Icons 官网](https://lucide.dev/icons)
- [Lucide React 文档](https://lucide.dev/guide/packages/lucide-react)
- 项目规范：`CLAUDE.md` - "不要用emoji 都找合适的icon代替"
