import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getRolePermissions, updateRolePermission } from '@/lib/api';
import type { RolePermission } from '@/lib/api';

const ALL_MODULES = [
  { key: 'send-order', label: '客服工作台', icon: '💬', desc: '发单、补充内容、评价' },
  { key: 'dispatcher', label: '派单后台', icon: '📋', desc: '接单、派单、评价' },
  { key: 'admin', label: '管理后台', icon: '⚙️', desc: '用户、门店、人员管理' },
  { key: 'cockpit', label: 'BOSS驾驶舱', icon: '👑', desc: '业绩总览、数据分析' },
  { key: 'consult-data', label: '咨询数据', icon: '📊', desc: '咨询量、回复率统计' },
  { key: 'hr', label: '人力资源', icon: '👔', desc: '招聘、离职、考勤、资产' },
  { key: 'knowledge', label: '废墟知识库', icon: '📚', desc: '业务学习、能力提升' },
  { key: 'customers', label: '客户资产', icon: '👥', desc: '客户管理、历史记录' },
];

export default function RolePermissions() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getRolePermissions();
      setRoles(data);
    } catch (e: any) {
      toast.error('加载失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleModule = (roleName: string, moduleKey: string, currentModules: string[]) => {
    const has = currentModules.includes(moduleKey);
    const next = has ? currentModules.filter(m => m !== moduleKey) : [...currentModules, moduleKey];
    setRoles(prev => prev.map(r => r.roleName === roleName ? { ...r, modules: next } : r));
  };

  const save = async (role: RolePermission) => {
    setSaving(role.roleName);
    try {
      await updateRolePermission(role.roleName, role.modules);
      toast.success(`${role.roleName} 权限已保存`);
    } catch (e: any) {
      toast.error('保存失败: ' + e.message);
    } finally {
      setSaving(null);
    }
  };

  const roleColors: Record<string, string> = {
    'BOSS': 'from-[#C89F7F] to-[#B88F6F]',
    '经理': 'from-[#5C7258] to-[#4A5E48]',
    '数据督导': 'from-[#8C6A53] to-[#7A5C48]',
    '派单侠': 'from-[#B88F6F] to-[#A87F5F]',
    '客服': 'from-[#14B8A6] to-[#0D9488]',
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF5F0' }}>
      <header className="border-b sticky top-0 z-30" style={{ backgroundColor: '#FFFFFF', borderColor: '#E8DFD2' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #726255, #5A4A3F)' }}>
              <span className="text-white font-bold text-sm">🔐</span>
            </div>
            <span className="font-semibold text-sm sm:text-base" style={{ color: '#4A3A2F' }}>角色权限配置</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin')} className="text-xs h-8" style={{ color: '#726255', borderColor: '#E8DFD2' }}>返回管理后台</Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-[#C89F7F] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {roles.map(role => (
              <div key={role.id} className="rounded-xl border border-[#E8DFD2] bg-white shadow-sm overflow-hidden">
                {/* 角色头部 */}
                <div className="px-4 sm:px-5 py-4 border-b border-[#E8DFD2] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${roleColors[role.roleName] || 'from-gray-400 to-gray-500'} flex items-center justify-center text-lg shadow-md`}>
                      {role.roleName === 'BOSS' ? '👑' : role.roleName === '经理' ? '💼' : role.roleName === '数据督导' ? '📈' : role.roleName === '派单侠' ? '📋' : role.roleName === '客服' ? '💬' : '👤'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#4A3A2F]">{role.roleName}</h3>
                      <p className="text-xs text-[#A08F80]">已开启 {role.modules.length} 个模块</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => save(role)}
                    disabled={saving === role.roleName}
                    className="bg-[#C89F7F] text-white hover:bg-[#B88F6F] text-xs h-8"
                  >
                    {saving === role.roleName ? '保存中...' : '💾 保存'}
                  </Button>
                </div>

                {/* 模块列表 */}
                <div className="p-4 sm:p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {ALL_MODULES.map(mod => {
                      const checked = role.modules.includes(mod.key);
                      return (
                        <label
                          key={mod.key}
                          className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            checked
                              ? 'border-[#C89F7F] bg-[#FFF1E3]'
                              : 'border-[#E8DFD2] bg-white hover:border-[#D5C8B8]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 w-4 h-4 accent-[#C89F7F] shrink-0"
                            checked={checked}
                            onChange={() => toggleModule(role.roleName, mod.key, role.modules)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-base">{mod.icon}</span>
                              <span className={`text-sm font-medium ${checked ? 'text-[#C89F7F]' : 'text-[#4A3A2F]'}`}>{mod.label}</span>
                            </div>
                            <p className="text-[11px] text-[#A08F80] mt-0.5">{mod.desc}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
