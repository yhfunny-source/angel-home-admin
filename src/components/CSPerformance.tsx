import { useState, useEffect } from 'react';
import { getCSPerformance, formatMoney } from '@/lib/api';
import type { CSPerformance as CSPerfType } from '@/lib/api';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  csId?: string;
}

export default function CSPerformance({ open, onClose, csId }: Props) {
  const [data, setData] = useState<CSPerfType | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getCSPerformance(csId)
      .then(setData)
      .catch((e: any) => toast.error('加载业绩失败: ' + (e.message || '未知错误')))
      .finally(() => setLoading(false));
  }, [open, csId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-[#4A3A2F]/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#FFFFFF] rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div className="sticky top-0 bg-gradient-to-r from-[#C89F7F] to-[#B88F6F] p-5 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">我的贡献</h2>
              <p className="text-xs text-white/80 mt-0.5">
                {data?.csName || ''} · {data?.year || ''}年{data?.month || ''}月
              </p>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white text-xl leading-none">✕</button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-[#C89F7F] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : data ? (
            <>
              {/* KPI 卡片 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#FFF1E3] rounded-xl p-4 text-center border border-[#F7EEDB]">
                  <p className="text-2xl font-bold text-[#A87F5F]">{data.totalDispatch}</p>
                  <p className="text-xs text-[#94724A] mt-1">当月总派单</p>
                </div>
                <div className="bg-[#EEF1EB] rounded-xl p-4 text-center border border-[#D8E0D2]">
                  <p className="text-2xl font-bold text-[#4A5E48]">{data.completed}</p>
                  <p className="text-xs text-[#5C7258] mt-1">成单数量</p>
                </div>
                <div className="bg-[#F0E8DF] rounded-xl p-4 text-center border border-[#E8DFD2]">
                  <p className="text-2xl font-bold text-[#C89F7F]">{formatMoney(data.totalInfoFee)}</p>
                  <p className="text-xs text-[#94724A] mt-1">总信息费</p>
                </div>
                <div className="bg-[#F5DCD6]/30 rounded-xl p-4 text-center border border-[#F5DCD6]">
                  <p className="text-2xl font-bold text-[#8C3F30]">{data.rejected}</p>
                  <p className="text-xs text-[#B85C4A] mt-1">被退/失败</p>
                </div>
              </div>

              {/* 成单率 */}
              {data.totalDispatch > 0 && (
                <div className="bg-[#FAF5F0] rounded-xl p-3 border border-[#E8DFD2]">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#4A3A2F]">成单率</span>
                    <span className="text-lg font-bold text-[#4A5E48]">
                      {((data.completed / data.totalDispatch) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 bg-[#E8DFD2] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#C89F7F] to-[#4A5E48] rounded-full transition-all"
                      style={{ width: `${Math.min((data.completed / data.totalDispatch) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* 每日明细 */}
              {data.dailyStats.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-[#4A3A2F] mb-2">📅 每日明细</h3>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {data.dailyStats.map(d => (
                      <div key={d.date} className="flex items-center gap-2 text-sm p-2 bg-[#FAF5F0] rounded-lg">
                        <span className="text-[#A08F80] w-16 shrink-0">{d.date.slice(5)}</span>
                        <span className="text-[#4A3A2F]">派{d.dispatchCount}</span>
                        <span className="text-[#4A5E48]">成{d.dealCount}</span>
                        <span className="text-[#C89F7F] font-medium ml-auto">{formatMoney(d.infoFee)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-10 text-[#A08F80]">暂无数据</div>
          )}
        </div>
      </div>
    </div>
  );
}
