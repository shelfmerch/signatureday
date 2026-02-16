import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderStatusSummary } from '@/types/dashboard';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface OrderStatusChartProps {
  data: OrderStatusSummary;
  loading?: boolean;
}

const COLORS = {
  new: '#3b82f6',
  in_progress: '#f59e0b',
  ready: '#a855f7',
  shipped: '#10b981',
};

const STATUS_LABELS = {
  new: 'New',
  in_progress: 'Processing',
  ready: 'Ready',
  shipped: 'Shipped',
};

export const OrderStatusChart = ({ data, loading }: OrderStatusChartProps) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    { name: STATUS_LABELS.new, value: data.new, color: COLORS.new },
    { name: STATUS_LABELS.in_progress, value: data.in_progress, color: COLORS.in_progress },
    { name: STATUS_LABELS.ready, value: data.ready, color: COLORS.ready },
    { name: STATUS_LABELS.shipped, value: data.shipped, color: COLORS.shipped },
  ];

  const total = data.new + data.in_progress + data.ready + data.shipped;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>

          <div className="grid grid-cols-2 gap-4">
            {chartData.map((item) => {
              const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
              return (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.value} ({percentage}%)
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};