#!/usr/bin/env node

/**
 * 核心功能测试脚本
 * 测试所有优化后的功能是否正常工作
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 开始运行核心功能测试...\n');

// 测试项目
const tests = [
  {
    name: '1. TypeScript 编译检查',
    command: 'npx',
    args: ['tsc', '--noEmit', '--project', 'main/tsconfig.json'],
    cwd: path.join(__dirname, '..'),
  },
  {
    name: '2. 主进程编译',
    command: 'npm',
    args: ['run', 'build:main'],
    cwd: path.join(__dirname, '..'),
  },
  {
    name: '3. Preload 编译',
    command: 'npm',
    args: ['run', 'build:preload'],
    cwd: path.join(__dirname, '..'),
  },
  {
    name: '4. 渲染进程编译',
    command: 'npm',
    args: ['run', 'build:renderer'],
    cwd: path.join(__dirname, '..'),
  },
];

// 运行测试
async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`\n📋 运行测试：${test.name}`);
    console.log(`命令：${test.command} ${test.args.join(' ')}`);
    
    try {
      await runCommand(test.command, test.args, test.cwd);
      console.log(`✅ ${test.name} - 通过`);
      passed++;
    } catch (error) {
      console.error(`❌ ${test.name} - 失败`);
      console.error(error.message);
      failed++;
    }
  }

  // 输出总结
  console.log('\n' + '='.repeat(50));
  console.log('📊 测试总结');
  console.log('='.repeat(50));
  console.log(`总测试数：${tests.length}`);
  console.log(`✅ 通过：${passed}`);
  console.log(`❌ 失败：${failed}`);
  console.log(`成功率：${((passed / tests.length) * 100).toFixed(2)}%`);
  console.log('='.repeat(50));

  if (failed > 0) {
    console.log('\n❌ 部分测试失败，请检查错误信息');
    process.exit(1);
  } else {
    console.log('\n✅ 所有测试通过！');
    process.exit(0);
  }
}

// 运行命令
function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true,
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`进程退出码：${code}`));
      }
    });

    proc.on('error', (error) => {
      reject(error);
    });
  });
}

// 启动测试
runTests().catch((error) => {
  console.error('\n❌ 测试执行出错:', error);
  process.exit(1);
});
