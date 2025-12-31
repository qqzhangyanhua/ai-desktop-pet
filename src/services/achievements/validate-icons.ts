/**
 * Achievement Icon Validation Test
 * 成就图标验证测试脚本
 *
 * 验证所有预设成就的 icon 名称是否为有效的 Lucide React icons
 */

import * as LucideIcons from 'lucide-react';

// 导入预设成就（需要从源文件复制，因为不能直接 import）
const PRESET_ACHIEVEMENT_ICONS = [
  'Hand',
  'HandHeart',
  'Medal',
  'Utensils',
  'Gamepad2',
  'MessageSquare',
  'Star',
  'Trophy',
  'Sprout',
  'Leaf',
  'TreeDeciduous',
  'TreePine',
  'Calendar',
  'Heart',
  'Snowflake',
  'Users',
  'HeartHandshake',
  'Sparkles',
  'MessagesSquare',
  'Target',
];

/**
 * 验证 icon 名称是否存在于 Lucide icons 中
 */
export function validateIconNames(): {
  valid: string[];
  invalid: string[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const iconName of PRESET_ACHIEVEMENT_ICONS) {
    const Icon = (LucideIcons as Record<string, unknown>)[iconName];
    if (Icon && typeof Icon === 'function') {
      valid.push(iconName);
    } else {
      invalid.push(iconName);
    }
  }

  return { valid, invalid };
}

/**
 * 运行验证并输出结果
 */
export function runValidation(): void {
  console.log('🔍 Validating achievement icons...\n');

  const { valid, invalid } = validateIconNames();

  console.log(`✅ Valid icons: ${valid.length}/${PRESET_ACHIEVEMENT_ICONS.length}`);
  if (valid.length > 0) {
    console.log('   ', valid.join(', '));
  }

  console.log('');

  if (invalid.length > 0) {
    console.error(`❌ Invalid icons: ${invalid.length}`);
    console.error('   ', invalid.join(', '));
    console.error('\n⚠️  Fix these icons in src/services/achievements/index.ts');
    process.exit(1);
  } else {
    console.log('✨ All icons are valid!');
  }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  runValidation();
}
