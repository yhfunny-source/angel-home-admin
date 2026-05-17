/**
 * 奶油拿铁配色方案 - 安全替换脚本
 * 只替换颜色值，不碰 JSX 结构
 */
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');

// 颜色映射：旧颜色 → 新颜色（按优先级排序，长的先匹配）
const COLOR_MAP = {
  // === 背景色 ===
  '#F0F4F8': '#FAF5F0',           // 全局背景
  'bg-[#F0F4F8]': 'bg-[#FAF5F0]',
  '#FFFFFF': '#FFFFFF',             // 卡片白底保持不变
  '#F5F8FB': '#F5EFE6',           // 侧边浅底/表头底色
  'bg-[#F5F8FB]': 'bg-[#F5EFE6]',
  '#E2E8F0': '#E8DFD2',           // 分割线
  'border-[#E2E8F0]': 'border-[#E8DFD2]',
  '#E8EDF2': '#E8DFD2',           // 边框/分割线
  'border-[#E8EDF2]': 'border-[#E8DFD2]',
  '#EDF1F5': '#F5EFE6',           // 标签底色
  'bg-[#EDF1F5]': 'bg-[#F5EFE6]',
  '#D8E0E8': '#E8DFD2',           // 边框
  'border-[#D8E0E8]': 'border-[#E8DFD2]',

  // === 主按钮/主题色 ===
  '#18A0FB': '#C89F7F',           // 主色蓝 → 拿铁棕
  '#0D8BD9': '#B88F6F',           // 深蓝 → 悬浮棕
  'from-[#18A0FB]': 'from-[#C89F7F]',
  'to-[#0D8BD9]': 'to-[#B88F6F]',
  'bg-[#18A0FB]': 'bg-[#C89F7F]',
  'hover:bg-[#0D8BD9]': 'hover:bg-[#B88F6F]',
  'border-[#18A0FB]': 'border-[#C89F7F]',
  'text-[#18A0FB]': 'text-[#C89F7F]',
  '#0D8BD9': '#B88F6F',
  'bg-[#0D8BD9]': 'bg-[#B88F6F]',
  '#0369A1': '#A87F5F',           // 点击深色
  'bg-[#0369A1]': 'bg-[#A87F5F]',
  'to-[#0369A1]': 'to-[#A87F5F]',
  '#075985': '#7A5C48',

  // === 文字色 ===
  '#2C3E50': '#4A3A2F',           // 深海军蓝 → 主标题
  'text-[#2C3E50]': 'text-[#4A3A2F]',
  'bg-[#2C3E50]': 'bg-[#4A3A2F]',
  '#5A6B7D': '#726255',           // 中灰蓝 → 正文
  'text-[#5A6B7D]': 'text-[#726255]',
  '#7A8FA6': '#A08F80',           // 灰蓝 → 辅助小字
  'text-[#7A8FA6]': 'text-[#A08F80]',
  '#9AAABF': '#A08F80',           // 浅灰蓝
  'text-[#9AAABF]': 'text-[#A08F80]',
  '#B8C4D0': '#BBABA0',           // 占位提示
  'text-[#B8C4D0]': 'text-[#BBABA0]',

  // === 重点/标题色 ===
  '#7A5C48': '#7A5C48',           // 标题重点色（碰巧相同）
  '#DDBFA7': '#DDBFA7',           // 轻量点缀色

  // === 成功/绿色系 ===
  '#10B981': '#5C7258',           // 成功绿 → 拿铁完成色
  '#059669': '#4A5E48',
  'from-[#10B981]': 'from-[#5C7258]',
  'to-[#059669]': 'to-[#4A5E48]',
  '#047857': '#3D4F3A',
  '#065F46': '#2F3F2C',
  '#ECFDF5': '#EEF1EB',
  'bg-[#ECFDF5]': 'bg-[#EEF1EB]',
  '#D1FAE5': '#DDE5D8',
  'bg-[#D1FAE5]': 'bg-[#DDE5D8]',

  // === 警告/橙色系 ===
  '#F59E0B': '#C89F7F',           // 琥珀 → 拿铁主色
  '#D97706': '#B88F6F',
  'from-[#F59E0B]': 'from-[#C89F7F]',
  'to-[#D97706]': 'to-[#B88F6F]',
  '#B45309': '#A87F5F',
  '#FEF3C7': '#FFF1E3',           // 待接单底色
  'bg-[#FEF3C7]': 'bg-[#FFF1E3]',
  '#FDE68A': '#F7EEDB',
  '#92400E': '#94724A',

  // === 红色系 ===
  '#EF4444': '#B85C4A',           // 红色 → 超时警告
  '#DC2626': '#A34E3C',
  '#B91C1C': '#8C3F30',
  '#991B1B': '#703025',
  '#FEF2F2': '#FBEAE6',
  'bg-[#FEF2F2]': 'bg-[#FBEAE6]',
  '#FEE2E2': '#F5DCD6',
  'bg-[#FEE2E2]': 'bg-[#F5DCD6]',
  '#FECACA': '#EBC4BC',

  // === 紫/粉系 ===
  '#6366F1': '#8C6A53',           // 紫 → 处理中棕
  '#4F46E5': '#7A5C48',
  '#7C3AED': '#7A5C48',
  '#6D28D9': '#6B4A38',
  '#EC4899': '#B88F6F',           // 粉 → 拿铁
  '#DB2777': '#A87F5F',
  '#F5F3FF': '#F0E8DF',           // 处理中底色
  'bg-[#F5F3FF]': 'bg-[#F0E8DF]',
  '#EDE9FE': '#E5DCD0',
  '#DDD6FE': '#D8CBC0',

  // === 蓝色系 ===
  '#EFF6FF': '#F0E8DF',
  'bg-[#EFF6FF]': 'bg-[#F0E8DF]',
  '#DBEAFE': '#E5DCD0',
  '#BFDBFE': '#D8CBC0',

  // === 其他背景 ===
  '#F0E8DF': '#F0E8DF',
  'bg-[#F0E8DF]': 'bg-[#F0E8DF]',
  '#FFF7ED': '#FFF1E3',
  'bg-[#FFF7ED]': 'bg-[#FFF1E3]',
  '#FFEDD5': '#F7EEDB',
  'bg-[#FFEDD5]': 'bg-[#F7EEDB]',
  '#FDF2F8': '#F0E8DF',
  'bg-[#FDF2F8]': 'bg-[#F0E8DF]',
  '#FCE7F3': '#E5DCD0',
  'bg-[#FCE7F3]': 'bg-[#E5DCD0]',
  '#EEF2FF': '#F0E8DF',
  'bg-[#EEF2FF]': 'bg-[#F0E8DF]',
  '#ECFEFF': '#F5EFE6',
  'bg-[#ECFEFF]': 'bg-[#F5EFE6]',
  '#F0FDFA': '#F5EFE6',
  'bg-[#F0FDFA]': 'bg-[#F5EFE6]',
  '#CCFBF1': '#DDE5D8',
  '#99F6E4': '#C4D4BE',

  // === 状态色（工单状态） ===
  // 待接单
  '#FFF1E3': '#FFF1E3',
  '#B97C4A': '#B97C4A',
  // 处理中
  '#F0E8DF': '#F0E8DF',
  '#8C6A53': '#8C6A53',
  // 已完成
  '#EEF1EB': '#EEF1EB',
  '#5C7258': '#5C7258',
  // 超时警告
  '#FBEAE6': '#FBEAE6',
  '#B85C4A': '#B85C4A',
  // 暂停等待
  '#F7EEDB': '#F7EEDB',
  '#94724A': '#94724A',

  // === 黑色/遮罩 ===
  '#1A202C': '#3D2E22',
  '#4A5568': '#726255',

  // === 焦点边框 ===
  '#D4B59E': '#D4B59E',
  'border-[#D4B59E]': 'border-[#D4B59E]',
};

// 获取所有 tsx/ts/css 文件
function getFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && item !== 'ui') {
      getFiles(fullPath, files);
    } else if (/\.(tsx|ts|css)$/.test(item)) {
      files.push(fullPath);
    }
  }
  return files;
}

// 安全替换：确保不会破坏 JSX
function safeReplace(content, oldStr, newStr) {
  // 如果旧串就是新串，跳过
  if (oldStr === newStr) return content;
  // 全局替换
  return content.split(oldStr).join(newStr);
}

const files = getFiles(SRC_DIR);
let totalChanges = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  let original = content;

  // 按长度降序排列，避免短匹配干扰长匹配
  const sorted = Object.entries(COLOR_MAP).sort((a, b) => b[0].length - a[0].length);

  for (const [oldColor, newColor] of sorted) {
    if (oldColor === newColor) continue;
    content = safeReplace(content, oldColor, newColor);
  }

  if (content !== original) {
    fs.writeFileSync(file, content);
    const changes = (original.length - content.length) !== 0 ? 'modified' : 'same';
    console.log(`✓ ${path.relative(__dirname, file)}`);
    totalChanges++;
  }
}

console.log(`\nDone! ${totalChanges} files modified.`);
