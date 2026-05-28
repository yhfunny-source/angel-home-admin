import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { storage } from '@/lib/storage';
import PhotoUploader from '@/components/PhotoUploader';

// ============ 类型定义 ============
interface Recruitment {
  id: string; name: string; gender: string; age: number;
  phone: string; position: string; source: string;
  status: 'pending' | 'interview' | 'hired' | 'rejected';
  interviewDate?: string; notes: string; createdAt: string;
  idCardFront?: string; idCardBack?: string;
}
interface Resignation {
  id: string; staffId: string; staffName: string; position: string;
  joinDate: string; leaveDate: string; reason: string;
  handoverStatus: string; notes: string; createdAt: string;
}
interface Attendance {
  id: string; staffId: string; staffName: string; date: string;
  checkIn: string; checkOut: string; status: 'normal' | 'late' | 'early' | 'absent' | 'leave';
  notes: string;
}
interface CompanyAsset {
  id: string; name: string; category: string;
  quantity: number; location: string; status: 'good' | 'repairing' | 'scrapped';
  purchaseDate?: string; value?: number; notes: string;
}
interface PhoneTransfer {
  id: string;
  phoneNumber: string;
  deviceModel: string;
  imei: string;
  simNumber: string;
  fromStaff: string;
  toStaff: string;
  transferType: 'handover' | 'return' | 'borrow';
  transferDate: string;
  returnDate?: string;
  wechatBind: 'bound' | 'unbound' | 'changed';
  status: 'pending' | 'done' | 'returned';
  condition: string;
  accessories: string;
  notes: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待处理', color: 'bg-[#FFF1E3] text-[#A87F5F] border-[#E8D5C4]' },
  interview: { label: '面试中', color: 'bg-[#E8F0FE] text-[#4A7BD9] border-[#C4D8F5]' },
  hired: { label: '已录用', color: 'bg-[#EEF1EB] text-[#4A5E48] border-[#C4D4BE]' },
  rejected: { label: '已拒绝', color: 'bg-[#F5DCD6] text-[#8C3F30] border-[#E8C4BC]' },
  normal: { label: '正常', color: 'bg-[#EEF1EB] text-[#4A5E48] border-[#C4D4BE]' },
  late: { label: '迟到', color: 'bg-[#FFF1E3] text-[#A87F5F] border-[#E8D5C4]' },
  early: { label: '早退', color: 'bg-[#FFF1E3] text-[#A87F5F] border-[#E8D5C4]' },
  absent: { label: '缺勤', color: 'bg-[#F5DCD6] text-[#8C3F30] border-[#E8C4BC]' },
  leave: { label: '请假', color: 'bg-[#E8F0FE] text-[#4A7BD9] border-[#C4D8F5]' },
  good: { label: '正常', color: 'bg-[#EEF1EB] text-[#4A5E48] border-[#C4D4BE]' },
  repairing: { label: '维修中', color: 'bg-[#FFF1E3] text-[#A87F5F] border-[#E8D5C4]' },
  scrapped: { label: '报废', color: 'bg-[#F5DCD6] text-[#8C3F30] border-[#E8C4BC]' },
  handover: { label: '移交', color: 'bg-[#E8F0FE] text-[#4A7BD9] border-[#C4D8F5]' },
  return: { label: '归还', color: 'bg-[#EEF1EB] text-[#4A5E48] border-[#C4D4BE]' },
  borrow: { label: '借用', color: 'bg-[#FFF1E3] text-[#A87F5F] border-[#E8D5C4]' },
  bound: { label: '已绑定', color: 'bg-[#EEF1EB] text-[#4A5E48] border-[#C4D4BE]' },
  unbound: { label: '未绑定', color: 'bg-[#F5DCD6] text-[#8C3F30] border-[#E8C4BC]' },
  changed: { label: '已换绑', color: 'bg-[#FFF1E3] text-[#A87F5F] border-[#E8D5C4]' },
  done: { label: '已完成', color: 'bg-[#EEF1EB] text-[#4A5E48] border-[#C4D4BE]' },
  returned: { label: '已归还', color: 'bg-[#E8F0FE] text-[#4A7BD9] border-[#C4D8F5]' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || { label: status, color: 'bg-gray-100 text-gray-600 border-gray-200' };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${s.color}`}>{s.label}</span>;
}

// ============ 主组件 ============
export default function HR() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'recruit' | 'resign' | 'attendance' | 'asset' | 'phone'>('recruit');
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const user = storage.get('user') ? JSON.parse(storage.get('user')!) : null;
  const roles: string[] = user?.roles || [];
  const canEdit = roles.includes('BOSS') || roles.includes('经理') || roles.includes('HR经理');
  const token = storage.get('token') || '';
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [recruits, setRecruits] = useState<Recruitment[]>([]);
  const [resigns, setResigns] = useState<Resignation[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [assets, setAssets] = useState<CompanyAsset[]>([]);
  const [phones, setPhones] = useState<PhoneTransfer[]>([]);
  const [form, setForm] = useState<Record<string, any>>({});
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [previewImage, setPreviewImage] = useState('');

  const tabs = [
    { key: 'recruit' as const, label: '招聘', icon: '👥', count: recruits.length },
    { key: 'resign' as const, label: '离职', icon: '🚪', count: resigns.length },
    { key: 'attendance' as const, label: '考勤', icon: '📅', count: attendances.length },
    { key: 'asset' as const, label: '资产', icon: '🏢', count: assets.length },
    { key: 'phone' as const, label: '手机流转', icon: '📱', count: phones.length },
  ];

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    try {
      const res = await fetch(`/api/hr/${tab}`, { headers });
      const data = await res.json();
      if (data.success) {
        switch (tab) {
          case 'recruit': setRecruits(data.data); break;
          case 'resign': setResigns(data.data); break;
          case 'attendance': setAttendances(data.data); break;
          case 'asset': setAssets(data.data); break;
          case 'phone': setPhones(data.data); break;
        }
      }
    } catch { /* ignore */ }
  };

  const handleSubmit = async () => {
    try {
      const url = editId ? `/api/hr/${tab}/${editId}` : `/api/hr/${tab}`;
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) { toast.success(editId ? '修改成功' : '添加成功'); setShowDialog(false); setEditId(null); loadData(); }
      else toast.error(data.message || '操作失败');
    } catch (e: any) { toast.error('操作失败: ' + e.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除？')) return;
    try {
      const res = await fetch(`/api/hr/${tab}/${id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (data.success) { toast.success('删除成功'); loadData(); }
    } catch { }
  };

  const openAdd = () => { setEditId(null); setForm({}); setShowDialog(true); };
  const openEdit = (item: any) => { setEditId(item.id); setForm({ ...item }); setShowDialog(true); };

  // 统计数据
  const stats = useMemo(() => {
    switch (tab) {
      case 'recruit':
        return [
          { label: '全部应聘', value: recruits.length, color: 'from-[#8C6A53] to-[#7A5C48]' },
          { label: '待处理', value: recruits.filter(r => r.status === 'pending').length, color: 'from-[#A87F5F] to-[#967055]' },
          { label: '面试中', value: recruits.filter(r => r.status === 'interview').length, color: 'from-[#5C7A9E] to-[#4A6A8E]' },
          { label: '已录用', value: recruits.filter(r => r.status === 'hired').length, color: 'from-[#5C7258] to-[#4A5E48]' },
        ];
      case 'resign':
        return [
          { label: '离职人数', value: resigns.length, color: 'from-[#8C6A53] to-[#7A5C48]' },
          { label: '本月离职', value: resigns.filter(r => r.leaveDate?.startsWith(new Date().toISOString().slice(0, 7))).length, color: 'from-[#A87F5F] to-[#967055]' },
          { label: '已完成交接', value: resigns.filter(r => r.handoverStatus?.includes('完成')).length, color: 'from-[#5C7258] to-[#4A5E48]' },
          { label: '待交接', value: resigns.filter(r => !r.handoverStatus?.includes('完成')).length, color: 'from-[#B85C4A] to-[#9A4C3A]' },
        ];
      case 'attendance':
        return [
          { label: '记录数', value: attendances.length, color: 'from-[#8C6A53] to-[#7A5C48]' },
          { label: '正常', value: attendances.filter(a => a.status === 'normal').length, color: 'from-[#5C7258] to-[#4A5E48]' },
          { label: '迟到/早退', value: attendances.filter(a => a.status === 'late' || a.status === 'early').length, color: 'from-[#A87F5F] to-[#967055]' },
          { label: '缺勤', value: attendances.filter(a => a.status === 'absent').length, color: 'from-[#B85C4A] to-[#9A4C3A]' },
        ];
      case 'asset':
        return [
          { label: '资产总数', value: assets.length, color: 'from-[#8C6A53] to-[#7A5C48]' },
          { label: '正常', value: assets.filter(a => a.status === 'good').length, color: 'from-[#5C7258] to-[#4A5E48]' },
          { label: '维修中', value: assets.filter(a => a.status === 'repairing').length, color: 'from-[#A87F5F] to-[#967055]' },
          { label: '报废', value: assets.filter(a => a.status === 'scrapped').length, color: 'from-[#B85C4A] to-[#9A4C3A]' },
        ];
      case 'phone':
        return [
          { label: '流转记录', value: phones.length, color: 'from-[#8C6A53] to-[#7A5C48]' },
          { label: '移交', value: phones.filter(p => p.transferType === 'handover').length, color: 'from-[#5C7A9E] to-[#4A6A8E]' },
          { label: '借用', value: phones.filter(p => p.transferType === 'borrow').length, color: 'from-[#A87F5F] to-[#967055]' },
          { label: '已归还', value: phones.filter(p => p.status === 'returned').length, color: 'from-[#5C7258] to-[#4A5E48]' },
        ];
      default: return [];
    }
  }, [tab, recruits, resigns, attendances, assets, phones]);

  // 搜索过滤
  const filterData = <T extends Record<string, any>>(data: T[]): T[] => {
    return data.filter(item => {
      const matchesSearch = !search || Object.values(item).some(v => String(v).toLowerCase().includes(search.toLowerCase()));
      const matchesStatus = !filterStatus || item.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF5F0' }}>
      {/* Header */}
      <header className="border-b sticky top-0 z-30" style={{ backgroundColor: '#FFFFFF', borderColor: '#E8DFD2' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #5C7258, #4A5E48)' }}>
              <span className="text-white font-bold text-sm">👔</span>
            </div>
            <span className="font-semibold text-sm sm:text-base" style={{ color: '#4A3A2F' }}>人力资源</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={openAdd} className="bg-[#C89F7F] text-white hover:bg-[#B88F6F] text-xs h-8">+ 新增</Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/portal')} className="text-xs h-8" style={{ color: '#726255', borderColor: '#E8DFD2' }}>返回</Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {stats.map((s, i) => (
            <div key={i} className="rounded-xl p-3 sm:p-4 text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${s.color.includes('8C6A53') ? '#C89F7F, #B08D6F' : s.color.includes('5C7258') ? '#8C9E7A, #7A8E6A' : s.color.includes('5C7A9E') ? '#7A9EC0, #6A8EB0' : s.color.includes('B85C4A') ? '#C07A6A, #B06A5A' : '#A09080, #908070'})` }}>
              <p className="text-2xl sm:text-3xl font-bold">{s.value}</p>
              <p className="text-xs opacity-90 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tab + 搜索 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex border-b overflow-x-auto" style={{ borderColor: '#E8DFD2' }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => { setTab(t.key); setSearch(''); setFilterStatus(''); }}
                className={`shrink-0 px-3 sm:px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${tab === t.key ? 'text-[#C89F7F] border-[#C89F7F]' : 'text-[#A08F80] border-transparent hover:text-[#726255]'}`}>
                {t.icon} {t.label} <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-[#C89F7F] text-white' : 'bg-[#E8DFD2] text-[#726255]'}`}>{t.count}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" placeholder="搜索..." value={search} onChange={e => setSearch(e.target.value)}
              className="h-9 px-3 rounded-lg border border-[#E8DFD2] text-sm bg-white w-40" />
            {tab !== 'phone' && (
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="h-9 px-2 rounded-lg border border-[#E8DFD2] text-sm bg-white">
                <option value="">全部状态</option>
                {tab === 'recruit' && <><option value="pending">待处理</option><option value="interview">面试中</option><option value="hired">已录用</option><option value="rejected">已拒绝</option></>}
                {tab === 'attendance' && <><option value="normal">正常</option><option value="late">迟到</option><option value="early">早退</option><option value="absent">缺勤</option><option value="leave">请假</option></>}
                {tab === 'asset' && <><option value="good">正常</option><option value="repairing">维修中</option><option value="scrapped">报废</option></>}
              </select>
            )}
            {tab === 'phone' && (
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="h-9 px-2 rounded-lg border border-[#E8DFD2] text-sm bg-white">
                <option value="">全部</option>
                <option value="handover">移交</option>
                <option value="borrow">借用</option>
                <option value="return">归还</option>
                <option value="pending">待处理</option>
                <option value="done">已完成</option>
                <option value="returned">已归还</option>
              </select>
            )}
          </div>
        </div>

        {/* ===== 员工招聘 ===== */}
        {tab === 'recruit' && (
          <DataTable data={filterData(recruits)} columns={['姓名', '性别', '应聘岗位', '状态', '操作']}>
            {r => (
              <>
                <td className="px-4 py-3">
                  <div className="font-medium text-[#4A3A2F]">{r.name}</div>
                  <div className="text-xs text-[#A08F80]">{r.age}岁 | {r.phone}</div>
                  {(r.idCardFront || r.idCardBack) && (
                    <div className="flex gap-1 mt-1">
                      {r.idCardFront && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E8F0FE] text-[#4A7BD9] cursor-pointer" onClick={(e) => { e.stopPropagation(); setPreviewImage(r.idCardFront!); }}>正面</span>}
                      {r.idCardBack && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E8F0FE] text-[#4A7BD9] cursor-pointer" onClick={(e) => { e.stopPropagation(); setPreviewImage(r.idCardBack!); }}>反面</span>}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-[#726255]">{r.gender}</td>
                <td className="px-4 py-3 text-[#726255]">{r.position} <span className="text-xs text-[#A08F80]">| {r.source}</span></td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-center">
                  {canEdit && <div className="flex items-center gap-2 justify-center"><button onClick={() => openEdit(r)} className="text-xs text-[#C89F7F] hover:text-[#7A5C48]">编辑</button><button onClick={() => handleDelete(r.id)} className="text-xs text-[#B85C4A] hover:text-[#8C3F30]">删除</button></div>}
                </td>
              </>
            )}
          </DataTable>
        )}

        {/* ===== 员工离职 ===== */}
        {tab === 'resign' && (
          <DataTable data={filterData(resigns)} columns={['员工', '岗位', '入职→离职', '离职原因', '操作']}>
            {r => (
              <>
                <td className="px-4 py-3"><div className="font-medium text-[#4A3A2F]">{r.staffName}</div></td>
                <td className="px-4 py-3 text-[#726255]">{r.position}</td>
                <td className="px-4 py-3"><div className="text-sm text-[#726255]">{r.joinDate}</div><div className="text-sm text-[#B85C4A]">↓ {r.leaveDate}</div></td>
                <td className="px-4 py-3"><div className="text-sm text-[#726255]">{r.reason}</div><div className="text-xs text-[#A08F80] mt-0.5">交接: {r.handoverStatus}</div></td>
                <td className="px-4 py-3 text-center">{canEdit && <div className="flex items-center gap-2 justify-center"><button onClick={() => openEdit(r)} className="text-xs text-[#C89F7F] hover:text-[#7A5C48]">编辑</button><button onClick={() => handleDelete(r.id)} className="text-xs text-[#B85C4A] hover:text-[#8C3F30]">删除</button></div>}</td>
              </>
            )}
          </DataTable>
        )}

        {/* ===== 员工考勤 ===== */}
        {tab === 'attendance' && (
          <DataTable data={filterData(attendances)} columns={['姓名', '日期', '上下班', '状态', '操作']}>
            {r => (
              <>
                <td className="px-4 py-3"><div className="font-medium text-[#4A3A2F]">{r.staffName}</div></td>
                <td className="px-4 py-3 text-[#726255]">{r.date}</td>
                <td className="px-4 py-3"><div className="text-sm text-[#726255]">{r.checkIn || '-'} → {r.checkOut || '-'}</div></td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-center">{canEdit && <div className="flex items-center gap-2 justify-center"><button onClick={() => openEdit(r)} className="text-xs text-[#C89F7F] hover:text-[#7A5C48]">编辑</button><button onClick={() => handleDelete(r.id)} className="text-xs text-[#B85C4A] hover:text-[#8C3F30]">删除</button></div>}</td>
              </>
            )}
          </DataTable>
        )}

        {/* ===== 公司资产 ===== */}
        {tab === 'asset' && (
          <DataTable data={filterData(assets)} columns={['资产名称', '类别/数量', '位置', '状态', '操作']}>
            {r => (
              <>
                <td className="px-4 py-3"><div className="font-medium text-[#4A3A2F]">{r.name}</div><div className="text-xs text-[#A08F80]">{r.purchaseDate} {r.value ? `| ¥${r.value}` : ''}</div></td>
                <td className="px-4 py-3 text-[#726255]">{r.category} <span className="text-xs text-[#A08F80]">x{r.quantity}</span></td>
                <td className="px-4 py-3 text-[#726255]">{r.location}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-center">{canEdit && <div className="flex items-center gap-2 justify-center"><button onClick={() => openEdit(r)} className="text-xs text-[#C89F7F] hover:text-[#7A5C48]">编辑</button><button onClick={() => handleDelete(r.id)} className="text-xs text-[#B85C4A] hover:text-[#8C3F30]">删除</button></div>}</td>
              </>
            )}
          </DataTable>
        )}

        {/* ===== 手机流转 ===== */}
        {tab === 'phone' && (
          <DataTable data={filterData(phones)} columns={['设备信息', '流转方式', '交接人', '状态', '操作']}>
            {r => (
              <>
                <td className="px-4 py-3">
                  <div className="font-medium text-[#4A3A2F]">{r.phoneNumber}</div>
                  <div className="text-xs text-[#A08F80]">{r.deviceModel} | IMEI: {r.imei?.slice(-6) || '-'}</div>
                  <div className="text-xs text-[#A08F80]">SIM: {r.simNumber || '-'}</div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.transferType} />
                  <div className="text-xs text-[#A08F80] mt-1">{r.transferDate}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-[#726255]">{r.fromStaff} → {r.toStaff}</div>
                  <div className="text-xs text-[#A08F80]">微信: <StatusBadge status={r.wechatBind} /></div>
                </td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-center">{canEdit && <div className="flex items-center gap-2 justify-center"><button onClick={() => openEdit(r)} className="text-xs text-[#C89F7F] hover:text-[#7A5C48]">编辑</button><button onClick={() => handleDelete(r.id)} className="text-xs text-[#B85C4A] hover:text-[#8C3F30]">删除</button></div>}</td>
              </>
            )}
          </DataTable>
        )}
      </div>

      {/* 弹窗 */}
      {showDialog && (
        <div className="fixed inset-0 bg-[#4A3A2F]/40 flex items-center justify-center z-50" onMouseDown={() => setShowDialog(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-5 max-h-[85vh] overflow-y-auto" onMouseDown={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#4A3A2F] mb-4">{editId ? '编辑' : '新增'}{tabs.find(t => t.key === tab)?.label}</h3>
            <div className="space-y-3">

              {/* ===== 招聘表单 ===== */}
              {tab === 'recruit' && <>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="姓名*"><input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="form-input" placeholder="应聘者姓名" /></FormField>
                  <FormField label="年龄"><input type="number" value={form.age || ''} onChange={e => setForm({ ...form, age: parseInt(e.target.value) || 0 })} className="form-input" placeholder="年龄" /></FormField>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="性别"><select value={form.gender || ''} onChange={e => setForm({ ...form, gender: e.target.value })} className="form-input"><option value="">请选择</option><option value="男">男</option><option value="女">女</option></select></FormField>
                  <FormField label="手机号"><input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} className="form-input" placeholder="联系电话" /></FormField>
                </div>
                <FormField label="应聘岗位*"><input value={form.position || ''} onChange={e => setForm({ ...form, position: e.target.value })} className="form-input" placeholder="如：客服、派单侠" /></FormField>
                <FormField label="招聘渠道"><input value={form.source || ''} onChange={e => setForm({ ...form, source: e.target.value })} className="form-input" placeholder="如：BOSS直聘、58同城" /></FormField>
                <FormField label="应聘状态"><select value={form.status || 'pending'} onChange={e => setForm({ ...form, status: e.target.value })} className="form-input"><option value="pending">待处理</option><option value="interview">面试中</option><option value="hired">已录用</option><option value="rejected">已拒绝</option></select></FormField>

                {/* 身份证图片上传 */}
                <div className="bg-[#FAF5F0] rounded-lg p-3 space-y-3">
                  <p className="text-xs font-medium text-[#726255] uppercase tracking-wider">📷 身份证件</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[#726255] block mb-1">身份证正面</label>
                      <PhotoUploader onUpload={(url) => setForm({ ...form, idCardFront: url })} existingUrl={form.idCardFront || ''} />
                    </div>
                    <div>
                      <label className="text-xs text-[#726255] block mb-1">身份证反面</label>
                      <PhotoUploader onUpload={(url) => setForm({ ...form, idCardBack: url })} existingUrl={form.idCardBack || ''} />
                    </div>
                  </div>
                </div>

                <FormField label="备注"><textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} className="form-input resize-none" rows={2} placeholder="其他备注信息" /></FormField>
              </>}

              {/* ===== 离职表单 ===== */}
              {tab === 'resign' && <>
                <FormField label="员工姓名*"><input value={form.staffName || ''} onChange={e => setForm({ ...form, staffName: e.target.value })} className="form-input" placeholder="离职员工姓名" /></FormField>
                <FormField label="岗位"><input value={form.position || ''} onChange={e => setForm({ ...form, position: e.target.value })} className="form-input" placeholder="担任岗位" /></FormField>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="入职日期"><input type="date" value={form.joinDate || ''} onChange={e => setForm({ ...form, joinDate: e.target.value })} className="form-input" /></FormField>
                  <FormField label="离职日期*"><input type="date" value={form.leaveDate || ''} onChange={e => setForm({ ...form, leaveDate: e.target.value })} className="form-input" /></FormField>
                </div>
                <FormField label="离职原因*"><textarea value={form.reason || ''} onChange={e => setForm({ ...form, reason: e.target.value })} className="form-input resize-none" rows={2} placeholder="请填写离职原因" /></FormField>
                <FormField label="交接状态"><select value={form.handoverStatus || ''} onChange={e => setForm({ ...form, handoverStatus: e.target.value })} className="form-input"><option value="">请选择</option><option value="待交接">待交接</option><option value="交接中">交接中</option><option value="已交接完成">已交接完成</option><option value="无需交接">无需交接</option></select></FormField>
                <FormField label="备注"><textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} className="form-input resize-none" rows={2} placeholder="其他备注" /></FormField>
              </>}

              {/* ===== 考勤表单 ===== */}
              {tab === 'attendance' && <>
                <FormField label="员工姓名*"><input value={form.staffName || ''} onChange={e => setForm({ ...form, staffName: e.target.value })} className="form-input" placeholder="考勤员工姓名" /></FormField>
                <FormField label="考勤日期*"><input type="date" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })} className="form-input" /></FormField>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="上班时间"><input type="time" value={form.checkIn || ''} onChange={e => setForm({ ...form, checkIn: e.target.value })} className="form-input" /></FormField>
                  <FormField label="下班时间"><input type="time" value={form.checkOut || ''} onChange={e => setForm({ ...form, checkOut: e.target.value })} className="form-input" /></FormField>
                </div>
                <FormField label="考勤状态"><select value={form.status || 'normal'} onChange={e => setForm({ ...form, status: e.target.value })} className="form-input"><option value="normal">正常</option><option value="late">迟到</option><option value="early">早退</option><option value="absent">缺勤</option><option value="leave">请假</option></select></FormField>
                <FormField label="备注"><textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} className="form-input resize-none" rows={2} placeholder="备注信息" /></FormField>
              </>}

              {/* ===== 资产表单 ===== */}
              {tab === 'asset' && <>
                <FormField label="资产名称*"><input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="form-input" placeholder="如：办公桌椅、电脑" /></FormField>
                <FormField label="资产类别"><input value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })} className="form-input" placeholder="如：办公设备、电子设备" /></FormField>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="数量"><input type="number" value={form.quantity || ''} onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} className="form-input" placeholder="数量" /></FormField>
                  <FormField label="价值(元)"><input type="number" value={form.value || ''} onChange={e => setForm({ ...form, value: parseFloat(e.target.value) || 0 })} className="form-input" placeholder="资产价值" /></FormField>
                </div>
                <FormField label="存放位置"><input value={form.location || ''} onChange={e => setForm({ ...form, location: e.target.value })} className="form-input" placeholder="如：办公室A区" /></FormField>
                <FormField label="资产状态"><select value={form.status || 'good'} onChange={e => setForm({ ...form, status: e.target.value })} className="form-input"><option value="good">正常</option><option value="repairing">维修中</option><option value="scrapped">报废</option></select></FormField>
                <FormField label="备注"><textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} className="form-input resize-none" rows={2} placeholder="其他备注" /></FormField>
              </>}

              {/* ===== 手机流转表单（优化版） ===== */}
              {tab === 'phone' && <>
                {/* 基本信息 */}
                <div className="bg-[#FAF5F0] rounded-lg p-3 space-y-3">
                  <p className="text-xs font-medium text-[#726255] uppercase tracking-wider">📱 设备信息</p>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="手机号*"><input value={form.phoneNumber || ''} onChange={e => setForm({ ...form, phoneNumber: e.target.value })} className="form-input" placeholder="工作手机号" /></FormField>
                    <FormField label="SIM卡号"><input value={form.simNumber || ''} onChange={e => setForm({ ...form, simNumber: e.target.value })} className="form-input" placeholder="SIM卡号（可选）" /></FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="设备型号*"><input value={form.deviceModel || ''} onChange={e => setForm({ ...form, deviceModel: e.target.value })} className="form-input" placeholder="如：iPhone 15 Pro" /></FormField>
                    <FormField label="IMEI"><input value={form.imei || ''} onChange={e => setForm({ ...form, imei: e.target.value })} className="form-input" placeholder="设备IMEI码" /></FormField>
                  </div>
                </div>

                {/* 流转信息 */}
                <div className="bg-[#FAF5F0] rounded-lg p-3 space-y-3">
                  <p className="text-xs font-medium text-[#726255] uppercase tracking-wider">🔄 流转信息</p>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="移交人*"><input value={form.fromStaff || ''} onChange={e => setForm({ ...form, fromStaff: e.target.value })} className="form-input" placeholder="原持有人" /></FormField>
                    <FormField label="接收人*"><input value={form.toStaff || ''} onChange={e => setForm({ ...form, toStaff: e.target.value })} className="form-input" placeholder="新持有人" /></FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="流转类型*"><select value={form.transferType || 'handover'} onChange={e => setForm({ ...form, transferType: e.target.value })} className="form-input"><option value="handover">永久移交</option><option value="borrow">临时借用</option><option value="return">归还公司</option></select></FormField>
                    <FormField label="交接日期*"><input type="date" value={form.transferDate || ''} onChange={e => setForm({ ...form, transferDate: e.target.value })} className="form-input" /></FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="微信绑定状态"><select value={form.wechatBind || 'unbound'} onChange={e => setForm({ ...form, wechatBind: e.target.value })} className="form-input"><option value="bound">已绑定</option><option value="unbound">未绑定</option><option value="changed">已换绑</option></select></FormField>
                    <FormField label="流转状态"><select value={form.status || 'done'} onChange={e => setForm({ ...form, status: e.target.value })} className="form-input"><option value="pending">待处理</option><option value="done">已完成</option><option value="returned">已归还</option></select></FormField>
                  </div>
                  {form.transferType === 'borrow' && (
                    <FormField label="预计归还日期"><input type="date" value={form.returnDate || ''} onChange={e => setForm({ ...form, returnDate: e.target.value })} className="form-input" /></FormField>
                  )}
                </div>

                {/* 设备状况 */}
                <div className="bg-[#FAF5F0] rounded-lg p-3 space-y-3">
                  <p className="text-xs font-medium text-[#726255] uppercase tracking-wider">📝 设备状况</p>
                  <FormField label="设备外观/功能状况"><input value={form.condition || ''} onChange={e => setForm({ ...form, condition: e.target.value })} className="form-input" placeholder="如：外观完好、功能正常" /></FormField>
                  <FormField label="配件清单"><input value={form.accessories || ''} onChange={e => setForm({ ...form, accessories: e.target.value })} className="form-input" placeholder="如：充电器、数据线、手机壳" /></FormField>
                </div>

                <FormField label="备注"><textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} className="form-input resize-none" rows={2} placeholder="其他备注信息" /></FormField>
              </>}
            </div>
            <div className="flex gap-2 mt-5 pt-3 border-t border-[#E8DFD2]">
              <Button variant="outline" className="flex-1" onClick={() => setShowDialog(false)}>取消</Button>
              <Button className="flex-1 bg-[#C89F7F] text-white hover:bg-[#B88F6F]" onClick={handleSubmit}>保存</Button>
            </div>
          </div>
        </div>
      )}

      {/* 图片预览弹窗 */}
      {previewImage && (
        <div className="fixed inset-0 bg-[#4A3A2F]/60 flex items-center justify-center z-50" onMouseDown={() => setPreviewImage('')}>
          <div className="relative max-w-lg w-full mx-4" onMouseDown={e => e.stopPropagation()}>
            <img src={previewImage} alt="预览" className="w-full rounded-xl shadow-2xl" />
            <button onClick={() => setPreviewImage('')} className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-[#726255] hover:text-[#B85C4A]">✕</button>
          </div>
        </div>
      )}

      <style>{`
        .form-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid #E8DFD2;
          font-size: 0.875rem;
          background-color: white;
          color: #4A3A2F;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .form-input:focus {
          border-color: #C89F7F;
          box-shadow: 0 0 0 2px rgba(200, 159, 127, 0.15);
        }
        .form-input::placeholder {
          color: #A08F80;
        }
      `}</style>
    </div>
  );
}

// ============ 表单字段包装 ============
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-[#726255] font-medium mb-1 block">{label}</label>
      {children}
    </div>
  );
}

// ============ 通用表格组件 ============
function DataTable<T extends { id?: string }>({ columns, data, children }: {
  columns: string[]; data: T[];
  children: (item: T) => React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#E8DFD2] bg-white shadow-sm overflow-hidden">
      {/* 桌面端表格 */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#FAF5F0]">
              {columns.map(c => <th key={c} className="px-4 py-3 text-left text-xs font-medium text-[#726255] uppercase tracking-wider">{c}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0E8DF]">
            {data.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-[#A08F80]">暂无记录</td></tr>
            ) : data.map((item, i) => (
              <tr key={item.id || i} className="hover:bg-[#FAF5F0] transition-colors">{children(item)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* 移动端卡片 */}
      <div className="sm:hidden divide-y divide-[#F0E8DF]">
        {data.length === 0 ? (
          <div className="px-4 py-12 text-center text-[#A08F80] text-sm">暂无记录</div>
        ) : data.map((item, i) => (
          <MobileCard key={item.id || i}>{children(item)}</MobileCard>
        ))}
      </div>
    </div>
  );
}

// 移动端将表格行转为卡片
function MobileCard({ children }: { children: React.ReactNode }) {
  return <div className="p-4 text-sm">{children}</div>;
}
