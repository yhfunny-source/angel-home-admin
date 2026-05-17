import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { updateUser } from '@/lib/api';

interface Props {
  userId: string;
  onClose: () => void;
}

export default function PasswordChangeDialog({ userId, onClose }: Props) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!oldPassword.trim()) { toast.error('请输入原密码'); return; }
    if (!newPassword.trim()) { toast.error('请输入新密码'); return; }
    if (newPassword.length < 4) { toast.error('新密码至少4位'); return; }
    if (newPassword !== confirmPassword) { toast.error('两次输入的新密码不一致'); return; }

    setLoading(true);
    try {
      await updateUser(userId, { password: newPassword });
      toast.success('密码修改成功');
      onClose();
    } catch (e: any) {
      toast.error(e.message || '修改失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <h3 className="text-lg font-bold text-[#4A3A2F] mb-4">修改密码</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-[#726255]">原密码</label>
              <Input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} placeholder="请输入原密码" />
            </div>
            <div>
              <label className="text-sm text-[#726255]">新密码</label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="至少4位" />
            </div>
            <div>
              <label className="text-sm text-[#726255]">确认新密码</label>
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="再次输入新密码" />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <Button variant="outline" className="flex-1" onClick={onClose}>取消</Button>
            <Button className="flex-1 bg-amber-500 hover:bg-amber-600" onClick={handleSubmit} disabled={loading}>
              {loading ? '修改中...' : '确认修改'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
