import type { ApiResponse, LoginCredentials, User, Staff, Waiter, Store, Order, WaiterReview, CockpitData } from '@/types';
import { storage } from './storage';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

function getToken(): string | null {
  return storage.get('token');
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

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
export async function getOrders(): Promise<Order[]> {
  return request<Order[]>('GET', '/orders');
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

// 订单补充内容
export async function addSupplement(orderId: string, content: string): Promise<Order> {
  return request<Order>('POST', `/orders/${orderId}/supplement`, { content });
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
