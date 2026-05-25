import { useState, useEffect } from 'react';
import { storage } from '@/lib/storage';
import type { Order } from '@/types';

interface RankingItem {
  csId: string;
  csName: string;
  total: number;
  pending: number;
  completed: number;
  inProgress: number;
}

interface DailyRankingProps {
  orders: Order[];
}

export default function DailyRanking({ orders }: DailyRankingProps) {
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [myStats, setMyStats] = useState<RankingItem | null>(null);

  const userStr = storage.get('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const myId = user?.id || '';

  useEffect(() => {
    if (!orders.length) {
      setRanking([]);
      return;
    }

    // ============ 北京时间周期计算 ============
    // 业务周期：每天中午12:00 ~ 次日中午12:00
    const now = new Date();
    // 当前 UTC 时间戳
    const utcMs = now.getTime();
    // 北京时间 = UTC + 8小时
    const beijingHour = (now.getUTCHours() + 8) % 24; // 0-23 北京时间小时
    // 正确获取北京日期：用本地时间格式化避免时区偏移
    const beijingNow = new Date(utcMs + 8 * 3600 * 1000);
    const year = beijingNow.getUTCFullYear();
    const month = String(beijingNow.getUTCMonth() + 1).padStart(2, '0');
    const day = String(beijingNow.getUTCDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    // 计算周期边界（UTC 时间戳）
    let cycleStartUtc: number; // 当天12:00或昨天12:00的UTC时间
    if (beijingHour >= 12) {
      // 北京时间 >= 12:00，周期从今天12:00开始
      // 今天12:00北京时间 = 今天4:00 UTC
      const todayNoonBeijing = new Date(`${todayStr}T12:00:00+08:00`);
      cycleStartUtc = todayNoonBeijing.getTime();
    } else {
      // 北京时间 < 12:00，周期从昨天12:00开始
      // 昨天12:00北京时间
      const yesterday = new Date(utcMs + 8 * 3600 * 1000 - 24 * 3600 * 1000);
      const yYear = yesterday.getUTCFullYear();
      const yMonth = String(yesterday.getUTCMonth() + 1).padStart(2, '0');
      const yDay = String(yesterday.getUTCDate()).padStart(2, '0');
      const yesterdayNoonBeijing = new Date(`${yYear}-${yMonth}-${yDay}T12:00:00+08:00`);
      cycleStartUtc = yesterdayNoonBeijing.getTime();
    }

    const todayOrders = orders.filter(o => {
      const dateField = (o as any).submittedAt || o.createdAt;
      if (!dateField) return false;
      const orderUtcMs = new Date(dateField).getTime();
      return orderUtcMs >= cycleStartUtc;
    });

    // 按客服分组统计
    const map = new Map<string, RankingItem>();
    todayOrders.forEach(o => {
      const csId = o.submitterId || 'unknown';
      const csName = o.submittedBy || '未知客服';
      const existing = map.get(csId);
      if (existing) {
        existing.total++;
        if (o.status === 'pending') existing.pending++;
        else if (o.status === 'completed' || o.status === 'rated') existing.completed++;
        else if (['assigned', 'arrived', 'serving'].includes(o.status)) existing.inProgress++;
      } else {
        map.set(csId, {
          csId,
          csName,
          total: 1,
          pending: o.status === 'pending' ? 1 : 0,
          completed: o.status === 'completed' || o.status === 'rated' ? 1 : 0,
          inProgress: ['assigned', 'arrived', 'serving'].includes(o.status) ? 1 : 0,
        });
      }
    });

    const list = Array.from(map.values()).sort((a, b) => b.total - a.total);
    setRanking(list);

    const mine = list.find(r => r.csId === myId);
    if (mine) setMyStats(mine);
  }, [orders, myId]);

  const todayTotal = ranking.reduce((sum, r) => sum + r.total, 0);

  if (!orders.length) return null;

  return (
    <div className="mb-4">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-base">🏆</span>
          <h3 className="font-bold text-[#4A3A2F] text-sm">今日榜单</h3>
          <span className="text-[10px] text-[#A08F80] bg-[#F0E8DF] px-1.5 py-0.5 rounded-full">
            12:00-次日12:00
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#726255]">
            共<span className="font-bold text-[#C89F7F]">{todayTotal}</span>单
          </span>
          {myStats && (
            <span className="text-[#726255] bg-[#FFF1E3] px-2 py-0.5 rounded-full">
              我<span className="font-bold text-[#C89F7F]">#{ranking.findIndex(r => r.csId === myId) + 1}</span>
            </span>
          )}
        </div>
      </div>

      {/* 排名卡片 - 横向滚动 */}
      <div className="overflow-x-auto pb-2 pt-2 scrollbar-hide" style={{ paddingTop: '8px' }}>
        {ranking.length === 0 ? (
          <div className="text-center py-3 text-xs text-[#A08F80] bg-[#FAF5F0] rounded-lg">
            本周期暂无订单
          </div>
        ) : (
        <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
          {ranking.map((item, index) => {
            const isMe = item.csId === myId;
            return (
              <div
                key={item.csId}
                className={`flex-shrink-0 rounded-xl border p-2.5 w-[115px] transition-all ${
                  isMe
                    ? 'border-[#C89F7F] bg-[#FFF1E3]'
                    : 'border-[#E8DFD2] bg-[#FFFFFF]'
                }`}
              >
                {/* 排名标识 - 内联在卡片内部，绝对不会再被截断 */}
                <div className="flex items-center gap-1.5 mb-1">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm ${
                    index === 0 ? 'bg-[#FFD700] text-[#8B6914]' :
                    index === 1 ? 'bg-[#C0C0C0] text-[#666]' :
                    index === 2 ? 'bg-[#CD7F32] text-white' :
                    'bg-[#E8DFD2] text-[#726255]'
                  }`}>
                    {index + 1}
                  </div>
                  <p className={`font-semibold text-sm truncate ${isMe ? 'text-[#C89F7F]' : 'text-[#4A3A2F]'}`}>
                    {item.csName}{isMe && <span className="text-[10px]">(我)</span>}
                  </p>
                </div>

                <div className="flex items-center gap-2 ml-0.5">
                  {/* 头像 */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                    isMe ? 'bg-[#C89F7F]' : 'bg-[#A08F80]'
                  }`}>
                    {item.csName?.[0] || '?'}
                  </div>
                  <p className="text-base font-bold text-[#4A3A2F] leading-tight">
                    {item.total}<span className="text-[10px] font-normal text-[#A08F80]">单</span>
                  </p>
                </div>

                {/* 细分统计 */}
                <div className="flex gap-1 mt-1.5 text-[10px]">
                  <span className="bg-[#E8DFD2] text-[#726255] px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    派{item.pending}
                  </span>
                  <span className="bg-[#DDE5D8] text-[#3D4F3A] px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    完{item.completed}
                  </span>
                  <span className="bg-[#FFF1E3] text-[#A87F5F] px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    进{item.inProgress}
                  </span>
                </div>
              </div>
            );
          })}

        </div>
        )}

        {/* 滚动圆点指示器 */}
        {ranking.length > 2 && (
          <div className="flex justify-center gap-1 mt-2">
            {ranking.map((item, index) => (
              <div
                key={item.csId}
                className={`w-1.5 h-1.5 rounded-full ${
                  index < 3 ? 'bg-[#C89F7F]' : 'bg-[#E8DFD2]'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
