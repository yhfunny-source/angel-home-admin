import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { storage } from '@/lib/storage';

// ============ 类型定义 ============
interface Recruitment {
  id: string; name: string; gender: string; age: number;
  phone: string; position: string; source: string;
  status: 'pending' | 'interview' | 'hired' | 'rejected';
  interviewDate?: string; notes: string; createdAt: string;
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
  id: string; phoneNumber: string; fromStaff: string; toStaff: string;
  transferDate: string; wechatBind: string; notes: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待处理', color: 'bg-[#FFF1E3] text-[#A87F5F]' },
  interview: { label: '面试中', color: 'bg-[#E8F0FE] text-[#4A7BD9]' },
  hired: { label: '已录用', color: 'bg-[#EEF1EB] text-[#4A5E48]' },
  rejected: { label: '已拒绝', color: 'bg-[#F5DCD6] text-[#8C3F30]' },
  normal: { label: '正常', color: 'bg-[#EEF1EB] text-[#4A5E48]' },
  late: { label: '迟到', color: 'bg-[#FFF1E3] text-[#A87F5F]' },
  early: { label: '早退', color: 'bg-[#FFF1E3] text-[#A87F5F]' },
  absent: { label: '缺勤', color: 'bg-[#F5DCD6] text-[#8C3F30]' },
  leave: { label: '请假', color: 'bg-[#E8F0FE] text-[#4A7BD9]' },
  good: { label: '正常', color: 'bg-[#EEF1EB] text-[#4A5E48]' },
  repairing: { label: '维修中', color: 'bg-[#FFF1E3] text-[#A87F5F]' },
  scrapped: { label: '报废', color: 'bg-[#F5DCD6] text-[#8C3F30]' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || { label: status, color: 'bg-gray-100 text-gray-600' };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>;
}

// ============ 主组件 ============
export default function HR() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'recruit' | 'resign' | 'attendance' | 'asset' | 'phone'>('recruit');
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const user = storage.get('user') ? JSON.parse(storage.get('user')!) : null;
  const isBoss = (user?.roles || []).includes('BOSS');
  const token = storage.get('token') || '';
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 各模块数据
  const [recruits, setRecruits] = useState<Recruitment[]>([]);
  const [resigns, setResigns] = useState<Resignation[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [assets, setAssets] = useState<CompanyAsset[]>([]);
  const [phones, setPhones] = useState<PhoneTransfer[]>([]);

  // 表单状态
  const [form, setForm] = useState<Record<string, any>>({});

  const tabs = [
    { key: 'recruit' as const, label: '员工招聘', icon: '👥' },
    { key: 'resign' as const, label: '员工离职', icon: '🚪' },
    { key: 'attendance' as const, label: '员工考勤', icon: '📅' },
    { key: 'asset' as const, label: '公司资产', icon: '🏢' },
    { key: 'phone' as const, label: '手机流转', icon: '📱' },
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
            {isBoss && (
              <Button size="sm" onClick={openAdd} className="bg-[#C89F7F] text-white hover:bg-[#B88F6F] text-xs h-8">+ 新增</Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate('/portal')} className="text-xs h-8" style={{ color: '#726255', borderColor: '#E8DFD2' }}>返回</Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        {/* Tab */}
        <div className="flex border-b mb-4 overflow-x-auto" style={{ borderColor: '#E8DFD2' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`shrink-0 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${tab === t.key ? 'text-[#C89F7F] border-[#C89F7F]' : 'text-[#A08F80] border-transparent'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ===== 员工招聘 ===== */}
        {tab === 'recruit' && (
          <DataTable
            columns={['姓名', '性别', '年龄', '应聘岗位', '来源', '状态', '操作']}
            data={recruits}
            renderRow={r => (
              <>
                <td className="px-3 py-3 font-medium">{r.name}</td>
                <td className="px-3 py-3">{r.gender}</td>
                <td className="px-3 py-3">{r.age}</td>
                <td className="px-3 py-3">{r.position}</td>
                <td className="px-3 py-3">{r.source}</td>
                <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-3 py-3 text-center">
                  {isBoss && <>
                    <button onClick={() => openEdit(r)} className="text-xs text-[#C89F7F] mr-2">编辑</button>
                    <button onClick={() => handleDelete(r.id)} className="text-xs text-[#B85C4A]">删除</button>
                  </>}
                </td>
              </>
            )}
            mobileCard={r => (
              <div className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{r.name} · {r.gender} · {r.age}岁</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="text-xs text-[#A08F80]">岗位: {r.position} | 来源: {r.source}</div>
                <div className="text-xs text-[#A08F80]">手机: {r.phone}</div>
              </div>
            )}
          />
        )}

        {/* ===== 员工离职 ===== */}
        {tab === 'resign' && (
          <DataTable
            columns={['姓名', '岗位', '入职日期', '离职日期', '离职原因', '交接状态', '操作']}
            data={resigns}
            renderRow={r => (
              <>
                <td className="px-3 py-3 font-medium">{r.staffName}</td>
                <td className="px-3 py-3">{r.position}</td>
                <td className="px-3 py-3">{r.joinDate}</td>
                <td className="px-3 py-3">{r.leaveDate}</td>
                <td className="px-3 py-3">{r.reason}</td>
                <td className="px-3 py-3">{r.handoverStatus}</td>
                <td className="px-3 py-3 text-center">
                  {isBoss && <>
                    <button onClick={() => openEdit(r)} className="text-xs text-[#C89F7F] mr-2">编辑</button>
                    <button onClick={() => handleDelete(r.id)} className="text-xs text-[#B85C4A]">删除</button>
                  </>}
                </td>
              </>
            )}
            mobileCard={r => (
              <div className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{r.staffName}</span>
                  <span className="text-xs text-[#A08F80]">{r.position}</span>
                </div>
                <div className="text-xs text-[#A08F80]">入职: {r.joinDate} → 离职: {r.leaveDate}</div>
                <div className="text-xs text-[#A08F80]">原因: {r.reason}</div>
              </div>
            )}
          />
        )}

        {/* ===== 员工考勤 ===== */}
        {tab === 'attendance' && (
          <DataTable
            columns={['姓名', '日期', '上班', '下班', '状态', '备注', '操作']}
            data={attendances}
            renderRow={r => (
              <>
                <td className="px-3 py-3 font-medium">{r.staffName}</td>
                <td className="px-3 py-3">{r.date}</td>
                <td className="px-3 py-3">{r.checkIn}</td>
                <td className="px-3 py-3">{r.checkOut}</td>
                <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-3 py-3">{r.notes}</td>
                <td className="px-3 py-3 text-center">
                  {isBoss && <>
                    <button onClick={() => openEdit(r)} className="text-xs text-[#C89F7F] mr-2">编辑</button>
                    <button onClick={() => handleDelete(r.id)} className="text-xs text-[#B85C4A]">删除</button>
                  </>}
                </td>
              </>
            )}
            mobileCard={r => (
              <div className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{r.staffName}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="text-xs text-[#A08F80]">{r.date} | 上班: {r.checkIn} 下班: {r.checkOut}</div>
              </div>
            )}
          />
        )}

        {/* ===== 公司资产 ===== */}
        {tab === 'asset' && (
          <DataTable
            columns={['资产名称', '类别', '数量', '位置', '状态', '价值', '操作']}
            data={assets}
            renderRow={r => (
              <>
                <td className="px-3 py-3 font-medium">{r.name}</td>
                <td className="px-3 py-3">{r.category}</td>
                <td className="px-3 py-3">{r.quantity}</td>
                <td className="px-3 py-3">{r.location}</td>
                <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-3 py-3">{r.value ? `¥${r.value}` : '-'}</td>
                <td className="px-3 py-3 text-center">
                  {isBoss && <>
                    <button onClick={() => openEdit(r)} className="text-xs text-[#C89F7F] mr-2">编辑</button>
                    <button onClick={() => handleDelete(r.id)} className="text-xs text-[#B85C4A]">删除</button>
                  </>}
                </td>
              </>
            )}
            mobileCard={r => (
              <div className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{r.name}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="text-xs text-[#A08F80]">{r.category} | 数量: {r.quantity} | 位置: {r.location}</div>
              </div>
            )}
          />
        )}

        {/* ===== 手机流转 ===== */}
        {tab === 'phone' && (
          <DataTable
            columns={['手机号', '移交人', '接收人', '交接日期', '微信绑定', '操作']}
            data={phones}
            renderRow={r => (
              <>
                <td className="px-3 py-3 font-medium">{r.phoneNumber}</td>
                <td className="px-3 py-3">{r.fromStaff}</td>
                <td className="px-3 py-3">{r.toStaff}</td>
                <td className="px-3 py-3">{r.transferDate}</td>
                <td className="px-3 py-3">{r.wechatBind}</td>
                <td className="px-3 py-3 text-center">
                  {isBoss && <>
                    <button onClick={() => openEdit(r)} className="text-xs text-[#C89F7F] mr-2">编辑</button>
                    <button onClick={() => handleDelete(r.id)} className="text-xs text-[#B85C4A]">删除</button>
                  </>}
                </td>
              </>
            )}
            mobileCard={r => (
              <div className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{r.phoneNumber}</span>
                  <span className="text-xs text-[#A08F80]">{r.transferDate}</span>
                </div>
                <div className="text-xs text-[#A08F80]">{r.fromStaff} → {r.toStaff} | 微信: {r.wechatBind}</div>
              </div>
            )}
          />
        )}
      </div>

      {/* 弹窗 */}
      {showDialog && (
        <div className="fixed inset-0 bg-[#4A3A2F]/40 flex items-center justify-center z-50" onMouseDown={() => setShowDialog(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-5 max-h-[80vh] overflow-y-auto" onMouseDown={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#4A3A2F] mb-4">
              {editId ? '编辑' : '新增'}{tabs.find(t => t.key === tab)?.label}
            </h3>
            <div className="space-y-3">
              {tab === 'recruit' && <>
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="姓名*" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" />
                  <input placeholder="年龄" type="number" value={form.age || ''} onChange={e => setForm({ ...form, age: parseInt(e.target.value) || 0 })} className="px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select value={form.gender || ''} onChange={e => setForm({ ...form, gender: e.target.value })} className="px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm">
                    <option value="">性别</option><option value="男">男</option><option value="女">女</option>
                  </select>
                  <input placeholder="手机号" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} className="px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" />
                </div>
                <input placeholder="应聘岗位*" value={form.position || ''} onChange={e => setForm({ ...form, position: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" />
                <input placeholder="来源（如BOSS直聘/58同城）" value={form.source || ''} onChange={e => setForm({ ...form, source: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" />
                <select value={form.status || 'pending'} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm">
                  <option value="pending">待处理</option><option value="interview">面试中</option><option value="hired">已录用</option><option value="rejected">已拒绝</option>
                </select>
                <input placeholder="备注" value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" />
              </>}
              {tab === 'resign' && <>
                <input placeholder="员工姓名*" value={form.staffName || ''} onChange={e => setForm({ ...form, staffName: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" />
                <input placeholder="岗位" value={form.position || ''} onChange={e => setForm({ ...form, position: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" placeholder="入职日期" value={form.joinDate || ''} onChange={e => setForm({ ...form, joinDate: e.target.value })} className="px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" />
                  <input type="date" placeholder="离职日期" value={form.leaveDate || ''} onChange={e => setForm({ ...form, leaveDate: e.target.value })} className="px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" />
                </div>
                <input placeholder="离职原因" value={form.reason || ''} onChange={e => setForm({ ...form, reason: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" />
                <input placeholder="交接状态" value={form.handoverStatus || ''} onChange={e => setForm({ ...form, handoverStatus: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" />
                <input placeholder="备注" value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" />
              </>}
              {tab === 'attendance' && <>
                <input placeholder="员工姓名*" value={form.staffName || ''} onChange={e => setForm({ ...form, staffName: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" />
                <input type="date" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="time" placeholder="上班时间" value={form.checkIn || ''} onChange={e => setForm({ ...form, checkIn: e.target.value })} className="px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" />
                  <input type="time" placeholder="下班时间" value={form.checkOut || ''} onChange={e => setForm({ ...form, checkOut: e.target.value })} className="px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" />
                </div>
                <select value={form.status || 'normal'} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm">
                  <option value="normal">正常</option><option value="late">迟到</option><option value="early">早退</option><option value="absent">缺勤</option><option value="leave">请假</option>
                </select>
                <input placeholder="备注" value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" />
              </>}
              {tab === 'asset' && <>
                <input placeholder="资产名称*" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" />
                <input placeholder="类别" value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" placeholder="数量" value={form.quantity || ''} onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} className="px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" />
                  <input type="number" placeholder="价值(元)" value={form.value || ''} onChange={e => setForm({ ...form, value: parseFloat(e.target.value) || 0 })} className="px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" />
                </div>
                <input placeholder="存放位置" value={form.location || ''} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" />
                <select value={form.status || 'good'} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm">
                  <option value="good">正常</option><option value="repairing">维修中</option><option value="scrapped">报废</option>
                </select>
                <input placeholder="备注" value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" />
              </>}
              {tab === 'phone' && <>
                <input placeholder="手机号*" value={form.phoneNumber || ''} onChange={e => setForm({ ...form, phoneNumber: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" />
                <input placeholder="移交人" value={form.fromStaff || ''} onChange={e => setForm({ ...form, fromStaff: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" />
                <input placeholder="接收人" value={form.toStaff || ''} onChange={e => setForm({ ...form, toStaff: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" />
                <input type="date" placeholder="交接日期" value={form.transferDate || ''} onChange={e => setForm({ ...form, transferDate: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" />
                <input placeholder="微信绑定情况" value={form.wechatBind || ''} onChange={e => setForm({ ...form, wechatBind: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" />
                <input placeholder="备注" value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E8DFD2] text-sm" />
              </>}
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setShowDialog(false)}>取消</Button>
              <Button className="flex-1 bg-[#C89F7F] text-white hover:bg-[#B88F6F]" onClick={handleSubmit}>保存</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ 通用表格组件 ============
function DataTable<T>({ columns, data, renderRow, mobileCard }: {
  columns: string[]; data: T[];
  renderRow: (item: T) => React.ReactNode;
  mobileCard: (item: T) => React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#E8DFD2] bg-white shadow-sm overflow-hidden">
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#FAF5F0] text-[#726255]">
            <tr>{columns.map(c => <th key={c} className="px-3 py-3 text-left font-medium">{c}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-[#F0E8DF]">
            {data.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-[#A08F80]">暂无记录</td></tr>
            ) : data.map((item, i) => (
              <tr key={i} className="hover:bg-[#FAF5F0]">{renderRow(item)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="sm:hidden divide-y divide-[#F0E8DF]">
        {data.length === 0 ? (
          <div className="px-4 py-8 text-center text-[#A08F80] text-sm">暂无记录</div>
        ) : data.map((item, i) => (
          <div key={i}>{mobileCard(item)}</div>
        ))}
      </div>
    </div>
  );
}
