import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { storage } from '@/lib/storage';
import { getCustomers, getCustomerDetail, syncCustomersFromOrders } from '@/lib/api';
import type { Customer, CustomerService } from '@/types';

export default function CustomerAssets() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'new' | 'old' | 'vip'>('all');
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [detailServices, setDetailServices] = useState<CustomerService[]>([]);
  const [syncing, setSyncing] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      console.log('[Debug] 开始加载客户资产...');
      const res = await getCustomers({
        search: search || undefined,
        type: filter === 'all' ? undefined : filter,
        page: 1,
        pageSize: 100,
      });
      console.log('[Debug] 客户资产返回:', res);
      setCustomers(res.list || []);
      setTotal(res.total || 0);
    } catch (e: any) {
      console.error('[Debug] 客户资产加载失败:', e);
      toast.error('获取客户列表失败: ' + (e.message || '请检查网络或联系管理员'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [search, filter]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await syncCustomersFromOrders();
      toast.success(`同步完成！新建 ${res.created} 个，更新 ${res.updated} 个`);
      loadCustomers();
    } catch (e: any) {
      toast.error(e.message || '同步失败');
    } finally {
      setSyncing(false);
    }
  };

  const showDetail = async (customer: Customer) => {
    setDetailOpen(true);
    setDetailCustomer(customer);
    try {
      const data = await getCustomerDetail(customer.id);
      setDetailServices(data.services || []);
    } catch {
      setDetailServices([]);
    }
  };

  const filterTabs = [
    { key: 'all' as const, label: '全部客户', count: total },
    { key: 'new' as const, label: '新客', count: customers.filter(c => c.orderCount <= 1).length },
    { key: 'old' as const, label: '老客', count: customers.filter(c => c.orderCount > 1).length },
    { key: 'vip' as const, label: 'VIP', count: customers.filter(c => c.isVip).length },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF5F0' }}>
      {/* Header */}
      <header className="border-b border-[#E8DFD2]" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #C89F7F, #B88F6F)' }}>
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-semibold text-[#4A3A2F] truncate">客户资产库</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="text-[#726255] border-[#E8DFD2] whitespace-nowrap">
              {syncing ? '同步中...' : '🔄 同步订单'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin')} className="text-[#726255] border-[#E8DFD2]">返回管理后台</Button>
            <Button variant="outline" size="sm" onClick={() => { storage.clear(); navigate('/login'); }} className="text-[#726255] border-[#E8DFD2]">退出</Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* 搜索 + 筛选 */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Input
            placeholder="搜索姓名/电话/微信/QQ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 h-9"
          />
          <div className="flex gap-2 shrink-0">
            {filterTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === tab.key
                    ? 'bg-[#C89F7F] text-white'
                    : 'bg-[#FFFFFF] text-[#726255] border border-[#E8DFD2] hover:bg-[#F5EFE6]'
                }`}
              >
                {tab.label}({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* 客户列表 */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-[#C89F7F] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12 text-[#A08F80] rounded-xl border border-[#E8DFD2]" style={{ backgroundColor: '#FFFFFF' }}>
            <div className="text-4xl mb-3">👥</div>
            <p>暂无客户数据</p>
            <p className="text-xs mt-2">请点击「同步订单」从已有订单中提取客户资料</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {customers.map(c => (
              <div
                key={c.id}
                onClick={() => showDetail(c)}
                className="rounded-xl border border-[#E8DFD2] p-4 cursor-pointer hover:shadow-md transition-shadow"
                style={{ backgroundColor: '#FFFFFF' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ background: c.isVip ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'linear-gradient(135deg, #C89F7F, #B88F6F)' }}>
                      {(c.name || c.wechat || c.phone || '客')[0]}
                    </div>
                    <div>
                      <p className="font-medium text-[#4A3A2F] text-sm">{c.name || '未命名客户'}</p>
                      <p className="text-xs text-[#A08F80]">
                        {c.sourceCsName ? `来源: ${c.sourceCsName}` : ''}
                        {c.sourceStoreName ? ` · ${c.sourceStoreName}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {c.orderCount > 1 && <Badge className="text-xs bg-[#EEF1EB] text-[#5C7258] border-0">老客</Badge>}
                    {c.isVip && <Badge className="text-xs bg-[#FFF1E3] text-[#B97C4A] border-0">VIP</Badge>}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="rounded-lg p-2" style={{ backgroundColor: '#F5EFE6' }}>
                    <p className="text-xs text-[#A08F80]">订单</p>
                    <p className="font-bold text-[#4A3A2F] text-lg">{c.orderCount}</p>
                  </div>
                  <div className="rounded-lg p-2" style={{ backgroundColor: '#F5EFE6' }}>
                    <p className="text-xs text-[#A08F80]">消费</p>
                    <p className="font-bold text-[#C89F7F] text-lg">¥{c.totalSpend || 0}</p>
                  </div>
                  <div className="rounded-lg p-2" style={{ backgroundColor: '#F5EFE6' }}>
                    <p className="text-xs text-[#A08F80]">最近</p>
                    <p className="font-bold text-[#4A3A2F] text-sm">{c.lastContactDate ? c.lastContactDate.slice(5) : '-'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {c.phone && <span className="text-xs px-2 py-0.5 rounded-full bg-[#F5EFE6] text-[#726255]">📞 {c.phone.slice(0, 3)}***{c.phone.slice(-4)}</span>}
                  {c.wechat && <span className="text-xs px-2 py-0.5 rounded-full bg-[#EEF1EB] text-[#5C7258]">💬 {c.wechat}</span>}
                  {c.qq && <span className="text-xs px-2 py-0.5 rounded-full bg-[#F0E8DF] text-[#8C6A53]">QQ {c.qq}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 分页提示 */}
        {!loading && customers.length > 0 && total > customers.length && (
          <p className="text-center text-xs text-[#A08F80] mt-4">共 {total} 位客户，显示前 {customers.length} 位</p>
        )}
      </div>

      {/* 客户详情弹窗 */}
      {detailOpen && detailCustomer && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-6">
          <div className="absolute inset-0 bg-[#4A3A2F]/40" onClick={() => setDetailOpen(false)} />
          <div className="relative bg-[#FFFFFF] rounded-2xl shadow-2xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
            {/* 头部 */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ background: detailCustomer.isVip ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'linear-gradient(135deg, #C89F7F, #B88F6F)' }}>
                  {(detailCustomer.name || '客')[0]}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#4A3A2F]">{detailCustomer.name || '未命名客户'}</h2>
                  <p className="text-sm text-[#A08F80]">
                    首次接触 {detailCustomer.firstContactDate || '-'}
                    {detailCustomer.sourceStoreName && ` · 来源店铺 ${detailCustomer.sourceStoreName}`}
                  </p>
                </div>
              </div>
              <button onClick={() => setDetailOpen(false)} className="text-[#A08F80] hover:text-[#4A3A2F] text-2xl leading-none">&times;</button>
            </div>

            {/* 联系方式 */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="rounded-lg p-3 border border-[#E8DFD2]" style={{ backgroundColor: '#F5EFE6' }}>
                <p className="text-xs text-[#A08F80] mb-1">电话</p>
                <p className="font-medium text-[#4A3A2F]">{detailCustomer.phone || '-'}</p>
              </div>
              <div className="rounded-lg p-3 border border-[#E8DFD2]" style={{ backgroundColor: '#F5EFE6' }}>
                <p className="text-xs text-[#A08F80] mb-1">微信</p>
                <p className="font-medium text-[#4A3A2F]">{detailCustomer.wechat || '-'}</p>
              </div>
              <div className="rounded-lg p-3 border border-[#E8DFD2]" style={{ backgroundColor: '#F5EFE6' }}>
                <p className="text-xs text-[#A08F80] mb-1">QQ</p>
                <p className="font-medium text-[#4A3A2F]">{detailCustomer.qq || '-'}</p>
              </div>
              <div className="rounded-lg p-3 border border-[#E8DFD2]" style={{ backgroundColor: '#F5EFE6' }}>
                <p className="text-xs text-[#A08F80] mb-1">总消费</p>
                <p className="font-bold text-[#C89F7F]">¥{detailCustomer.totalSpend || 0}</p>
              </div>
            </div>

            {/* 服务记录 */}
            <div>
              <h3 className="text-sm font-semibold text-[#7A5C48] mb-3 flex items-center gap-2">
                <span>📋</span> 服务记录（{detailServices.length}次）
              </h3>
              {detailServices.length === 0 ? (
                <p className="text-sm text-[#A08F80] text-center py-4">暂无服务记录</p>
              ) : (
                <div className="space-y-3">
                  {detailServices.map((s, i) => (
                    <div key={i} className="rounded-lg border border-[#E8DFD2] p-3" style={{ backgroundColor: '#FAF5F0' }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs border-0 ${s.customerType === 'old' ? 'bg-[#EEF1EB] text-[#5C7258]' : 'bg-[#FFF1E3] text-[#B97C4A]'}`}>
                            {s.customerType === 'old' ? '老客' : '新客'}
                          </Badge>
                          <span className="text-sm font-medium text-[#4A3A2F]">{s.serviceDate}</span>
                        </div>
                        <span className="text-xs text-[#C89F7F]">信息费 ¥{s.infoFee || 0}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-[#726255] mb-2">
                        <p>客服: <span className="text-[#4A3A2F] font-medium">{s.csName || '-'}</span></p>
                        <p>店铺: <span className="text-[#4A3A2F] font-medium">{s.storeName || '-'}</span></p>
                        <p>服务员: <span className="text-[#4A3A2F] font-medium">{s.waiterName || '-'}</span></p>
                        <p>评分: <span className="text-[#F59E0B]">{'★'.repeat(s.rating || 5)}{'☆'.repeat(5 - (s.rating || 5))}</span></p>
                      </div>
                      {s.comment && (
                        <p className="text-xs text-[#A08F80] bg-[#F5EFE6] rounded p-2">💬 {s.comment}</p>
                      )}
                      {s.tags && s.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {s.tags.map((t: string, j: number) => (
                            <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-[#E8DFD2] text-[#726255]">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 画像分析 */}
            {detailServices.length > 1 && (
              <div className="mt-4 rounded-xl border border-[#E8DFD2] p-4" style={{ backgroundColor: '#FFF1E3' }}>
                <h3 className="text-sm font-semibold text-[#B97C4A] mb-2">🎯 客户画像</h3>
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div>
                    <p className="text-[#A08F80]">回头次数</p>
                    <p className="font-bold text-[#4A3A2F] text-lg">{detailServices.length}</p>
                  </div>
                  <div>
                    <p className="text-[#A08F80]">常去店铺</p>
                    <p className="font-bold text-[#4A3A2F]">{Array.from(new Set(detailServices.map(s => s.storeName).filter(Boolean))).join(', ') || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[#A08F80]">偏好客服</p>
                    <p className="font-bold text-[#4A3A2F]">{Array.from(new Set(detailServices.map(s => s.csName).filter(Boolean))).join(', ') || '-'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
