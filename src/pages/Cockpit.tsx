import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import PasswordChangeDialog from '@/components/PasswordChangeDialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getCockpit, formatMoney, formatDateTime } from '@/lib/api';
import { storage } from '@/lib/storage';
import type { CockpitData, Order } from '@/types';

export default function Cockpit() {
  const navigate = useNavigate();
  const [data, setData] = useState<CockpitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getCockpit();
      setData(res);
    } catch (e: any) {
      toast.error('数据加载失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);

  const user = storage.get('user') ? JSON.parse(storage.get('user')!) : null;

  const handleLogout = () => {
    storage.remove('token');
    storage.remove('user');
    navigate('/login');
  };

  const openOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetail(true);
  };

  // 解析偏好
  const parsePrefs = (prefs: any) => {
    if (!prefs) return null;
    try {
      return typeof prefs === 'string' ? JSON.parse(prefs) : prefs;
    } catch { return null; }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF5F0' }}>
      {/* Header */}
      <header className="border-b" style={{ backgroundColor: '#FFFFFF', borderColor: '#E8DFD2' }}>
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #C89F7F, #B88F6F)' }}>
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-semibold" style={{ color: '#4A3A2F' }}>BOSS驾驶舱</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setShowPasswordDialog(true)} style={{ color: '#726255', borderColor: '#E8DFD2' }}>
              修改密码
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/portal')} style={{ color: '#726255', borderColor: '#E8DFD2' }}>
              返回工作台
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} style={{ color: '#726255', borderColor: '#E8DFD2' }}>
              退出
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {loading && !data ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-[#C89F7F] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* KPI */}
            <div className="grid grid-cols-6 gap-4">
              {[
                { label: '总订单', value: data.kpi.totalOrders, icon: '📋', color: 'from-[#C89F7F] to-[#B88F6F]' },
                { label: '已完成', value: data.kpi.completedOrders, icon: '✅', color: 'from-[#5C7258] to-[#4A5E48]' },
                { label: '总收入', value: formatMoney(data.kpi.totalRevenue), icon: '💰', color: 'from-[#C89F7F] to-[#B88F6F]' },
                { label: '信息费', value: formatMoney(data.kpi.totalInfoFee), icon: '💎', color: 'from-[#8C6A53] to-[#7A5C48]' },
                { label: '营业门店', value: data.kpi.activeStores, icon: '🏪', color: 'from-[#B88F6F] to-[#A87F5F]' },
                { label: '在岗服务员', value: data.kpi.activeWaiters, icon: '👔', color: 'from-[#14B8A6] to-[#0D9488]' },
              ].map(card => (
                <div key={card.label} className="rounded-xl p-5 border border-[#E8DFD2] shadow-sm">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center mb-3 shadow-md`}>
                    <span className="text-lg">{card.icon}</span>
                  </div>
                  <p className="text-xs text-[#A08F80] mb-1">{card.label}</p>
                  <p className="text-xl font-bold text-[#4A3A2F]">{card.value}</p>
                </div>
              ))}
            </div>

            {/* 快捷入口 */}
            <div className="grid grid-cols-3 gap-4">
              <button onClick={() => navigate('/admin?tab=stores')} className="rounded-xl p-5 border border-[#E8DFD2] shadow-sm hover:shadow-md transition-all text-left">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C89F7F] to-[#B88F6F] flex items-center justify-center text-xl shadow-md">🏪</div>
                  <div>
                    <h3 className="font-semibold text-[#4A3A2F]">店铺业绩</h3>
                    <p className="text-sm text-[#A08F80]">{data.storeStats?.length || 0} 家门店</p>
                  </div>
                </div>
              </button>
              <button onClick={() => navigate('/admin?tab=waiters')} className="rounded-xl p-5 border border-[#E8DFD2] shadow-sm hover:shadow-md transition-all text-left">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#B88F6F] to-[#A87F5F] flex items-center justify-center text-xl shadow-md">👔</div>
                  <div>
                    <h3 className="font-semibold text-[#4A3A2F]">服务员业绩</h3>
                    <p className="text-sm text-[#A08F80]">{data.waiterStats?.length || 0} 位服务员</p>
                  </div>
                </div>
              </button>
              <button onClick={() => navigate('/admin?tab=staff')} className="rounded-xl p-5 border border-[#E8DFD2] shadow-sm hover:shadow-md transition-all text-left">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#5C7258] to-[#4A5E48] flex items-center justify-center text-xl shadow-md">💬</div>
                  <div>
                    <h3 className="font-semibold text-[#4A3A2F]">客服业绩</h3>
                    <p className="text-sm text-[#A08F80]">{data.staffStats?.length || 0} 位客服</p>
                  </div>
                </div>
              </button>
            </div>

            {/* 动态标签 */}
            {data.dynamicTags && data.dynamicTags.length > 0 && (
              <div className="rounded-xl border border-[#E8DFD2] shadow-sm p-5">
                <h3 className="text-sm font-semibold text-[#4A3A2F] mb-3">服务员动态标签</h3>
                <div className="flex flex-wrap gap-2">
                  {data.dynamicTags.map(t => (
                    <Badge key={t.name} variant="outline" className="px-3 py-1 bg-amber-50 text-[#A87F5F] border-amber-200">
                      {t.name} <span className="ml-1 text-xs">x{t.count}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* 最近订单 */}
            <div className="rounded-xl border border-[#E8DFD2] shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E8DFD2] flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#4A3A2F]">最近订单</h3>
                <span className="text-xs text-[#A08F80]">最近10笔</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#FAF5F0] text-[#726255]">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">时间</th>
                      <th className="px-4 py-3 text-left font-medium">客户</th>
                      <th className="px-4 py-3 text-left font-medium">状态</th>
                      <th className="px-4 py-3 text-left font-medium">客服</th>
                      <th className="px-4 py-3 text-left font-medium">服务员</th>
                      <th className="px-4 py-3 text-left font-medium">门店</th>
                      <th className="px-4 py-3 text-right font-medium">金额</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.recentOrders?.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-[#A08F80]">暂无订单</td></tr>
                    ) : data.recentOrders?.map(order => (
                      <tr key={order.id} className="hover:bg-[#FAF5F0] cursor-pointer" onClick={() => openOrder(order)}>
                        <td className="px-4 py-3 text-[#726255]">{formatDateTime(order.createdAt)}</td>
                        <td className="px-4 py-3 font-medium text-[#4A3A2F]">{order.customerName || '匿名'}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-4 py-3">{order.staffName || '-'}</td>
                        <td className="px-4 py-3">{order.waiterName || '-'}</td>
                        <td className="px-4 py-3">{order.storeName || '-'}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatMoney(order.infoFee)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* 订单详情弹窗 */}
      {showOrderDetail && selectedOrder && (
        <div className="fixed inset-0 bg-[#4A3A2F]/40 flex items-center justify-center z-50" onClick={() => setShowOrderDetail(false)}>
          <div className="rounded-2xl shadow-2xl bg-[#FFFFFF] max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#4A3A2F]">订单详情</h3>
                <button onClick={() => setShowOrderDetail(false)} className="text-[#A08F80] hover:text-[#726255]">✕</button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="bg-[#FAF5F0] p-3 rounded-lg">
                  <p className="text-xs text-[#A08F80]">客户信息</p>
                  <p className="font-medium">{selectedOrder.customerName || '匿名'} {selectedOrder.phone || ''}</p>
                  <p className="text-[#726255]">{selectedOrder.address}</p>
                </div>
                <div className="bg-[#FAF5F0] p-3 rounded-lg">
                  <p className="text-xs text-[#A08F80]">服务链</p>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <p><span className="text-[#A08F80]">客服:</span> {selectedOrder.staffName || '-'}</p>
                    <p><span className="text-[#A08F80]">派单侠:</span> {selectedOrder.dispatcherName || '-'}</p>
                    <p><span className="text-[#A08F80]">服务员:</span> {selectedOrder.waiterName || '-'}</p>
                    <p><span className="text-[#A08F80]">门店:</span> {selectedOrder.storeName || '-'}</p>
                  </div>
                </div>
                <div className="bg-[#FAF5F0] p-3 rounded-lg">
                  <p className="text-xs text-[#A08F80]">财务</p>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <p><span className="text-[#A08F80]">订单金额:</span> {formatMoney(selectedOrder.infoFee)}</p>
                    <p><span className="text-[#A08F80]">预付金:</span> {formatMoney(selectedOrder.prepayAmount)}</p>
                  </div>
                </div>
                {/* 偏好 */}
                {(() => {
                  const prefs = parsePrefs(selectedOrder.preferences);
                  return prefs ? (
                    <div className="bg-[#FAF5F0] p-3 rounded-lg">
                      <p className="text-xs text-[#A08F80] mb-2">客户偏好</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(prefs).flatMap(([k, v]) => {
                          const labels: Record<string, string> = { height: '身高', body: '身型', cup: '罩杯', personality: '性格', service: '服务', age: '年龄', taboo: '禁忌' };
                          return (Array.isArray(v) ? v : []).map((val: string) => (
                            <Badge key={`${k}-${val}`} variant="outline" className="bg-[#F0E8DF] text-[#BE185D] border-[#FBCFE8] text-xs">
                              {labels[k] || k}: {val}
                            </Badge>
                          ));
                        })}
                      </div>
                    </div>
                  ) : null;
                })()}
                {/* 补充内容 */}
                {(() => {
                  const supps = selectedOrder.supplements;
                  if (!supps) return null;
                  const list = typeof supps === 'string' ? JSON.parse(supps) : supps;
                  if (!Array.isArray(list) || list.length === 0) return null;
                  return (
                    <div className="bg-[#FFF1E3] p-3 rounded-lg border border-[#F7EEDB]">
                      <p className="text-xs text-[#B88F6F] mb-2">📌 客服补充 ({list.length}条)</p>
                      {list.map((s: any) => (
                        <div key={s.id} className="flex justify-between text-xs mb-1">
                          <span className="text-[#94724A]">{s.content}</span>
                          <span className="text-[#FB923C]">{formatDateTime(s.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                {selectedOrder.notes && (
                  <div className="bg-[#FAF5F0] p-3 rounded-lg">
                    <p className="text-xs text-[#A08F80]">客服备注</p>
                    <p className="text-[#4A3A2F] mt-1">{selectedOrder.notes}</p>
                  </div>
                )}
                {selectedOrder.completionNote && (
                  <div className="bg-[#EEF1EB] p-3 rounded-lg">
                    <p className="text-xs text-[#4A5E48]">服务完成备注</p>
                    <p className="text-[#2F3F2C] mt-1">{selectedOrder.completionNote}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {showPasswordDialog ? <PasswordChangeDialog userId={user?.id || ''} onClose={() => setShowPasswordDialog(false)} /> : null}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-[#E8DFD2] text-[#726255]',
    assigned: 'bg-[#E5DCD0] text-[#A87F5F]',
    arrived: 'bg-[#E5DCD0] text-[#6B4A38]',
    serving: 'bg-[#F7EEDB] text-[#A87F5F]',
    completed: 'bg-[#DDE5D8] text-[#3D4F3A]',
    rated: 'bg-[#FFF1E3] text-[#A87F5F]',
    cancelled: 'bg-[#F5DCD6] text-[#8C3F30]',
  };
  const labels: Record<string, string> = {
    pending: '待派单', assigned: '已派单', arrived: '已到店',
    serving: '服务中', completed: '已完成', rated: '已评价', cancelled: '已取消',
  };
  return <Badge variant="outline" className={`${map[status] || ''}`}>{labels[status] || status}</Badge>;
}