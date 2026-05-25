import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { storage } from '@/lib/storage';
import { formatDate } from '@/lib/api';

interface Store {
  id: string;
  name: string;
}

interface ConsultRecord {
  id: string;
  storeId: string;
  storeName: string;
  csId: string;
  csName: string;
  date: string;
  consultCount: number;
  replyCount: number;
  replyUnder1Min: number;
  createdBy: string;
  createdAt: string;
}

interface DaySummary {
  totalConsult: number;
  totalReply: number;
  avgReplyRate: string;
  storeCount: number;
  records: ConsultRecord[];
}

interface MonthSummary {
  month: string;
  totalConsult: number;
  totalReply: number;
  avgReplyRate: string;
  storeCount: number;
  records: ConsultRecord[];
}

interface StoreSummary {
  storeId: string;
  storeName: string;
  totalConsult: number;
  totalReply: number;
  avgReplyRate: string;
}

export default function ConsultData() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'day' | 'month' | 'store'>('day');
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date().toISOString()));
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [daySummary, setDaySummary] = useState<DaySummary | null>(null);
  const [monthData, setMonthData] = useState<MonthSummary | null>(null);
  const [storeData, setStoreData] = useState<StoreSummary[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editRecord, setEditRecord] = useState<ConsultRecord | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const user = storage.get('user') ? JSON.parse(storage.get('user')!) : null;
  const isBoss = (user?.roles || []).includes('BOSS');

  // 新增/编辑表单
  const [form, setForm] = useState<{
    storeId: string; storeName: string; csId: string; csName: string;
    date: string; consultCount: number; replyCount: number; replyUnder1Min: number;
  }>({
    storeId: '', storeName: '', csId: '', csName: '',
    date: formatDate(new Date().toISOString()),
    consultCount: 0, replyCount: 0, replyUnder1Min: 0
  });

  const token = storage.get('token') || '';
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 加载系统店铺列表
  useEffect(() => {
    fetch('/api/stores', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (data.success) setStores(data.data || []); })
      .catch(() => {});
  }, []);

  const fetchDayData = async (date: string) => {
    try {
      const res = await fetch(`/api/consult-data/day?date=${date}`, { headers });
      const data = await res.json();
      if (data.success) setDaySummary(data.data);
    } catch (e: any) { toast.error('加载失败: ' + e.message); }
  };

  const fetchMonthData = async (month: string) => {
    try {
      const res = await fetch(`/api/consult-data/month?month=${month}`, { headers });
      const data = await res.json();
      if (data.success) setMonthData(data.data);
    } catch (e: any) { toast.error('加载失败: ' + e.message); }
  };

  const fetchStoreData = async () => {
    try {
      const res = await fetch(`/api/consult-data/by-store`, { headers });
      const data = await res.json();
      if (data.success) setStoreData(data.data);
    } catch (e: any) { toast.error('加载失败: ' + e.message); }
  };

  useEffect(() => {
    if (tab === 'day') fetchDayData(selectedDate);
    else if (tab === 'month') fetchMonthData(selectedMonth);
    else fetchStoreData();
  }, [tab, selectedDate, selectedMonth]);

  const handleSubmit = async () => {
    if (!form.storeName) { toast.error('请输入店铺名称'); return; }
    try {
      const url = editRecord ? `/api/consult-data/${editRecord.id}` : '/api/consult-data';
      const method = editRecord ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) {
        toast.success(editRecord ? '修改成功' : '添加成功');
        setShowAddDialog(false);
        setEditRecord(null);
        if (tab === 'day') fetchDayData(selectedDate);
        else if (tab === 'month') fetchMonthData(selectedMonth);
        else fetchStoreData();
      } else { toast.error(data.message || '操作失败'); }
    } catch (e: any) { toast.error('操作失败: ' + e.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这条记录？')) return;
    try {
      const res = await fetch(`/api/consult-data/${id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (data.success) {
        toast.success('删除成功');
        if (tab === 'day') fetchDayData(selectedDate);
        else if (tab === 'month') fetchMonthData(selectedMonth);
      } else { toast.error(data.message || '删除失败'); }
    } catch (e: any) { toast.error('删除失败: ' + e.message); }
  };

  const openEdit = (r: ConsultRecord) => {
    setEditRecord(r);
    setForm({
      storeId: r.storeId, storeName: r.storeName, csId: r.csId || '', csName: r.csName || '',
      date: r.date,
      consultCount: r.consultCount, replyCount: r.replyCount, replyUnder1Min: r.replyUnder1Min
    });
    setShowAddDialog(true);
  };

  const replyRate = (consult: number, reply: number) => {
    if (!consult) return '0%';
    return ((reply / consult) * 100).toFixed(0) + '%';
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF5F0' }}>
      {/* Header */}
      <header className="border-b sticky top-0 z-30" style={{ backgroundColor: '#FFFFFF', borderColor: '#E8DFD2' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #C89F7F, #B88F6F)' }}>
              <span className="text-white font-bold text-sm">📊</span>
            </div>
            <span className="font-semibold text-sm sm:text-base" style={{ color: '#4A3A2F' }}>后台咨询数据管理</span>
          </div>
          <div className="flex items-center gap-2">
            {isBoss && (
              <Button size="sm" onClick={() => { setEditRecord(null); setForm({ storeId: '', storeName: '', csId: '', csName: '', date: selectedDate, consultCount: 0, replyCount: 0, replyUnder1Min: 0 }); setShowAddDialog(true); }}
                className="bg-[#C89F7F] text-white hover:bg-[#B88F6F] text-xs h-8">
                + 录入数据
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate('/portal')} className="text-xs h-8" style={{ color: '#726255', borderColor: '#E8DFD2' }}>
              返回
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Tab 切换 */}
        <div className="flex border-b mb-4" style={{ borderColor: '#E8DFD2' }}>
          {[
            { key: 'day' as const, label: '按日查看' },
            { key: 'month' as const, label: '按月查看' },
            { key: 'store' as const, label: '按店铺查看' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-sm font-medium text-center transition-colors border-b-2 ${
                tab === t.key
                  ? 'text-[#C89F7F] border-[#C89F7F]'
                  : 'text-[#A08F80] border-transparent hover:text-[#726255]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 按日查看 */}
        {tab === 'day' && (
          <div className="space-y-4">
            {/* 日期选择 + KPI */}
            <div className="rounded-xl border border-[#E8DFD2] bg-white shadow-sm p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-[#4A3A2F]">
                  {selectedDate === formatDate(new Date().toISOString()) ? '今日汇总' : `${selectedDate} 汇总`}
                </h3>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-[#E8DFD2] text-sm text-[#4A3A2F] bg-[#FAF5F0]"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: '总咨询量', value: daySummary?.totalConsult || 0, color: 'text-[#C89F7F]' },
                  { label: '总回复数', value: daySummary?.totalReply || 0, color: 'text-[#C89F7F]' },
                  { label: '平均回复率', value: daySummary ? replyRate(daySummary.totalConsult, daySummary.totalReply) : '0%', color: 'text-[#C89F7F]' },
                  { label: '店铺数', value: daySummary?.storeCount || 0, color: 'text-[#C89F7F]' },
                ].map(kpi => (
                  <div key={kpi.label} className="bg-[#FAF5F0] rounded-xl p-4 text-center">
                    <p className="text-xs text-[#A08F80] mb-1">{kpi.label}</p>
                    <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 详细记录 */}
            <div className="rounded-xl border border-[#E8DFD2] bg-white shadow-sm overflow-hidden">
              <div className="px-4 sm:px-5 py-3 border-b border-[#E8DFD2] flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#4A3A2F]">详细记录</h3>
                <span className="text-xs text-[#A08F80]">{daySummary?.records?.length || 0} 条</span>
              </div>
              {/* 桌面表格 */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#FAF5F0] text-[#726255]">
                    <tr>
                      <th className="px-3 py-3 text-left font-medium">店铺</th>
                      <th className="px-3 py-3 text-left font-medium">客服</th>
                      <th className="px-3 py-3 text-right font-medium">咨询量</th>
                      <th className="px-3 py-3 text-right font-medium">1分回复</th>
                      <th className="px-3 py-3 text-right font-medium">回复率</th>
                      {isBoss && <th className="px-3 py-3 text-center font-medium">操作</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0E8DF]">
                    {(!daySummary?.records || daySummary.records.length === 0) ? (
                      <tr><td colSpan={isBoss ? 6 : 5} className="px-4 py-8 text-center text-[#A08F80]">暂无记录</td></tr>
                    ) : daySummary.records.map(r => (
                      <tr key={r.id} className="hover:bg-[#FAF5F0]">
                        <td className="px-3 py-3 font-medium text-[#4A3A2F]">{r.storeName}</td>
                        <td className="px-3 py-3 text-[#726255]">{r.csName || '-'}</td>
                        <td className="px-3 py-3 text-right">{r.consultCount}</td>
                        <td className="px-3 py-3 text-right">{r.replyUnder1Min}</td>
                        <td className="px-3 py-3 text-right font-medium text-[#C89F7F]">{replyRate(r.consultCount, r.replyCount)}</td>
                        {isBoss && (
                          <td className="px-3 py-3 text-center">
                            <button onClick={() => openEdit(r)} className="text-xs text-[#C89F7F] hover:text-[#A87F5F] mr-2">编辑</button>
                            <button onClick={() => handleDelete(r.id)} className="text-xs text-[#B85C4A] hover:text-[#8C3F30]">删除</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* 手机卡片 */}
              <div className="sm:hidden divide-y divide-[#F0E8DF]">
                {(!daySummary?.records || daySummary.records.length === 0) ? (
                  <div className="px-4 py-8 text-center text-[#A08F80] text-sm">暂无记录</div>
                ) : daySummary.records.map(r => (
                  <div key={r.id} className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-[#4A3A2F]">{r.storeName}</span>
                      <span className="text-sm font-medium text-[#C89F7F]">{replyRate(r.consultCount, r.replyCount)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#A08F80]">
                      <span>👤{r.csName || '-'}</span>
                      <span>咨询: {r.consultCount}</span>
                      <span>1分回复: {r.replyUnder1Min}</span>
                    </div>
                    {isBoss && (
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => openEdit(r)} className="text-xs text-[#C89F7F]">编辑</button>
                        <button onClick={() => handleDelete(r.id)} className="text-xs text-[#B85C4A]">删除</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 按月查看 */}
        {tab === 'month' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-[#E8DFD2] bg-white shadow-sm p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-[#4A3A2F]">{selectedMonth} 汇总</h3>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-[#E8DFD2] text-sm text-[#4A3A2F] bg-[#FAF5F0]"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: '总咨询量', value: monthData?.totalConsult || 0 },
                  { label: '总回复数', value: monthData?.totalReply || 0 },
                  { label: '平均回复率', value: monthData ? replyRate(monthData.totalConsult, monthData.totalReply) : '0%' },
                  { label: '店铺数', value: monthData?.storeCount || 0 },
                ].map(kpi => (
                  <div key={kpi.label} className="bg-[#FAF5F0] rounded-xl p-4 text-center">
                    <p className="text-xs text-[#A08F80] mb-1">{kpi.label}</p>
                    <p className="text-2xl font-bold text-[#C89F7F]">{kpi.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-[#E8DFD2] bg-white shadow-sm overflow-hidden">
              <div className="px-4 sm:px-5 py-3 border-b border-[#E8DFD2]">
                <h3 className="text-sm font-semibold text-[#4A3A2F]">每日明细</h3>
              </div>
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#FAF5F0] text-[#726255]">
                    <tr><th className="px-4 py-3 text-left font-medium">日期</th><th className="px-4 py-3 text-left font-medium">店铺</th><th className="px-4 py-3 text-right font-medium">咨询量</th><th className="px-4 py-3 text-right font-medium">回复数</th><th className="px-4 py-3 text-right font-medium">回复率</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0E8DF]">
                    {(!monthData?.records || monthData.records.length === 0) ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-[#A08F80]">暂无记录</td></tr>
                    ) : monthData.records.map(r => (
                      <tr key={r.id} className="hover:bg-[#FAF5F0]">
                        <td className="px-4 py-3">{r.date}</td>
                        <td className="px-4 py-3">{r.storeName}</td>
                        <td className="px-4 py-3 text-right">{r.consultCount}</td>
                        <td className="px-4 py-3 text-right">{r.replyCount}</td>
                        <td className="px-4 py-3 text-right font-medium text-[#C89F7F]">{replyRate(r.consultCount, r.replyCount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="sm:hidden divide-y divide-[#F0E8DF]">
                {(!monthData?.records || monthData.records.length === 0) ? (
                  <div className="px-4 py-8 text-center text-[#A08F80] text-sm">暂无记录</div>
                ) : monthData.records.map(r => (
                  <div key={r.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#A08F80]">{r.date}</span>
                      <span className="font-medium text-sm text-[#C89F7F]">{replyRate(r.consultCount, r.replyCount)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-medium text-sm text-[#4A3A2F]">{r.storeName}</span>
                      <span className="text-xs text-[#A08F80]">咨询{r.consultCount} 回复{r.replyCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 按店铺查看 */}
        {tab === 'store' && (
          <div className="rounded-xl border border-[#E8DFD2] bg-white shadow-sm overflow-hidden">
            <div className="px-4 sm:px-5 py-3 border-b border-[#E8DFD2] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#4A3A2F]">店铺统计</h3>
              <span className="text-xs text-[#A08F80]">{storeData.length} 家</span>
            </div>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#FAF5F0] text-[#726255]">
                  <tr><th className="px-4 py-3 text-left font-medium">店铺名称</th><th className="px-4 py-3 text-right font-medium">总咨询量</th><th className="px-4 py-3 text-right font-medium">总回复数</th><th className="px-4 py-3 text-right font-medium">平均回复率</th></tr>
                </thead>
                <tbody className="divide-y divide-[#F0E8DF]">
                  {storeData.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-[#A08F80]">暂无记录</td></tr>
                  ) : storeData.map(s => (
                    <tr key={s.storeId} className="hover:bg-[#FAF5F0]">
                      <td className="px-4 py-3 font-medium text-[#4A3A2F]">{s.storeName}</td>
                      <td className="px-4 py-3 text-right">{s.totalConsult}</td>
                      <td className="px-4 py-3 text-right">{s.totalReply}</td>
                      <td className="px-4 py-3 text-right font-medium text-[#C89F7F]">{s.avgReplyRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="sm:hidden divide-y divide-[#F0E8DF]">
              {storeData.length === 0 ? (
                <div className="px-4 py-8 text-center text-[#A08F80] text-sm">暂无记录</div>
              ) : storeData.map(s => (
                <div key={s.storeId} className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-[#4A3A2F]">{s.storeName}</span>
                    <span className="text-sm font-medium text-[#C89F7F]">{s.avgReplyRate}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#A08F80]">
                    <span>咨询: {s.totalConsult}</span>
                    <span>回复: {s.totalReply}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 录入/编辑弹窗 */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-[#4A3A2F]/40 flex items-center justify-center z-50" onMouseDown={() => setShowAddDialog(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-5" onMouseDown={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#4A3A2F] mb-4">{editRecord ? '编辑咨询数据' : '录入咨询数据'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#A08F80] mb-1 block">店铺 <span className="text-red-400">*</span></label>
                <select
                  value={form.storeId}
                  onChange={e => {
                    const s = stores.find(st => st.id === e.target.value);
                    setForm({ ...form, storeId: e.target.value, storeName: s?.name || '' });
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm bg-white"
                >
                  <option value="">请选择店铺</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-[#A08F80] mb-1 block">日期</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" />
                </div>
                <div>
                  <label className="text-xs text-[#A08F80] mb-1 block">客服 <span className="text-red-400">*</span></label>
                  <input type="text" value={form.csName} onChange={e => setForm({ ...form, csName: e.target.value, csId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" placeholder="负责客服姓名" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-[#A08F80] mb-1 block">咨询量</label>
                  <input type="number" value={form.consultCount} onChange={e => setForm({ ...form, consultCount: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" min={0} />
                </div>
                <div>
                  <label className="text-xs text-[#A08F80] mb-1 block">回复数</label>
                  <input type="number" value={form.replyCount} onChange={e => setForm({ ...form, replyCount: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" min={0} />
                </div>
                <div>
                  <label className="text-xs text-[#A08F80] mb-1 block">1分回复</label>
                  <input type="number" value={form.replyUnder1Min} onChange={e => setForm({ ...form, replyUnder1Min: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" min={0} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddDialog(false)}>取消</Button>
              <Button className="flex-1 bg-[#C89F7F] text-white hover:bg-[#B88F6F]" onClick={handleSubmit}>保存</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
