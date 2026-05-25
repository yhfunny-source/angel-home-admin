import { formatDateTime } from '@/lib/api';
import type { Order } from '@/types';

interface OrderTimelineProps {
  order: Order;
}

// 计算两个时间的持续时间（分钟）
// 解析 YYYY-MM-DD HH:MM:SS 为本地时间戳（不做时区转换，数据库即北京时间）
function parseLocalTime(dt: string): number {
  const m = dt.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return new Date(dt).getTime();
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5])).getTime();
}

function durationMinutes(start: string, end: string): string {
  const s = parseLocalTime(start);
  const e = parseLocalTime(end);
  const mins = Math.round((e - s) / 60000);
  if (mins < 1) return '不到1分钟';
  if (mins < 60) return `${mins}分钟`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  if (remainMins === 0) return `${hours}小时`;
  return `${hours}小时${remainMins}分钟`;
}

interface TimelineItem {
  icon: string;
  label: string;
  time?: string;
  highlight?: boolean;
  duration?: string;
  durationLabel?: string;
}

export default function OrderTimeline({ order }: OrderTimelineProps) {
  const o = order as any;

  const items: TimelineItem[] = [
    {
      icon: '📝',
      label: '客服发出订单',
      time: o.submittedAt,
      highlight: true,
    },
  ];

  // 派单侠接单
  if (o.assignedAt) {
    items.push({
      icon: '📋',
      label: '派单侠接单',
      time: o.assignedAt,
      duration: o.submittedAt ? durationMinutes(o.submittedAt, o.assignedAt) : undefined,
      durationLabel: '接单响应',
    });
  }

  // 服务员出发
  if (o.departedAt) {
    items.push({
      icon: '🚗',
      label: '服务员出发',
      time: o.departedAt,
    });
  }

  // 服务员到达
  if (o.arrivedAt) {
    const hasDeparted = items.some(i => i.label === '服务员出发');
    items.push({
      icon: '📍',
      label: '服务员到达',
      time: o.arrivedAt,
      duration: hasDeparted && o.departedAt ? durationMinutes(o.departedAt, o.arrivedAt) : undefined,
      durationLabel: '路途耗时',
    });
  }

  // 开始服务
  if (o.servingAt) {
    items.push({
      icon: '💆',
      label: '开始服务',
      time: o.servingAt,
    });
  }

  // 服务完成
  if (o.completedAt) {
    items.push({
      icon: '✅',
      label: '服务完成',
      time: o.completedAt,
      highlight: true,
      duration: o.servingAt ? durationMinutes(o.servingAt, o.completedAt) : undefined,
      durationLabel: '服务时长',
    });
  }

  // 被退单
  if (o.rejectedAt) {
    items.push({
      icon: '❌',
      label: '订单被退',
      time: o.rejectedAt,
    });
  }

  if (items.length <= 1) {
    return (
      <div className="text-xs text-[#A08F80] py-2">
        ⏳ 暂无时间记录（订单发出后各节点时间会在此显示）
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div key={index} className="flex gap-2">
            {/* 时间线竖线 */}
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm ${
                item.highlight ? 'bg-[#C89F7F] text-white' : 'bg-[#E8DFD2] text-[#726255]'
              }`}>
                {item.icon}
              </div>
              {!isLast && <div className="w-0.5 flex-1 bg-[#E8DFD2] my-0.5" />}
            </div>
            {/* 内容 */}
            <div className="flex-1 pb-3">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${item.highlight ? 'text-[#C89F7F]' : 'text-[#4A3A2F]'}`}>
                  {item.label}
                </span>
                {item.duration && (
                  <span className="text-xs bg-[#FFF1E3] text-[#A87F5F] px-1.5 py-0.5 rounded-full">
                    ⏱️ {item.durationLabel}: {item.duration}
                  </span>
                )}
              </div>
              {item.time && (
                <p className="text-xs text-[#A08F80]">{formatDateTime(item.time)}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
