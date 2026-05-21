import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/lib/api';
import { storage } from '@/lib/storage';
import { toast } from 'sonner';

// 全局错误捕获，防止JS错误导致白屏
function initErrorHandler() {
  if (typeof window !== 'undefined') {
    window.onerror = function(msg, url, line) {
      console.error('Global error:', msg, 'at', url, ':', line);
      return true;
    };
    window.addEventListener('unhandledrejection', function(e) {
      console.error('Unhandled promise rejection:', e.reason);
    });
  }
}

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    initErrorHandler();
    // 如果已登录直接跳转
    const token = storage.get('token');
    if (token) {
      navigate('/portal');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }

    setLoading(true);

    try {
      const res = await login({ username: username.trim(), password: password.trim() });

      if (res.user && res.token) {
        // 保存登录状态
        storage.set('token', res.token);
        storage.set('user', JSON.stringify(res.user));

        toast.success('登录成功');

        // 延迟跳转确保状态保存
        setTimeout(() => {
          // 使用navigate，如果不工作则fallback到window.location
          try {
            navigate('/portal');
          } catch {
            window.location.href = '/#/portal';
          }
        }, 100);
      } else {
        setError('登录返回数据异常');
      }
    } catch (err: any) {
      const msg = err?.message || String(err) || '登录失败，请检查网络';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#FAF5F0' }}>
      <div className="w-full max-w-sm">
        <div className="rounded-2xl p-8" style={{ backgroundColor: '#FFFFFF', boxShadow: '0 4px 24px rgba(44,62,80,0.08), 0 1px 4px rgba(44,62,80,0.04)' }}>
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #C89F7F, #B88F6F)' }}>
              <span className="text-white text-2xl font-bold">A</span>
            </div>
            <h1 className="text-2xl font-bold" style={{ color: '#4A3A2F' }}>废墟计划</h1>
            <p className="text-sm mt-1" style={{ color: '#A08F80' }}>服务管理系统</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="username" style={{ color: '#726255' }}>用户名</Label>
              <Input
                id="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="请输入用户名"
                className="h-11"
                style={{ borderColor: '#E8DFD2' }}
                autoComplete="username"
                autoCapitalize="none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" style={{ color: '#726255' }}>密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="h-11"
                style={{ borderColor: '#E8DFD2' }}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="text-sm p-3 rounded-lg" style={{ color: '#A34E3C', backgroundColor: '#FBEAE6' }}>
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 text-white font-medium rounded-lg border-0"
              style={{ background: 'linear-gradient(135deg, #C89F7F, #B88F6F)' }}
              disabled={loading}
            >
              {loading ? '登录中...' : '登 录'}
            </Button>
          </form>
        </div>
        <p className="text-center text-xs mt-6" style={{ color: '#A08F80' }}> Angel Home 服务管理系统</p>
      </div>
    </div>
  );
}
