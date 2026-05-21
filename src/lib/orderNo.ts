import { storage } from './storage';

/**
 * 生成自定义订单号
 * 格式: 时间编码(6位) + 店铺名前2字母 + 随机2位数字 + 当天序列号(2位)
 * 示例: 260522AX0315
 */
export async function generateOrderNo(storeName: string): Promise<string> {
  const now = new Date();
  
  // 1. 时间编码: 年月日各2位
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const timeCode = `${year}${month}${day}`;
  
  // 2. 店铺名前2个字母
  const storeLetters = getStoreLetters(storeName);
  
  // 3. 随机2位数字
  const randomNum = String(Math.floor(Math.random() * 100)).padStart(2, '0');
  
  // 4. 当天序列号
  const today = `${year}${month}${day}`;
  const key = `order_seq_${today}_${storeLetters}`;
  let seq = parseInt(storage.get(key) || '0', 10);
  seq += 1;
  storage.set(key, String(seq));
  const seqStr = String(seq).padStart(2, '0');
  
  return `${timeCode}${storeLetters}${randomNum}${seqStr}`;
}

/**
 * 从店铺名提取2个字母缩写
 */
function getStoreLetters(storeName: string): string {
  if (!storeName) return 'XX';
  
  // 取店铺名中前两个汉字的拼音首字母
  const pinyinMap: Record<string, string> = {
    '废': 'F', '墟': 'X', '计': 'J', '划': 'H', '天': 'T', '使': 'S',
    '上': 'S', '海': 'H', '北': 'B', '京': 'J', '广': 'G', '深': 'S',
    '杭': 'H', '成': 'C', '都': 'D', '武': 'W', '南': 'N', '西': 'X',
    '安': 'A', '重': 'C', '庆': 'Q', '苏': 'S', '宁': 'N', '无': 'W',
    '昆': 'K', '太': 'T', '张': 'Z', '江': 'J', '宜': 'Y', '溧': 'L',
    '坛': 'T', '启': 'Q', '如': 'R', '皋': 'G',
    '宝': 'B', '嘉': 'J', '闵': 'M', '长': 'C',
    '静': 'J', '黄': 'H', '杨': 'Y', '奉': 'F',
    '中': 'Z', '大': 'D', '小': 'X', '老': 'L',
    '红': 'H', '绿': 'L', '蓝': 'L', '紫': 'Z', '银': 'Y',
    '美': 'M', '丽': 'L', '华': 'H', '光': 'G', '明': 'M', '悦': 'Y',
    '雅': 'Y', '馨': 'X', '梦': 'M', '云': 'Y', '星': 'X', '月': 'Y',
    '阳': 'Y', '春': 'C', '夏': 'X', '秋': 'Q', '冬': 'D', '福': 'F',
    '喜': 'X', '乐': 'L', '富': 'F', '贵': 'G', '吉': 'J', '祥': 'X',
    '瑞': 'R', '盛': 'S', '昌': 'C', '隆': 'L', '达': 'D', '顺': 'S',
    '和': 'H', '平': 'P', '康': 'K', '泰': 'T', '兴': 'X', '旺': 'W',
    '源': 'Y', '来': 'L', '好': 'H', '佳': 'J', '优': 'Y', '尚': 'S',
    '品': 'P', '味': 'W', '园': 'Y', '庭': 'T', '轩': 'X', '阁': 'G',
    '府': 'F', '城': 'C', '庄': 'Z', '居': 'J', '坊': 'F', '舍': 'S',
    '屋': 'W', '楼': 'L', '宫': 'G', '殿': 'D', '堂': 'T',
    '厅': 'T', '室': 'S', '房': 'F', '间': 'J', '店': 'D', '铺': 'P',
    '馆': 'G', '所': 'S', '社': 'S', '区': 'Q', '县': 'X', '镇': 'Z',
    '乡': 'X', '村': 'C', '屯': 'T', '堡': 'B', '寨': 'Z', '岗': 'G',
    '岭': 'L', '坡': 'P', '沟': 'G', '河': 'H', '湖': 'H',
    '泉': 'Q', '洋': 'Y', '岛': 'D', '湾': 'W',
    '滩': 'T', '岸': 'A', '堤': 'D', '坝': 'B', '桥': 'Q', '路': 'L',
    '街': 'J', '道': 'D', '巷': 'X', '口': 'K', '门': 'M', '关': 'G',
  };
  
  const letters: string[] = [];
  for (const char of storeName) {
    if (letters.length >= 2) break;
    const letter = pinyinMap[char];
    if (letter) {
      letters.push(letter);
    }
  }
  
  if (letters.length >= 2) {
    return letters.slice(0, 2).join('');
  }
  
  // 兜底：取前2个大写字母
  return storeName.slice(0, 2).toUpperCase().padEnd(2, 'X');
}
