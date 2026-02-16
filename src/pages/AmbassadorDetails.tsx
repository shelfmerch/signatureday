import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle, Clock, DollarSign, ArrowLeft } from 'lucide-react';
import {
  getAmbassador,
  getAmbassadorRewards,
  getAmbassadorGroups,
  AmbassadorResponse,
  AmbassadorRewardItem,
  AmbassadorGroupItem,
  Paginated,
} from '@/lib/ambassadorApi';
import { paymentsApi } from '@/lib/api';
import { ambassadorAdminApi } from '@/services/ambassadorAdminApi';
import { adminApi } from '@/services/adminApi';
import { toast } from 'sonner';

export default function AmbassadorDetails() {
  const { ambassadorId } = useParams<{ ambassadorId: string }>();
  const navigate = useNavigate();

  const [ambassador, setAmbassador] = useState<AmbassadorResponse | null>(null);
  const [rewards, setRewards] = useState<AmbassadorRewardItem[]>([]);
  const [groups, setGroups] = useState<AmbassadorGroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingRewardId, setPayingRewardId] = useState<string | null>(null);

  const loadData = async () => {
    if (!ambassadorId) {
      navigate('/admin/ambassadors');
      return;
    }

    try {
      setLoading(true);
      const amb = await getAmbassador(ambassadorId);
      setAmbassador(amb);

      const res: Paginated<AmbassadorRewardItem> = await getAmbassadorRewards(ambassadorId, 1, 200);
      setRewards(res.items || []);
      const groupsRes: Paginated<AmbassadorGroupItem> = await getAmbassadorGroups(ambassadorId, 1, 200);
      setGroups(groupsRes.items || []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load ambassador details');
      navigate('/admin/ambassadors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ambassadorId]);

  const handleUpdateStatus = async (rewardId: string, status: 'Pending' | 'Approved' | 'Paid') => {
    try {
      await ambassadorAdminApi.updateRewardStatus(rewardId, status);
      await loadData();
      toast.success(`Reward status updated to ${status}`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update reward status');
    }
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (document.getElementById('razorpay-sdk')) return resolve(true);
      const script = document.createElement('script');
      script.id = 'razorpay-sdk';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleMarkAsPaid = async (rewardId: string) => {
    const reward = rewards.find((r) => r.id === rewardId);
    if (!reward) {
      toast.error('Reward not found');
      return;
    }

    if (!ambassador?.id) return;

    if (!ambassador.upiId) {
      toast.error('Ambassador has no UPI ID set. Ask them to update their profile.');
      return;
    }

    const amountPaise = Math.round((reward.rewardAmount || 0) * 100);
    if (!amountPaise || amountPaise <= 0) {
      toast.error('Invalid reward amount');
      return;
    }

    try {
      setPayingRewardId(rewardId);

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay SDK');
      }

      const rpOrder = await paymentsApi.createOrder(amountPaise, `reward_${reward.id}`, {
        type: 'ambassadorReward',
        rewardId: reward.id,
        ambassadorId: ambassador.id,
      });

      const { keyId } = await paymentsApi.getKey();

      const options: any = {
        key: keyId,
        amount: rpOrder.amount,
        currency: 'INR',
        name: 'Signature Day',
        description: `Ambassador reward for ${ambassador.name}`,
        order_id: rpOrder.id,
        prefill: {
          name: ambassador.name,
          email: ambassador.email,
        },
        notes: {
          rewardId: reward.id,
          ambassadorId: ambassador.id,
        },
        handler: async (response: any) => {
          try {
            const verify = await paymentsApi.verify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              clientOrderId: `REWARD-${reward.id}`,
              email: ambassador.email,
              name: ambassador.name,
              amount: amountPaise,
            });

            if (!verify.valid) {
              toast.error('Payment verification failed');
              return;
            }

            await adminApi.markPayoutPaid(reward.id, response.razorpay_payment_id, 'razorpay');
            toast.success('Reward paid via Razorpay');
            await loadData();
          } catch (e: any) {
            console.error('Failed to finalize ambassador payout:', e);
            toast.error(e?.message || 'Failed to finalize payout');
          } finally {
            setPayingRewardId(null);
          }
        },
        modal: {
          ondismiss: () => {
            setPayingRewardId(null);
            toast.info('Razorpay payment cancelled');
          },
        },
        theme: { color: '#6d28d9' },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (e: any) {
      console.error('Razorpay payout error:', e);
      setPayingRewardId(null);
      toast.error(e?.message || 'Failed to start Razorpay payment');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading ambassador details…</p>
      </div>
    );
  }

  if (!ambassador) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="mb-4">Ambassador not found.</p>
            <Button variant="outline" onClick={() => navigate('/admin/ambassadors')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Ambassadors
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalRewards = rewards.reduce((s, r) => s + (r.rewardAmount || 0), 0);
  const totalMembers = rewards.reduce((s, r) => s + (r.memberCount || 0), 0);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Ambassador Details</h1>
            <p className="text-muted-foreground">
              {ambassador.name} • {ambassador.email} • {ambassador.referralCode}
            </p>
            {ambassador.upiId && (
              <p className="text-sm text-muted-foreground mt-1">
                UPI ID: <span className="font-monospace">{ambassador.upiId}</span>
              </p>
            )}
          </div>
          <Button variant="outline" onClick={() => navigate('/admin/ambassadors')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Ambassadors
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Total Groups</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rewards.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Total Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMembers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Total Earned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalRewards}</div>
            </CardContent>
          </Card>
        </div>


        {/* Groups Card */}
        <Card>
          <CardHeader>
            <CardTitle>Referred Groups</CardTitle>
          </CardHeader>
          <CardContent>
            {groups.length === 0 ? (
              <p className="text-muted-foreground">No groups joined yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Group Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell className="font-medium">{group.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            group.status === 'paid'
                              ? 'default'
                              : 'outline'
                          }
                        >
                          {group.status === 'paid' ? 'Paid' : 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono bg-secondary px-2 py-0.5 rounded">
                            {group.currentMemberCount} / {group.totalMembers}
                          </span>
                          <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${Math.min(100, (group.currentMemberCount / group.totalMembers) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{group.currentMemberCount}</TableCell>
                      <TableCell>{new Date(group.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rewards</CardTitle>
          </CardHeader>
          <CardContent>
            {rewards.length === 0 ? (
              <p className="text-muted-foreground">No rewards yet for this ambassador.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Group</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Reward</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rewards.map((reward) => (
                    <TableRow key={reward.id}>
                      <TableCell className="font-medium">{reward.groupName}</TableCell>
                      <TableCell>{reward.memberCount}</TableCell>
                      <TableCell className="font-semibold">₹{reward.rewardAmount}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            reward.status === 'Paid' || reward.status === 'paid'
                              ? 'default'
                              : reward.status === 'Approved'
                                ? 'secondary'
                                : 'outline'
                          }
                        >
                          {reward.status === 'Paid' || reward.status === 'paid'
                            ? 'Paid'
                            : reward.status === 'pending' || reward.status === 'Pending'
                              ? 'Pending'
                              : reward.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(reward.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {reward.status === 'Pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(reward.id, 'Approved')}
                            >
                              <DollarSign className="w-3 h-3 mr-1" />
                              Approve
                            </Button>
                          )}
                          {reward.status !== 'Paid' && reward.status !== 'paid' && (
                            <Button
                              size="sm"
                              onClick={() => handleMarkAsPaid(reward.id)}
                              disabled={payingRewardId === reward.id}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {payingRewardId === reward.id ? 'Processing...' : 'Mark Paid'}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

