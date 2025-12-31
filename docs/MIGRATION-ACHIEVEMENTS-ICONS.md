# 成就系统图标迁移指南

## 概述

成就系统已从 emoji 图标迁移到 Lucide React icons，以符合项目规范。

## 变更内容

### 1. 类型定义
- `Achievement.icon` 字段现在存储 Lucide icon 名称（如 `'Hand'`, `'Trophy'`），而非 emoji

### 2. 预设成就图标映射

| 成就 ID | 原 Emoji | 新 Icon | 含义 |
|---------|---------|---------|------|
| first_pet | 👋 | Hand | 初次相遇 |
| pet_10 | 🤗 | HandHeart | 熟悉的手感 |
| pet_100 | 🎖️ | Medal | 抚摸大师 |
| feed_10 | 🍱 | Utensils | 营养师 |
| play_10 | 🎮 | Gamepad2 | 玩伴 |
| chat_10 | 💬 | MessageSquare | 话痨 |
| interaction_100 | ⭐ | Star | 互动达人 |
| interaction_500 | 🏆 | Trophy | 铁杆玩家 |
| companion_1 | 🌱 | Sprout | 初识 |
| companion_7 | 🌿 | Leaf | 一周之约 |
| companion_30 | 🌳 | TreeDeciduous | 月度伙伴 |
| companion_100 | 🌲 | TreePine | 百日守护 |
| consecutive_7 | 📅 | Calendar | 持之以恒 |
| consecutive_30 | ❤️ | Heart | 日久生情 |
| intimacy_30 | 🧊 | Snowflake | 破冰 |
| intimacy_50 | 👥 | Users | 好友 |
| intimacy_70 | 💙 | HeartHandshake | 挚友 |
| intimacy_100 | 💖 | Sparkles | 灵魂伴侣 |
| first_chat | 🗨️ | MessagesSquare | 第一次对话 |
| all_interactions | 🎯 | Target | 全面发展 |

## 迁移方法

### 方法一：清理并重新初始化（推荐）

**适用场景**：不需要保留已解锁成就记录

**步骤**：

1. 在浏览器控制台或开发工具中执行：
```javascript
import { cleanAllAchievements } from '@/services/database/migrate-achievements';
await cleanAllAchievements();
```

2. 重启应用，系统会自动重新初始化所有成就

### 方法二：迁移现有数据（保留解锁记录）

**适用场景**：需要保留已解锁成就和解锁时间

**步骤**：

1. 在浏览器控制台或开发工具中执行：
```javascript
import { migrateAchievementIcons } from '@/services/database/migrate-achievements';
await migrateAchievementIcons();
```

2. 验证迁移结果：
```javascript
import { validateAchievementIcons } from '@/services/database/migrate-achievements';
const result = await validateAchievementIcons();
console.log(`Valid: ${result.valid}, Invalid: ${result.invalid.length}`);
if (result.invalid.length > 0) {
  console.table(result.invalid);
}
```

3. 重启应用

### 方法三：使用数据导出/导入（最安全）

**适用场景**：希望备份数据后再迁移

**步骤**：

1. 在设置面板 → 数据管理 → 导出数据
2. 执行方法一或方法二
3. 如果出现问题，使用导入功能恢复数据

## 验证迁移

迁移后，访问设置面板 → 统计面板 → 成就标签，检查：

1. ✅ 所有成就显示为 Lucide icons（而非 emoji）
2. ✅ 已解锁成就的状态和时间保持不变
3. ✅ 成就卡片正常渲染，icon 样式正确

## 技术细节

### 代码变更文件

1. `src/types/statistics.ts` - 类型定义更新
2. `src/services/achievements/index.ts` - 预设成就定义
3. `src/components/toast/AchievementToast.tsx` - Toast 组件渲染
4. `src/components/settings/StatsPanel.tsx` - 统计面板渲染
5. `src/services/database/migrate-achievements.ts` - 迁移工具（新增）

### 动态 Icon 加载机制

组件使用以下工具函数动态加载 Lucide icons：

```typescript
function getDynamicIcon(iconName: string): React.ComponentType<{ className?: string }> | null {
  const Icon = (LucideIcons as Record<string, unknown>)[iconName];
  if (Icon && typeof Icon === 'function') {
    return Icon as React.ComponentType<{ className?: string }>;
  }
  return null;
}
```

如果 icon 名称无效，将返回 `null`，组件不会崩溃。

## 常见问题

### Q: 迁移后成就不显示图标？
A: 检查浏览器控制台错误，可能是 icon 名称拼写错误。运行 `validateAchievementIcons()` 验证。

### Q: 已解锁成就丢失？
A: 使用方法二迁移，或从备份中恢复数据。

### Q: 新增自定义成就如何选择 icon？
A: 访问 [Lucide Icons](https://lucide.dev/icons) 查找合适的 icon 名称。

## 后续注意事项

- ✅ 新增成就必须使用 Lucide icon 名称
- ✅ 禁止在成就系统中使用 emoji
- ✅ 所有 icon 名称必须为 PascalCase（如 `HandHeart`，而非 `hand-heart`）
