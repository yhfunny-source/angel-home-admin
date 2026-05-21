import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { DailyRecord, CustomerContact, Store } from '@/types';
import { saveDailyRecord, saveCustomer, getStores } from '@/lib/api';
import { storage } from '@/lib/storage';

interface Props {
  open: boolean;
  userId: string;
  userName: string;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: DailyRecord | null;
}

export default function DailyCheckInDialog({ open, userId, userName, onClose, onSuccess, initialData }: Props) {
  const today = new Date().toISOString().slice(0, 10);

  // 获取当前用户绑定的门店
  const boundStores = useMemo(() => {
    try {
      const userStr = storage.get('user');
      if (!userStr) return [];
      const user = JSON.parse(userStr);
      const storeIds = user?.storeIds || (user?.storeId ? [user.storeId] : []);
      return storeIds as string[];
    } catch { return []; }
  }, []);

  // 加载所有门店信息
  const [allStores, setAllStores] = useState<Store[]>([]);
  useEffect(() => {
    if (!open) return;
    getStores().then(setAllStores).catch(() => setAllStores([]));
  }, [open]);

  // 当前选择的门店ID（默认选第一个绑定的）
  const [storeId, setStoreId] = useState<string>(boundStores[0] || '');

  // 门店名称
  const storeName = useMemo(() => {
    return allStores.find(s => s.id === storeId)?.name || '';
  }, [allStores, storeId]);

  // 是否显示门店选择器（绑定了2家及以上才显示）
  const showStoreSelector = boundStores.length >= 2;

  const [recordDate, setRecordDate] = useState(today);
  const [meituanConsults, setMeituanConsults] = useState(0);
  const [phoneConsults, setPhoneConsults] = useState(0);
  const [wechatAdds, setWechatAdds] = useState(0);
  const [wechatAccounts, setWechatAccounts] = useState<string[]>([]);
  const [qqAdds, setQqAdds] = useState(0);
  const [qqAccounts, setQqAccounts] = useState<string[]>([]);
  const [dispatchCount, setDispatchCount] = useState(0);
  const [dealCount, setDealCount] = useState(0);
  const [oldCustomerDeals, setOldCustomerDeals] = useState(0);
  const [newCustomerDeals, setNewCustomerDeals] = useState(0);
  const [customerContacts, setCustomerContacts] = useState<CustomerContact[]>([]);
  const [saving, setSaving] = useState(false);

  // 加载已有数据
  useEffect(() => {
    if (initialData) {
      setRecordDate(initialData.recordDate || today);
      setStoreId(initialData.storeId || boundStores[0] || '');
      setMeituanConsults(initialData.meituanConsults || 0);
      setPhoneConsults(initialData.phoneConsults || 0);
      setWechatAdds(initialData.wechatAdds || 0);
      setWechatAccounts(initialData.wechatAccounts || []);
      setQqAdds(initialData.qqAdds || 0);
      setQqAccounts(initialData.qqAccounts || []);
      setDispatchCount(initialData.dispatchCount || 0);
      setDealCount(initialData.dealCount || 0);
      setOldCustomerDeals(initialData.oldCustomerDeals || 0);
      setNewCustomerDeals(initialData.newCustomerDeals || 0);
      setCustomerContacts(initialData.customerContacts || []);
    } else {
      resetForm();
    }
  }, [initialData]);

  function resetForm() {
    setRecordDate(today);
    setStoreId(boundStores[0] || '');
    setMeituanConsults(0);
    setPhoneConsults(0);
    setWechatAdds(0);
    setWechatAccounts([]);
    setQqAdds(0);
    setQqAccounts([]);
    setDispatchCount(0);
    setDealCount(0);
    setOldCustomerDeals(0);
    setNewCustomerDeals(0);
    setCustomerContacts([]);
  }

  // 微信数量变化时更新输入框数量
  function handleWechatChange(val: string) {
    const n = Math.max(0, parseInt(val) || 0);
    setWechatAdds(n);
    setWechatAccounts(prev => {
      const arr = [...prev];
      while (arr.length < n) arr.push('');
      return arr.slice(0, n);
    });
  }

  // QQ数量变化时更新输入框数量
  function handleQqChange(val: string) {
    const n = Math.max(0, parseInt(val) || 0);
    setQqAdds(n);
    setQqAccounts(prev => {
      const arr = [...prev];
      while (arr.length < n) arr.push('');
      return arr.slice(0, n);
    });
  }

  // 成单数量变化时更新客户资料卡片
  function handleDealChange(val: string) {
    const n = Math.max(0, parseInt(val) || 0);
    setDealCount(n);
    setCustomerContacts(prev => {
      const arr = [...prev];
      while (arr.length < n) arr.push({ name: '', phone: '', wechat: '', qq: '', type: 'new' });
      return arr.slice(0, n);
    });
  }

  function updateContact(i: number, field: keyof CustomerContact, value: string) {
    setCustomerContacts(prev => {
      const arr = [...prev];
      arr[i] = { ...arr[i], [field]: value };
      return arr;
    });
  }

  async function handleSubmit() {
    if (!recordDate) {
      toast.error('请选择日期');
      return;
    }
    if (showStoreSelector && !storeId) {
      toast.error('请选择今日打卡的门店');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        id: initialData?.id || undefined,
        userId,
        recordDate,
        storeId: storeId || boundStores[0] || undefined,
        storeName: storeName || undefined,
        meituanConsults,
        phoneConsults,
        wechatAdds,
        wechatAccounts: wechatAccounts.filter(Boolean),
        qqAdds,
        qqAccounts: qqAccounts.filter(Boolean),
        dispatchCount,
        dealCount,
        oldCustomerDeals,
        newCustomerDeals,
        customerContacts: customerContacts || [],
      };
      console.log('Submit daily record:', JSON.stringify(payload));
      await saveDailyRecord(payload);

      // 同步成单客户资料到客户资产库
      const validContacts = (customerContacts || []).filter(c => c.name || c.phone || c.wechat || c.qq);
      if (validContacts.length > 0) {
        let synced = 0;
        // 获取当前用户信息用于标记客户来源
        let csName = userName;
        let storeId = '';
        let storeName = '';
        try {
          const userStr = storage.get('user');
          if (userStr) {
            const u = JSON.parse(userStr);
            csName = u.name || u.username || userName;
            storeId = u.storeId || u.storeIds?.[0] || '';
          }
        } catch { /* ignore */ }
        for (const contact of validContacts) {
          try {
            await saveCustomer({
              name: contact.name || undefined,
              phone: contact.phone || undefined,
              wechat: contact.wechat || undefined,
              qq: contact.qq || undefined,
              sourceCsId: userId,
              sourceCsName: csName,
              sourceStoreId: storeId || undefined,
              sourceStoreName: storeName || undefined,
              status: 'active',
            });
            synced++;
          } catch (e) {
            console.error('Sync customer failed:', e);
          }
        }
        if (synced > 0) {
          toast.success(`${synced} 位客户已同步到客户资产库`);
        }
      }

      toast.success(initialData ? '打卡记录已更新' : '打卡成功');
      onSuccess();
      onClose();
    } catch (e: any) {
      console.error('Submit error:', e);
      toast.error('保存失败: ' + (e.message || JSON.stringify(e)));
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-6">
      <div className="absolute inset-0 bg-[#4A3A2F]/40" onClick={onClose} />
      <div className="relative bg-[#FFFFFF] rounded-2xl shadow-2xl w-full max-w-2xl mx-4 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E8DFD2] pb-4">
          <div>
            <h2 className="text-lg font-bold text-[#4A3A2F]">每日业务打卡</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-[#C89F7F] font-medium">👤 {userName}</span>
              {storeName && <span className="text-sm text-[#A08F80]">· 📍 {storeName}</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-[#A08F80] hover:text-[#4A3A2F] text-2xl leading-none">&times;</button>
        </div>

        {/* 日期 */}
        <div>
          <Label className="text-[#4A3A2F]">打卡日期</Label>
          <Input type="date" value={recordDate} onChange={e => setRecordDate(e.target.value)} className="mt-1" />
        </div>

        {/* 门店选择 */}
        {boundStores.length > 0 && (
          <div className="bg-[#FAF5F0] rounded-xl p-4">
            <Label className="text-[#4A3A2F] font-medium flex items-center gap-2">
              <span>📍</span> 所属门店
              {showStoreSelector && <span className="text-xs text-[#A08F80] font-normal">（请选择今日打卡门店）</span>}
            </Label>
            {showStoreSelector ? (
              /* 绑定了2家及以上 - 显示下拉选择 */
              <div className="mt-2">
                <select
                  value={storeId}
                  onChange={e => setStoreId(e.target.value)}
                  className="w-full h-10 rounded-md border border-[#E8DFD2] px-3 text-sm bg-white"
                >
                  <option value="">请选择门店</option>
                  {boundStores.map((sid: string) => {
                    const s = allStores.find((st: Store) => st.id === sid);
                    return (
                      <option key={sid} value={sid}>{s?.name || sid}</option>
                    );
                  })}
                </select>
                {storeId && (
                  <p className="text-xs text-[#A08F80] mt-1">已选择: <span className="text-[#C89F7F] font-medium">{storeName}</span></p>
                )}
              </div>
            ) : (
              /* 只绑定了1家 - 自动填充只读 */
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-10 rounded-md border border-[#E8DFD2] px-3 text-sm flex items-center bg-white text-[#4A3A2F]">
                  <span className="text-[#C89F7F] mr-2">📍</span>
                  <span className="font-medium">{storeName || allStores.find((s: Store) => s.id === boundStores[0])?.name || '加载中...'}</span>
                  <span className="ml-auto text-xs text-[#A08F80]">(自动填充)</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 咨询数据 */}
        <div className="bg-[#FAF5F0] rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-[#7A5C48] flex items-center gap-2">
            <span>📊</span> 渠道咨询
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[#726255] text-xs">美团后台咨询数</Label>
              <Input type="number" min={0} value={meituanConsults} onChange={e => setMeituanConsults(Math.max(0, parseInt(e.target.value) || 0))} className="mt-1" placeholder="0" />
            </div>
            <div>
              <Label className="text-[#726255] text-xs">电话咨询数</Label>
              <Input type="number" min={0} value={phoneConsults} onChange={e => setPhoneConsults(Math.max(0, parseInt(e.target.value) || 0))} className="mt-1" placeholder="0" />
            </div>
          </div>
        </div>

        {/* 添加联系方式 */}
        <div className="bg-[#FAF5F0] rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-[#7A5C48] flex items-center gap-2">
            <span>📱</span> 添加联系方式
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[#726255] text-xs">微信添加（人）</Label>
              <Input type="number" min={0} value={wechatAdds} onChange={e => handleWechatChange(e.target.value)} className="mt-1" placeholder="0" />
            </div>
            <div>
              <Label className="text-[#726255] text-xs">QQ添加（人）</Label>
              <Input type="number" min={0} value={qqAdds} onChange={e => handleQqChange(e.target.value)} className="mt-1" placeholder="0" />
            </div>
          </div>
          {/* 动态微信账号输入 */}
          {wechatAdds > 0 && (
            <div className="space-y-2">
              <Label className="text-[#726255] text-xs">微信账号（{wechatAdds}个）</Label>
              <div className="grid grid-cols-2 gap-2">
                {wechatAccounts.map((acc, i) => (
                  <Input key={`wx-${i}`} value={acc} onChange={e => {
                    const arr = [...wechatAccounts];
                    arr[i] = e.target.value;
                    setWechatAccounts(arr);
                  }} placeholder={`微信 ${i + 1}`} className="text-sm" />
                ))}
              </div>
            </div>
          )}
          {/* 动态QQ账号输入 */}
          {qqAdds > 0 && (
            <div className="space-y-2">
              <Label className="text-[#726255] text-xs">QQ账号（{qqAdds}个）</Label>
              <div className="grid grid-cols-2 gap-2">
                {qqAccounts.map((acc, i) => (
                  <Input key={`qq-${i}`} value={acc} onChange={e => {
                    const arr = [...qqAccounts];
                    arr[i] = e.target.value;
                    setQqAccounts(arr);
                  }} placeholder={`QQ ${i + 1}`} className="text-sm" />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 派单/成单数据 */}
        <div className="bg-[#FAF5F0] rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-[#7A5C48] flex items-center gap-2">
            <span>📋</span> 派单成单
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[#726255] text-xs">昨天派单数量</Label>
              <Input type="number" min={0} value={dispatchCount} onChange={e => setDispatchCount(Math.max(0, parseInt(e.target.value) || 0))} className="mt-1" placeholder="0" />
            </div>
            <div>
              <Label className="text-[#726255] text-xs">成单数量</Label>
              <Input type="number" min={0} value={dealCount} onChange={e => handleDealChange(e.target.value)} className="mt-1" placeholder="0" />
            </div>
            <div>
              <Label className="text-[#726255] text-xs">老客单</Label>
              <Input type="number" min={0} value={oldCustomerDeals} onChange={e => setOldCustomerDeals(Math.max(0, parseInt(e.target.value) || 0))} className="mt-1" placeholder="0" />
            </div>
            <div>
              <Label className="text-[#726255] text-xs">新客单</Label>
              <Input type="number" min={0} value={newCustomerDeals} onChange={e => setNewCustomerDeals(Math.max(0, parseInt(e.target.value) || 0))} className="mt-1" placeholder="0" />
            </div>
          </div>
        </div>

        {/* 成单客户资料 */}
        {customerContacts.length > 0 && (
          <div className="bg-[#FFF1E3] rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-[#B97C4A] flex items-center gap-2">
              <span>👥</span> 成单客户资料（{customerContacts.length}位）— 客户即资产
            </h3>
            {customerContacts.map((contact, i) => (
              <div key={i} className="bg-[#FFFFFF] rounded-lg p-3 space-y-2 border border-[#FDE68A]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#4A3A2F]">客户 {i + 1}</span>
                  <div className="flex gap-1">
                    <button onClick={() => updateContact(i, 'type', 'old')} className={`px-2 py-0.5 rounded-full text-xs transition-colors ${contact.type === 'old' ? 'bg-[#C89F7F] text-white' : 'bg-[#E8DFD2] text-[#726255]'}`}>老客</button>
                    <button onClick={() => updateContact(i, 'type', 'new')} className={`px-2 py-0.5 rounded-full text-xs transition-colors ${contact.type === 'new' ? 'bg-[#C89F7F] text-white' : 'bg-[#E8DFD2] text-[#726255]'}`}>新客</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input value={contact.name} onChange={e => updateContact(i, 'name', e.target.value)} placeholder="姓名" className="text-sm" />
                  <Input value={contact.phone} onChange={e => updateContact(i, 'phone', e.target.value)} placeholder="电话" className="text-sm" />
                  <Input value={contact.wechat} onChange={e => updateContact(i, 'wechat', e.target.value)} placeholder="微信" className="text-sm" />
                  <Input value={contact.qq} onChange={e => updateContact(i, 'qq', e.target.value)} placeholder="QQ" className="text-sm" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end gap-3 pt-2 border-t border-[#E8DFD2]">
          <Button variant="outline" onClick={onClose} className="text-[#726255] border-[#E8DFD2]">取消</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-[#C89F7F] text-white hover:bg-[#B88F6F]">
            {saving ? '保存中...' : initialData ? '更新记录' : '提交打卡'}
          </Button>
        </div>
      </div>
    </div>
  );
}
