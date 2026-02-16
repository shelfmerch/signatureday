import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '@/services/adminApi';
import { AdminDashboardData, CollegeStat } from '@/types/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CollegeStatsChart } from '@/components/admin/CollegeStatsChart';
import { toast } from 'sonner';

export default function CollegeDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const dashboardData = await adminApi.getDashboardData('365d');
        setData(dashboardData);
      } catch (error: any) {
        console.error('Failed to fetch college stats:', error);
        const status = error?.status;
        if (status === 401 || status === 403) {
          toast.error('Please sign in as admin to view college insights');
          navigate('/admin');
        } else {
          toast.error('Failed to load college stats');
        }
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [navigate]);

  const collegeStats: CollegeStat[] = data?.collegeStats || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">College Insights</h1>
          <p className="text-muted-foreground mt-1">
            College-wise performance, rewards, and participation.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/admin')}>
          Back to Dashboard
        </Button>
      </div>

      <CollegeStatsChart data={collegeStats} loading={loading} />

      <Card>
        <CardHeader>
          <CardTitle>College-wise Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading colleges…</p>
          ) : !collegeStats.length ? (
            <p className="text-sm text-muted-foreground">No college data available yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4 font-medium">College</th>
                    <th className="py-2 pr-4 font-medium">Ambassadors</th>
                    <th className="py-2 pr-4 font-medium">Groups</th>
                    <th className="py-2 pr-4 font-medium">Members</th>
                    <th className="py-2 pr-4 font-medium">Rewards Paid</th>
                    <th className="py-2 pr-4 font-medium">Rewards Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {collegeStats.map((c) => (
                    <tr key={c.college || 'Unknown'} className="border-b last:border-0">
                      <td className="py-2 pr-4">{c.college || 'Unknown'}</td>
                      <td className="py-2 pr-4">{c.ambassadors}</td>
                      <td className="py-2 pr-4">{c.groups}</td>
                      <td className="py-2 pr-4">{c.members}</td>
                      <td className="py-2 pr-4">
                        ₹{(c.rewardsPaid || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 pr-4">
                        ₹{(c.rewardsPending || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

