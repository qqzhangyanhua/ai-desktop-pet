/**
 * Live2D 配置检查脚本
 * 用于验证 Live2D 模型文件和配置是否正确
 */

import { existsSync, statSync, readdirSync } from 'fs';
import { join } from 'path';

interface CheckResult {
  success: boolean;
  message: string;
  details?: string[];
}

const PUBLIC_DIR = join(process.cwd(), 'public');
const MODEL_DIR = join(PUBLIC_DIR, 'whitecatfree_vts');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(path: string, description: string): CheckResult {
  if (!existsSync(path)) {
    return {
      success: false,
      message: `✗ ${description} 不存在`,
      details: [`路径: ${path}`],
    };
  }

  const stats = statSync(path);
  const size = (stats.size / 1024).toFixed(2);
  
  return {
    success: true,
    message: `✓ ${description} 存在`,
    details: [`路径: ${path}`, `大小: ${size} KB`],
  };
}

function checkDirectory(path: string, description: string): CheckResult {
  if (!existsSync(path)) {
    return {
      success: false,
      message: `✗ ${description} 不存在`,
      details: [`路径: ${path}`],
    };
  }

  if (!statSync(path).isDirectory()) {
    return {
      success: false,
      message: `✗ ${description} 不是目录`,
      details: [`路径: ${path}`],
    };
  }

  const files = readdirSync(path);
  
  return {
    success: true,
    message: `✓ ${description} 存在`,
    details: [
      `路径: ${path}`,
      `文件数量: ${files.length}`,
      `文件列表: ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`,
    ],
  };
}

function printResult(result: CheckResult) {
  const color = result.success ? 'green' : 'red';
  log(`  ${result.message}`, color);
  
  if (result.details) {
    result.details.forEach(detail => {
      log(`    ${detail}`, 'cyan');
    });
  }
}

async function main() {
  log('\n=== Live2D 配置检查 ===\n', 'blue');

  const checks: CheckResult[] = [];

  // 1. 检查 public 目录
  log('1. 检查目录结构', 'yellow');
  checks.push(checkDirectory(PUBLIC_DIR, 'public 目录'));
  checks.push(checkDirectory(MODEL_DIR, '模型目录'));
  checks.forEach(printResult);
  log('');

  // 2. 检查必需文件
  log('2. 检查模型文件', 'yellow');
  const requiredFiles = [
    { file: 'white-cat.model3.json', desc: '模型配置文件' },
    { file: 'white-cat.moc3', desc: '模型数据文件' },
    { file: 'white-cat.physics3.json', desc: '物理效果配置' },
    { file: 'white-cat.cdi3.json', desc: '显示信息配置' },
  ];

  requiredFiles.forEach(({ file, desc }) => {
    const result = checkFileExists(join(MODEL_DIR, file), desc);
    checks.push(result);
    printResult(result);
  });
  log('');

  // 3. 检查贴图目录
  log('3. 检查贴图文件', 'yellow');
  const textureDir = join(MODEL_DIR, 'white-cat.2048');
  const textureDirCheck = checkDirectory(textureDir, '贴图目录');
  checks.push(textureDirCheck);
  printResult(textureDirCheck);

  if (textureDirCheck.success) {
    const textureFile = join(textureDir, 'texture_00.png');
    const textureCheck = checkFileExists(textureFile, '贴图文件');
    checks.push(textureCheck);
    printResult(textureCheck);
  }
  log('');

  // 4. 检查表情文件
  log('4. 检查表情文件', 'yellow');
  const expressionFiles = readdirSync(MODEL_DIR).filter(f => f.endsWith('.exp3.json'));
  log(`  ✓ 找到 ${expressionFiles.length} 个表情文件`, 'green');
  expressionFiles.forEach(file => {
    log(`    - ${file}`, 'cyan');
  });
  log('');

  // 5. 总结
  log('=== 检查总结 ===\n', 'blue');
  const successCount = checks.filter(c => c.success).length;
  const totalCount = checks.length;
  const allPassed = successCount === totalCount;

  if (allPassed) {
    log(`✓ 所有检查通过 (${successCount}/${totalCount})`, 'green');
    log('\nLive2D 配置正确，可以正常使用！', 'green');
    log('\n下一步：', 'yellow');
    log('  1. 在设置中启用 Live2D', 'cyan');
    log('  2. 重启应用', 'cyan');
    log('  3. 访问 http://localhost:1420/test.html 测试', 'cyan');
  } else {
    log(`✗ 检查失败 (${totalCount - successCount} 个问题)`, 'red');
    log('\n请修复以上问题后重试', 'yellow');
    log('\n常见问题：', 'yellow');
    log('  - 确保模型文件已正确放置在 public/whitecatfree_vts/ 目录', 'cyan');
    log('  - 检查文件名是否正确（区分大小写）', 'cyan');
    log('  - 确保文件完整且未损坏', 'cyan');
  }

  log('\n');
  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  log('\n✗ 检查过程出错:', 'red');
  console.error(err);
  process.exit(1);
});
