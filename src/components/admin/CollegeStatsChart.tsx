import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CollegeStat } from '@/types/dashboard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface CollegeStatsChartProps {
  data: CollegeStat[];
  loading?: boolean;
}

export const CollegeStatsChart = ({ data, loading }: CollegeStatsChartProps) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Colleges by Rewards</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const topColleges = [...data]
    .sort((a, b) => (b.rewardsPaid || 0) - (a.rewardsPaid || 0))
    .slice(0, 8)
    .map((c) => ({
      name: c.college || 'Unknown',
      rewardsPaid: c.rewardsPaid || 0,
      groups: c.groups || 0,
      members: c.members || 0,
    }));

  if (!topColleges.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Colleges by Rewards</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No college data available yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Colleges by Rewards</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topColleges} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                interval={0}
                angle={-30}
                textAnchor="end"
              />
              <YAxis
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number, key: string) => {
                  if (key === 'rewardsPaid') {
                    return [`₹${value.toLocaleString('en-IN')}`, 'Rewards Paid'];
                  }
                  if (key === 'members') {
                    return [value, 'Members'];
                  }
                  if (key === 'groups') {
                    return [value, 'Groups'];
                  }
                  return [value, key];
                }}
              />
              <Bar dataKey="rewardsPaid" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

