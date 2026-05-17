import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { storage } from '@/lib/storage';
import {
  getOrders, getWaiters,
  updateOrder, createReview, getReviews,
  formatDateTime, generateId,
} from '@/lib/api';
import type { Order, Waiter, OrderStatus } from '@/types';
import PasswordChangeDialog from '@/components/PasswordChangeDialog';

const statusLabels: Record<OrderStatus, string> = {
  pending: '待派单', assigned: '已派单', arrived: '已到店',
  serving: '服务中', completed: '已完成', rated: '已评价', cancelled: '已取消',
};

const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-[#E8DFD2] text-[#726255]',
  assigned: 'bg-[#E5DCD0] text-[#A87F5F]',
  arrived: 'bg-[#E5DCD0] text-[#6B4A38]',
  serving: 'bg-[#F7EEDB] text-[#A87F5F]',
  completed: 'bg-[#DDE5D8] text-[#3D4F3A]',
  rated: 'bg-[#FFF1E3] text-[#A87F5F]',
  cancelled: 'bg-[#F5DCD6] text-[#8C3F30]',
};

export default function Dispatcher() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'completed'>('pending');
  const [showDetail, setShowDetail] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [assignWaiterId, setAssignWaiterId] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTags, setReviewTags] = useState<string[]>([]);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewedOrders, setReviewedOrders] = useState<Set<string>>(new Set());
  const [completionNote, setCompletionNote] = useState('');
  const [showComplete, setShowComplete] = useState(false);

  const userStr = storage.get('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const prevOrdersRef = useRef<Order[]>([]);

  const loadData = async () => {
    try {
      const [o, w] = await Promise.all([
        getOrders().catch(() => []),
        getWaiters().catch(() => []),
      ]);

      // 检测新订单通知
      const prev = prevOrdersRef.current;
      if (prev.length > 0) {
        const newOrders = o.filter((order: Order) => !prev.find(p => p.id === order.id));
        newOrders.forEach((order: Order) => {
          toast.info(`📋 新订单 - ${order.customerName || '匿名'} · ${order.address?.substring(0, 20)}...`, { duration: 5000 });
        });

        // 检测补充内容
        o.forEach((order: Order) => {
          const prevOrder = prev.find(p => p.id === order.id);
          if (prevOrder) {
            const prevSupps = typeof prevOrder.supplements === 'string'
              ? JSON.parse(prevOrder.supplements || '[]')
              : (prevOrder.supplements || []);
            const currSupps = typeof order.supplements === 'string'
              ? JSON.parse(order.supplements || '[]')
              : (order.supplements || []);
            if (currSupps.length > prevSupps.length) {
              const newSupp = currSupps[currSupps.length - 1];
              toast.info(`📌 客服补充 - ${order.customerName || '客人'}: ${newSupp.content}`, { duration: 5000 });
            }
          }
        });
      }
      prevOrdersRef.current = o;

      setOrders(o);
      setWaiters(w);

      // 加载已评价
      const reviews = await getReviews({ reviewerRole: '派单侠' }).catch(() => []);
      setReviewedOrders(new Set(reviews.map(r => r.orderId)));
    } catch (e) {
      console.error('加载失败:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 10000);
    return () => clearInterval(timer);
  }, []);

  // 过滤
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const activeOrders = orders.filter(o => ['assigned', 'arrived', 'serving'].includes(o.status));
  const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'rated');

  const filteredOrders = activeTab === 'pending' ? pendingOrders : activeTab === 'active' ? activeOrders : completedOrders;

  const openDetail = (order: Order) => {
    setSelectedOrder(order);
    setShowDetail(true);
  };

  const openAssign = (order: Order) => {
    setSelectedOrder(order);
    setAssignWaiterId('');
    setShowAssign(true);
  };

  const handleAssign = async () => {
    if (!selectedOrder || !assignWaiterId) return;
    try {
      const waiter = waiters.find(w => w.id === assignWaiterId);
      await updateOrder(selectedOrder.id, {
        status: 'assigned',
        waiterId: assignWaiterId,
        waiterName: waiter?.name,
        dispatcherId: user?.id,
        dispatcherName: user?.name || user?.username,
      });
      toast.success('派单成功');
      setShowAssign(false);
      loadData();
    } catch (e: any) {
      toast.error(e.message || '派单失败');
    }
  };

  const handleStatusUpdate = async (orderId: string, status: OrderStatus) => {
    try {
      if (status === 'serving') {
        await updateOrder(orderId, { status });
        toast.success('状态更新为服务中');
      } else if (status === 'completed') {
        setSelectedOrder(orders.find(o => o.id === orderId) || null);
        setCompletionNote('');
        setShowComplete(true);
        return;
      }
      loadData();
    } catch (e: any) {
      toast.error(e.message || '更新失败');
    }
  };

  const handleComplete = async () => {
    if (!selectedOrder) return;
    try {
      await updateOrder(selectedOrder.id, {
        status: 'completed',
        completionNote: completionNote || undefined,
      });
      toast.success('订单完成');
      setShowComplete(false);
      loadData();
    } catch (e: any) {
      toast.error(e.message || '操作失败');
    }
  };

  const openReview = (order: Order) => {
    if (reviewedOrders.has(order.id)) {
      toast.info('该订单您已评价过');
      return;
    }
    setSelectedOrder(order);
    setReviewRating(5);
    setReviewTags([]);
    setReviewComment('');
    setShowReview(true);
  };

  const handleReview = async () => {
    if (!selectedOrder?.waiterId) return;
    try {
      await createReview({
        id: generateId(),
        orderId: selectedOrder.id,
        waiterId: selectedOrder.waiterId,
        reviewerId: user?.id,
        reviewerRole: '派单侠',
        rating: reviewRating,
        tags: reviewTags,
        comment: reviewComment,
      });
      toast.success('评价提交成功');
      setShowReview(false);
      setReviewedOrders(prev => new Set(prev).add(selectedOrder.id));
      loadData();
    } catch (e: any) {
      toast.error(e.message || '评价失败');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('已复制');
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      toast.success('已复制');
    }
  };

  const parsePrefs = (prefs: any) => {
    if (!prefs) return null;
    try { return typeof prefs === 'string' ? JSON.parse(prefs) : prefs; }
    catch { return null; }
  };

  const prefLabels: Record<string, string> = {
    height: '身高', body: '身型', cup: '罩杯', personality: '性格',
    service: '服务', age: '年龄', taboo: '禁忌',
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF5F0' }}>
      {/* Header */}
      <header className="border-b border-[#E8DFD2]">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-semibold text-[#4A3A2F]">派单后台</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#A08F80]">{user?.name || user?.username}</span>
            <Button variant="outline" size="sm" onClick={() => setShowPasswordDialog(true)} className="text-[#726255]">修改密码</Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/portal')} className="text-[#726255]">返回</Button>
            <Button variant="outline" size="sm" onClick={() => { localStorage.clear(); navigate('/login'); }} className="text-[#726255]">退出</Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Tab */}
        <div className="flex items-center gap-2 mb-6">
          {[
            { key: 'pending' as const, label: '待派单', count: pendingOrders.length },
            { key: 'active' as const, label: '进行中', count: activeOrders.length },
            { key: 'completed' as const, label: '已完成', count: completedOrders.length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-[#5C7258] text-white'
                  : 'bg-white text-[#726255] hover:bg-[#E8DFD2] border border-[#E8DFD2]'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${activeTab === tab.key ? 'bg-white text-[#4A5E48]' : 'bg-[#FBEAE6]0 text-white'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 订单列表 */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-[#5C7258] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-[#A08F80]  rounded-xl border border-[#E8DFD2]">
            暂无{activeTab === 'pending' ? '待派单' : activeTab === 'active' ? '进行中' : '已完成'}的订单
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map(order => (
              <div key={order.id} className="rounded-xl border border-[#E8DFD2] shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant="outline" className={statusColors[order.status]}>
                        {statusLabels[order.status]}
                      </Badge>
                      <span className="text-xs text-[#A08F80]">{formatDateTime(order.createdAt)}</span>
                      {order.storeName && (
                        <Badge variant="outline" className="text-xs bg-[#F0E8DF] text-[#6B4A38] border-[#D8CBC0]">{order.storeName}</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-[#A08F80]">客户:</span>
                        <span className="ml-1 font-medium">{order.customerName || '匿名'}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-[#A08F80]">手机:</span>
                        <span className="ml-1">{order.phone || '-'}</span>
                        {order.phone && (
                          <button onClick={() => copyToClipboard(order.phone!)} className="ml-1 text-[#C89F7F] hover:text-[#A87F5F] text-xs">📋</button>
                        )}
                      </div>
                      <div>
                        <span className="text-[#A08F80]">信息费:</span>
                        <span className="ml-1 font-medium">¥{order.infoFee}</span>
                      </div>
                    </div>
                    <div className="mt-1 text-sm flex items-center">
                      <span className="text-[#A08F80]">地址:</span>
                      <span className="ml-1 text-[#726255]">{order.address}</span>
                      <button onClick={() => copyToClipboard(order.address)} className="ml-1 text-[#C89F7F] hover:text-[#A87F5F] text-xs">📋</button>
                    </div>
                    {order.waiterName && (
                      <div className="mt-1 text-sm">
                        <span className="text-[#A08F80]">服务员:</span>
                        <span className="ml-1">{order.waiterName}</span>
                      </div>
                    )}
                    {/* 偏好 */}
                    {(() => {
                      const prefs = parsePrefs(order.preferences);
                      return prefs ? (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Object.entries(prefs).flatMap(([k, v]) => {
                            const arr = Array.isArray(v) ? v : [];
                            return arr.map((val: string) => (
                              <Badge key={`${k}-${val}`} variant="outline" className="text-xs bg-[#F0E8DF] text-[#BE185D] border-[#FBCFE8]">
                                {prefLabels[k] || k}: {val}
                              </Badge>
                            ));
                          })}
                        </div>
                      ) : null;
                    })()}
                    {/* 补充内容 */}
                    {(() => {
                      const supps = order.supplements;
                      if (!supps) return null;
                      try {
                        const list = typeof supps === 'string' ? JSON.parse(supps) : supps;
                        if (!Array.isArray(list) || list.length === 0) return null;
                        return (
                          <div className="mt-2 bg-[#FFF1E3] rounded-lg p-2 border border-[#F7EEDB] animate-pulse">
                            <p className="text-xs text-[#B88F6F] mb-1">📌 客服新补充 ({list.length}条)</p>
                            {list.slice(-2).map((s: any) => (
                              <div key={s.id} className="flex justify-between text-xs">
                                <span className="text-[#94724A] font-medium">{s.content}</span>
                                <span className="text-[#FB923C]">{formatDateTime(s.createdAt)}</span>
                              </div>
                            ))}
                          </div>
                        );
                      } catch { return null; }
                    })()}
                    {order.notes && (
                      <div className="mt-1 text-sm text-[#A08F80] bg-[#FAF5F0] p-2 rounded">
                        <span className="text-[#A08F80]">备注:</span> {order.notes}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 ml-4 min-w-[72px]">
                    <button onClick={() => openDetail(order)} className="text-xs text-[#B88F6F] hover:text-[#7A5C48] py-2 px-3 rounded-lg bg-[#F0E8DF] hover:bg-[#E5DCD0] transition-colors text-center">👁️ 详情</button>
                    {order.status === 'pending' && (
                      <button onClick={() => openAssign(order)} className="text-sm font-bold text-white bg-gradient-to-r from-[#5C7258] to-[#4A5E48] hover:from-emerald-600 hover:to-teal-600 py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 text-center">📋 派单</button>
                    )}
                    {order.status === 'assigned' && (
                      <button onClick={() => handleStatusUpdate(order.id, 'serving')} className="text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 text-center">▶️ 服务中</button>
                    )}
                    {order.status === 'serving' && (
                      <button onClick={() => handleStatusUpdate(order.id, 'completed')} className="text-sm font-bold text-white bg-gradient-to-r from-[#5C7258] to-[#4A5E48] hover:from-green-600 hover:to-emerald-600 py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 text-center">✅ 完成</button>
                    )}
                    {(order.status === 'completed' || order.status === 'rated') && !reviewedOrders.has(order.id) && (
                      <button onClick={() => openReview(order)} className="text-sm font-bold text-white bg-gradient-to-r from-[#C89F7F] to-[#B88F6F] hover:from-[#B88F6F] hover:to-[#A87F5F] py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 text-center">⭐ 评价</button>
                    )}
                    {reviewedOrders.has(order.id) && (
                      <span className="text-xs text-[#A08F80] py-3 px-4 rounded-xl bg-[#E8DFD2] text-center">已评价</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 派单弹窗 */}
      {showAssign && selectedOrder && (
        <div className="fixed inset-0 bg-[#4A3A2F]/40 flex items-center justify-center z-50" onClick={() => setShowAssign(false)}>
          <div className="rounded-2xl shadow-2xl max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-bold text-[#4A3A2F] mb-4">选择服务员</h3>
              <p className="text-sm text-[#A08F80] mb-4">
                客户: {selectedOrder.customerName || '匿名'} · {selectedOrder.address}
              </p>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {waiters.filter(w => w.status === 'active').length === 0 ? (
                  <p className="text-center text-[#A08F80] py-4">没有可用的服务员</p>
                ) : waiters.filter(w => w.status === 'active').map(w => (
                  <button
                    key={w.id}
                    onClick={() => setAssignWaiterId(w.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                      assignWaiterId === w.id
                        ? 'border-[#5C7258] bg-emerald-50'
                        : 'border-[#E8DFD2] hover:bg-[#F5EFE6]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold">
                      {w.name[0]}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-[#4A3A2F]">{w.name}</p>
                      <p className="text-xs text-[#A08F80]">
                        ★ {typeof w.rating === 'number' ? w.rating.toFixed(1) : parseFloat(w.rating || '0').toFixed(1)} · {w.age || '-'}岁 · {w.height || '-'}
                      </p>
                    </div>
                    {assignWaiterId === w.id && <span className="text-[#5C7258] text-lg">✓</span>}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 mt-4">
                <Button variant="outline" className="flex-1" onClick={() => setShowAssign(false)}>取消</Button>
                <Button className="flex-1 bg-[#5C7258] hover:bg-emerald-600" onClick={handleAssign} disabled={!assignWaiterId}>
                  确认派单
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 完成弹窗 */}
      {showComplete && selectedOrder && (
        <div className="fixed inset-0 bg-[#4A3A2F]/40 flex items-center justify-center z-50" onClick={() => setShowComplete(false)}>
          <div className="rounded-2xl shadow-2xl max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-bold text-[#4A3A2F] mb-4">完成订单</h3>
              <p className="text-sm text-[#A08F80] mb-4">客户: {selectedOrder.customerName || '匿名'}</p>
              <div className="mb-4">
                <Label>完成备注（可选）</Label>
                <textarea
                  value={completionNote}
                  onChange={e => setCompletionNote(e.target.value)}
                  placeholder="服务完成情况..."
                  className="w-full mt-2 p-3 border border-[#E8DFD2] rounded-lg text-sm min-h-[80px]"
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowComplete(false)}>取消</Button>
                <Button className="flex-1 bg-[#EEF1EB]0 hover:bg-green-600" onClick={handleComplete}>确认完成</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 评价弹窗 */}
      {showReview && selectedOrder && (
        <div className="fixed inset-0 bg-[#4A3A2F]/40 flex items-center justify-center z-50" onClick={() => setShowReview(false)}>
          <div className="rounded-2xl shadow-2xl max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-bold text-[#4A3A2F] mb-2">评价服务员</h3>
              <p className="text-sm text-[#A08F80] mb-4">{selectedOrder.waiterName}</p>
              <div className="mb-4">
                <Label>评分</Label>
                <div className="flex gap-2 mt-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className={`text-2xl transition-colors ${star <= reviewRating ? 'text-[#FBBF24]' : 'text-[#E8DFD2]'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <Label>标签</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['专业', '准时', '热情', '细心', '礼貌', '技术好'].map(tag => (
                    <button
                      key={tag}
                      onClick={() => setReviewTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                      className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                        reviewTags.includes(tag)
                          ? 'bg-[#FFF1E3] text-[#A87F5F] border border-[#F7EEDB]'
                          : 'bg-[#E8DFD2] text-[#726255] border border-[#E8DFD2]'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <Label>评语</Label>
                <textarea
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  placeholder="可选"
                  className="w-full mt-2 p-3 border border-[#E8DFD2] rounded-lg text-sm min-h-[60px]"
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowReview(false)}>取消</Button>
                <Button className="flex-1 bg-[#FFF8E6]0 hover:bg-[#B88F6F]" onClick={handleReview}>提交评价</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 详情弹窗 */}
      {showDetail && selectedOrder && (
        <div className="fixed inset-0 bg-[#4A3A2F]/40 flex items-center justify-center z-50 p-4" onClick={() => setShowDetail(false)}>
          <div className="rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#4A3A2F]">订单详情</h3>
                <button onClick={() => setShowDetail(false)} className="text-[#A08F80] hover:text-[#726255]">✕</button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="bg-[#FAF5F0] p-3 rounded-lg">
                  <div className="grid grid-cols-2 gap-2">
                    <p><span className="text-[#A08F80]">客户:</span> {selectedOrder.customerName || '匿名'}</p>
                    <p><span className="text-[#A08F80]">手机:</span> {selectedOrder.phone || '-'}</p>
                  </div>
                </div>
                <div className="bg-[#FAF5F0] p-3 rounded-lg">
                  <p className="text-[#A08F80] mb-1">地址</p>
                  <p>{selectedOrder.address}</p>
                  {selectedOrder.location && <p className="text-[#A08F80] mt-1">定位: {selectedOrder.location}</p>}
                  <button
                    onClick={() => copyToClipboard(`${selectedOrder.address}${selectedOrder.location ? ' ' + selectedOrder.location : ''}`)}
                    className="mt-2 text-xs text-[#B88F6F] hover:text-[#7A5C48]"
                  >
                    📋 复制地址
                  </button>
                </div>
                <div className="bg-[#FAF5F0] p-3 rounded-lg">
                  <div className="grid grid-cols-2 gap-2">
                    <p><span className="text-[#A08F80]">客服:</span> {selectedOrder.staffName || '-'}</p>
                    <p><span className="text-[#A08F80]">派单侠:</span> {selectedOrder.dispatcherName || '-'}</p>
                    <p><span className="text-[#A08F80]">服务员:</span> {selectedOrder.waiterName || '-'}</p>
                    <p><span className="text-[#A08F80]">门店:</span> {selectedOrder.storeName || '-'}</p>
                  </div>
                </div>
                <div className="bg-[#FAF5F0] p-3 rounded-lg">
                  <div className="grid grid-cols-2 gap-2">
                    <p><span className="text-[#A08F80]">信息费:</span> ¥{selectedOrder.infoFee}</p>
                    <p><span className="text-[#A08F80]">预付金:</span> ¥{selectedOrder.prepayAmount || 0}</p>
                  </div>
                </div>
                {selectedOrder.notes && (
                  <div className="bg-[#FAF5F0] p-3 rounded-lg">
                    <p className="text-[#A08F80] mb-1">客服备注</p>
                    <p>{selectedOrder.notes}</p>
                  </div>
                )}
                {(() => {
                  const prefs = parsePrefs(selectedOrder.preferences);
                  return prefs ? (
                    <div className="bg-[#FAF5F0] p-3 rounded-lg">
                      <p className="text-[#A08F80] mb-2">客户偏好</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(prefs).flatMap(([k, v]) => {
                          const arr = Array.isArray(v) ? v : [];
                          return arr.map((val: string) => (
                            <Badge key={`${k}-${val}`} variant="outline" className="bg-[#F0E8DF] text-[#BE185D] border-[#FBCFE8]">{prefLabels[k] || k}: {val}</Badge>
                          ));
                        })}
                      </div>
                    </div>
                  ) : null;
                })()}
                {(() => {
                  const supps = selectedOrder.supplements;
                  if (!supps) return null;
                  try {
                    const list = typeof supps === 'string' ? JSON.parse(supps) : supps;
                    if (!Array.isArray(list) || list.length === 0) return null;
                    return (
                      <div className="bg-[#FFF1E3] p-3 rounded-lg border border-[#F7EEDB]">
                        <p className="text-[#B88F6F] mb-2">📌 客服补充 ({list.length}条)</p>
                        {list.map((s: any) => (
                          <div key={s.id} className="flex justify-between text-xs mb-1">
                            <span className="text-[#94724A]">{s.content}</span>
                            <span className="text-[#FB923C]">{formatDateTime(s.createdAt)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  } catch { return null; }
                })()}
                <Button
                  className="w-full bg-[#4A3A2F] hover:bg-[#3D2E22]"
                  onClick={() => {
                    const lines = [
                      `客户: ${selectedOrder.customerName || '匿名'}`,
                      `电话: ${selectedOrder.phone || '-'}`,
                      `地址: ${selectedOrder.address}`,
                      selectedOrder.location ? `定位: ${selectedOrder.location}` : '',
                    ].filter(Boolean);
                    copyToClipboard(lines.join('\n'));
                  }}
                >
                  一键复制完整派单信息
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showPasswordDialog ? <PasswordChangeDialog userId={user?.id || ''} onClose={() => setShowPasswordDialog(false)} /> : null}
    </div>
  );
}
