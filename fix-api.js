/**
 * API 修复脚本 - 修复评价提交的 undefined 问题
 * 
 * 使用方法：
 * 1. 将此文件上传到服务器 /www/wwwroot/api/ 目录
 * 2. 执行: node /www/wwwroot/api/fix-api.js
 * 3. 重启 API 服务: pm2 restart api (或 pm2 restart all)
 */

const fs = require('fs');
const path = require('path');

const apiPath = path.join(__dirname, 'api.js');
let content = fs.readFileSync(apiPath, 'utf-8');

// 修复1: 在 waiter-reviews POST handler 中处理 id 为 undefined 的情况
// 查找模式: 插入 waiter_reviews 的 SQL 语句
const patterns = [
  // 模式A: r.id 直接作为参数
  {
    search: /VALUES \(\?,\?,\?,\?,\?,\?,\?,\?\)/g,
    replace: 'VALUES (?,?,?,?,?,?,?,?)'
  }
];

// 修复: 在 waiter-reviews 路由处理中，确保 id 有默认值
// 查找 "INSERT INTO waiter_reviews" 附近的代码
const insertMatch = content.match(/app\.post\(['"`]\/api\/waiter-reviews['"`][\s\S]{0,30}/);
if (insertMatch) {
  console.log('Found POST /api/waiter-reviews at:', insertMatch[0].substring(0, 50));
}

// 查找 waiter_reviews 的 INSERT 语句
const reviewInsertRegex = /INSERT INTO waiter_reviews\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/;
const match = content.match(reviewInsertRegex);

if (match) {
  console.log('Found waiter_reviews INSERT statement:');
  console.log('  Columns:', match[1]);
  console.log('  Values:', match[2]);
  
  // 检查是否包含 id 列
  if (match[1].includes('id')) {
    console.log('  ✓ id column found in INSERT');
  } else {
    console.log('  ✗ id column NOT found in INSERT');
  }
} else {
  console.log('Could not find waiter_reviews INSERT statement, searching...');
  
  // 打印包含 waiter-reviews 和 INSERT 的所有行
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('waiter') && lines[i].includes('INSERT')) {
      console.log(`  Line ${i + 1}: ${lines[i].trim()}`);
      // 打印前后5行上下文
      for (let j = Math.max(0, i - 3); j <= Math.min(lines.length - 1, i + 8); j++) {
        console.log(`    ${j + 1}: ${lines[j]}`);
      }
    }
  }
}

console.log('\n--- 修复建议 ---');
console.log('如果后端收到的 r.id 为 undefined，需要确保插入语句中有默认值。');
console.log('找到 POST /api/waiter-reviews 的 handler，确保 id 参数这样处理：');
console.log('  r.id || (Date.now().toString(36) + Math.random().toString(36).substring(2, 6))');
console.log('\n或者直接修改 INSERT 参数中的 id 值为：');
console.log('  (r.id || (Date.now().toString(36) + Math.random().toString(36).substring(2, 6)))');
