import { storage } from './storage';

/**
 * 生成自定义订单号
 * 格式: YYMMDD + 店铺名前2字母拼音 + 随机2位 + 当天序列号2位
 * 示例: 260522SH0315 (上海店)
 */
export async function generateOrderNo(storeName: string): Promise<string> {
  const now = new Date();

  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const timeCode = `${yy}${mm}${dd}`;

  const storeLetters = getStoreLetters(storeName);
  const randomNum = String(Math.floor(Math.random() * 100)).padStart(2, '0');

  const key = `order_seq_${timeCode}_${storeLetters}`;
  let seq = parseInt(storage.get(key) || '0', 10);
  seq += 1;
  storage.set(key, String(seq));
  const seqStr = String(seq).padStart(2, '0');

  return `${timeCode}${storeLetters}${randomNum}${seqStr}`;
}

function getStoreLetters(storeName: string): string {
  if (!storeName) return 'XX';

  const pinyinMap: Record<string, string> = {
    '安': 'A',     '爱': 'A',     '伴': 'B',     '八': 'B',     '北': 'B',     '宝': 'B',     '帮': 'B',     '白': 'B',
    '百': 'B',     '碧': 'B',     '城': 'C',     '川': 'C',     '常': 'C',     '彩': 'C',     '成': 'C',     '昌': 'C',
    '春': 'C',     '橙': 'C',     '潮': 'C',     '翠': 'C',     '茶': 'C',     '诚': 'C',     '重': 'C',     '长': 'C',
    '东': 'D',     '低': 'D',     '冬': 'D',     '大': 'D',     '店': 'D',     '德': 'D',     '殿': 'D',     '短': 'D',
    '达': 'D',     '道': 'D',     '都': 'D',     '队': 'D',     '二': 'E',     '佛': 'F',     '凤': 'F',     '坊': 'F',
    '府': 'F',     '废': 'F',     '房': 'F',     '法': 'F',     '福': 'F',     '粉': 'F',     '风': 'F',     '飞': 'F',
    '光': 'G',     '古': 'G',     '宫': 'G',     '广': 'G',     '歌': 'G',     '港': 'G',     '莞': 'G',     '贵': 'G',
    '阁': 'G',     '馆': 'G',     '高': 'G',     '会': 'H',     '划': 'H',     '华': 'H',     '合': 'H',     '和': 'H',
    '哈': 'H',     '好': 'H',     '惠': 'H',     '杭': 'H',     '海': 'H',     '湖': 'H',     '画': 'H',     '红': 'H',
    '花': 'H',     '虹': 'H',     '魂': 'H',     '黑': 'H',     '九': 'J',     '井': 'J',     '京': 'J',     '今': 'J',
    '佳': 'J',     '嘉': 'J',     '家': 'J',     '居': 'J',     '揭': 'J',     '江': 'J',     '济': 'J',     '精': 'J',
    '节': 'J',     '荆': 'J',     '计': 'J',     '近': 'J',     '酒': 'J',     '金': 'J',     '间': 'J',     '咖': 'K',
    '客': 'K',     '康': 'K',     '快': 'K',     '昆': 'K',     '丽': 'L',     '乐': 'L',     '侣': 'L',     '六': 'L',
    '兰': 'L',     '律': 'L',     '恋': 'L',     '拉': 'L',     '来': 'L',     '楼': 'L',     '洛': 'L',     '灵': 'L',
    '理': 'L',     '礼': 'L',     '绿': 'L',     '老': 'L',     '蓝': 'L',     '隆': 'L',     '露': 'L',     '龙': 'L',
    '墨': 'M',     '慢': 'M',     '明': 'M',     '梅': 'M',     '梦': 'M',     '盟': 'M',     '美': 'M',     '茂': 'M',
    '门': 'M',     '鸣': 'M',     '南': 'N',     '宁': 'N',     '念': 'N',     '品': 'P',     '平': 'P',     '朋': 'P',
    '派': 'P',     '铺': 'P',     '魄': 'P',     '七': 'Q',     '千': 'Q',     '庆': 'Q',     '情': 'Q',     '棋': 'Q',
    '气': 'Q',     '清': 'Q',     '琴': 'Q',     '秋': 'Q',     '趣': 'Q',     '青': 'Q',     '仁': 'R',     '柔': 'R',
    '瑞': 'R',     '三': 'S',     '上': 'S',     '书': 'S',     '使': 'S',     '十': 'S',     '四': 'S',     '声': 'S',
    '室': 'S',     '尚': 'S',     '山': 'S',     '思': 'S',     '所': 'S',     '汕': 'S',     '沈': 'S',     '涩': 'S',
    '深': 'S',     '盛': 'S',     '石': 'S',     '社': 'S',     '神': 'S',     '绍': 'S',     '舍': 'S',     '色': 'S',
    '苏': 'S',     '诗': 'S',     '霜': 'S',     '韶': 'S',     '顺': 'S',     '厅': 'T',     '台': 'T',     '团': 'T',
    '堂': 'T',     '天': 'T',     '太': 'T',     '头': 'T',     '庭': 'T',     '泰': 'T',     '万': 'W',     '乌': 'W',
    '五': 'W',     '味': 'W',     '屋': 'W',     '文': 'W',     '无': 'W',     '旺': 'W',     '晚': 'W',     '武': 'W',
    '温': 'W',     '舞': 'W',     '仙': 'X',     '侠': 'X',     '信': 'X',     '兴': 'X',     '厦': 'X',     '墟': 'X',
    '夏': 'X',     '小': 'X',     '徐': 'X',     '心': 'X',     '新': 'X',     '星': 'X',     '曦': 'X',     '羞': 'X',
    '翔': 'X',     '襄': 'X',     '西': 'X',     '轩': 'X',     '雪': 'X',     '霞': 'X',     '香': 'X',     '馨': 'X',
    '一': 'Y',     '义': 'Y',     '云': 'Y',     '优': 'Y',     '勇': 'Y',     '友': 'Y',     '园': 'Y',     '宜': 'Y',
    '影': 'Y',     '悦': 'Y',     '意': 'Y',     '扬': 'Y',     '月': 'Y',     '源': 'Y',     '玉': 'Y',     '艺': 'Y',
    '远': 'Y',     '逸': 'Y',     '银': 'Y',     '阳': 'Y',     '雅': 'Y',     '雨': 'Y',     '音': 'Y',     '韵': 'Y',
    '中': 'Z',     '之': 'Z',     '庄': 'Z',     '族': 'Z',     '早': 'Z',     '智': 'Z',     '湛': 'Z',     '珍': 'Z',
    '珠': 'Z',     '真': 'Z',     '紫': 'Z',     '组': 'Z',     '织': 'Z',     '肇': 'Z',     '郑': 'Z'
  };

  const letters: string[] = [];
  for (const char of storeName) {
    if (letters.length >= 2) break;
    const mapped = pinyinMap[char];
    if (mapped) {
      letters.push(mapped);
    } else if (/[a-zA-Z]/.test(char)) {
      letters.push(char.toUpperCase());
    } else if (/[\u4e00-\u9fff]/.test(char)) {
      letters.push(String.fromCharCode(65 + (char.charCodeAt(0) % 26)));
    }
  }

  if (letters.length >= 2) return letters.slice(0, 2).join('');
  if (letters.length === 1) return letters[0] + 'X';
  return 'XX';
}
