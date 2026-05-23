import type { ApiResponse, LoginCredentials, User, Staff, Waiter, Store, Order, WaiterReview, CockpitData, DailyRecord, Customer, CustomerService } from '@/types';
import { storage } from './storage';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

function getToken(): string | null {
  return storage.get('token');
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // 自动带上用户ID，用于后端权限隔离
  // 注意：HTTP header 不能包含中文字符，只传用户ID（纯字母数字）
  try {
    const userStr = storage.get('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.id) headers['x-user-id'] = user.id;
    }
  } catch { /* ignore */ }
  return headers;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers = getAuthHeaders();

  const options: RequestInit = {
    method,
    headers,
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
    const data = await res.json() as ApiResponse<T>;
    if (!data.success) {
      throw new Error(data.message || '请求失败');
    }
    return data.data as T;
  } catch (err) {
    console.error(`API ${method} ${path} failed:`, err);
    throw err;
  }
}

// 登录 - 后端返回 User 对象（内含 token 字段）
export async function login(creds: LoginCredentials): Promise<{ user: User; token: string }> {
  const res = await request<User & { token: string }>('POST', '/login', creds);
  if (res.token) {
    storage.set('token', res.token);
    // 从返回数据中分离出 token，其余作为 user 对象存储
    const { token, ...user } = res;
    storage.set('user', JSON.stringify(user));
    return { user: user as User, token };
  }
  throw new Error('登录返回数据缺少token');
}

// 用户管理
export async function getUsers(): Promise<User[]> {
  return request<User[]>('GET', '/users');
}

export async function createUser(data: Partial<User>): Promise<User> {
  return request<User>('POST', '/users', data);
}

export async function updateUser(id: string, data: Partial<User>): Promise<User> {
  return request<User>('PUT', `/users/${id}`, data);
}

export async function deleteUser(id: string): Promise<void> {
  return request<void>('DELETE', `/users/${id}`);
}

// 客服管理
export async function getStaff(): Promise<Staff[]> {
  return request<Staff[]>('GET', '/staff');
}

export async function createStaff(data: Partial<Staff>): Promise<Staff> {
  return request<Staff>('POST', '/staff', data);
}

export async function updateStaff(id: string, data: Partial<Staff>): Promise<Staff> {
  return request<Staff>('PUT', `/staff/${id}`, data);
}

export async function deleteStaff(id: string): Promise<void> {
  return request<void>('DELETE', `/staff/${id}`);
}

// 服务员管理
export async function getWaiters(): Promise<Waiter[]> {
  return request<Waiter[]>('GET', '/waiters');
}

export async function createWaiter(data: Partial<Waiter>): Promise<Waiter> {
  return request<Waiter>('POST', '/waiters', data);
}

export async function updateWaiter(id: string, data: Partial<Waiter>): Promise<Waiter> {
  return request<Waiter>('PUT', `/waiters/${id}`, data);
}

export async function deleteWaiter(id: string): Promise<void> {
  return request<void>('DELETE', `/waiters/${id}`);
}

// 店铺管理
export async function getStores(): Promise<Store[]> {
  return request<Store[]>('GET', '/stores');
}

export async function createStore(data: Partial<Store>): Promise<Store> {
  return request<Store>('POST', '/stores', data);
}

export async function updateStore(id: string, data: Partial<Store>): Promise<Store> {
  return request<Store>('PUT', `/stores/${id}`, data);
}

export async function deleteStore(id: string): Promise<void> {
  return request<void>('DELETE', `/stores/${id}`);
}

// 订单管理
export async function getOrders(params?: { status?: string; myOrders?: boolean; dispatcherView?: boolean }): Promise<Order[]> {
  const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]) as [string, string][]).toString() : '';
  return request<Order[]>('GET', '/orders' + qs);
}

export async function getOrder(id: string): Promise<Order> {
  return request<Order>('GET', `/orders/${id}`);
}

export async function createOrder(data: Partial<Order>): Promise<Order> {
  return request<Order>('POST', '/orders', data);
}

export async function updateOrder(id: string, data: Partial<Order>): Promise<Order> {
  return request<Order>('PUT', `/orders/${id}`, data);
}

export async function deleteOrder(id: string): Promise<void> {
  return request<void>('DELETE', `/orders/${id}`);
}

// 订单补充内容（发消息给派单侠）
export async function addSupplement(orderId: string, content: string, sender?: { id?: string; name?: string; role?: string }): Promise<{ id: string; content: string; createdAt: string }> {
  const body: any = { content };
  if (sender) {
    body.senderId = sender.id;
    body.senderName = sender.name;
    body.senderRole = sender.role;
  }
  return request<{ id: string; content: string; createdAt: string }>('POST', `/orders/${orderId}/supplement`, body);
}

// 评价
export async function createReview(data: Partial<WaiterReview>): Promise<WaiterReview> {
  return request<WaiterReview>('POST', '/waiter-reviews', data);
}

export async function getReviews(params?: { orderId?: string; waiterId?: string; reviewerRole?: string }): Promise<WaiterReview[]> {
  const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
  return request<WaiterReview[]>('GET', `/waiter-reviews${qs}`);
}

// 驾驶舱
export async function getCockpit(): Promise<CockpitData> {
  return request<CockpitData>('GET', '/cockpit');
}

// 健康检查
export async function healthCheck(): Promise<{ status: string; db: string }> {
  return request<{ status: string; db: string }>('GET', '/health');
}

// 工具函数
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
}

// 客服每日打卡（使用认证头部）
function getAuthHeadersForFetch(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const userStr = storage.get('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.id) headers['x-user-id'] = user.id;
    }
  } catch { /* ignore */ }
  return headers;
}

export async function getDailyRecords(params?: { userId?: string; date?: string; startDate?: string; endDate?: string }): Promise<DailyRecord[]> {
  const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]).toString() : '';
  const res = await fetch('/api/cs-daily-records' + qs, { headers: getAuthHeadersForFetch() });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || '获取打卡记录失败');
  return data.data || [];
}

export async function getAllDailyRecords(params?: { startDate?: string; endDate?: string }): Promise<DailyRecord[]> {
  const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]).toString() : '';
  const res = await fetch('/api/cs-daily-records/all' + qs, { headers: getAuthHeadersForFetch() });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || '获取打卡记录失败');
  return data.data || [];
}

export async function saveDailyRecord(record: DailyRecord): Promise<{ id: string }> {
  const res = await fetch('/api/cs-daily-records', {
    method: 'POST',
    headers: getAuthHeadersForFetch(),
    body: JSON.stringify(record),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || '保存打卡记录失败');
  return data.data;
}

export async function deleteDailyRecord(id: string): Promise<void> {
  const res = await fetch('/api/cs-daily-records/' + id, { method: 'DELETE', headers: getAuthHeadersForFetch() });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || '删除打卡记录失败');
}

// ===== 订单补充消息 API =====
export async function getSupplements(orderId: string): Promise<any[]> {
  const res = await fetch(`/api/orders/${orderId}/supplements`, { headers: getAuthHeadersForFetch() });
  const result = await res.json();
  if (!result.success) throw new Error(result.error || '获取消息失败');
  return result.data || [];
}

// ===== 客户资产 API =====
export async function searchCustomers(params: { name?: string; phone?: string; wechat?: string; qq?: string }): Promise<Customer[]> {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
  const res = await fetch('/api/customers/search?' + qs, { headers: getAuthHeadersForFetch() });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || '搜索客户失败');
  return data.data || [];
}

export async function getCustomers(params?: { search?: string; csId?: string; storeId?: string; type?: string; page?: number; pageSize?: number }): Promise<{ list: Customer[]; total: number }> {
  const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]).toString() : '';
  const res = await fetch('/api/customers' + qs, { headers: getAuthHeadersForFetch() });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || '获取客户列表失败');
  return data.data || { list: [], total: 0 };
}

export async function getCustomerDetail(id: string): Promise<Customer & { services: CustomerService[] }> {
  const res = await fetch('/api/customers/' + id, { headers: getAuthHeadersForFetch() });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || '获取客户详情失败');
  return data.data;
}

export async function saveCustomer(customer: Partial<Customer>): Promise<{ id: string; isNew: boolean }> {
  const res = await fetch('/api/customers', {
    method: 'POST',
    headers: getAuthHeadersForFetch(),
    body: JSON.stringify(customer),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || '保存客户失败');
  return data.data;
}

export async function addCustomerService(service: Partial<CustomerService>): Promise<{ id: string }> {
  const res = await fetch('/api/customer-services', {
    method: 'POST',
    headers: getAuthHeadersForFetch(),
    body: JSON.stringify(service),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || '添加服务记录失败');
  return data.data;
}

export async function syncCustomersFromOrders(): Promise<{ created: number; updated: number; total: number }> {
  const res = await fetch('/api/customers/sync-from-orders', { method: 'POST', headers: getAuthHeadersForFetch() });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || '同步客户失败');
  return data.data;
}

export async function getCSPortraits(csId?: string): Promise<{ csStats: any[]; waiterStats: any[] }> {
  const qs = csId ? '?csId=' + csId : '';
  const res = await fetch('/api/cs-portraits' + qs, { headers: getAuthHeadersForFetch() });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || '获取画像失败');
  return data.data;
}

export function formatDateTime(dt?: string): string {
  if (!dt) return '-';
  const d = new Date(dt);
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function formatDate(dt?: string): string {
  if (!dt) return '-';
  const d = new Date(dt);
  return d.toLocaleDateString('zh-CN');
}

export function formatMoney(n?: number): string {
  if (n === undefined || n === null) return '-';
  return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
