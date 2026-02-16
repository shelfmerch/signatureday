import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAmbassador, getAmbassadorStats, getAmbassadorSummary, getAmbassadorRewards, updateAmbassadorPayoutMethod, getAmbassadorGroups, type AmbassadorResponse, type AmbassadorStatsResponse, type AmbassadorSummaryResponse, type AmbassadorRewardItem, type AmbassadorGroupItem } from '@/lib/ambassadorApi';
import { Copy, ExternalLink, Eye, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function AmbassadorDashboard() {
  const { ambassadorId } = useParams<{ ambassadorId: string }>();
  const navigate = useNavigate();

  const [ambassador, setAmbassador] = useState<AmbassadorResponse | null>(null);
  const [stats, setStats] = useState<AmbassadorStatsResponse | null>(null);
  const [summary, setSummary] = useState<AmbassadorSummaryResponse | null>(null);
  const [rewards, setRewards] = useState<AmbassadorRewardItem[]>([]);
  const [groups, setGroups] = useState<AmbassadorGroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [upiInput, setUpiInput] = useState('');
  const [savingUpi, setSavingUpi] = useState(false);
  const [rewardScreenshots, setRewardScreenshots] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!ambassadorId) {
      navigate('/ambassador/signup');
      return;
    }
    // If id doesn't look like a Mongo ObjectId, redirect to signup
    if (!/^[a-fA-F0-9]{24}$/.test(ambassadorId)) {
      toast.error('Ambassador not found');
      navigate('/ambassador/signup');
      return;
    }

    const run = async () => {
      try {
        const amb = await getAmbassador(ambassadorId);
        setAmbassador(amb);
        // Store ambassadorId in localStorage for quick access
        localStorage.setItem('ambassadorId', ambassadorId);
        const s = await getAmbassadorStats(ambassadorId);
        setStats(s);
        const summaryData = await getAmbassadorSummary(ambassadorId);
        setSummary(summaryData);
        const r = await getAmbassadorRewards(ambassadorId, 1, 50);
        setRewards(r.items);
        const g = await getAmbassadorGroups(ambassadorId, 1, 50);
        setGroups(g.items);
      } catch (err: any) {
        toast.error(err?.message || 'Failed to load ambassador');
        navigate('/ambassador/signup');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [ambassadorId, navigate]);

  const copyReferralLink = () => {
    if (!ambassador) return;
    const fallbackLink = `${window.location.origin}/ref/${ambassador.referralCode}`;
    const linkToCopy = ambassador.referralLink || fallbackLink;
    navigator.clipboard.writeText(linkToCopy);
    toast.success('Referral link copied!');
  };

  const handleSaveUpi = async () => {
    if (!ambassador) return;

    const value = upiInput.trim();
    const upiRegex = /^[\w.-]+@[\w-]+$/;
    if (!value || !upiRegex.test(value)) {
      toast.error('Please enter a valid UPI ID (e.g. name@bank)');
      return;
    }

    try {
      setSavingUpi(true);
      const updated = await updateAmbassadorPayoutMethod(ambassador.id, { type: 'upi', upiId: value });
      setAmbassador(updated);
      toast.success('UPI payout method saved');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save UPI ID');
    } finally {
      setSavingUpi(false);
    }
  };

  // Extract screenshot URLs from rewards (if stored in backend)
  useEffect(() => {
    const screenshots: Record<string, string> = {};
    rewards.forEach(reward => {
      // Check if reward has paidTxRef with screenshot URL
      // This would need to be added to the API response if not already there
      // For now, we'll check localStorage for any stored screenshots
      const stored = localStorage.getItem(`reward-screenshot-${reward.id}`);
      if (stored) {
        screenshots[reward.id] = stored;
      }
    });
    if (Object.keys(screenshots).length > 0) {
      setRewardScreenshots(screenshots);
    }
  }, [rewards]);

  const handleDownloadScreenshot = (rewardId: string, url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `payment-screenshot-${rewardId}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Screenshot download started');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">Loading...</CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!ambassador || !stats) return null;

  const referralUrl =
    ambassador.referralLink || `${window.location.origin}/ref/${ambassador.referralCode}`;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Campus Ambassador Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {ambassador.name}!</p>
        </div>

        {/* Referral Link Card */}
        <Card>
          <CardHeader>
            <CardTitle>Your Referral Link</CardTitle>
            <CardDescription>Share this link to earn rewards</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="flex-1 p-3 bg-muted rounded-md font-mono text-sm break-all">
                {referralUrl}
              </div>
              <Button onClick={copyReferralLink} size="icon">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Referral Code: <span className="font-bold">{ambassador.referralCode}</span>
            </div>
            {stats.referredGroups > 0 && (
              <div className="mt-3 p-3 rounded-md bg-green-50 border border-green-200 text-sm">
                ✅ <span className="font-medium">{stats.referredGroups}</span> {stats.referredGroups === 1 ? 'group has' : 'groups have'} been created using your referral link.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payout settings */}
        <Card>
          <CardHeader>
            <CardTitle>Payout Method</CardTitle>
            <CardDescription>Provide your UPI ID so the admin can pay your rewards manually.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700">UPI ID</label>
                <input
                  type="text"
                  className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="yourname@bank"
                  value={upiInput || ambassador.upiId || ''}
                  onChange={(e) => setUpiInput(e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Example: <code className="font-mono">name@icici</code>. We only store this UPI ID, not any card details.
                </p>
              </div>
              <Button onClick={handleSaveUpi} disabled={savingUpi}>
                {savingUpi ? 'Saving…' : 'Save UPI'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Clicks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClicks || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                visits to referral link
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Groups</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalGroups}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.completedOrders} completed orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMembers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                across all groups
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Estimated Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                ₹{Math.round(
                  groups
                    .filter(g => g.status !== 'paid' && g.status !== 'Paid')
                    .reduce((sum, g) => sum + (g.currentMemberCount || 0), 0)
                  * 149 * 0.16
                )}
              </div>

              <p className="text-xs text-muted-foreground mt-1">
                Based on {
                  groups
                    .filter(g => g.status !== 'paid' && g.status !== 'Paid')
                    .reduce((sum, g) => sum + (g.currentMemberCount || 0), 0)
                } members joined (₹17.88/member)
              </p>
            </CardContent>


          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ₹{summary?.totalRewards.paid ?? stats.paidRewards ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Transferred to you
              </p>
            </CardContent>
          </Card>
        </div>


        {/* Referred Groups List */}
        <Card>
          <CardHeader>
            <CardTitle>Referred Groups</CardTitle>
            <CardDescription>Groups created using your referral link</CardDescription>
          </CardHeader>
          <CardContent>
            {groups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No groups joined yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-3 font-medium">Group Name</th>
                      <th className="p-3 font-medium">Status</th>
                      <th className="p-3 font-medium">Progress</th>
                      <th className="p-3 font-medium">Total Sales</th>
                      <th className="p-3 font-medium">Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((group) => (
                      <tr key={group.id} className="border-b last:border-0 hover:bg-muted/10">
                        <td className="p-3 font-medium">{group.name}</td>
                        <td className="p-3">
                          <Badge
                            variant={
                              group.status === 'paid'
                                ? 'default'
                                : 'outline'
                            }
                          >
                            {group.status === 'paid' ? 'Paid' : 'Active'}
                          </Badge>
                        </td>
                        <td className="p-3">
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
                        </td>
                        <td className="p-3 font-medium">
                          ₹{Math.round((group.currentMemberCount || 0) * 149 * 0.16)}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {new Date(group.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reward Rule */}
        <Card>
          <CardHeader>
            <CardTitle>Reward Rule</CardTitle>
            <CardDescription>Simple and scalable earnings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Each member who joins a group pays <span className="font-semibold">₹149</span> (incl. GST). You earn
                <span className="font-semibold"> 16%</span> of ₹149 value, i.e., <span className="font-semibold">₹17.88 per member</span>.
              </p>
              <p className="text-xs">
                Example: If 50 members complete their join payment across your referred groups, your reward is
                <span className="font-semibold"> 50 × ₹17.88 = ₹894</span>.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
