import { AdminDashboardData, DashboardOrder, RevenueDataPoint, TopDesign } from '@/types/dashboard';

const generateMockDashboardData = (): AdminDashboardData => {
  // Generate revenue trend for last 7 days
  const revenueTrend: RevenueDataPoint[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    revenueTrend.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: Math.floor(Math.random() * 8000) + 3000,
      ordersCount: Math.floor(Math.random() * 15) + 5,
    });
  }

  // Generate recent orders
  const recentOrders: DashboardOrder[] = [
    {
      id: '1',
      orderId: 'ORD-001',
      customerName: 'John Doe',
      membersCount: 12,
      totalAmount: 5000,
      status: 'shipped',
      paymentStatus: 'paid',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      orderId: 'ORD-002',
      customerName: 'Jane Smith',
      membersCount: 15,
      totalAmount: 6500,
      status: 'new',
      paymentStatus: 'paid',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      orderId: 'ORD-003',
      customerName: 'Bob Wilson',
      membersCount: 10,
      totalAmount: 3800,
      status: 'in_progress',
      paymentStatus: 'paid',
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '4',
      orderId: 'ORD-004',
      customerName: 'Alice Brown',
      membersCount: 18,
      totalAmount: 7200,
      status: 'ready',
      paymentStatus: 'paid',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '5',
      orderId: 'ORD-005',
      customerName: 'Charlie Davis',
      membersCount: 8,
      totalAmount: 2800,
      status: 'new',
      paymentStatus: 'pending',
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
  ];

  // Top designs
  const topDesigns: TopDesign[] = [
    {
      designId: 'design-1',
      designName: 'Grid 3x4',
      previewImage: '/images/designs.png',
      ordersCount: 45,
      revenue: 45000,
    },
    {
      designId: 'design-2',
      designName: 'Grid 2x6',
      previewImage: '/images/designs.png',
      ordersCount: 38,
      revenue: 38000,
    },
    {
      designId: 'design-3',
      designName: 'Center Focus',
      previewImage: '/images/designs.png',
      ordersCount: 32,
      revenue: 32000,
    },
    {
      designId: 'design-4',
      designName: 'Hexagonal Grid',
      previewImage: '/images/designs.png',
      ordersCount: 28,
      revenue: 28000,
    },
    {
      designId: 'design-5',
      designName: 'Circle Grid',
      previewImage: '/images/designs.png',
      ordersCount: 22,
      revenue: 22000,
    },
  ];

  return {
    stats: {
      totalOrders: 450,
      totalRevenue: 125000,
      totalCustomers: 340,
      avgOrderValue: 277.77,
      conversionRate: 3.2,
      repeatCustomers: 45,
      totalMembers: 5400,
      percentChangeOrders: 5.2,
      percentChangeRevenue: 8.1,
      percentChangeCustomers: 12.4,
    },
    recentOrders,
    orderStatus: {
      new: 112,
      in_progress: 89,
      ready: 67,
      shipped: 182,
    },
    revenueTrend,
    topDesigns,
    customerMetrics: {
      totalCustomers: 340,
      newThisMonth: 58,
      repeatCustomers: 45,
      avgOrdersPerCustomer: 1.32,
    },
  };
};

export const mockDashboardApi = {
  getDashboardData: async (): Promise<AdminDashboardData> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    return generateMockDashboardData();
  },
};