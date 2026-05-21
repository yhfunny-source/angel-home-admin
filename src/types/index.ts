// 用户角色（中文）
export type UserRole = 'BOSS' | '经理' | '数据督导' | '客服' | '派单侠';

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  roles: UserRole[];
  phone?: string;
  storeId?: string;       // 主绑定门店ID
  storeName?: string;     // 主绑定门店名称
  storeIds?: string[];    // 绑定的所有门店（最多2个）
  status?: 'active' | 'inactive';
  createdAt?: string;
}

export interface Staff {
  id: string;
  userId: string;
  name: string;                    // 花名/工号
  realName?: string;               // 真实姓名
  phone?: string;                  // 手机号
  idCard?: string;                 // 身份证号
  gender?: '男' | '女';
  age?: number;
  homeAddress?: string;            // 家庭住址
  resume?: string;                 // 简历/备注
  bankCard?: string;               // 银行卡号
  emergencyContact?: string;       // 紧急联系人
  emergencyPhone?: string;         // 紧急联系人电话
  entryDate?: string;              // 入职日期
  storeId?: string;                // 主要归属门店
  storeIds: string[];              // 关联的所有门店（旧字段保留兼容）
  status: 'active' | 'inactive' | 'busy';
  createdAt?: string;
  // 关联数据
  user?: User;
  stores?: Store[];
  primaryStore?: Store;            // 主要归属门店对象
}

export interface Waiter {
  id: string;
  name: string;
  phone?: string;
  avatar?: string;
  gender?: '男' | '女';
  age?: number;
  height?: string;
  bodyType?: string;
  cup?: string;
  personality?: string;
  tags?: string[];
  rating: number;
  totalReviews: number;
  status: 'active' | 'inactive' | 'busy' | 'rest';
  storeId?: string;
  createdAt?: string;
}

export interface Store {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  rent?: number;
  commissionRate?: number;
  marketingFee?: number;
  operatingCost?: number;
  manager?: string;
  staffUserId?: string;  // 绑定的客服用户ID
  status: 'active' | 'inactive';
  createdAt?: string;
}

export interface OrderPreferences {
  height?: string[];
  body?: string[];
  cup?: string[];
  personality?: string[];
  service?: string[];
  age?: string[];
  taboo?: string[];
}

export type OrderStatus = 
  | 'pending'      // 待派单
  | 'assigned'     // 已派单
  | 'departed'     // 已出发
  | 'arrived'      // 已到达
  | 'serving'      // 服务中
  | 'completed'    // 已完成
  | 'rated'        // 已评价
  | 'rejected'     // 被退（客人不满意）
  | 'cancelled';   // 已取消/彻底失败

export interface OrderSupplement {
  id: string;
  content: string;
  createdAt: string;
  createdBy?: string;
}

export interface Order {
  id: string;
  customerName?: string;
  phone?: string;
  wechat?: string;
  qq?: string;
  address: string;
  location?: string;
  preferences?: OrderPreferences | string;
  supplements?: OrderSupplement[] | string;
  notes?: string;
  infoFee: number;
  prepayAmount?: number;
  status: OrderStatus;
  storeId?: string;
  storeName?: string;
  waiterId?: string;
  waiterName?: string;
  staffId?: string;
  staffName?: string;
  submitterId?: string;
  submittedBy?: string;
  dispatcherId?: string;
  dispatcherName?: string;
  review?: string;
  completionNote?: string;
  referencePhoto?: string;    // 参考照片URL
  // 被退相关字段
  rejectReason?: string;          // 被退原因：too_expensive, person_not_satisfy, service_not_satisfy, other
  rejectNote?: string;            // 被退备注
  customerRejectReason?: string;  // 客人理由：too_expensive, person_not_good, service_not_available, no_feature, other
  customerRejectNote?: string;    // 客人其他备注
  rejectAt?: string;              // 被退时间
  followUpAction?: 'reassign' | 'fail'; // 客服跟进：reassign=换人, fail=彻底失败
  createdAt: string;
  updatedAt?: string;
}

export interface WaiterReview {
  id: string;
  orderId: string;
  waiterId: string;
  waiterName?: string;
  reviewerId: string;
  reviewerRole: string;
  rating: number;
  tags: string[];
  comment?: string;
  createdAt: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface CockpitData {
  kpi: {
    totalOrders: number;
    completedOrders: number;
    totalRevenue: number;
    totalInfoFee: number;
    activeStores: number;
    activeWaiters: number;
  };
  recentOrders: Order[];
  storeStats: { id: string; name: string; orderCount: number; revenue: number; infoFee: number }[];
  waiterStats: { id: string; name: string; orderCount: number; revenue: number; rating: number }[];
  staffStats: { id: string; name: string; orderCount: number; completedCount: number }[];
  dynamicTags: { name: string; count: number }[];
}

export interface NavItem {
  id: string;
  label: string;
  icon?: string;
  path?: string;
  children?: NavItem[];
  roles?: UserRole[];
}

// 客户资产
export interface Customer {
  id: string;
  name?: string;
  phone?: string;
  wechat?: string;
  qq?: string;
  sourceStoreId?: string;
  sourceStoreName?: string;
  sourceCsId?: string;
  sourceCsName?: string;
  tags?: string[];
  notes?: string;
  orderCount: number;
  totalSpend: number;
  firstContactDate?: string;
  lastContactDate?: string;
  isVip: boolean;
  status: 'active' | 'inactive' | 'blacklist';
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerService {
  id: string;
  customerId: string;
  orderId?: string;
  serviceDate?: string;
  storeId?: string;
  storeName?: string;
  csId?: string;
  csName?: string;
  waiterId?: string;
  waiterName?: string;
  rating: number;
  tags?: string[];
  comment?: string;
  infoFee: number;
  customerType: 'old' | 'new';
  createdAt?: string;
}

// 客服每日业务打卡
export interface CustomerContact {
  name: string;
  phone?: string;
  wechat?: string;
  qq?: string;
  type: 'old' | 'new';
}

export interface DailyRecord {
  id?: string;
  userId: string;
  recordDate: string;
  storeId?: string;       // 打卡所属门店ID
  storeName?: string;     // 打卡所属门店名称
  meituanConsults: number;
  phoneConsults: number;
  wechatAdds: number;
  wechatAccounts: string[];
  qqAdds: number;
  qqAccounts: string[];
  dispatchCount: number;
  dealCount: number;
  oldCustomerDeals: number;
  newCustomerDeals: number;
  customerContacts: CustomerContact[];
  createdAt?: string;
  updatedAt?: string;
}
