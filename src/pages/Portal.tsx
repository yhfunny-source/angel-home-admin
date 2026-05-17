import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { storage } from '@/lib/storage';
import type { UserRole } from '@/types';

interface PortalItem {
  label: string;
  path: string;
  icon: string;
  desc: string;
  roles: UserRole[];
  color: string;
}

const portals: PortalItem[] = [
  {
    label: '客服工作台',
    path: '/send-order',
    icon: '💬',
    desc: '发单、补充内容、评价',
    roles: ['客服', 'BOSS', '经理'],
    color: 'from-[#C89F7F] to-[#B88F6F]',
  },
  {
    label: '派单后台',
    path: '/dispatcher',
    icon: '📋',
    desc: '接单、派单、评价',
    roles: ['派单侠', 'BOSS', '经理'],
    color: 'from-[#5C7258] to-[#4A5E48]',
  },
  {
    label: '管理后台',
    path: '/admin',
    icon: '⚙️',
    desc: '用户、门店、人员管理',
    roles: ['BOSS', '经理', '数据督导'],
    color: 'from-[#8C6A53] to-[#7A5C48]',
  },
  {
    label: 'BOSS驾驶舱',
    path: '/cockpit',
    icon: '👑',
    desc: '业绩总览、数据分析',
    roles: ['BOSS'],
    color: 'from-[#C89F7F] to-[#B88F6F]',
  },
];

export default function Portal() {
  const navigate = useNavigate();
  const userStr = storage.get('user');
  const user = userStr ? JSON.parse(userStr) : null;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#A08F80] mb-4">请先登录</p>
          <Button onClick={() => navigate('/login')}>去登录</Button>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    storage.remove('token');
    storage.remove('user');
    toast.success('已退出登录');
    navigate('/login');
  };

  const roles: UserRole[] = user.roles || [];
  const isBoss = roles.includes('BOSS');

  const filtered = portals.filter(p => {
    if (isBoss) return true;
    return p.roles.some(r => roles.includes(r));
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF5F0' }}>
      {/* Header */}
      <div className="border-b" style={{ backgroundColor: '#FFFFFF', borderColor: '#E8DFD2' }}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #C89F7F, #B88F6F)' }}>
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-semibold" style={{ color: '#4A3A2F' }}>天使到家</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm" style={{ color: '#726255' }}>
              {user.name || user.username}
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F5EFE6', color: '#726255' }}>{roles.join(', ')}</span>
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout} style={{ color: '#726255', borderColor: '#E8DFD2' }}>
              退出
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#4A3A2F' }}>工作台</h1>
          <p style={{ color: '#A08F80' }}>选择你要进入的模块</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="group rounded-2xl p-6 transition-all text-left"
              style={{ backgroundColor: '#FFFFFF', boxShadow: '0 1px 4px rgba(44,62,80,0.06)', border: '1px solid #E8DFD2' }}
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform`}>
                <span className="text-2xl">{item.icon}</span>
              </div>
              <h3 className="text-lg font-semibold mb-1" style={{ color: '#4A3A2F' }}>{item.label}</h3>
              <p className="text-sm" style={{ color: '#A08F80' }}>{item.desc}</p>
              <div className="mt-4 flex gap-1 flex-wrap">
                {item.roles.map(r => (
                  <span key={r} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F5EFE6', color: '#726255' }}>
                    {r}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
