import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { storage } from '@/lib/storage';
import { getMyPermissions } from '@/lib/api';

interface PortalItem {
  label: string;
  path: string;
  icon: string;
  desc: string;
  moduleKey: string;
  color: string;
}

const ALL_PORTALS: PortalItem[] = [
  {
    label: '客服工作台',
    path: '/send-order',
    icon: '💬',
    desc: '发单、补充内容、评价',
    moduleKey: 'send-order',
    color: 'from-[#C89F7F] to-[#B88F6F]',
  },
  {
    label: '派单后台',
    path: '/dispatcher',
    icon: '📋',
    desc: '接单、派单、评价',
    moduleKey: 'dispatcher',
    color: 'from-[#5C7258] to-[#4A5E48]',
  },
  {
    label: '管理后台',
    path: '/admin',
    icon: '⚙️',
    desc: '用户、门店、人员管理',
    moduleKey: 'admin',
    color: 'from-[#8C6A53] to-[#7A5C48]',
  },
  {
    label: 'BOSS驾驶舱',
    path: '/cockpit',
    icon: '👑',
    desc: '业绩总览、数据分析',
    moduleKey: 'cockpit',
    color: 'from-[#C89F7F] to-[#B88F6F]',
  },
  {
    label: '咨询数据',
    path: '/consult-data',
    icon: '📊',
    desc: '咨询量、回复率统计',
    moduleKey: 'consult-data',
    color: 'from-[#B88F6F] to-[#A87F5F]',
  },
  {
    label: '人力资源',
    path: '/hr',
    icon: '👔',
    desc: '招聘、离职、考勤、资产',
    moduleKey: 'hr',
    color: 'from-[#5C7258] to-[#4A5E48]',
  },
  {
    label: '废墟知识库',
    path: '/knowledge',
    icon: '📚',
    desc: '业务学习、能力提升',
    moduleKey: 'knowledge',
    color: 'from-[#8C6A53] to-[#7A5C48]',
  },
  {
    label: '客户资产',
    path: '/customers',
    icon: '👥',
    desc: '客户管理、历史记录',
    moduleKey: 'customers',
    color: 'from-[#B88F6F] to-[#A87F5F]',
  },
];

export default function Portal() {
  const navigate = useNavigate();
  const user = storage.get('user') ? JSON.parse(storage.get('user')!) : null;
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyPermissions()
      .then(mods => { setPermissions(mods); })
      .catch(() => { setPermissions([]); })
      .finally(() => { setLoading(false); });
  }, []);

  const visiblePortals = permissions.length > 0
    ? ALL_PORTALS.filter(p => permissions.includes(p.moduleKey))
    : [];

  const handleLogout = () => {
    storage.remove('token');
    storage.remove('user');
    toast.success('已退出登录');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAF5F0' }}>
        <div className="w-10 h-10 border-4 border-[#C89F7F] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF5F0' }}>
      {/* Header */}
      <header className="border-b" style={{ backgroundColor: '#FFFFFF', borderColor: '#E8DFD2' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #C89F7F, #B88F6F)' }}>
              <span className="text-white text-xl">🏠</span>
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: '#4A3A2F' }}>废墟计划</h1>
              <p className="text-xs" style={{ color: '#A08F80' }}>欢迎回来，{user?.name || user?.username || '用户'}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} style={{ color: '#726255', borderColor: '#E8DFD2' }}>
            退出登录
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {visiblePortals.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🔒</p>
            <h2 className="text-lg font-semibold text-[#4A3A2F] mb-2">暂无访问权限</h2>
            <p className="text-sm text-[#A08F80]">请联系管理员为您分配模块权限</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visiblePortals.map(portal => (
              <button
                key={portal.path}
                onClick={() => navigate(portal.path)}
                className="rounded-xl border p-5 text-left transition-all hover:shadow-md bg-white"
                style={{ borderColor: '#E8DFD2' }}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${portal.color} flex items-center justify-center text-2xl shadow-md shrink-0`}>
                    {portal.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold mb-1" style={{ color: '#4A3A2F' }}>{portal.label}</h3>
                    <p className="text-sm" style={{ color: '#A08F80' }}>{portal.desc}</p>
                  </div>
                  <svg className="w-5 h-5 mt-1" style={{ color: '#C89F7F' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
