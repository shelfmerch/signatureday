import { AdminDashboardData } from '@/types/dashboard';
import { LocalStorageService } from '@/lib/localStorage';

const handleResponse = async (res: Response) => {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.message || 'Request failed';
    const status = res.status;
    throw Object.assign(new Error(message), { status, data });
  }
  return data;
};

export const adminApi = {
  getDashboardData: async (range: '7d' | '30d' | '120d' | '365d' = '7d'): Promise<AdminDashboardData> => {
    // Get auth token from localStorage
    const token = LocalStorageService.loadAuthToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add Authorization header if token exists
    if (token && token.split('.').length === 3) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`/api/admin/stats?range=${encodeURIComponent(range)}`, {
      credentials: 'include',
      headers
    });
    const data = await handleResponse(res);

    // Map backend -> AdminDashboardData; fill optional UI sections with safe defaults
    return {
      stats: {
        totalOrders: data?.stats?.totalOrders ?? 0,
        totalRevenue: data?.stats?.totalRevenue ?? 0,
        totalCustomers: data?.stats?.totalCustomers ?? 0,
        avgOrderValue: data?.stats?.avgOrderValue ?? 0,
        conversionRate: data?.stats?.conversionRate ?? 0,
        repeatCustomers: data?.stats?.repeatCustomers ?? 0,
        totalMembers: data?.stats?.totalMembers ?? 0,
        percentChangeOrders: data?.stats?.percentChangeOrders ?? 0,
        percentChangeRevenue: data?.stats?.percentChangeRevenue ?? 0,
        percentChangeCustomers: data?.stats?.percentChangeCustomers ?? 0,
      },
      orderStatus: data?.orderStatus ?? { new: 0, in_progress: 0, ready: 0, shipped: 0 },
      revenueTrend: data?.revenueTrend ?? [],
      recentOrders: data?.recentOrders ?? [],
      topDesigns: data?.topDesigns ?? [],
      customerMetrics: {
        totalCustomers: data?.stats?.totalCustomers ?? 0,
        newThisMonth: 0,
        repeatCustomers: data?.stats?.repeatCustomers ?? 0,
        avgOrdersPerCustomer: 0,
      },
      collegeStats: data?.collegeStats ?? [],
    } as AdminDashboardData;
  },

  markPayoutPaid: async (rewardId: string, txRef: string, paidVia: 'manual-upi' | 'razorpay' | 'bank-transfer' = 'manual-upi') => {
    const token = LocalStorageService.loadAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token && token.split('.').length === 3) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`/api/admin/rewards/${encodeURIComponent(rewardId)}/pay`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ txRef, paidVia })
    });
    return handleResponse(res);
  }
};
