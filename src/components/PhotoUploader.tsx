import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { storage } from '@/lib/storage';

interface Props {
  onUpload: (url: string) => void;
  existingUrl?: string;
}

export default function PhotoUploader({ onUpload, existingUrl }: Props) {
  const [preview, setPreview] = useState<string>(existingUrl || '');
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      toast.error('请上传图片文件');
      return;
    }

    // 验证文件大小（5MB）
    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片不能超过5MB');
      return;
    }

    // 本地预览
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // 上传
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);

      // 获取认证头 - 使用统一 storage 工具
      const headers: Record<string, string> = {};
      const token = storage.get('token');
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/upload/photo', {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message || '上传失败');

      onUpload(data.data.url);
      toast.success('图片上传成功');
    } catch (e: any) {
      toast.error('上传失败: ' + (e.message || '未知错误'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="参考照片"
            className="w-full h-32 object-cover rounded-lg border border-[#E8DFD2]"
          />
          <div className="absolute top-1 right-1 flex gap-1">
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="bg-[#4A3A2F] text-white text-xs px-2 py-1 rounded hover:bg-[#3D2E22] transition-colors"
            >
              {uploading ? '上传中...' : '更换'}
            </button>
            <button
              onClick={() => { setPreview(''); onUpload(''); }}
              className="bg-[#B85C4A] text-white text-xs px-2 py-1 rounded hover:bg-[#8C3F30] transition-colors"
            >
              删除
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-20 border-2 border-dashed border-[#E8DFD2] rounded-lg flex flex-col items-center justify-center gap-1 hover:border-[#C89F7F] hover:bg-[#FAF5F0] transition-colors"
        >
          <span className="text-2xl">📷</span>
          <span className="text-xs text-[#A08F80]">{uploading ? '上传中...' : '上传参考照片（可选）'}</span>
        </button>
      )}
    </div>
  );
}
