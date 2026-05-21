import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrderNotification } from '@/hooks/useOrderNotification';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { storage } from '@/lib/storage';
import {
  getOrders, getWaiters, getStores,
  createOrder, updateOrder, addSupplement, getSupplements,
  getReviews, createReview,
  formatDateTime, generateId,
} from '@/lib/api';
import { generateOrderNo } from '@/lib/orderNo';
import type { Order, Store, OrderPreferences } from '@/types';
import PasswordChangeDialog from '@/components/PasswordChangeDialog';
import DailyCheckInDialog from '@/components/DailyCheckInDialog';
import DailyRanking from '@/components/DailyRanking';
import SmartPasteParser from '@/components/SmartPasteParser';
import PhotoUploader from '@/components/PhotoUploader';
import { getDailyRecords } from '@/lib/api';

// 偏好选项配置
const preferenceOptions: Record<string, string[]> = {
  height: ['165及以上', '160-165', '155-160'],
  body: ['丰满', '刚好', '苗条', '骨感'],
  cup: ['B', 'C', 'D', 'EF'],
  personality: ['活泼有趣', '贴心姐姐', '高冷御姐', '萝莉可爱'],
  service: ['花样有趣', '私人定制', '正规推拿'],
  age: ['22-30', '30-35', '35及以上'],
  taboo: ['纹身', '香水', '浓妆', '邋遢', '地域歧视'],
};

const prefLabels: Record<string, string> = {
  height: '身高', body: '身型', cup: '胸CUP', personality: '性格',
  service: '服务', age: '年龄', taboo: '禁忌',
};

const statusLabels: Record<string, string> = {
  pending: '待派单', assigned: '已派单', departed: '已出发', arrived: '已到达',
  serving: '服务中', completed: '已完成', rated: '已评价', rejected: '被退', cancelled: '彻底失败',
};

const statusColors: Record<string, string> = {
  pending: 'bg-[#E8DFD2] text-[#726255]',
  assigned: 'bg-[#E5DCD0] text-[#A87F5F]',
  departed: 'bg-[#E8EDF5] text-[#5C7295]',
  arrived: 'bg-[#E5DCD0] text-[#6B4A38]',
  serving: 'bg-[#F7EEDB] text-[#A87F5F]',
  completed: 'bg-[#DDE5D8] text-[#3D4F3A]',
  rated: 'bg-[#FFF1E3] text-[#A87F5F]',
  rejected: 'bg-[#F5DCD6] text-[#8C3F30]',
  cancelled: 'bg-[#F5DCD6] text-[#8C3F30]',
};

export default function SendOrder() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'active' | 'completed'>('all');
  const [showForm, setShowForm] = useState(false);
  const [showSupplement, setShowSupplement] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showDailyCheckIn, setShowDailyCheckIn] = useState(false);
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderMessages, setOrderMessages] = useState<any[]>([]);
  const [supplementContent, setSupplementContent] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTags, setReviewTags] = useState<string[]>([]);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewedOrders, setReviewedOrders] = useState<Set<string>>(new Set());
  // 被退跟进弹窗
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpOrder, setFollowUpOrder] = useState<Order | null>(null);
  const [customerRejectReason, setCustomerRejectReason] = useState('');
  const [customerRejectNote, setCustomerRejectNote] = useState('');
  const [followUpAction, setFollowUpAction] = useState<'reassign' | 'fail' | null>(null);
  const customerRejectReasons = [
    { value: 'too_expensive', label: '太贵' },
    { value: 'person_not_good', label: '对人不满意' },
    { value: 'service_not_available', label: '要的服务没有' },
    { value: 'no_feature', label: '毫无特色' },
    { value: 'other', label: '其他' },
  ];

  // 表单状态
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [wechat, setWechat] = useState('');
  const [qq, setQq] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState('');
  const [storeId, setStoreId] = useState('');
  const [notes, setNotes] = useState('');
  const [infoFee, setInfoFee] = useState('');
  const [prepayAmount, setPrepayAmount] = useState('');
  const [preferences, setPreferences] = useState<OrderPreferences>({});
  const [referencePhoto, setReferencePhoto] = useState('');
  const [supplementOrder, setSupplementOrder] = useState<Order | null>(null);

  const userStr = storage.get('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const prevOrdersRef = useRef<Order[]>([]);

  const loadData = async () => {
    try {
      console.log('loadData: calling getOrders...');
      const [o, , s] = await Promise.all([
        getOrders().catch((e) => { console.error('getOrders error:', e); return []; }),
        getWaiters().catch(() => []),
        getStores().catch(() => []),
      ]);
      console.log('loadData: got orders:', o?.length, o?.slice(0, 1));

      // 检测新补充内容
      const prev = prevOrdersRef.current;
      if (prev.length > 0 && o.length > 0) {
        o.forEach(order => {
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
      setStores(s);

      // 加载已评价订单
      const reviews = await getReviews({ reviewerRole: '客服' }).catch(() => []);
      setReviewedOrders(new Set(reviews.map(r => r.orderId)));
    } catch (e) {
      console.error('加载失败:', e);
    } finally {
      setLoading(false);
    }
  };

  // 加载今日打卡记录
  const loadTodayRecord = async () => {
    try {
      if (!user?.id) return;
      const today = new Date().toISOString().slice(0, 10);
      const records = await getDailyRecords({ userId: user.id, date: today });
      setTodayRecord(records[0] || null);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    loadData();
    loadTodayRecord();
    const timer = setInterval(loadData, 15000);
    return () => clearInterval(timer);
  }, []);

  // 订单状态变化通知 - 提示音(6秒) + 弹窗
  useOrderNotification(orders, (order, oldStatus, newStatus) => {
    const sLabels: Record<string, string> = {
      pending: '待派单', assigned: '已派单', departed: '已出发', arrived: '已到达',
      serving: '服务中', completed: '已完成', rated: '已评价', rejected: '被退', cancelled: '彻底失败',
    };
    // 只提示与自己相关的订单
    if (order.submitterId === user?.id) {
      toast.info(`订单状态变化：${order.customerName || '匿名客户'} [${sLabels[oldStatus] || oldStatus}] → [${sLabels[newStatus] || newStatus}]`, {
        duration: 6000,
      });
    }
  });

  // 过滤订单
  const filteredOrders = orders.filter(o => {
    if (activeTab === 'pending') return o.status === 'pending';
    if (activeTab === 'active') return ['assigned', 'arrived', 'serving'].includes(o.status);
    if (activeTab === 'completed') return o.status === 'completed' || o.status === 'rated';
    return true;
  });

  const handleSubmit = async () => {
    if (!phone.trim() && !wechat.trim() && !qq.trim()) {
      toast.error('请至少填写一种联系方式（手机/微信/QQ）');
      return;
    }
    if (!address.trim()) {
      toast.error('请填写服务地址');
      return;
    }
    if (!storeId) {
      toast.error('请选择门店');
      return;
    }

    try {
      // 使用用户绑定的店铺ID（storeIds数组优先），最多2个，取第一个作为主门店
      const boundStoreIds = user?.storeIds || (user?.storeId ? [user.storeId] : []);
      const finalStoreId = boundStoreIds[0] || storeId;
      const finalStoreName = boundStoreIds[0]
        ? (stores.find(s => s.id === boundStoreIds[0])?.name || user?.storeName)
        : stores.find(s => s.id === storeId)?.name;

      if (!finalStoreId) {
        toast.error('未选择门店，请联系管理员绑定店铺');
        return;
      }

      // 生成自定义订单号
      const orderNo = await generateOrderNo(finalStoreName || 'XX');

      const newOrder: Partial<Order> = {
        id: orderNo, // 使用自定义订单号
        customerName: customerName || undefined,
        phone: phone || undefined,
        wechat: wechat || undefined,
        qq: qq || undefined,
        address,
        location: location || undefined,
        storeId: finalStoreId,
        storeName: finalStoreName,
        notes: notes || undefined,
        infoFee: parseFloat(infoFee || '0'),
        prepayAmount: prepayAmount ? parseFloat(prepayAmount) : undefined,
        preferences: Object.keys(preferences).length > 0 ? preferences : undefined,
        status: 'pending',
        submitterId: user?.id,
        submittedBy: user?.name || user?.username,
        referencePhoto: referencePhoto || undefined,
      };
      await createOrder(newOrder);
      toast.success(`订单提交成功，订单号：${orderNo}`);
      setShowForm(false);
      resetForm();
      loadData();
    } catch (e: any) {
      toast.error(e.message || '提交失败');
    }
  };

  const resetForm = () => {
    setCustomerName('');
    setPhone('');
    setWechat('');
    setQq('');
    setAddress('');
    setLocation('');
    // 如果用户绑定了店铺，自动填充
    setStoreId((user?.storeIds?.[0]) || user?.storeId || '');
    setNotes('');
    setInfoFee('');
    setPrepayAmount('');
    setPreferences({});
    setReferencePhoto('');
  };

  const togglePreference = (key: string, value: string) => {
    setPreferences(prev => {
      const current = prev[key as keyof OrderPreferences] || [];
      const arr = Array.isArray(current) ? current : [];
      if (arr.includes(value)) {
        return { ...prev, [key]: arr.filter(v => v !== value) };
      }
      return { ...prev, [key]: [...arr, value] };
    });
  };

  const openSupplement = (order: Order) => {
    setSupplementOrder(order);
    setSupplementContent('');
    setShowSupplement(true);
  };

  const handleSupplement = async () => {
    if (!supplementOrder || !supplementContent.trim()) return;
    try {
      await addSupplement(supplementOrder.id, supplementContent, {
        id: user?.id,
        name: user?.name || user?.username,
        role: '客服',
      });
      toast.success('消息已发送给派单侠');
      setShowSupplement(false);
      setSupplementContent('');
      loadData();
    } catch (e: any) {
      toast.error(e.message || '发送失败');
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
    if (!selectedOrder?.waiterId) {
      toast.error('该订单尚未分配服务员');
      return;
    }
    try {
      // 提交评价（信息费由派单侠在订单完成时录入）
      await createReview({
        id: generateId(),
        orderId: selectedOrder.id,
        waiterId: selectedOrder.waiterId,
        reviewerId: user?.id,
        reviewerRole: '客服',
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

  const openDetail = async (order: Order) => {
    setSelectedOrder(order);
    setShowDetail(true);
    // 加载消息记录
    try {
      const msgs = await getSupplements(order.id);
      setOrderMessages(msgs);
    } catch {
      setOrderMessages([]);
    }
  };

  // 复制到剪贴板
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

  // 判断订单是否属于当前客服
  const isMyOrder = (order: Order) => order.submitterId === user?.id;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF5F0' }}>
      {/* Header */}
      <header className="border-b border-[#E8DFD2]">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-semibold text-[#4A3A2F]">客服工作台</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="sm" onClick={() => setShowDailyCheckIn(true)} className="bg-[#C89F7F] text-white hover:bg-[#B88F6F] whitespace-nowrap px-2.5 py-1 h-8 text-xs">
              {todayRecord ? '✓ 已打卡' : '📋 打卡'}
            </Button>
            <span className="text-xs text-[#A08F80] hidden sm:inline mr-1">{user?.name || user?.username}</span>
            <button onClick={() => setShowPasswordDialog(true)} className="text-[#A08F80] hover:text-[#726255] p-1" title="修改密码">🔒</button>
            <button onClick={() => navigate('/portal')} className="text-[#A08F80] hover:text-[#726255] p-1" title="返回">←</button>
            <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="text-[#A08F80] hover:text-[#726255] p-1" title="退出">🚪</button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* 当日派单排名 */}
        <DailyRanking orders={orders} />

        {/* 发单按钮 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            {[
              { key: 'all' as const, label: '全部' },
              { key: 'pending' as const, label: '待派单' },
              { key: 'active' as const, label: '进行中' },
              { key: 'completed' as const, label: '已完成' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-[#C89F7F] text-white'
                    : 'bg-[#FFFFFF] text-[#726255] hover:bg-[#E8DFD2] border border-[#E8DFD2]'
                }`}
              >
                {tab.label}
                {tab.key === 'pending' && orders.filter(o => o.status === 'pending').length > 0 && (
                  <span className="ml-1.5 bg-[#B85C4A] text-white text-xs rounded-full px-1.5 py-0.5">{orders.filter(o => o.status === 'pending').length}</span>
                )}
              </button>
            ))}
          </div>
          <Button onClick={() => setShowForm(true)} className="bg-[#C89F7F] text-white hover:bg-[#B88F6F]">
            + 新建订单
          </Button>
        </div>

        {/* 被退订单提示 */}
        {(() => {
          const rejected = orders.filter(o => o.status === 'rejected' && o.submitterId === user?.id);
          if (rejected.length === 0) return null;
          return (
            <div className="mb-4 space-y-2">
              {rejected.map(o => (
                <div key={o.id} className="bg-[#F5DCD6] border border-[#E8B8B0] rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[#8C3F30]">⚠️ 订单被退 - 请及时跟进</p>
                    <p className="text-sm text-[#B85C4A]">客户: {o.customerName || '匿名'} | 被退原因: {o.rejectReason === 'too_expensive' ? '嫌贵' : o.rejectReason === 'person_not_satisfy' ? '对人不满意' : o.rejectReason === 'service_not_satisfy' ? '对服务不满意' : o.rejectReason === 'other' ? '其他' : o.rejectReason || '未知'}</p>
                  </div>
                  <Button size="sm" className="bg-[#B85C4A] hover:bg-[#8C3F30] text-white" onClick={() => { setFollowUpOrder(o); setCustomerRejectReason(''); setCustomerRejectNote(''); setFollowUpAction(null); setShowFollowUp(true); }}>
                    立即跟进
                  </Button>
                </div>
              ))}
            </div>
          );
        })()}

        {/* 订单列表 */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-[#C89F7F] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-[#A08F80]  rounded-xl border border-[#E8DFD2]">
            暂无订单
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map(order => {
              const mine = isMyOrder(order);
              return (
                <div key={order.id} className={`rounded-xl border shadow-sm p-4 hover:shadow-md transition-shadow ${
                  mine
                    ? 'border-l-4 border-l-[#C89F7F] border-[#E8DFD2] bg-[#FFFFFF]'  /* 自己的单 - 左侧棕色条 */
                    : 'border-[#D8D0C8] bg-[#F5F0EA]'  /* 别人的单 - 浅灰背景 */
                }`}>
                  {mine ? (
                    /* ========== 自己的订单 - 完整显示 ========== */
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className={statusColors[order.status]}>
                            {statusLabels[order.status]}
                          </Badge>
                          <span className="text-xs text-[#A08F80]">{formatDateTime(order.createdAt)}</span>
                          {order.storeName && (
                            <Badge variant="outline" className="text-xs bg-[#F0E8DF] text-[#6B4A38] border-[#D8CBC0]">
                              {order.storeName}
                            </Badge>
                          )}
                          {reviewedOrders.has(order.id) && (
                            <Badge variant="outline" className="text-xs bg-[#E8DFD2] text-[#A08F80]">已评价</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-[#A08F80]">客户:</span>
                            <span className="ml-1 font-medium">{order.customerName || '匿名'}</span>
                          </div>
                          <div>
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
                        <div className="mt-1 text-sm">
                          <span className="text-[#A08F80]">地址:</span>
                          <span className="ml-1 text-[#726255]">{order.address}</span>
                          <button onClick={() => copyToClipboard(order.address)} className="ml-1 text-[#C89F7F] hover:text-[#A87F5F] text-xs">📋</button>
                        </div>
                        {/* 偏好标签 */}
                        {(() => {
                          const prefs = parsePrefs(order.preferences);
                          return prefs ? (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {Object.entries(prefs).flatMap(([k, v]) => {
                                const arr = Array.isArray(v) ? v : [];
                                return arr.map((val: string) => (
                                  <Badge key={`${k}-${val}`} variant="outline" className="text-xs bg-gradient-to-r from-pink-50 to-purple-50 text-[#BE185D] border-[#FBCFE8]">
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
                              <div className="mt-2 bg-[#FFF1E3] rounded-lg p-2 border border-[#F7EEDB]">
                                <p className="text-xs text-[#B88F6F] mb-1">📌 补充内容 ({list.length}条)</p>
                                {list.map((s: any) => (
                                  <div key={s.id} className="flex justify-between text-xs">
                                    <span className="text-[#94724A]">{s.content}</span>
                                    <span className="text-[#FB923C]">{formatDateTime(s.createdAt)}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          } catch { return null; }
                        })()}
                        {order.waiterName && (
                          <div className="mt-1 text-sm text-[#A08F80]">
                            服务员: {order.waiterName}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <button onClick={() => openDetail(order)} className="text-xs text-[#B88F6F] hover:text-[#7A5C48] whitespace-nowrap">👁️ 详情</button>
                        {/* 所有订单都可以发消息给派单侠 */}
                        {mine && (
                          <button onClick={() => openSupplement(order)} className="text-xs text-[#C89F7F] hover:text-[#A87F5F] whitespace-nowrap">💬 发消息</button>
                        )}
                        {(order.status === 'completed' || order.status === 'rated') && !reviewedOrders.has(order.id) && (
                          <button onClick={() => openReview(order)} className="text-xs text-[#B88F6F] hover:text-[#94724A] whitespace-nowrap">⭐ 评价</button>
                        )}
                        {reviewedOrders.has(order.id) && (
                          <span className="text-xs text-[#A08F80] whitespace-nowrap">已评价</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* ========== 别人的订单 - 模糊显示 ========== */
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className={statusColors[order.status]}>
                            {statusLabels[order.status]}
                          </Badge>
                          <span className="text-xs text-[#A08F80]">{formatDateTime(order.createdAt)}</span>
                          {order.storeName && (
                            <Badge variant="outline" className="text-xs bg-[#E8E4DF] text-[#8A7E74] border-[#D8D0C8]">
                              {order.storeName}
                            </Badge>
                          )}
                          {/* 归属标识 */}
                          <Badge variant="outline" className="text-xs bg-[#F0E8DF] text-[#A08F80] border-[#E8DFD2]">
                            🔒{order.submittedBy || '其他'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-[#A08F80]">
                          <span>客户: ***</span>
                          <span>手机: ****</span>
                          <span>信息费: ¥{order.infoFee}</span>
                        </div>
                        <div className="mt-1 text-sm text-[#A08F80]">
                          地址: ***
                        </div>
                        {order.waiterName && (
                          <div className="mt-1 text-sm text-[#A08F80]">
                            服务员: {order.waiterName}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <button onClick={() => openDetail(order)} className="text-xs text-[#A08F80] hover:text-[#726255] whitespace-nowrap">👁️ 详情</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 发单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 bg-[#4A3A2F]/40 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="rounded-2xl shadow-2xl bg-[#FFFFFF] max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#4A3A2F]">新建订单</h3>
                <button onClick={() => setShowForm(false)} className="text-[#A08F80] hover:text-[#726255]">✕</button>
              </div>
              <div className="space-y-4">
                {/* 智能粘贴识别 */}
                <SmartPasteParser
                  onParse={(data) => {
                    if (data.customerName) setCustomerName(data.customerName);
                    if (data.phone) setPhone(data.phone);
                    if (data.wechat) setWechat(data.wechat);
                    if (data.qq) setQq(data.qq);
                    if (data.address) setAddress(data.address + (data.roomNumber ? ` ${data.roomNumber}` : ''));
                    toast.success('已自动填充识别到的信息');
                  }}
                />
                <div>
                  <Label>客户姓名（可选）</Label>
                  <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="输入客户姓名" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>手机</Label>
                    <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="手机号" />
                  </div>
                  <div>
                    <Label>微信</Label>
                    <Input value={wechat} onChange={e => setWechat(e.target.value)} placeholder="微信号" />
                  </div>
                  <div>
                    <Label>QQ</Label>
                    <Input value={qq} onChange={e => setQq(e.target.value)} placeholder="QQ号" />
                  </div>
                </div>
                <p className="text-xs text-[#A08F80]">手机/微信/QQ 至少填一项</p>
                <div>
                  <Label>服务地址 *</Label>
                  <Textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="输入详细地址" rows={2} />
                </div>
                {/* 参考照片上传 */}
                <div>
                  <Label>参考照片（可选）</Label>
                  <div className="mt-1">
                    <PhotoUploader onUpload={setReferencePhoto} existingUrl={referencePhoto} />
                  </div>
                  <p className="text-xs text-[#A08F80] mt-1">可上传客户环境或需求参考照片</p>
                </div>
                <div>
                  <Label>定位备注</Label>
                  <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="如：XX酒店1208房" />
                </div>
                <div>
                  <Label>所属门店 *</Label>
                  {/* 根据 user 绑定状态判断：1家只读，2家可选，未绑定全选 */}
                  {(() => {
                    const boundStoreIds = user?.storeIds || (user?.storeId ? [user.storeId] : []);
                    if (boundStoreIds.length === 1) {
                      /* 绑1家 - 自动填充只读 */
                      const storeName = stores.find(s => s.id === boundStoreIds[0])?.name || user?.storeName || '已绑定门店';
                      return (
                        <div className="w-full h-10 rounded-md border border-[#E8DFD2] px-3 text-sm flex items-center bg-[#FAF5F0] text-[#4A3A2F]">
                          <span className="text-[#C89F7F] mr-2">📍</span>
                          <span className="font-medium">{storeName}</span>
                          <span className="ml-auto text-xs text-[#A08F80]">(自动填充)</span>
                        </div>
                      );
                    } else if (boundStoreIds.length >= 2) {
                      /* 绑2家及以上 - 从绑定门店中选择 */
                      return (
                        <select
                          value={storeId}
                          onChange={e => setStoreId(e.target.value)}
                          className="w-full h-10 rounded-md border border-[#E8DFD2] px-3 text-sm"
                        >
                          <option value="">请选择门店</option>
                          {boundStoreIds.map((sid: string) => {
                            const s = stores.find((st: Store) => st.id === sid);
                            return <option key={sid} value={sid}>{s?.name || sid}</option>;
                          })}
                        </select>
                      );
                    }
                    /* 未绑定 - 从所有门店中选择 */
                    return (
                      <select
                        value={storeId}
                        onChange={e => setStoreId(e.target.value)}
                        className="w-full h-10 rounded-md border border-[#E8DFD2] px-3 text-sm"
                      >
                        <option value="">请选择门店（未绑定）</option>
                        {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    );
                  })()}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>信息费</Label>
                    <Input value={infoFee} onChange={e => setInfoFee(e.target.value)} placeholder="0" type="number" />
                    <p className="text-xs text-[#A08F80] mt-1">信息费由派单侠完成服务后录入</p>
                  </div>
                  <div>
                    <Label>预付金</Label>
                    <Input value={prepayAmount} onChange={e => setPrepayAmount(e.target.value)} placeholder="0" type="number" />
                  </div>
                </div>
                <div>
                  <Label>客服备注</Label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="客户特殊要求等..." rows={2} />
                </div>
                {/* 偏好选择 */}
                <div>
                  <Label>客户偏好</Label>
                  <div className="space-y-2 mt-2">
                    {Object.entries(preferenceOptions).map(([key, options]) => (
                      <div key={key} className="bg-[#FAF5F0] rounded-lg p-2">
                        <span className="text-xs text-[#A08F80] font-medium">{prefLabels[key]}</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {options.map(opt => {
                            const selected = (preferences[key as keyof OrderPreferences] || []).includes(opt);
                            return (
                              <button
                                key={opt}
                                onClick={() => togglePreference(key, opt)}
                                className={`text-xs px-2 py-1 rounded-full transition-colors ${
                                  selected
                                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                                    : 'bg-[#FFFFFF] text-[#726255] border border-[#E8DFD2] hover:border-pink-300'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>取消</Button>
                <Button className="flex-1 bg-[#C89F7F] text-white hover:bg-[#B88F6F]" onClick={handleSubmit}>提交订单</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 补充内容弹窗 */}
      {showSupplement && supplementOrder && (
        <div className="fixed inset-0 bg-[#4A3A2F]/40 flex items-center justify-center z-50" onClick={() => setShowSupplement(false)}>
          <div className="rounded-2xl shadow-2xl bg-[#FFFFFF] max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-bold text-[#4A3A2F] mb-2">💬 发消息给派单侠</h3>
              <p className="text-sm text-[#A08F80] mb-4">订单 #{supplementOrder.id?.slice(-6)} · 客户: {supplementOrder.customerName || '匿名'}</p>
              {/* 历史补充 */}
              {(() => {
                const supps = supplementOrder.supplements;
                if (!supps) return null;
                try {
                  const list = typeof supps === 'string' ? JSON.parse(supps) : supps;
                  if (!Array.isArray(list) || list.length === 0) return null;
                  return (
                    <div className="mb-4 space-y-2 max-h-40 overflow-y-auto">
                      {list.map((s: any) => (
                        <div key={s.id} className="bg-[#FAF5F0] p-2 rounded-lg text-sm">
                          <p>{s.content}</p>
                          <p className="text-xs text-[#A08F80] mt-1">{formatDateTime(s.createdAt)}</p>
                        </div>
                      ))}
                    </div>
                  );
                } catch { return null; }
              })()}
              <Textarea
                value={supplementContent}
                onChange={e => setSupplementContent(e.target.value)}
                placeholder="输入要告知派单侠的信息（如：客人要求带矿泉水、改地址了...）"
                rows={3}
              />
              <div className="flex gap-3 mt-4">
                <Button variant="outline" className="flex-1" onClick={() => setShowSupplement(false)}>取消</Button>
                <Button className="flex-1 bg-[#FFF1E3]0 hover:bg-orange-600" onClick={handleSupplement}>发送</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 评价弹窗 */}
      {showReview && selectedOrder && (
        <div className="fixed inset-0 bg-[#4A3A2F]/40 flex items-center justify-center z-50" onClick={() => setShowReview(false)}>
          <div className="rounded-2xl shadow-2xl bg-[#FFFFFF] max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-bold text-[#4A3A2F] mb-2">评价服务员</h3>
              <p className="text-sm text-[#A08F80] mb-4">{selectedOrder.waiterName}</p>
              {/* 显示信息费（派单侠录入的，客服只读查看） */}
              {selectedOrder.infoFee && parseFloat(String(selectedOrder.infoFee)) > 0 ? (
                <div className="mb-4 bg-[#EEF1EB] rounded-lg p-3 border border-[#D8E0D2]">
                  <Label className="text-[#5C7258] font-medium">💎 订单信息费（业绩）</Label>
                  <p className="text-lg font-bold text-[#4A3A2F] mt-1">¥{selectedOrder.infoFee}</p>
                  <p className="text-xs text-[#A08F80] mt-1">由派单侠完成服务时录入</p>
                </div>
              ) : (
                <div className="mb-4 bg-[#F5DCD6] rounded-lg p-3 border border-[#E8B8B0]">
                  <p className="text-sm text-[#8C3F30]">⚠️ 该订单尚未录入信息费（业绩）</p>
                </div>
              )}
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
                <Textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="可选" rows={2} />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowReview(false)}>取消</Button>
                <Button className="flex-1 bg-[#C89F7F] text-white hover:bg-[#B88F6F]" onClick={handleReview}>提交评价</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 被退跟进弹窗 */}
      {showFollowUp && followUpOrder && (
        <div className="fixed inset-0 bg-[#4A3A2F]/40 flex items-center justify-center z-50" onClick={() => setShowFollowUp(false)}>
          <div className="rounded-2xl shadow-2xl bg-[#FFFFFF] max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-bold text-[#4A3A2F] mb-2">⚠️ 被退订单跟进</h3>
              <p className="text-sm text-[#A08F80] mb-4">客户: {followUpOrder.customerName || '匿名'}</p>
              <div className="mb-4 bg-[#F5DCD6] rounded-lg p-3 border border-[#E8B8B0]">
                <p className="text-sm text-[#8C3F30] font-medium">派单侠反馈的被退原因:</p>
                <p className="text-sm text-[#B85C4A] mt-1">
                  {followUpOrder.rejectReason === 'too_expensive' ? '嫌贵' :
                   followUpOrder.rejectReason === 'person_not_satisfy' ? '对人不满意' :
                   followUpOrder.rejectReason === 'service_not_satisfy' ? '对服务不满意' :
                   followUpOrder.rejectReason === 'other' ? `其他: ${followUpOrder.rejectNote || ''}` :
                   followUpOrder.rejectReason || '未知'}
                </p>
              </div>
              <div className="mb-4">
                <Label className="text-[#4A3A2F] font-medium">客人给的理由 *</Label>
                <div className="space-y-2 mt-2">
                  {customerRejectReasons.map(r => (
                    <label key={r.value} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      customerRejectReason === r.value ? 'border-[#C89F7F] bg-[#FFF1E3]' : 'border-[#E8DFD2] hover:bg-[#F5EFE6]'
                    }`}>
                      <input type="radio" name="customerRejectReason" value={r.value} checked={customerRejectReason === r.value} onChange={e => setCustomerRejectReason(e.target.value)} />
                      <span className="text-sm">{r.label}</span>
                    </label>
                  ))}
                </div>
                {customerRejectReason === 'other' && (
                  <textarea value={customerRejectNote} onChange={e => setCustomerRejectNote(e.target.value)} placeholder="请填写其他原因..." className="w-full mt-2 p-3 border border-[#E8DFD2] rounded-lg text-sm min-h-[60px]" />
                )}
              </div>
              <div className="mb-4">
                <Label className="text-[#4A3A2F] font-medium">处理方式 *</Label>
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => setFollowUpAction('reassign')}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                      followUpAction === 'reassign'
                        ? 'bg-[#EEF1EB] text-[#5C7258] border-2 border-[#5C7258]'
                        : 'bg-[#FAF5F0] text-[#726255] border-2 border-[#E8DFD2] hover:border-[#C89F7F]'
                    }`}
                  >
                    🔄 换人
                    <p className="text-xs font-normal mt-1">订单回到派单侠重新派单</p>
                  </button>
                  <button
                    onClick={() => setFollowUpAction('fail')}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                      followUpAction === 'fail'
                        ? 'bg-[#F5DCD6] text-[#8C3F30] border-2 border-[#8C3F30]'
                        : 'bg-[#FAF5F0] text-[#726255] border-2 border-[#E8DFD2] hover:border-[#C89F7F]'
                    }`}
                  >
                    ❌ 彻底失败
                    <p className="text-xs font-normal mt-1">订单关闭</p>
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <Button className="flex-1 bg-[#E8DFD2] hover:bg-[#D8CBC0] text-[#726255]" onClick={() => setShowFollowUp(false)}>取消</Button>
                <Button
                  className="flex-1 bg-[#C89F7F] hover:bg-[#A87F5F]"
                  disabled={!customerRejectReason || !followUpAction}
                  onClick={async () => {
                    if (!followUpOrder || !followUpAction) return;
                    try {
                      if (followUpAction === 'reassign') {
                        await updateOrder(followUpOrder.id, {
                          status: 'pending',
                          customerRejectReason,
                          customerRejectNote: customerRejectNote || undefined,
                          followUpAction: 'reassign',
                        });
                        toast.success('已选择换人，订单已回到派单侠后台');
                      } else {
                        await updateOrder(followUpOrder.id, {
                          status: 'cancelled',
                          customerRejectReason,
                          customerRejectNote: customerRejectNote || undefined,
                          followUpAction: 'fail',
                        });
                        toast.success('已标记为彻底失败');
                      }
                      setShowFollowUp(false);
                      loadData();
                    } catch (e: any) {
                      toast.error(e.message || '操作失败');
                    }
                  }}
                >
                  确认提交
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 详情弹窗 */}
      {showDetail && selectedOrder && (
        <div className="fixed inset-0 bg-[#4A3A2F]/40 flex items-center justify-center z-50 p-4" onClick={() => setShowDetail(false)}>
          <div className="rounded-2xl shadow-2xl bg-[#FFFFFF] max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#4A3A2F]">订单详情</h3>
                <button onClick={() => setShowDetail(false)} className="text-[#A08F80] hover:text-[#726255]">✕</button>
              </div>
              {isMyOrder(selectedOrder) ? (
                /* ========== 自己的订单 - 完整详情 ========== */
                <div className="space-y-3 text-sm">
                  <div className="bg-[#FAF5F0] p-3 rounded-lg">
                    <div className="grid grid-cols-2 gap-2">
                      <p><span className="text-[#A08F80]">客户:</span> {selectedOrder.customerName || '匿名'}</p>
                      <p><span className="text-[#A08F80]">手机:</span> {selectedOrder.phone || '-'}</p>
                      {selectedOrder.wechat && <p><span className="text-[#A08F80]">微信:</span> {selectedOrder.wechat}</p>}
                      {selectedOrder.qq && <p><span className="text-[#A08F80]">QQ:</span> {selectedOrder.qq}</p>}
                    </div>
                  </div>
                  <div className="bg-[#FAF5F0] p-3 rounded-lg">
                    <p className="text-[#A08F80] mb-1">地址</p>
                    <p>{selectedOrder.address}</p>
                    {selectedOrder.location && <p className="text-[#A08F80] mt-1">定位: {selectedOrder.location}</p>}
                  </div>
                  {/* 参考照片 */}
                  {selectedOrder.referencePhoto && (
                    <div className="bg-[#FAF5F0] p-3 rounded-lg">
                      <p className="text-[#A08F80] mb-2">参考照片</p>
                      <img
                        src={selectedOrder.referencePhoto}
                        alt="参考照片"
                        className="w-full max-h-48 object-contain rounded-lg border border-[#E8DFD2]"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}
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
                              <Badge key={`${k}-${val}`} variant="outline" className="bg-[#F0E8DF] text-[#BE185D] border-[#FBCFE8]">
                                {prefLabels[k] || k}: {val}
                              </Badge>
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
                          <p className="text-[#B88F6F] mb-2">📌 补充内容 ({list.length}条)</p>
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
                  {/* 消息记录 */}
                  {orderMessages.length > 0 && (
                    <div className="bg-[#EEF1EB] p-3 rounded-lg border border-[#D8E0D2]">
                      <p className="text-[#5C7258] font-medium mb-2">💬 消息记录 ({orderMessages.length}条)</p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {orderMessages.map((msg: any) => (
                          <div key={msg.id} className="bg-white rounded-lg p-2 text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-[#4A3A2F]">{msg.senderName || '系统'}</span>
                              <span className="text-[#A08F80]">{msg.createdAt ? msg.createdAt.slice(0, 16).replace('T', ' ') : ''}</span>
                            </div>
                            <p className="text-[#726255]">{msg.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button
                      className="flex-1 bg-[#4A3A2F] hover:bg-[#3D2E22]"
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
                      一键复制完整信息
                    </Button>
                  </div>
                </div>
              ) : (
                /* ========== 别人的订单 - 模糊详情 ========== */
                <div className="space-y-3 text-sm">
                  {/* 隐私提示 */}
                  <div className="bg-[#F5DCD6] border border-[#E8B8B0] p-4 rounded-lg text-center">
                    <p className="text-[#8C3F30] text-lg mb-1">🔒 他人订单</p>
                    <p className="text-[#B85C4A] text-sm">客户隐私已隐藏</p>
                  </div>
                  <div className="bg-[#F8F4EF] p-3 rounded-lg">
                    <div className="grid grid-cols-2 gap-2 text-[#A08F80]">
                      <p>客户: ***</p>
                      <p>手机: ****</p>
                      <p>微信: ***</p>
                      <p>QQ: ***</p>
                    </div>
                  </div>
                  <div className="bg-[#F8F4EF] p-3 rounded-lg">
                    <p className="text-[#A08F80] mb-1">地址</p>
                    <p className="text-[#A08F80]">***</p>
                  </div>
                  <div className="bg-[#F8F4EF] p-3 rounded-lg">
                    <div className="grid grid-cols-2 gap-2">
                      <p><span className="text-[#A08F80]">客服:</span> {selectedOrder.staffName || '-'}</p>
                      <p><span className="text-[#A08F80]">派单侠:</span> {selectedOrder.dispatcherName || '-'}</p>
                      <p><span className="text-[#A08F80]">服务员:</span> {selectedOrder.waiterName || '-'}</p>
                      <p><span className="text-[#A08F80]">门店:</span> {selectedOrder.storeName || '-'}</p>
                    </div>
                  </div>
                  <div className="bg-[#F8F4EF] p-3 rounded-lg">
                    <div className="grid grid-cols-2 gap-2">
                      <p><span className="text-[#A08F80]">信息费:</span> ¥{selectedOrder.infoFee}</p>
                      <p><span className="text-[#A08F80]">预付金:</span> ¥{selectedOrder.prepayAmount || 0}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showDailyCheckIn ? (
        <DailyCheckInDialog
          open={showDailyCheckIn}
          userId={user?.id || ''}
          userName={user?.name || user?.username || ''}
          onClose={() => setShowDailyCheckIn(false)}
          onSuccess={loadTodayRecord}
          initialData={todayRecord}
        />
      ) : null}
      {showPasswordDialog ? <PasswordChangeDialog userId={user?.id || ''} onClose={() => setShowPasswordDialog(false)} /> : null}
    </div>
  );
}
