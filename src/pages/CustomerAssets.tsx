import { useState, useEffect, useMemo } from 'react';
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
  const [sortKey, setSortKey] = useState<'lastContactDate' | 'orderCount' | 'totalSpend'>('lastContactDate');
  const [sortDesc, setSortDesc] = useState(true);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await getCustomers({
        search: search || undefined,
        type: filter === 'all' ? undefined : filter,
        page: 1,
        pageSize: 200,
      });
      setCustomers(res.list || []);
      setTotal(res.total || 0);
    } catch (e: any) {
      toast.error('获取客户列表失败: ' + (e.message || '请检查网络'));
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

  // 排序后的客户列表
  const sortedCustomers = useMemo(() => {
    const list = [...customers];
    list.sort((a, b) => {
      const aVal = a[sortKey] || 0;
      const bVal = b[sortKey] || 0;
      if (sortDesc) return bVal > aVal ? 1 : -1;
      return aVal > bVal ? 1 : -1;
    });
    return list;
  }, [customers, sortKey, sortDesc]);

  const handleSort = (key: 'lastContactDate' | 'orderCount' | 'totalSpend') => {
    if (sortKey === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  };

  // 获取客户的主联系方式和类型
  const getContactInfo = (c: Customer) => {
    if (c.phone) return { label: c.phone, type: '手机' };
    if (c.wechat) return { label: c.wechat, type: '微信' };
    if (c.qq) return { label: c.qq, type: 'QQ' };
    return { label: '匿名', type: '-' };
  };

  // VIP等级显示
  const getVipBadge = (c: Customer) => {
    if (c.isVip && c.orderCount >= 10) return { label: 'SVIP', class: 'bg-[#8B4513] text-white border-[#8B4513]' };
    if (c.isVip && c.orderCount >= 5) return { label: 'MVP', class: 'bg-[#C89F7F] text-white border-[#C89F7F]' };
    if (c.isVip) return { label: 'VIP', class: 'bg-[#F59E0B] text-white border-[#F59E0B]' };
    return null;
  };

  const filterTabs = [
    { key: 'all' as const, label: '全部', count: total },
    { key: 'new' as const, label: '新客', count: customers.filter(c => c.orderCount <= 1).length },
    { key: 'old' as const, label: '老客', count: customers.filter(c => c.orderCount > 1).length },
    { key: 'vip' as const, label: 'VIP', count: customers.filter(c => c.isVip).length },
  ];

  const SortIcon = ({ col }: { col: 'lastContactDate' | 'orderCount' | 'totalSpend' }) => {
    if (sortKey !== col) return <span className="text-[#D0C4B8] ml-1">⇅</span>;
    return <span className="text-[#C89F7F] ml-1">{sortDesc ? '↓' : '↑'}</span>;
  };

  // 导出CSV
  const exportCSV = () => {
    const headers = ['账号', '类型', '姓名', 'VIP', '消费次数', '消费金额', '关联客服', '关联服务员', '来源', '首次接触', '最近接触'];
    const rows = customers.map(c => {
      const ci = getContactInfo(c);
      const vip = getVipBadge(c);
      return [
        ci.label,
        ci.type,
        c.name || '-',
        vip?.label || '-',
        String(c.orderCount),
        String(c.totalSpend || 0),
        (c.relatedCs || []).join('、') || '-',
        (c.relatedWaiters || []).join('、') || '-',
        `${c.sourceStoreName || '-'} · ${c.sourceCsName || '-'}`,
        c.firstContactDate || '-',
        c.lastContactDate || '-',
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `客户资产_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success('导出成功');
  };

  return (
    <div className="min-h-screen bg-[#FAF5F0]">
      {/* Header */}
      <header className="border-b border-[#E8DFD2] bg-white">
        <div className="max-w-[1600px] mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #C89F7F, #B88F6F)' }}>
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-semibold text-[#4A3A2F] truncate">客户存档</span>
            <span className="text-xs text-[#A08F80] ml-2">共 {total} 位客户</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="text-[#726255] border-[#E8DFD2] whitespace-nowrap text-xs">
              {syncing ? '同步中...' : '同步订单'}
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} className="text-[#726255] border-[#E8DFD2] whitespace-nowrap text-xs">
              导出数据
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin')} className="text-[#726255] border-[#E8DFD2] text-xs">返回管理</Button>
            <Button variant="outline" size="sm" onClick={() => { storage.clear(); navigate('/login'); }} className="text-[#726255] border-[#E8DFD2] text-xs">退出</Button>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-4 py-4">
        {/* 搜索 + 筛选 */}
        <div className="flex items-center gap-3 mb-3">
          <Input
            placeholder="搜索姓名/电话/微信..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-64 h-8 text-sm"
          />
          <div className="flex gap-1">
            {filterTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  filter === tab.key
                    ? 'bg-[#C89F7F] text-white'
                    : 'bg-white text-[#726255] border border-[#E8DFD2] hover:bg-[#F5EFE6]'
                }`}
              >
                {tab.label}({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* 客户表格 */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-[#C89F7F] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12 text-[#A08F80] rounded-lg border border-[#E8DFD2] bg-white">
            <div className="text-4xl mb-3">👥</div>
            <p>暂无客户数据</p>
            <p className="text-xs mt-2">请点击「同步订单」从已有订单中提取客户资料</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-[#E8DFD2] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F5EFE6] border-b border-[#E8DFD2]">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-[#6B4A38] w-[140px]">账号</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-[#6B4A38] w-[60px]">类型</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-[#6B4A38] w-[60px]">VIP</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-[#6B4A38] w-[70px] cursor-pointer hover:text-[#C89F7F]" onClick={() => handleSort('orderCount')}>
                      消费次数{SortIcon({ col: 'orderCount' })}
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-[#6B4A38] w-[90px] cursor-pointer hover:text-[#C89F7F]" onClick={() => handleSort('totalSpend')}>
                      消费金额{SortIcon({ col: 'totalSpend' })}
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-[#6B4A38] min-w-[120px]">关联客服</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-[#6B4A38] min-w-[120px]">关联服务员</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-[#6B4A38] w-[120px]">备注</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-[#6B4A38] w-[140px]">来源</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-[#6B4A38] w-[100px] cursor-pointer hover:text-[#C89F7F]" onClick={() => handleSort('lastContactDate')}>
                      时间{SortIcon({ col: 'lastContactDate' })}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCustomers.map((c, idx) => {
                    const ci = getContactInfo(c);
                    const vip = getVipBadge(c);
                    const isEven = idx % 2 === 0;
                    return (
                      <tr
                        key={c.id}
                        onClick={() => showDetail(c)}
                        className={`border-b border-[#F0E8DF] cursor-pointer transition-colors hover:bg-[#FFF8F0] ${isEven ? 'bg-white' : 'bg-[#FCFAF7]'}`}
                      >
                        <td className="px-3 py-2">
                          <span className="font-medium text-[#4A3A2F]">{ci.label}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs text-[#726255]">{ci.type}</span>
                        </td>
                        <td className="px-3 py-2">
                          {vip ? (
                            <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold ${vip.class}`}>
                              {vip.label}
                            </span>
                          ) : c.orderCount > 1 ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-xs bg-[#EEF1EB] text-[#5C7258]">老客</span>
                          ) : (
                            <span className="text-[#A08F80] text-xs">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {c.orderCount > 1 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#F5DCD6] text-[#B85C4A] text-xs font-bold">{c.orderCount}</span>
                          ) : (
                            <span className="text-[#A08F80]">{c.orderCount}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className="font-medium text-[#C89F7F]">¥{c.totalSpend || 0}</span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {(c.relatedCs || []).slice(0, 3).map((name, i) => (
                              <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-[#EEF1EB] text-[#5C7258]">{name}</span>
                            ))}
                            {(c.relatedCs || []).length > 3 && (
                              <span className="text-xs text-[#A08F80]">+{(c.relatedCs || []).length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {(c.relatedWaiters || []).slice(0, 3).map((name, i) => (
                              <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-[#F5DCD6] text-[#8C3F30]">{name}</span>
                            ))}
                            {(c.relatedWaiters || []).length > 3 && (
                              <span className="text-xs text-[#A08F80]">+{(c.relatedWaiters || []).length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs text-[#726255] truncate max-w-[120px] block">{c.notes || '-'}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs text-[#726255]">
                            {c.sourceStoreName || '-'} · {c.sourceCsName || '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs text-[#A08F80]">{c.lastContactDate || '-'}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && customers.length > 0 && (
          <p className="text-center text-xs text-[#A08F80] mt-3">
            共 {total} 位客户，显示 {customers.length} 位 · 点击行查看详情
          </p>
        )}
      </div>

      {/* 客户详情弹窗 */}
      {detailOpen && detailCustomer && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-6">
          <div className="absolute inset-0 bg-[#4A3A2F]/40" onClick={() => setDetailOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
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
              <div className="rounded-lg p-3 border border-[#E8DFD2] bg-[#F5EFE6]">
                <p className="text-xs text-[#A08F80] mb-1">电话</p>
                <p className="font-medium text-[#4A3A2F]">{detailCustomer.phone || '-'}</p>
              </div>
              <div className="rounded-lg p-3 border border-[#E8DFD2] bg-[#F5EFE6]">
                <p className="text-xs text-[#A08F80] mb-1">微信</p>
                <p className="font-medium text-[#4A3A2F]">{detailCustomer.wechat || '-'}</p>
              </div>
              <div className="rounded-lg p-3 border border-[#E8DFD2] bg-[#F5EFE6]">
                <p className="text-xs text-[#A08F80] mb-1">QQ</p>
                <p className="font-medium text-[#4A3A2F]">{detailCustomer.qq || '-'}</p>
              </div>
              <div className="rounded-lg p-3 border border-[#E8DFD2] bg-[#F5EFE6]">
                <p className="text-xs text-[#A08F80] mb-1">总消费</p>
                <p className="font-bold text-[#C89F7F]">¥{detailCustomer.totalSpend || 0}</p>
              </div>
            </div>

            {/* 关联概览 */}
            <div className="mb-5 p-3 bg-[#F5EFE6] rounded-lg border border-[#E8DFD2]">
              <h3 className="text-xs font-semibold text-[#7A5C48] mb-2">关联人员</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-[#A08F80] mb-1">关联客服 ({detailCustomer.relatedCs?.length || 0})</p>
                  <div className="flex flex-wrap gap-1">
                    {(detailCustomer.relatedCs || []).map((name, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded bg-[#EEF1EB] text-[#5C7258]">{name}</span>
                    ))}
                    {(!detailCustomer.relatedCs || detailCustomer.relatedCs.length === 0) && <span className="text-xs text-[#A08F80]">-</span>}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[#A08F80] mb-1">关联服务员 ({detailCustomer.relatedWaiters?.length || 0})</p>
                  <div className="flex flex-wrap gap-1">
                    {(detailCustomer.relatedWaiters || []).map((name, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded bg-[#F5DCD6] text-[#8C3F30]">{name}</span>
                    ))}
                    {(!detailCustomer.relatedWaiters || detailCustomer.relatedWaiters.length === 0) && <span className="text-xs text-[#A08F80]">-</span>}
                  </div>
                </div>
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
                    <div key={i} className="rounded-lg border border-[#E8DFD2] p-3 bg-[#FAF5F0]">
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
              <div className="mt-4 rounded-xl border border-[#E8DFD2] p-4 bg-[#FFF1E3]">
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
