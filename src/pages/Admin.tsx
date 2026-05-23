import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { storage } from '@/lib/storage';
import {
  getUsers, getStaff, getWaiters, getStores, getOrders,
  createUser, createStaff, createWaiter, createStore,
  updateUser, updateStaff, updateWaiter, updateStore,
  deleteUser, deleteStaff, deleteWaiter, deleteStore,
  formatMoney, formatDateTime,
} from '@/lib/api';
import type { User, Staff, Waiter, Store, Order, UserRole, DailyRecord } from '@/types';
import PasswordChangeDialog from '@/components/PasswordChangeDialog';
import { getAllDailyRecords } from '@/lib/api';
import DailyRanking from '@/components/DailyRanking';

const navSections = [
  { title: '', items: [{ id: 'overview', label: '概览', icon: '\uD83D\uDCCA' }] },
  { title: '业务数据', items: [{ id: 'orders', label: '订单管理', icon: '\uD83D\uDCCB' }, { id: 'checkin', label: '打卡记录', icon: '\uD83D\uDCC5' }] },
  { title: '客户资产', items: [{ id: 'customers', label: '客户资产库', icon: '\uD83D\uDC65' }] },
  { title: '组织权限', items: [{ id: 'users', label: '用户账号', icon: '\uD83D\uDC64' }, { id: 'roles', label: '角色权限', icon: '\uD83D\uDEE1\uFE0F' }] },
  { title: '门店管理', items: [{ id: 'stores', label: '门店列表', icon: '\uD83C\uDFEA' }] },
  { title: '人员管理', items: [{ id: 'staff', label: '员工档案', icon: '\uD83D\uDCAC' }, { id: 'waiters', label: '服务员档案', icon: '\uD83D\uDC54' }] },
];

const roleColors: Record<string, string> = {
  'BOSS': 'bg-[#F5DCD6] text-[#8C3F30]',
  '经理': 'bg-[#F7EEDB] text-[#A87F5F]',
  '数据督导': 'bg-[#E5DCD0] text-[#A87F5F]',
  '客服': 'bg-[#DDE5D8] text-[#3D4F3A]',
  '派单侠': 'bg-[#E5DCD0] text-[#6B4A38]',
};

const roleOrder: UserRole[] = ['BOSS', '经理', '数据督导', '客服', '派单侠'];

export default function Admin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showBindStaff, setShowBindStaff] = useState(false);
  const [showStaffDetail, setShowStaffDetail] = useState(false);
  const [formType, setFormType] = useState('');
  const [editId, setEditId] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [deleteTarget, setDeleteTarget] = useState({ type: '', id: '', name: '' });
  const [bindStoreId, setBindStoreId] = useState('');
  const [bindStoreName, setBindStoreName] = useState('');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedBindStaffId, setSelectedBindStaffId] = useState('');
  const [detailStaff, setDetailStaff] = useState<Staff | null>(null);
  const [checkinRecords, setCheckinRecords] = useState<DailyRecord[]>([]);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinFilter, setCheckinFilter] = useState({ startDate: '', endDate: '', csName: '' });
  const [orderFilter, setOrderFilter] = useState({ status: '', search: '' });

  const currentUser = JSON.parse(storage.get('user') || '{}');

  const loadData = async () => {
    try {
      const [u, s, w, st, o] = await Promise.all([
        getUsers().catch(() => []),
        getStaff().catch(() => []),
        getWaiters().catch(() => []),
        getStores().catch(() => []),
        getOrders().catch(() => []),
      ]);
      setUsers(u); setStaff(s); setWaiters(w); setStores(st); setOrders(o);
    } catch { toast.error('数据加载失败'); }
    setLoading(false);
  };

  const loadCheckinRecords = async () => {
    setCheckinLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const start = checkinFilter.startDate || sevenDaysAgo;
      const end = checkinFilter.endDate || today;
      const records = await getAllDailyRecords({ startDate: start, endDate: end });
      console.log('[Debug] 打卡记录原始数据:', records);
      if (records.length > 0) {
        console.log('[Debug] 第一条记录:', JSON.stringify(records[0], null, 2));
      }
      setCheckinRecords(records);
    } catch (e: any) {
      console.error('[Debug] 打卡记录加载失败:', e);
      toast.error('加载打卡记录失败: ' + (e.message || '未知错误'));
    } finally {
      setCheckinLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (activeTab === 'checkin') loadCheckinRecords(); }, [activeTab, checkinFilter]);

  // Get users with customer role
  const customerUsers = users.filter(u => (u.roles || []).includes('客服'));

  const openBindStaff = (store: Store) => {
    setBindStoreId(store.id);
    setBindStoreName(store.name);
    setSelectedBindStaffId(store.staffUserId || '');
    setShowBindStaff(true);
  };

  const handleBindStaff = async () => {
    if (!bindStoreId) return;
    try {
      await updateStore(bindStoreId, { staffUserId: selectedBindStaffId || undefined });
      toast.success(selectedBindStaffId ? '客服绑定成功' : '已解除绑定');
      setShowBindStaff(false);
      loadData();
    } catch (e: any) { toast.error(e.message || '绑定失败'); }
  };

  const getStoreBoundUser = (storeId: string) => {
    const store = stores.find(s => s.id === storeId);
    if (!store?.staffUserId) return null;
    return users.find(u => u.id === store.staffUserId);
  };

  const openStaffDetail = (s: Staff) => { setDetailStaff(s); setShowStaffDetail(true); };

  const openForm = (type: string, item?: any) => {
    setFormType(type);
    setEditId(item?.id || '');
    if (type === 'user') {
      // 兼容单门店和多门店
      const boundStores = item?.storeIds
        ? item.storeIds
        : item?.storeId
          ? [item.storeId]
          : [];
      setFormData({ username: item?.username || '', name: item?.name || '', roles: (item?.roles || ['客服']) as UserRole[], phone: item?.phone || '', password: '', storeIds: boundStores });
    } else if (type === 'staff') {
      setFormData({
        name: item?.name || '', realName: item?.realName || '', phone: item?.phone || '',
        idCard: item?.idCard || '', gender: item?.gender || '女', age: item?.age ? String(item.age) : '',
        homeAddress: item?.homeAddress || '', resume: item?.resume || '',
        bankCard: item?.bankCard || '', emergencyContact: item?.emergencyContact || '',
        emergencyPhone: item?.emergencyPhone || '', entryDate: item?.entryDate || '',
        storeId: item?.storeId || '',
      });
    } else if (type === 'waiter') {
      setFormData({ name: item?.name || '', phone: item?.phone || '', age: item?.age ? String(item.age) : '', height: item?.height || '', bodyType: item?.bodyType || '', cup: item?.cup || '', gender: item?.gender || '女', tags: (item?.tags || []).join(', '), storeId: item?.storeId || '' });
    } else if (type === 'store') {
      setFormData({ name: item?.name || '', address: item?.address || '', phone: item?.phone || '', rent: item?.rent ? String(item.rent) : '', commissionRate: item?.commissionRate ? String(item.commissionRate) : '', marketingFee: item?.marketingFee ? String(item.marketingFee) : '', operatingCost: item?.operatingCost ? String(item.operatingCost) : '', staffUserId: item?.staffUserId || '' });
    }
    setShowForm(true);
  };

  const saveForm = async () => {
    try {
      console.log('saveForm type:', formType, 'editId:', editId, 'formData:', formData);
      if (!formData.name || !formData.name.trim()) {
        toast.error('请填写姓名/名称'); return;
      }
      if (formType === 'user') {
        const data: any = { username: formData.username, name: formData.name, roles: formData.roles, phone: formData.phone, status: 'active' };
        if (formData.password) data.password = formData.password;
        else if (!editId) data.password = '123456';
        // 多门店绑定（最多2个）
        const storeIds = (formData.storeIds || []).filter(Boolean);
        if (storeIds.length > 0) {
          data.storeIds = storeIds.slice(0, 2);
          data.storeId = storeIds[0]; // 主门店
        }
        editId ? await updateUser(editId, data) : await createUser(data);
      } else if (formType === 'staff') {
        const data: any = { name: formData.name.trim(), status: 'active' };
        if (formData.realName) data.realName = formData.realName.trim();
        if (formData.phone) data.phone = formData.phone.trim();
        if (formData.idCard) data.idCard = formData.idCard.trim();
        if (formData.gender) data.gender = formData.gender;
        if (formData.age) data.age = parseInt(formData.age) || null;
        if (formData.homeAddress) data.homeAddress = formData.homeAddress.trim();
        if (formData.resume) data.resume = formData.resume.trim();
        if (formData.bankCard) data.bankCard = formData.bankCard.trim();
        if (formData.emergencyContact) data.emergencyContact = formData.emergencyContact.trim();
        if (formData.emergencyPhone) data.emergencyPhone = formData.emergencyPhone.trim();
        if (formData.entryDate) data.entryDate = formData.entryDate;
        if (formData.storeId) data.storeId = formData.storeId;
        console.log('staff data:', JSON.stringify(data));
        editId ? await updateStaff(editId, data) : await createStaff(data);
      } else if (formType === 'waiter') {
        const data: any = { name: formData.name.trim(), status: 'active' };
        if (formData.phone) data.phone = formData.phone.trim();
        if (formData.age) data.age = parseInt(formData.age) || null;
        if (formData.height) data.height = formData.height.trim();
        if (formData.bodyType) data.bodyType = formData.bodyType;
        if (formData.cup) data.cup = formData.cup;
        if (formData.gender) data.gender = formData.gender;
        if (formData.tags) data.tags = formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
        if (formData.storeId) data.storeId = formData.storeId;
        data.rating = 0;
        console.log('waiter data:', JSON.stringify(data));
        editId ? await updateWaiter(editId, data) : await createWaiter(data);
      } else if (formType === 'store') {
        const data: any = { name: formData.name.trim(), address: (formData.address || '').trim(), phone: (formData.phone || '').trim(), rent: parseFloat(formData.rent) || 0, commissionRate: parseFloat(formData.commissionRate) || 0, marketingFee: parseFloat(formData.marketingFee) || 0, operatingCost: parseFloat(formData.operatingCost) || 0, status: 'active' as const };
        if (formData.staffUserId) data.staffUserId = formData.staffUserId;
        console.log('store data:', JSON.stringify(data));
        editId ? await updateStore(editId, data) : await createStore(data);
      }
      toast.success(editId ? '更新成功' : '创建成功');
      setShowForm(false); loadData();
    } catch (e: any) { console.error('saveForm error:', e); toast.error('保存失败: ' + (e.message || JSON.stringify(e))); }
  };

  const confirmDelete = (type: string, id: string, name: string) => { setDeleteTarget({ type, id, name }); setShowDelete(true); };

  const handleDelete = async () => {
    try {
      const { type, id } = deleteTarget;
      if (type === 'user') await deleteUser(id);
      else if (type === 'staff') await deleteStaff(id);
      else if (type === 'waiter') await deleteWaiter(id);
      else if (type === 'store') await deleteStore(id);
      toast.success('删除成功'); loadData();
    } catch (e: any) { toast.error(e.message || '删除失败'); }
    setShowDelete(false);
  };

  const filteredUsers = users.filter(u => !search || (u.name?.includes(search) || u.username?.includes(search)));
  const filteredStaff = staff.filter(s => !search || (s.name?.includes(search) || s.realName?.includes(search)));
  const filteredWaiters = waiters.filter(w => !search || w.name?.includes(search));
  const filteredStores = stores.filter(s => !search || (s.name?.includes(search) || s.address?.includes(search)));

  const roleStats = useMemo(() => {
    const stats: Record<string, number> = {};
    roleOrder.forEach(r => stats[r] = 0);
    users.forEach(u => (u.roles || []).forEach(r => { if (stats[r] !== undefined) stats[r]++; }));
    return stats;
  }, [users]);

  // KPI cards data - 使用真实订单数据
  const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'rated');
  const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.infoFee || 0), 0);
  const kpiCards = useMemo(() => [
    { label: '总订单', value: orders.length, icon: '\uD83D\uDCCB', color: 'bg-[#F0E8DF] text-[#B88F6F]' },
    { label: '已完成', value: completedOrders.length, icon: '\u2705', color: 'bg-[#EEF1EB] text-[#4A5E48]' },
    { label: '总收入', value: formatMoney(totalRevenue), icon: '\uD83D\uDCB0', color: 'bg-[#FFF8E6] text-[#B88F6F]' },
    { label: '营业门店', value: stores.filter(s => s.status === 'active').length, icon: '\uD83C\uDFEA', color: 'bg-[#F0E8DF] text-[#7A5C48]' },
    { label: '空闲服务员', value: waiters.filter(w => w.status === 'active').length, icon: '\uD83D\uDC54', color: 'bg-[#F0E8DF] text-[#A87F5F]' },
  ], [stores, waiters, orders, completedOrders, totalRevenue]);

  // Quick entry buttons
  const quickEntries = [
    { label: '添加用户', icon: '\uD83D\uDC64', action: () => openForm('user'), color: 'hover:bg-[#F0E8DF]' },
    { label: '添加员工', icon: '\uD83D\uDCAC', action: () => openForm('staff'), color: 'hover:bg-[#EEF1EB]' },
    { label: '添加服务员', icon: '\uD83D\uDC54', action: () => openForm('waiter'), color: 'hover:bg-[#F0E8DF]' },
    { label: '添加门店', icon: '\uD83C\uDFEA', action: () => openForm('store'), color: 'hover:bg-[#F0E8DF]' },
  ];

  // customerUsers is already computed above

  // ===== Render =====
  return (
    <div className="min-h-screen bg-[#FAF5F0] flex relative">
      {/* Mobile overlay */}
      {sidebarOpen ? (
        <div className="fixed inset-0 bg-[#4A3A2F]/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      ) : null}

      {/* Sidebar */}
      <aside className={sidebarOpen
        ? 'fixed inset-y-0 left-0 z-50 w-56 bg-[#4A3A2F] text-white flex-shrink-0 flex flex-col lg:static lg:z-auto transition-transform'
        : 'fixed inset-y-0 left-0 z-50 w-56 bg-[#4A3A2F] text-white flex-shrink-0 flex flex-col lg:static lg:z-auto -translate-x-full lg:translate-x-0 transition-transform'}>
        <div className="h-16 flex items-center px-5 border-b border-[#726255]">
          <div className="w-8 h-8 bg-gradient-to-br from-[#C89F7F] to-[#B88F6F] rounded-lg flex items-center justify-center mr-3">
            <span className="font-bold text-sm">A</span>
          </div>
          <div>
            <h1 className="font-semibold text-sm">Angel Home</h1>
            <p className="text-xs text-[#A08F80]">管理后台</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {navSections.map(section => (
            <div key={section.title || 'main'} className="mb-2">
              {section.title ? <div className="px-5 py-2 text-xs font-medium text-[#A08F80] uppercase tracking-wider">{section.title}</div> : null}
              {section.items.map(item => (
                <button key={item.id} onClick={() => { 
                    if (item.id === 'customers') { navigate('/customers'); setSidebarOpen(false); return; }
                    setActiveTab(item.id); setSidebarOpen(false); 
                  }}
                  className={activeTab === item.id
                    ? 'w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-colors bg-[#7A5C48]/30 text-[#DDBFA7] border-r-2 border-[#C89F7F]'
                    : 'w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-colors text-[#A08F80] hover:text-white hover:bg-[#7A5C48]/20'}>
                  <span className="text-base">{item.icon}</span>
                  <span className="flex-1 text-left">{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t border-[#726255] p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C89F7F] to-[#B88F6F] flex items-center justify-center text-xs font-bold">{(currentUser?.name || 'A')[0]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{currentUser?.name || '管理员'}</p>
              <p className="text-xs text-[#A08F80] truncate">{(currentUser?.roles || []).join(', ')}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full border-[#726255] text-[#A08F80] hover:text-white hover:bg-[#7A5C48]/30 mb-2" onClick={() => setShowPasswordDialog(true)}>
            修改密码
          </Button>
          <Button variant="outline" size="sm" className="w-full border-[#726255] text-[#A08F80] hover:text-white hover:bg-[#7A5C48]/30" onClick={() => { storage.clear(); navigate('/login'); }}>
            退出登录
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col w-full">
        <header className="h-14 border-b border-[#E8DFD2] flex items-center px-4 lg:px-6 justify-between gap-2">
          <div className="flex items-center gap-2 lg:gap-3 min-w-0">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg text-[#726255] hover:bg-[#F5EFE6]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <Button variant="outline" size="sm" className="text-[#726255] border-[#E8DFD2] shrink-0" onClick={() => navigate('/portal')}>
              ← 返回
            </Button>
            <div className="hidden sm:flex items-center gap-2 text-sm text-[#A08F80]">
              <span className="text-[#A08F80]">管理后台</span>
              <span className="text-[#BBABA0]">/</span>
              {navSections.flatMap(s => s.items).find(i => i.id === activeTab)?.label}
            </div>
          </div>
          <Input placeholder="搜索..." value={search} onChange={e => setSearch(e.target.value)} className="w-32 sm:w-48 h-8 text-sm" />
        </header>

        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-[#C89F7F] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div>
              {/* ====== Overview ====== */}
              {activeTab === 'overview' ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                    {kpiCards.map(card => (
                      <div key={card.label} className="bg-[#FFFFFF] rounded-xl p-4 sm:p-5 border border-[#E8DFD2] shadow-sm">
                        <div className="flex items-center justify-between mb-2 sm:mb-3">
                          <span className="text-xs text-[#A08F80] whitespace-nowrap">{card.label}</span>
                          <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${card.color} flex items-center justify-center text-base shrink-0`}>{card.icon}</span>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-[#4A3A2F]">{card.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-[#FFFFFF] rounded-xl border border-[#E8DFD2] shadow-sm p-4 sm:p-5">
                    <h3 className="text-sm font-semibold text-[#4A3A2F] mb-3 sm:mb-4">快捷入口</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {quickEntries.map(item => (
                        <button key={item.label} onClick={item.action} className={`flex items-center gap-2 sm:gap-3 p-3 rounded-lg border border-[#E8DFD2] bg-[#FAF5F0] ${item.color} transition-colors text-left`}>
                          <span className="text-xl shrink-0">{item.icon}</span>
                          <span className="text-sm text-[#4A3A2F] whitespace-nowrap">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 派单排名 */}
                  <DailyRanking orders={orders} />

                  <div className="bg-[#FFFFFF] rounded-xl border border-[#E8DFD2] shadow-sm p-4 sm:p-5">
                    <h3 className="text-sm font-semibold text-[#4A3A2F] mb-3 sm:mb-4">角色分布</h3>
                    <div className="grid grid-cols-3 sm:flex sm:gap-4 gap-3">
                      {roleOrder.map(role => (
                          <div key={role} className="flex-1 text-center p-3 sm:p-4 rounded-lg bg-[#FAF5F0]">
                            <p className="text-xl sm:text-2xl font-bold text-[#4A3A2F]">{roleStats[role] || 0}</p>
                            <Badge variant="outline" className={`mt-1 sm:mt-2 ${roleColors[role] || ''}`}>{role}</Badge>
                          </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* ====== Users ====== */}
              {activeTab === 'users' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-[#4A3A2F]">用户账号</h2>
                    <Button size="sm" onClick={() => openForm('user')} className="bg-[#C89F7F] text-white hover:bg-[#B88F6F]">+ 添加</Button>
                  </div>
                  <div className="rounded-xl border border-[#E8DFD2] shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-[#FAF5F0] text-[#726255]">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">用户名</th>
                          <th className="px-4 py-3 text-left font-medium">姓名</th>
                          <th className="px-4 py-3 text-left font-medium">角色</th>
                          <th className="px-4 py-3 text-left font-medium">手机</th>
                          <th className="px-4 py-3 text-left font-medium">绑定门店</th>
                          <th className="px-4 py-3 text-right font-medium">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredUsers.length === 0 ? (
                          <tr><td colSpan={6} className="px-4 py-8 text-center text-[#A08F80]">暂无数据</td></tr>
                        ) : filteredUsers.map(u => {
                          // 获取绑定的门店名称
                          const boundStoreIds = u.storeIds || (u.storeId ? [u.storeId] : []);
                          const boundStores = boundStoreIds.map(id => stores.find(s => s.id === id)).filter(Boolean);
                          return (
                            <tr key={u.id} className="hover:bg-[#F5EFE6]">
                              <td className="px-4 py-3 font-medium text-[#4A3A2F]">{u.username}</td>
                              <td className="px-4 py-3">{u.name || '-'}</td>
                              <td className="px-4 py-3">
                                <div className="flex gap-1 flex-wrap">
                                  {(u.roles || []).map(r => (
                                    <Badge key={r} variant="outline" className={`text-xs ${roleColors[r] || ''}`}>{r}</Badge>
                                  ))}
                                </div>
                              </td>
                              <td className="px-4 py-3">{u.phone || '-'}</td>
                              <td className="px-4 py-3">
                                {boundStores.length > 0 ? (
                                  <div className="flex gap-1 flex-wrap">
                                    {boundStores.map(s => (
                                      <Badge key={s!.id} variant="outline" className="text-xs bg-[#F0E8DF] text-[#6B4A38] border-[#D8CBC0]">{s!.name}</Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-[#A08F80]">未绑定</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button onClick={() => openForm('user', u)} className="text-[#B88F6F] hover:text-[#7A5C48] text-xs mr-3">编辑</button>
                                <button onClick={() => confirmDelete('user', u.id, u.name || u.username)} className="text-[#B85C4A] hover:text-[#8C3F30] text-xs">删除</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {/* ====== Roles ====== */}
              {activeTab === 'roles' ? (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-[#4A3A2F]">角色权限</h2>
                  <div className="grid grid-cols-1 gap-4">
                    {roleOrder.map(role => {
                      const members = users.filter(u => (u.roles || []).includes(role));
                      const noMembers = members.length === 0;
                      return (
                        <div key={role} className="rounded-xl border border-[#E8DFD2] shadow-sm p-5">
                          <div className="flex items-center gap-3 mb-4">
                            <Badge variant="outline" className={`text-sm px-3 py-1 ${roleColors[role]}`}>{role}</Badge>
                            <span className="text-sm text-[#A08F80]">{members.length} 人</span>
                          </div>
                          {noMembers ? (
                            <p className="text-sm text-[#A08F80] py-2">暂无成员</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {members.map(m => (
                                <div key={m.id} className="flex items-center gap-2 px-3 py-1.5 bg-[#FAF5F0] rounded-lg text-sm">
                                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#C89F7F] to-[#B88F6F] flex items-center justify-center text-white text-xs font-bold">{(m.name || m.username)[0]}</div>
                                  <span className="text-[#4A3A2F]">{m.name || m.username}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* ====== Stores ====== */}
              {activeTab === 'stores' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-[#4A3A2F]">门店列表</h2>
                    <Button size="sm" onClick={() => openForm('store')} className="bg-[#C89F7F] text-white hover:bg-[#B88F6F]">+ 添加门店</Button>
                  </div>
                  <div className="rounded-xl border border-[#E8DFD2] shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-[#FAF5F0] text-[#726255]">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">门店名称</th>
                          <th className="px-4 py-3 text-left font-medium">地址</th>
                          <th className="px-4 py-3 text-left font-medium">电话</th>
                          <th className="px-4 py-3 text-left font-medium">关联客服</th>
                          <th className="px-4 py-3 text-left font-medium">成本配置</th>
                          <th className="px-4 py-3 text-right font-medium">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStores.length === 0 ? (
                          <tr><td colSpan={6} className="px-4 py-8 text-center text-[#A08F80]">暂无数据</td></tr>
                        ) : filteredStores.map(s => {
                          const boundUser = getStoreBoundUser(s.id);
                          const btnClass = boundUser
                            ? 'bg-[#DDE5D8] text-[#3D4F3A] hover:bg-green-200'
                            : 'bg-[#E8DFD2] text-[#A08F80] hover:bg-[#E5DCD0] hover:text-[#B88F6F]';
                          const btnText = boundUser ? `👤 ${boundUser.name || boundUser.username}` : '+ 绑定客服';
                          return (
                            <tr key={s.id} className="hover:bg-[#F5EFE6]">
                              <td className="px-4 py-3 font-medium text-[#4A3A2F]">{s.name}</td>
                              <td className="px-4 py-3 text-[#726255]">{s.address || '-'}</td>
                              <td className="px-4 py-3">{s.phone || '-'}</td>
                              <td className="px-4 py-3">
                                <button onClick={() => openBindStaff(s)} className={`text-xs px-2.5 py-1 rounded-full transition-colors ${btnClass}`}>{btnText}</button>
                              </td>
                              <td className="px-4 py-3"><button onClick={() => openForm('store', s)} className="text-xs text-[#B88F6F] hover:underline">查看详情</button></td>
                              <td className="px-4 py-3 text-right">
                                <button onClick={() => openForm('store', s)} className="text-[#B88F6F] hover:text-[#7A5C48] text-xs mr-3">编辑</button>
                                <button onClick={() => confirmDelete('store', s.id, s.name)} className="text-[#B85C4A] hover:text-[#8C3F30] text-xs">删除</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {/* ====== Staff (HR Records) ====== */}
              {activeTab === 'staff' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-[#4A3A2F]">员工档案（人事档案）</h2>
                    <Button size="sm" onClick={() => openForm('staff')} className="bg-[#C89F7F] text-white hover:bg-[#B88F6F]">+ 添加员工</Button>
                  </div>
                  <div className="rounded-xl border border-[#E8DFD2] shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-[#FAF5F0] text-[#726255]">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">花名/工号</th>
                          <th className="px-4 py-3 text-left font-medium">真实姓名</th>
                          <th className="px-4 py-3 text-left font-medium">性别</th>
                          <th className="px-4 py-3 text-left font-medium">手机</th>
                          <th className="px-4 py-3 text-left font-medium">归属门店</th>
                          <th className="px-4 py-3 text-left font-medium">入职日期</th>
                          <th className="px-4 py-3 text-right font-medium">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStaff.length === 0 ? (
                          <tr><td colSpan={7} className="px-4 py-8 text-center text-[#A08F80]">暂无数据</td></tr>
                        ) : filteredStaff.map(s => {
                          const primaryStore = stores.find(st => st.id === s.storeId);
                          return (
                            <tr key={s.id} className="hover:bg-[#F5EFE6]">
                              <td className="px-4 py-3 font-medium text-[#4A3A2F]">{s.name}</td>
                              <td className="px-4 py-3">{s.realName || '-'}</td>
                              <td className="px-4 py-3">{s.gender || '-'}</td>
                              <td className="px-4 py-3">{s.phone || '-'}</td>
                              <td className="px-4 py-3">
                                {primaryStore
                                  ? <Badge variant="outline" className="text-xs bg-[#F0E8DF] text-[#6B4A38] border-[#D8CBC0]">{primaryStore.name}</Badge>
                                  : <span className="text-xs text-[#A08F80]">未分配</span>}
                              </td>
                              <td className="px-4 py-3 text-[#A08F80]">{s.entryDate || '-'}</td>
                              <td className="px-4 py-3 text-right">
                                <button onClick={() => openStaffDetail(s)} className="text-[#B88F6F] hover:text-[#7A5C48] text-xs mr-3">👁️ 详情</button>
                                <button onClick={() => openForm('staff', s)} className="text-[#B88F6F] hover:text-[#7A5C48] text-xs mr-3">编辑</button>
                                <button onClick={() => confirmDelete('staff', s.id, s.name)} className="text-[#B85C4A] hover:text-[#8C3F30] text-xs">删除</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {/* ====== Waiters ====== */}
              {activeTab === 'waiters' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-[#4A3A2F]">服务员档案</h2>
                    <Button size="sm" onClick={() => openForm('waiter')} className="bg-[#C89F7F] text-white hover:bg-[#B88F6F]">+ 添加</Button>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredWaiters.length === 0 ? (
                      <div className="col-span-full text-center py-12 text-[#A08F80]  rounded-xl border border-[#E8DFD2]">暂无服务员数据</div>
                    ) : filteredWaiters.map(w => {
                      const statusClass = w.status === 'active' ? 'bg-[#EEF1EB] text-[#5C7258]' : w.status === 'busy' ? 'bg-[#F5DCD6] text-[#8C3F30]' : 'bg-[#E8DFD2] text-[#726255]';
                      const statusLabel = w.status === 'active' ? '空闲' : w.status === 'busy' ? '忙碌中' : '休息';
                      return (
                        <div key={w.id} className="rounded-xl border border-[#E8DFD2] shadow-sm p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold">{w.name[0]}</div>
                              <div>
                                <h4 className="font-semibold text-[#4A3A2F]">{w.name}</h4>
                                <p className="text-xs text-[#A08F80]">{w.phone || '无电话'}</p>
                              </div>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusClass}`}>{statusLabel}</span>
                          </div>
                          <div className="space-y-1.5 text-xs text-[#726255] mb-3">
                            {w.age ? <p><span className="text-[#A08F80]">年龄:</span> {w.age}岁</p> : null}
                            {w.height ? <p><span className="text-[#A08F80]">身高:</span> {w.height}</p> : null}
                            {w.bodyType ? <p><span className="text-[#A08F80]">身型:</span> {w.bodyType}</p> : null}
                            {w.cup ? <p><span className="text-[#A08F80]">罩杯:</span> {w.cup}</p> : null}
                            {w.gender ? <p><span className="text-[#A08F80]">性别:</span> {w.gender}</p> : null}
                          </div>
                          {w.tags && w.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {w.tags.map(t => <Badge key={t} variant="outline" className="text-xs bg-[#F0E8DF] text-[#BE185D] border-[#FBCFE8]">{t}</Badge>)}
                            </div>
                          ) : null}
                          <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                            <div className="flex items-center gap-1">
                              <span className="text-[#C89F7F]">★</span>
                              <span className="text-sm font-semibold">{typeof w.rating === 'number' ? w.rating.toFixed(1) : parseFloat(w.rating || '0').toFixed(1)}</span>
                              <span className="text-xs text-[#A08F80]">({w.totalReviews || 0}评)</span>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => openForm('waiter', w)} className="text-[#B88F6F] hover:text-[#7A5C48] text-xs">编辑</button>
                              <button onClick={() => confirmDelete('waiter', w.id, w.name)} className="text-[#B85C4A] hover:text-[#8C3F30] text-xs">删除</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* ====== Orders ====== */}
              {activeTab === 'orders' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-[#4A3A2F]">订单管理</h2>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="搜索手机号/客户名/订单号..."
                        value={orderFilter.search}
                        onChange={e => setOrderFilter({ ...orderFilter, search: e.target.value })}
                        className="h-8 text-xs px-3 rounded-lg border border-[#E8DFD2] bg-[#FFFFFF] w-48"
                      />
                      <select
                        value={orderFilter.status}
                        onChange={e => setOrderFilter({ ...orderFilter, status: e.target.value })}
                        className="h-8 text-xs px-2 rounded-lg border border-[#E8DFD2] bg-[#FFFFFF]"
                      >
                        <option value="">全部状态</option>
                        <option value="pending">待派单</option>
                        <option value="assigned">已派单</option>
                        <option value="departed">已出发</option>
                        <option value="arrived">已到达</option>
                        <option value="serving">服务中</option>
                        <option value="completed">已完成</option>
                        <option value="rejected">被退</option>
                        <option value="cancelled">彻底失败</option>
                      </select>
                    </div>
                  </div>
                  {orders.length === 0 ? (
                    <div className="text-center py-12 text-[#A08F80] rounded-xl border border-[#E8DFD2] bg-[#FFFFFF]">暂无订单</div>
                  ) : (
                    <div className="space-y-3">
                      {orders.filter(o => {
                        const matchStatus = !orderFilter.status || o.status === orderFilter.status;
                        const kw = orderFilter.search.trim();
                        const matchSearch = !kw ||
                          (o.phone && o.phone.includes(kw)) ||
                          (o.customerName && o.customerName.includes(kw)) ||
                          (o.orderNo && o.orderNo.includes(kw)) ||
                          (o.address && o.address.includes(kw)) ||
                          (o.submittedBy && o.submittedBy.includes(kw)) ||
                          (o.wechat && o.wechat.includes(kw));
                        return matchStatus && matchSearch;
                      }).map(order => (
                        <div key={order.id} className="bg-[#FFFFFF] rounded-xl border border-[#E8DFD2] shadow-sm p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-[#C89F7F]">#{order.orderNo || order.id?.slice(-6)}</span>
                              <Badge variant="outline" className={
                                order.status === 'pending' ? 'bg-[#E8DFD2] text-[#726255]' :
                                order.status === 'assigned' ? 'bg-[#E5DCD0] text-[#A87F5F]' :
                                order.status === 'departed' ? 'bg-[#E8EDF5] text-[#5C7295]' :
                                order.status === 'arrived' ? 'bg-[#EDE8F5] text-[#7A6FA8]' :
                                order.status === 'serving' ? 'bg-[#F7EEDB] text-[#A87F5F]' :
                                order.status === 'completed' || order.status === 'rated' ? 'bg-[#DDE5D8] text-[#3D4F3A]' :
                                'bg-[#F5DCD6] text-[#8C3F30]'
                              }>
                                {order.status === 'pending' ? '待派单' : order.status === 'assigned' ? '已派单' : order.status === 'departed' ? '已出发' : order.status === 'arrived' ? '已到达' : order.status === 'serving' ? '服务中' : order.status === 'completed' || order.status === 'rated' ? '已完成' : order.status === 'rejected' ? '被退' : '彻底失败'}
                              </Badge>
                              {order.storeName && <Badge variant="outline" className="text-xs bg-[#F0E8DF] text-[#6B4A38] border-[#D8CBC0]">{order.storeName}</Badge>}
                              {/* 老客户标记 */}
                              {(() => {
                                const hasHistory = order.phone || order.wechat || order.qq;
                                return hasHistory ? <Badge variant="outline" className="text-xs bg-[#EEF1EB] text-[#5C7258] border-[#D8CBC0]">可匹配</Badge> : null;
                              })()}
                            </div>
                            <span className="text-xs text-[#A08F80]">{formatDateTime(order.createdAt)}</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                            <div><span className="text-[#A08F80]">客户:</span> <span className="font-medium">{order.customerName || '匿名'}</span></div>
                            <div><span className="text-[#A08F80]">手机:</span> {order.phone || '-'}</div>
                            <div><span className="text-[#A08F80]">客服:</span> {order.submittedBy || order.staffName || '-'}</div>
                            <div><span className="text-[#A08F80]">派单侠:</span> {order.dispatcherName || '-'}</div>
                          </div>
                          <div className="mt-1 text-sm"><span className="text-[#A08F80]">地址:</span> <span className="text-[#726255]">{order.address}</span></div>
                          {order.waiterName && <div className="text-sm"><span className="text-[#A08F80]">服务员:</span> {order.waiterName}</div>}
                          <div className="mt-1 text-sm font-medium text-[#A87F5F]">信息费: ¥{order.infoFee || 0}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {/* ====== Checkin Records ====== */}
              {activeTab === 'checkin' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-[#4A3A2F]">客服打卡记录</h2>
                    <div className="flex items-center gap-2">
                      <Input type="date" value={checkinFilter.startDate} onChange={e => setCheckinFilter({ ...checkinFilter, startDate: e.target.value })} className="w-32 h-8 text-xs" />
                      <span className="text-[#A08F80] text-xs">至</span>
                      <Input type="date" value={checkinFilter.endDate} onChange={e => setCheckinFilter({ ...checkinFilter, endDate: e.target.value })} className="w-32 h-8 text-xs" />
                      <Button size="sm" onClick={loadCheckinRecords} className="bg-[#C89F7F] text-white hover:bg-[#B88F6F] text-xs">查询</Button>
                    </div>
                  </div>
                  {checkinLoading ? (
                    <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-[#C89F7F] border-t-transparent rounded-full animate-spin" /></div>
                  ) : checkinRecords.length === 0 ? (
                    <div className="text-center py-12 text-[#A08F80] rounded-xl border border-[#E8DFD2] bg-[#FFFFFF]">暂无打卡记录</div>
                  ) : (
                    <div className="space-y-3">
                      {checkinRecords.map((r, i) => (
                        <div key={r.id || i} className="rounded-xl border border-[#E8DFD2] p-4 bg-[#FFFFFF]">
                          {/* 头部：日期 + 客服名 + 店铺名（优先用打卡记录中的门店，其次从用户绑定查找） */}
                          {(() => {
                            const csUser = users.find(u => u.id === r.userId);
                            const csName = csUser?.name || csUser?.username || r.userId;
                            // 优先用打卡记录自带的 storeName，没有则从用户绑定查找
                            const recordStoreName = (r as any).storeName || (r as any).store_name;
                            const recordStoreId = (r as any).storeId || (r as any).store_id;
                            let displayStoreName = recordStoreName;
                            if (!displayStoreName && recordStoreId) {
                              displayStoreName = stores.find((s: Store) => s.id === recordStoreId)?.name;
                            }
                            if (!displayStoreName && csUser) {
                              const boundStoreIds = csUser.storeIds || (csUser.storeId ? [csUser.storeId] : []);
                              displayStoreName = boundStoreIds
                                .map((sid: string) => stores.find((s: Store) => s.id === sid)?.name)
                                .filter(Boolean)[0];
                            }
                            return (
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-bold text-[#4A3A2F]">{r.recordDate}</span>
                                  <Badge className="bg-[#EEF1EB] text-[#5C7258] border-0 text-xs">👤 {csName}</Badge>
                                  {displayStoreName && (
                                    <Badge className="bg-[#FFF1E3] text-[#B97C4A] border-0 text-xs">📍 {displayStoreName}</Badge>
                                  )}
                                </div>
                                <span className="text-xs text-[#A08F80]">{r.createdAt ? r.createdAt.slice(0, 16).replace('T', ' ') : ''}</span>
                              </div>
                            );
                          })()}
                          {/* 兼容后端可能返回 snake_case 或 camelCase 字段名 */}
                          {(() => {
                            const mc = (r as any).meituanConsults ?? (r as any).meituan_consults ?? 0;
                            const pc = (r as any).phoneConsults ?? (r as any).phone_consults ?? 0;
                            const wa = (r as any).wechatAdds ?? (r as any).wechat_adds ?? 0;
                            const qa = (r as any).qqAdds ?? (r as any).qq_adds ?? 0;
                            const dc = (r as any).dispatchCount ?? (r as any).dispatch_count ?? 0;
                            const dl = (r as any).dealCount ?? (r as any).deal_count ?? 0;
                            const oc = (r as any).oldCustomerDeals ?? (r as any).old_customer_deals ?? 0;
                            const nc = (r as any).newCustomerDeals ?? (r as any).new_customer_deals ?? 0;
                            return (
                              <>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-center mb-3">
                                  <div className="rounded-lg p-2 bg-[#F5EFE6]">
                                    <p className="text-xs text-[#A08F80]">美团咨询</p>
                                    <p className="font-bold text-[#4A3A2F]">{mc}</p>
                                  </div>
                                  <div className="rounded-lg p-2 bg-[#F5EFE6]">
                                    <p className="text-xs text-[#A08F80]">电话咨询</p>
                                    <p className="font-bold text-[#4A3A2F]">{pc}</p>
                                  </div>
                                  <div className="rounded-lg p-2 bg-[#F5EFE6]">
                                    <p className="text-xs text-[#A08F80]">微信添加</p>
                                    <p className="font-bold text-[#4A3A2F]">{wa}</p>
                                  </div>
                                  <div className="rounded-lg p-2 bg-[#F5EFE6]">
                                    <p className="text-xs text-[#A08F80]">QQ添加</p>
                                    <p className="font-bold text-[#4A3A2F]">{qa}</p>
                                  </div>
                                  <div className="rounded-lg p-2 bg-[#F5EFE6]">
                                    <p className="text-xs text-[#A08F80]">派单</p>
                                    <p className="font-bold text-[#4A3A2F]">{dc}</p>
                                  </div>
                                  <div className="rounded-lg p-2 bg-[#F5EFE6]">
                                    <p className="text-xs text-[#A08F80]">成单</p>
                                    <p className="font-bold text-[#C89F7F]">{dl}</p>
                                  </div>
                                </div>
                                {/* 老客/新客细分 */}
                                {(oc > 0 || nc > 0) && (
                                  <div className="flex gap-3 mb-3 text-xs">
                                    <span className="px-2 py-1 rounded-full bg-[#EEF1EB] text-[#5C7258]">老客单 {oc}</span>
                                    <span className="px-2 py-1 rounded-full bg-[#FFF1E3] text-[#B97C4A]">新客单 {nc}</span>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                          {/* 成单客户详细信息卡片 */}
                          {(() => {
                            let contacts = r.customerContacts;
                            if (!contacts && (r as any).customer_contacts) contacts = (r as any).customer_contacts;
                            if (!contacts && (r as any).contacts) contacts = (r as any).contacts;
                            if (typeof contacts === 'string') {
                              try { contacts = JSON.parse(contacts); } catch { contacts = []; }
                            }
                            if (!Array.isArray(contacts) || contacts.length === 0) return null;
                            return (
                              <div className="mt-2 pt-2 border-t border-[#E8DFD2]">
                                <p className="text-xs text-[#7A5C48] font-medium mb-2">👥 成单客户资料 ({contacts.length}位)</p>
                                <div className="space-y-2">
                                  {contacts.map((c: any, j: number) => (
                                    <div key={j} className="flex items-center gap-2 bg-[#FAF5F0] rounded-lg p-2">
                                      {/* 客户类型标签 */}
                                      <Badge className={`shrink-0 text-xs border-0 ${c.type === 'old' ? 'bg-[#EEF1EB] text-[#5C7258]' : 'bg-[#FFF1E3] text-[#B97C4A]'}`}>
                                        {c.type === 'old' ? '老客' : '新客'}
                                      </Badge>
                                      {/* 客户姓名 */}
                                      <span className="text-sm font-medium text-[#4A3A2F] min-w-[60px]">{c.name || '匿名'}</span>
                                      {/* 电话 - BOSS看完整数据，不脱敏 */}
                                      {c.phone && (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#F5EFE6] text-[#726255]">
                                          📞 {c.phone}
                                        </span>
                                      )}
                                      {/* 微信 */}
                                      {c.wechat && (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#EEF1EB] text-[#5C7258]">
                                          💬 {c.wechat}
                                        </span>
                                      )}
                                      {/* QQ */}
                                      {c.qq && (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#F0E8DF] text-[#8C6A53]">
                                          QQ {c.qq}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </main>

      {/* ====== Staff Form (HR) ====== */}
      {showForm && formType === 'staff' ? (
        <div className="fixed inset-0 bg-[#4A3A2F]/40 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="rounded-2xl shadow-2xl bg-[#FFFFFF] max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-bold text-[#4A3A2F] mb-4">{editId ? '编辑' : '添加'}员工档案</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#726255]">花名/工号 *</label>
                  <Input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="如花名、工号" />
                </div>
                <div>
                  <label className="text-sm text-[#726255]">真实姓名</label>
                  <Input value={formData.realName || ''} onChange={e => setFormData({ ...formData, realName: e.target.value })} placeholder="真实姓名" />
                </div>
                <div>
                  <label className="text-sm text-[#726255]">手机号</label>
                  <Input value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="手机号" />
                </div>
                <div>
                  <label className="text-sm text-[#726255]">身份证号</label>
                  <Input value={formData.idCard || ''} onChange={e => setFormData({ ...formData, idCard: e.target.value })} placeholder="18位身份证号" />
                </div>
                <div>
                  <label className="text-sm text-[#726255]">性别</label>
                  <select value={formData.gender || '女'} onChange={e => setFormData({ ...formData, gender: e.target.value })} className="w-full h-10 rounded-md border border-[#E8DFD2] px-3 text-sm">
                    <option value="女">女</option>
                    <option value="男">男</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-[#726255]">年龄</label>
                  <Input value={formData.age || ''} onChange={e => setFormData({ ...formData, age: e.target.value })} placeholder="年龄" type="number" />
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-[#726255]">家庭住址</label>
                  <Input value={formData.homeAddress || ''} onChange={e => setFormData({ ...formData, homeAddress: e.target.value })} placeholder="家庭住址" />
                </div>
                <div>
                  <label className="text-sm text-[#726255]">银行卡号</label>
                  <Input value={formData.bankCard || ''} onChange={e => setFormData({ ...formData, bankCard: e.target.value })} placeholder="银行卡号" />
                </div>
                <div>
                  <label className="text-sm text-[#726255]">入职日期</label>
                  <Input value={formData.entryDate || ''} onChange={e => setFormData({ ...formData, entryDate: e.target.value })} placeholder="YYYY-MM-DD" type="date" />
                </div>
                <div>
                  <label className="text-sm text-[#726255]">紧急联系人</label>
                  <Input value={formData.emergencyContact || ''} onChange={e => setFormData({ ...formData, emergencyContact: e.target.value })} placeholder="紧急联系人姓名" />
                </div>
                <div>
                  <label className="text-sm text-[#726255]">紧急联系人电话</label>
                  <Input value={formData.emergencyPhone || ''} onChange={e => setFormData({ ...formData, emergencyPhone: e.target.value })} placeholder="紧急联系人电话" />
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-[#726255]">归属门店</label>
                  <select value={formData.storeId || ''} onChange={e => setFormData({ ...formData, storeId: e.target.value })} className="w-full h-10 rounded-md border border-[#E8DFD2] px-3 text-sm">
                    <option value="">不分配</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-[#726255]">简历/备注</label>
                  <textarea value={formData.resume || ''} onChange={e => setFormData({ ...formData, resume: e.target.value })} placeholder="工作经历、技能特长、备注..." className="w-full mt-1 p-3 border border-[#E8DFD2] rounded-lg text-sm min-h-[80px]" />
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>取消</Button>
                <Button className="flex-1 bg-[#C89F7F] text-white hover:bg-[#B88F6F]" onClick={saveForm}>保存</Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ====== Other Forms ====== */}
      {showForm && formType !== 'staff' ? (
        <div className="fixed inset-0 bg-[#4A3A2F]/40 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="rounded-2xl shadow-2xl bg-[#FFFFFF] max-w-md w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-bold text-[#4A3A2F] mb-4">{editId ? '编辑' : '添加'}{formType === 'user' ? '用户' : formType === 'waiter' ? '服务员' : '门店'}</h3>
              <div className="space-y-3">
                {formType === 'user' ? (
                  <>
                    <div><label className="text-sm text-[#726255]">用户名</label><Input value={formData.username || ''} onChange={e => setFormData({ ...formData, username: e.target.value })} placeholder="登录用户名" /></div>
                    <div><label className="text-sm text-[#726255]">姓名</label><Input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="真实姓名" /></div>
                    <div><label className="text-sm text-[#726255]">手机</label><Input value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="手机号" /></div>
                    <div>
                      <label className="text-sm text-[#726255]">登录密码{editId ? '（留空则不修改）' : ''}</label>
                      <Input type="password" value={formData.password || ''} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder={editId ? '不修改请留空' : '默认 123456'} />
                    </div>
                    <div>
                      <label className="text-sm text-[#726255]">角色（可多选）</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {roleOrder.map(role => {
                          const roles = formData.roles || [];
                          const isChecked = roles.includes(role);
                          return (
                            <label key={role} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E8DFD2] cursor-pointer hover:bg-[#F5EFE6]">
                              <input type="checkbox" checked={isChecked} onChange={e => {
                                const newRoles = e.target.checked ? [...roles, role] : roles.filter((r: string) => r !== role);
                                setFormData({ ...formData, roles: newRoles });
                              }} className="rounded" />
                              <span className="text-sm">{role}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-[#726255]">绑定门店（最多2个）</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {stores.map(s => {
                          const boundStores = formData.storeIds || [];
                          const isChecked = boundStores.includes(s.id);
                          return (
                            <label key={s.id} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                              isChecked
                                ? 'border-[#C89F7F] bg-[#FFF1E3] text-[#C89F7F]'
                                : 'border-[#E8DFD2] hover:bg-[#F5EFE6]'
                            }`}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={e => {
                                  const current = formData.storeIds || [];
                                  if (e.target.checked) {
                                    if (current.length >= 2) {
                                      toast.error('最多只能绑定2个门店');
                                      return;
                                    }
                                    setFormData({ ...formData, storeIds: [...current, s.id] });
                                  } else {
                                    setFormData({ ...formData, storeIds: current.filter((id: string) => id !== s.id) });
                                  }
                                }}
                                className="rounded"
                              />
                              <span className="text-sm">{s.name}</span>
                            </label>
                          );
                        })}
                      </div>
                      <p className="text-xs text-[#A08F80] mt-1">已选 {(formData.storeIds || []).length}/2 个，绑定后该客服新建订单时自动归属主门店</p>
                    </div>
                  </>
                ) : formType === 'waiter' ? (
                  <>
                    <div><label className="text-sm text-[#726255]">姓名</label><Input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="姓名" /></div>
                    <div><label className="text-sm text-[#726255]">手机</label><Input value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="手机号" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm text-[#726255]">性别</label>
                        <select value={formData.gender || '女'} onChange={e => setFormData({ ...formData, gender: e.target.value })} className="w-full h-10 rounded-md border border-[#E8DFD2] px-3 text-sm">
                          <option value="女">女</option>
                          <option value="男">男</option>
                        </select>
                      </div>
                      <div><label className="text-sm text-[#726255]">年龄</label><Input value={formData.age || ''} onChange={e => setFormData({ ...formData, age: e.target.value })} placeholder="年龄" /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><label className="text-sm text-[#726255]">身高</label><Input value={formData.height || ''} onChange={e => setFormData({ ...formData, height: e.target.value })} placeholder="170cm" /></div>
                      <div><label className="text-sm text-[#726255]">身型</label><Input value={formData.bodyType || ''} onChange={e => setFormData({ ...formData, bodyType: e.target.value })} placeholder="苗条" /></div>
                      <div><label className="text-sm text-[#726255]">罩杯</label><Input value={formData.cup || ''} onChange={e => setFormData({ ...formData, cup: e.target.value })} placeholder="C" /></div>
                    </div>
                    <div><label className="text-sm text-[#726255]">标签</label><Input value={formData.tags || ''} onChange={e => setFormData({ ...formData, tags: e.target.value })} placeholder="专业,准时,热情" /></div>
                  </>
                ) : formType === 'store' ? (
                  <>
                    <div><label className="text-sm text-[#726255]">门店名称</label><Input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="名称" /></div>
                    <div><label className="text-sm text-[#726255]">地址</label><Input value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="地址" /></div>
                    <div><label className="text-sm text-[#726255]">电话</label><Input value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="电话" /></div>
                    <div>
                      <label className="text-sm text-[#726255]">绑定客服</label>
                      <select value={formData.staffUserId || ''} onChange={e => setFormData({ ...formData, staffUserId: e.target.value })} className="w-full h-10 rounded-md border border-[#E8DFD2] px-3 text-sm mt-1">
                        <option value="">不绑定</option>
                        {users
                          .filter((u: User) => (u.roles || []).includes('客服'))
                          .map((u: User) => (
                            <option key={u.id} value={u.id}>{u.name} ({u.username})</option>
                          ))}
                      </select>
                      <p className="text-xs text-[#A08F80] mt-1">绑定后该客服新建订单自动归属此门店</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-sm text-[#726255]">房租</label><Input value={formData.rent || ''} onChange={e => setFormData({ ...formData, rent: e.target.value })} placeholder="0" type="number" /></div>
                      <div><label className="text-sm text-[#726255]">佣金比例(%)</label><Input value={formData.commissionRate || ''} onChange={e => setFormData({ ...formData, commissionRate: e.target.value })} placeholder="0" type="number" /></div>
                      <div><label className="text-sm text-[#726255]">营销费用</label><Input value={formData.marketingFee || ''} onChange={e => setFormData({ ...formData, marketingFee: e.target.value })} placeholder="0" type="number" /></div>
                      <div><label className="text-sm text-[#726255]">运营费用</label><Input value={formData.operatingCost || ''} onChange={e => setFormData({ ...formData, operatingCost: e.target.value })} placeholder="0" type="number" /></div>
                    </div>
                  </>
                ) : null}
              </div>
              <div className="flex gap-3 mt-5">
                <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>取消</Button>
                <Button className="flex-1 bg-[#C89F7F] text-white hover:bg-[#B88F6F]" onClick={saveForm}>保存</Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ====== Bind Staff Modal ====== */}
      {showBindStaff ? (
        <div className="fixed inset-0 bg-[#4A3A2F]/40 flex items-center justify-center z-50 p-4" onClick={() => setShowBindStaff(false)}>
          <div className="rounded-2xl shadow-2xl bg-[#FFFFFF] max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-bold text-[#4A3A2F] mb-1">绑定客服</h3>
              <p className="text-sm text-[#A08F80] mb-4">门店: <strong>{bindStoreName}</strong></p>
              <div className="max-h-72 overflow-y-auto space-y-2">
                <button onClick={() => setSelectedBindStaffId('')} className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${!selectedBindStaffId ? 'border-[#C89F7F] bg-[#F0E8DF]' : 'border-[#E8DFD2] hover:bg-[#F5EFE6]'}`}>
                  <div className="w-10 h-10 rounded-full bg-[#E8DFD2] flex items-center justify-center text-[#A08F80] text-sm">—</div>
                  <div><p className="font-medium text-[#4A3A2F]">不绑定客服</p><p className="text-xs text-[#A08F80]">当前门店不关联任何客服</p></div>
                  {!selectedBindStaffId ? <span className="text-[#C89F7F] ml-auto">✓</span> : null}
                </button>
                {customerUsers.length === 0 ? (
                  <p className="text-center text-[#A08F80] py-4">用户组中没有角色为&quot;客服&quot;的用户，请先在&quot;用户账号&quot;中添加</p>
                ) : customerUsers.map(u => (
                  <button key={u.id} onClick={() => setSelectedBindStaffId(u.id)} className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${selectedBindStaffId === u.id ? 'border-[#C89F7F] bg-[#F0E8DF]' : 'border-[#E8DFD2] hover:bg-[#F5EFE6]'}`}>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-sm">{(u.name || u.username)[0]}</div>
                    <div className="flex-1">
                      <p className="font-medium text-[#4A3A2F]">{u.name || u.username} <Badge variant="outline" className="text-xs ml-1 bg-[#EEF1EB] text-[#3D4F3A]">客服</Badge></p>
                      <p className="text-xs text-[#A08F80]">{u.phone || '无手机号'}</p>
                    </div>
                    {selectedBindStaffId === u.id ? <span className="text-[#C89F7F]">✓</span> : null}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 mt-4">
                <Button variant="outline" className="flex-1" onClick={() => setShowBindStaff(false)}>取消</Button>
                <Button className="flex-1 bg-[#C89F7F] text-white hover:bg-[#B88F6F]" onClick={handleBindStaff}>确认绑定</Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ====== Staff Detail Modal ====== */}
      {showStaffDetail && detailStaff ? (
        <div className="fixed inset-0 bg-[#4A3A2F]/40 flex items-center justify-center z-50 p-4" onClick={() => setShowStaffDetail(false)}>
          <div className="rounded-2xl shadow-2xl bg-[#FFFFFF] max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#4A3A2F]">客服人事档案</h3>
                <button onClick={() => setShowStaffDetail(false)} className="text-[#A08F80] hover:text-[#726255]">✕</button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#FAF5F0] p-3 rounded-lg"><p className="text-xs text-[#A08F80]">花名/工号</p><p className="font-medium">{detailStaff.name}</p></div>
                  <div className="bg-[#FAF5F0] p-3 rounded-lg"><p className="text-xs text-[#A08F80]">真实姓名</p><p className="font-medium">{detailStaff.realName || '-'}</p></div>
                  <div className="bg-[#FAF5F0] p-3 rounded-lg"><p className="text-xs text-[#A08F80]">性别</p><p className="font-medium">{detailStaff.gender || '-'}</p></div>
                  <div className="bg-[#FAF5F0] p-3 rounded-lg"><p className="text-xs text-[#A08F80]">年龄</p><p className="font-medium">{detailStaff.age || '-'}</p></div>
                  <div className="bg-[#FAF5F0] p-3 rounded-lg"><p className="text-xs text-[#A08F80]">手机号</p><p className="font-medium">{detailStaff.phone || '-'}</p></div>
                  <div className="bg-[#FAF5F0] p-3 rounded-lg"><p className="text-xs text-[#A08F80]">身份证号</p><p className="font-medium">{detailStaff.idCard || '-'}</p></div>
                </div>
                <div className="bg-[#FAF5F0] p-3 rounded-lg"><p className="text-xs text-[#A08F80]">家庭住址</p><p className="font-medium">{detailStaff.homeAddress || '-'}</p></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#FAF5F0] p-3 rounded-lg"><p className="text-xs text-[#A08F80]">银行卡号</p><p className="font-medium">{detailStaff.bankCard || '-'}</p></div>
                  <div className="bg-[#FAF5F0] p-3 rounded-lg"><p className="text-xs text-[#A08F80]">入职日期</p><p className="font-medium">{detailStaff.entryDate || '-'}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#FAF5F0] p-3 rounded-lg"><p className="text-xs text-[#A08F80]">紧急联系人</p><p className="font-medium">{detailStaff.emergencyContact || '-'}</p></div>
                  <div className="bg-[#FAF5F0] p-3 rounded-lg"><p className="text-xs text-[#A08F80]">紧急联系人电话</p><p className="font-medium">{detailStaff.emergencyPhone || '-'}</p></div>
                </div>
                <div className="bg-[#FAF5F0] p-3 rounded-lg">
                  <p className="text-xs text-[#A08F80] mb-1">归属门店</p>
                  {stores.find(st => st.id === detailStaff.storeId)
                    ? <Badge variant="outline" className="bg-[#F0E8DF] text-[#6B4A38] border-[#D8CBC0]">{stores.find(st => st.id === detailStaff.storeId)?.name}</Badge>
                    : <span className="text-[#A08F80]">未分配</span>}
                </div>
                {detailStaff.resume ? (
                  <div className="bg-[#FAF5F0] p-3 rounded-lg">
                    <p className="text-xs text-[#A08F80] mb-1">简历/备注</p>
                    <p className="text-[#4A3A2F] whitespace-pre-wrap">{detailStaff.resume}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ====== Delete Confirm ====== */}
      {showDelete ? (
        <div className="fixed inset-0 bg-[#4A3A2F]/40 flex items-center justify-center z-50 p-4" onClick={() => setShowDelete(false)}>
          <div className="rounded-2xl shadow-2xl bg-[#FFFFFF] max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-bold text-[#A34E3C] mb-2">确认删除</h3>
              <p className="text-sm text-[#726255] mb-4">确定要删除 <strong>{deleteTarget.name}</strong> 吗？此操作不可恢复。</p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowDelete(false)}>取消</Button>
                <Button variant="destructive" className="flex-1" onClick={handleDelete}>确认删除</Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {showPasswordDialog ? <PasswordChangeDialog userId={currentUser?.id || ''} onClose={() => setShowPasswordDialog(false)} /> : null}
    </div>
  );
}
