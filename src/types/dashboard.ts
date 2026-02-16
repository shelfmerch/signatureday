export type OrderStatus = 'new' | 'in_progress' | 'ready' | 'shipped';
export type PaymentStatus = 'paid' | 'pending' | 'failed';

export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  avgOrderValue: number;
  conversionRate: number;
  repeatCustomers: number;
  totalMembers: number;
  percentChangeOrders: number;
  percentChangeRevenue: number;
  percentChangeCustomers: number;
}

export interface OrderStatusSummary {
  new: number;
  in_progress: number;
  ready: number;
  shipped: number;
}

export interface DashboardOrder {
  id: string;
  orderId: string;
  customerName: string;
  membersCount: number;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  ordersCount: number;
}

export interface TopDesign {
  designId: string;
  designName: string;
  previewImage: string;
  ordersCount: number;
  revenue: number;
}

export interface CustomerMetrics {
  totalCustomers: number;
  newThisMonth: number;
  repeatCustomers: number;
  avgOrdersPerCustomer: number;
}

export interface CollegeStat {
  college: string;
  ambassadors: number;
  groups: number;
  members: number;
  rewardsPaid: number;
  rewardsPending: number;
}

export interface AdminDashboardData {
  stats: DashboardStats;
  recentOrders: DashboardOrder[];
  orderStatus: OrderStatusSummary;
  revenueTrend: RevenueDataPoint[];
  topDesigns: TopDesign[];
  customerMetrics: CustomerMetrics;
  collegeStats?: CollegeStat[];
}