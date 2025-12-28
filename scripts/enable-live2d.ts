/**
 * 快速启用 Live2D 脚本
 * 直接修改数据库配置启用 Live2D
 */

import Database from '@tauri-apps/plugin-sql';
import { DEFAULT_CONFIG } from '../src/types/config.js';

async function main() {
  console.log('🔧 正在启用 Live2D...\n');

  try {
    // 连接数据库
    const db = await Database.load('sqlite:ai-desktop-pet.db');
    console.log('✓ 数据库连接成功');

    // 读取当前配置
    const result = await db.select<Array<{ value: string }>>(
      'SELECT value FROM config WHERE key = ?',
      ['app_config']
    );

    let config;
    if (result.length > 0) {
      config = JSON.parse(result[0].value);
      console.log('✓ 读取当前配置');
    } else {
      config = DEFAULT_CONFIG;
      console.log('⚠ 未找到配置，使用默认配置');
    }

    // 启用 Live2D
    config.live2d = {
      ...config.live2d,
      useLive2D: true,
    };
    config.useLive2D = true;

    console.log('✓ 更新配置：启用 Live2D');

    // 保存到数据库
    const now = Date.now();
    await db.execute(
      `INSERT INTO config (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      ['app_config', JSON.stringify(config), now]
    );

    console.log('✓ 配置已保存到数据库');
    console.log('\n✨ Live2D 已启用！');
    console.log('\n📋 下一步：');
    console.log('   1. 重启应用（关闭后重新运行 pnpm dev:tauri）');
    console.log('   2. 等待 Live2D 模型加载（约 2-3 秒）');
    console.log('   3. 打开浏览器开发者工具（F12）查看日志');
    console.log('\n💡 提示：');
    console.log('   - 查看 Console 标签的 [Live2DManager] 日志');
    console.log('   - 查看 Network 标签确认模型文件加载');
    console.log('   - 如果仍显示占位符，请查看 docs/live2d-setup-guide.md');

    await db.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 启用失败：', error);
    console.error('\n请确保：');
    console.error('   1. 应用已经运行过至少一次（数据库已创建）');
    console.error('   2. 数据库文件存在');
    console.error('   3. 没有其他进程占用数据库');
    process.exit(1);
  }
}

main();
