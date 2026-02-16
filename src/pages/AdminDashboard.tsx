import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MetricCard } from '@/components/admin/MetricCard';
import { RecentOrdersWidget } from '@/components/admin/RecentOrdersWidget';
import { OrderStatusChart } from '@/components/admin/OrderStatusChart';
import { RevenueChart } from '@/components/admin/RevenueChart';
import { CollegeStatsChart } from '@/components/admin/CollegeStatsChart';
import { adminApi } from '@/services/adminApi';
import { AdminDashboardData } from '@/types/dashboard';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import {
  ShoppingCart,
  DollarSign,
  Users,
  TrendingUp,
  RefreshCw,
  UserCheck,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState<'7d' | '30d' | '120d' | '365d'>('7d');

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const dashboardData = await adminApi.getDashboardData(range);
      setData(dashboardData);

      if (isRefresh) {
        toast.success('Dashboard refreshed');
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      // If auth required and missing, navigate to admin orders (protected) or show error
      const status = (error as any)?.status;
      if (status === 401 || status === 403) {
        toast.error('Please sign in as admin to view the dashboard');
        navigate('/admin/order');
      } else {
        toast.error('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <AdminSidebar />
      <main className="flex-1 min-h-0 overflow-y-auto bg-white pt-0 px-6 md:px-8 pb-6 md:pb-8 space-y-6">
          {/* Header - sticky, flush at top */}
          <div className="sticky top-0 z-10 -mx-6 md:-mx-8 px-6 md:px-8 pt-6 md:pt-8 pb-4 bg-white border-b border-border/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Welcome back! Here's your business overview.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={range}
                onChange={(e) => setRange(e.target.value as any)}
                className="border rounded-md px-2 py-1 text-sm"
                aria-label="Select timeframe"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 1 month</option>
                <option value="120d">Last 4 months</option>
                <option value="365d">Last 1 year</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={() => navigate('/admin/order')} size="sm">
                View All Orders
              </Button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Orders"
              value={data?.stats.totalOrders || 0}
              percentChange={data?.stats.percentChangeOrders}
              trend={
                data?.stats.percentChangeOrders && data.stats.percentChangeOrders > 0
                  ? 'up'
                  : 'down'
              }
              icon={ShoppingCart}
              loading={loading}
              subtitle="vs prev 7d"
            />
            <MetricCard
              title="Total Revenue"
              value={data?.stats.totalRevenue || 0}
              unit="₹"
              percentChange={data?.stats.percentChangeRevenue}
              trend={
                data?.stats.percentChangeRevenue && data.stats.percentChangeRevenue > 0
                  ? 'up'
                  : 'down'
              }
              icon={DollarSign}
              loading={loading}
              subtitle="vs prev 7d"
            />
            <MetricCard
              title="Total Customers"
              value={data?.stats.totalCustomers || 0}
              percentChange={data?.stats.percentChangeCustomers}
              trend={
                data?.stats.percentChangeCustomers && data.stats.percentChangeCustomers > 0
                  ? 'up'
                  : 'down'
              }
              icon={Users}
              loading={loading}
              subtitle="vs prev 7d"
            />
            <MetricCard
              title="Avg Order Value"
              value={`₹${data?.stats.avgOrderValue.toFixed(2) || 0}`}
              icon={TrendingUp}
              loading={loading}
            />
          </div>

          {/* Secondary Metrics */}
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              title="Repeat Customers"
              value={data?.stats.repeatCustomers || 0}
              subtitle={
                data?.stats.totalCustomers
                  ? `${(
                      (data.stats.repeatCustomers / data.stats.totalCustomers) *
                      100
                    ).toFixed(1)}% of total`
                  : ''
              }
              icon={UserCheck}
              loading={loading}
            />
            <MetricCard
              title="Total Members"
              value={data?.stats.totalMembers || 0}
              subtitle={
                data?.stats.totalOrders
                  ? `avg: ${(data.stats.totalMembers / data.stats.totalOrders).toFixed(0)}/order`
                  : ''
              }
              icon={Users}
              loading={loading}
            />
            <MetricCard
              title="Conversion Rate"
              value={`${data?.stats.conversionRate.toFixed(1) || 0}%`}
              icon={Clock}
              loading={loading}
            />
          </div>

          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="md:col-span-1 lg:col-span-1">
              <RevenueChart data={data?.revenueTrend || []} loading={loading} />
            </div>
            <div className="md:col-span-1 lg:col-span-1">
              <OrderStatusChart
                data={data?.orderStatus || { new: 0, in_progress: 0, ready: 0, shipped: 0 }}
                loading={loading}
              />
            </div>
            <div className="md:col-span-2 lg:col-span-1">
              <CollegeStatsChart data={data?.collegeStats || []} loading={loading} />
            </div>
          </div>

          {/* Recent Orders */}
          <RecentOrdersWidget orders={data?.recentOrders || []} loading={loading} />
      </main>
    </div>
  );
}