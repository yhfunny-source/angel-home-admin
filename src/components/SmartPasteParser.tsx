import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';

interface ParsedResult {
  customerName: string;
  phone: string;
  wechat: string;
  qq: string;
  address: string;
  roomNumber: string;
}

interface Props {
  onParse: (data: Partial<ParsedResult>) => void;
}

export default function SmartPasteParser({ onParse }: Props) {
  const [pasteText, setPasteText] = useState('');
  const [parsedPreview, setParsedPreview] = useState<Partial<ParsedResult> | null>(null);

  // 解析手机号（11位，1开头）
  const extractPhone = (text: string): string => {
    const match = text.match(/1[3-9]\d{9}/);
    return match ? match[0] : '';
  };

  // 解析地址（包含省市区的长文本，或门牌号模式）
  const extractAddress = (text: string): { address: string; roomNumber: string } => {
    // 匹配地址模式：省/市/区/路/号/弄/幢/单元/室等
    const addressPatterns = [
      // 完整地址：浙江省杭州市西湖区xx路xx号xx室
      /([\u4e00-\u9fa5]{2,10}省[\u4e00-\u9fa5]{2,10}市[\u4e00-\u9fa5]{2,10}(?:区|县)[\u4e00-\u9fa5\d\-]{3,50}?(?:号|弄|幢|栋|单元|室|层|楼|房))/,
      // 城市+区+路+号
      /([\u4e00-\u9fa5]{2,10}市[\u4e00-\u9fa5]{2,10}(?:区|县)[\u4e00-\u9fa5\d\-]{3,50}?(?:号|弄|幢|栋|单元|室|层|楼|房))/,
      // 区+路+号
      /([\u4e00-\u9fa5]{2,10}(?:区|县)[\u4e00-\u9fa5\d\-]{3,50}?(?:号|弄|幢|栋|单元|室|层|楼|房))/,
      // 路+号+小区+楼+单元+室
      /([\u4e00-\u9fa5\d\-]{2,20}(?:路|街|大道|巷|道|里|弄)[\u4e00-\u9fa5\d\-]{2,50}?(?:号|幢|栋|单元|室|层|楼|房))/,
      // 最宽松：包含常见地址关键词的长文本
      /([\u4e00-\u9fa5\d\-]{5,60}?(?:小区|花园|公寓|大厦|中心|广场|府|城|苑|庭|居|轩|阁|里|新村|家园|街区|街道)[\u4e00-\u9fa5\d\-]{0,30}?(?:号|幢|栋|单元|室|层|楼|房|\d{1,4}室|\d{1,4}号))/,
    ];

    for (const pattern of addressPatterns) {
      const match = text.match(pattern);
      if (match) {
        const fullAddress = match[0];
        // 提取房号（室/号/房结尾的）
        const roomMatch = fullAddress.match(/(\d{1,4}(?:室|号房|号房间|房))/);
        return {
          address: fullAddress,
          roomNumber: roomMatch ? roomMatch[1] : '',
        };
      }
    }

    // 兜底：找包含"路"、"号"、"小区"等关键词的片段
    const fallbackMatch = text.match(/([\u4e00-\u9fa5\d\-]{10,50}?(?:路|街|大道|巷|小区|花园|公寓|大厦|号))/);
    if (fallbackMatch) {
      const full = fallbackMatch[0];
      const roomMatch = text.match(/(\d{1,4}室)/);
      return {
        address: full,
        roomNumber: roomMatch ? roomMatch[1] : '',
      };
    }

    return { address: '', roomNumber: '' };
  };

  // 解析姓名
  const extractName = (text: string): string => {
    // 模式：姓名：xxx / 联系人：xxx / 客户：xxx / 名字：xxx
    const namePatterns = [
      /(?:姓名|联系人|客户|名字)[：:]\s*([\u4e00-\u9fa5]{2,4})/,
      /(?:姓名|联系人|客户|名字)\s+([\u4e00-\u9fa5]{2,4})/,
    ];
    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }

    // 如果文本开头是2-3个汉字，可能是姓名
    const startMatch = text.match(/^[\s\n]*([\u4e00-\u9fa5]{2,3})[，,\s]/);
    if (startMatch) return startMatch[1];

    return '';
  };

  // 解析微信
  const extractWechat = (text: string): string => {
    const patterns = [
      /(?:微信|wx|VX|vx|微信号|微)[：:]\s*([a-zA-Z0-9_\-]{3,20})/i,
      /(?:微信|wx|VX|vx|微信号|微)\s+([a-zA-Z0-9_\-]{3,20})/i,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }
    // 匹配 wx开头的字符串
    const wxMatch = text.match(/\b(wx[a-zA-Z0-9_]{3,15})\b/i);
    if (wxMatch) return wxMatch[1];
    return '';
  };

  // 解析QQ
  const extractQQ = (text: string): string => {
    const patterns = [
      /(?:QQ|qq|企鹅)[：:]\s*(\d{5,11})/,
      /(?:QQ|qq|企鹅)\s+(\d{5,11})/,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }
    return '';
  };

  const handleParse = useCallback(() => {
    if (!pasteText.trim()) return;

    const text = pasteText.trim();
    const phone = extractPhone(text);
    const { address, roomNumber } = extractAddress(text);
    const customerName = extractName(text);
    const wechat = extractWechat(text);
    const qq = extractQQ(text);

    const result: Partial<ParsedResult> = {};
    if (phone) result.phone = phone;
    if (address) result.address = address;
    if (roomNumber) result.roomNumber = roomNumber;
    if (customerName) result.customerName = customerName;
    if (wechat) result.wechat = wechat;
    if (qq) result.qq = qq;

    setParsedPreview(result);

    if (Object.keys(result).length > 0) {
      onParse(result);
    }
  }, [pasteText, onParse]);

  const hasPreview = parsedPreview && Object.keys(parsedPreview).length > 0;

  return (
    <div className="bg-[#FFF1E3] rounded-xl p-4 border border-[#F7EEDB]">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[#C89F7F] text-lg">📋</span>
        <span className="text-[#A87F5F] font-medium text-sm">智能粘贴识别</span>
      </div>
      <p className="text-xs text-[#B88F6F] mb-2">粘贴包含客户信息的文本，自动提取手机号、地址、姓名等</p>
      <textarea
        value={pasteText}
        onChange={e => setPasteText(e.target.value)}
        placeholder="例如：张三 13800138000 杭州市西湖区文三路123号黄龙国际中心E座502室 微信：wxzhangsan"
        className="w-full p-3 border border-[#E8DFD2] rounded-lg text-sm min-h-[60px] bg-white"
      />
      <div className="flex items-center justify-between mt-2">
        <Button
          size="sm"
          className="bg-[#C89F7F] hover:bg-[#A87F5F] text-white"
          onClick={handleParse}
          disabled={!pasteText.trim()}
        >
          🔍 智能识别
        </Button>
        {hasPreview && (
          <span className="text-xs text-[#5C7258]">
            ✅ 已提取 {Object.keys(parsedPreview!).length} 项
          </span>
        )}
      </div>
      {/* 预览提取结果 */}
      {hasPreview && (
        <div className="mt-3 bg-[#EEF1EB] rounded-lg p-3 border border-[#D8E0D2]">
          <p className="text-xs font-medium text-[#5C7258] mb-1">识别结果预览：</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {parsedPreview!.customerName && (
              <span className="px-2 py-0.5 rounded-full bg-[#D8E0D2] text-[#3D4F3A]">👤 {parsedPreview!.customerName}</span>
            )}
            {parsedPreview!.phone && (
              <span className="px-2 py-0.5 rounded-full bg-[#D8E0D2] text-[#3D4F3A]">📞 {parsedPreview!.phone}</span>
            )}
            {parsedPreview!.wechat && (
              <span className="px-2 py-0.5 rounded-full bg-[#D8E0D2] text-[#3D4F3A]">💬 {parsedPreview!.wechat}</span>
            )}
            {parsedPreview!.qq && (
              <span className="px-2 py-0.5 rounded-full bg-[#D8E0D2] text-[#3D4F3A]">QQ {parsedPreview!.qq}</span>
            )}
            {parsedPreview!.address && (
              <span className="px-2 py-0.5 rounded-full bg-[#D8E0D2] text-[#3D4F3A]">📍 {parsedPreview!.address}{parsedPreview!.roomNumber ? ` ${parsedPreview!.roomNumber}` : ''}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
