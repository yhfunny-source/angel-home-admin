import { useState, useEffect } from 'react';
import { getMyPermissions } from '@/lib/api';

// 模块路径映射
const PATH_TO_MODULE: Record<string, string> = {
  '/send-order': 'send-order',
  '/dispatcher': 'dispatcher',
  '/admin': 'admin',
  '/cockpit': 'cockpit',
  '/consult-data': 'consult-data',
  '/hr': 'hr',
  '/knowledge': 'knowledge',
  '/customers': 'customers',
  '/role-permissions': 'admin',
};

interface Props {
  children: React.ReactNode;
  path: string;
}

export default function PermissionGuard({ children, path }: Props) {
  const [permissions, setPermissions] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyPermissions()
      .then(mods => setPermissions(mods))
      .catch(() => setPermissions([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAF5F0' }}>
        <div className="w-10 h-10 border-4 border-[#C89F7F] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const requiredModule = PATH_TO_MODULE[path];
  if (!requiredModule) return <>{children}</>;
  if (!permissions || !permissions.includes(requiredModule)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAF5F0' }}>
        <div className="text-center">
          <p className="text-4xl mb-4">🔒</p>
          <h2 className="text-lg font-semibold text-[#4A3A2F] mb-2">无权访问</h2>
          <p className="text-sm text-[#A08F80]">您没有该模块的访问权限</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
