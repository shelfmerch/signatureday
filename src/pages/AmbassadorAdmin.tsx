import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TablePagination } from '@/components/admin/TablePagination';
import { ambassadorAdminApi, WaitlistItem } from '@/services/ambassadorAdminApi';
import { getAmbassadorRewards as getAmbassadorRewardsApi, Paginated, AmbassadorRewardItem } from '@/lib/ambassadorApi';
import { Search, CheckCircle, Clock, UserPlus, XCircle, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function AmbassadorAdmin() {
  const [searchTerm, setSearchTerm] = useState('');
  const [ambassadors, setAmbassadors] = useState<
    Array<{
      id: string;
      name: string;
      email: string;
      city?: string;
      phone: string;
      college?: string;
      referralCode: string;
      referralLink: string;
      upiId?: string;
      totals: {
        rewardsPaid: number;
        rewardsPending: number;
      };
      createdAt: string;
    }>
  >([]);
  const [ambassadorsTotal, setAmbassadorsTotal] = useState(0);
  const [allRewards, setAllRewards] = useState<AmbassadorRewardItem[]>([]);
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistItem[]>([]);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [approvingWaitlistId, setApprovingWaitlistId] = useState<string | null>(null);
  const [rejectingWaitlistId, setRejectingWaitlistId] = useState<string | null>(null);
  const [showWaitlist, setShowWaitlist] = useState(true);
  const [ambassadorPage, setAmbassadorPage] = useState(1);
  const [ambassadorPageSize, setAmbassadorPageSize] = useState(20);
  const [waitlistPage, setWaitlistPage] = useState(1);
  const [waitlistTotal, setWaitlistTotal] = useState(0);
  const [waitlistPageSize, setWaitlistPageSize] = useState(10);

  const loadAmbassadors = async () => {
    try {
      const res = await ambassadorAdminApi.listAmbassadors(
        ambassadorPage,
        ambassadorPageSize,
        searchTerm.trim()
      );
      setAmbassadors(res.items || []);
      setAmbassadorsTotal(res.total || res.items?.length || 0);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load ambassadors');
    }
  };

  const loadAdminRewards = async () => {
    try {
      // Load all rewards for stats
      const allRes = await ambassadorAdminApi.getRewards(1, 1000);
      setAllRewards(allRes.items || []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load rewards stats');
    }
  };

  useEffect(() => {
    setAmbassadorPage(1);
  }, [searchTerm]);

  useEffect(() => {
    loadAmbassadors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, ambassadorPage, ambassadorPageSize]);

  useEffect(() => {
    loadAdminRewards();
  }, []);

  useEffect(() => {
    loadWaitlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitlistPage, waitlistPageSize]);

  const loadWaitlist = async () => {
    try {
      setWaitlistLoading(true);
      const res = await ambassadorAdminApi.listWaitlist(
        waitlistPage,
        waitlistPageSize,
        'pending'
      );
      setWaitlistEntries(res.items || []);
      setWaitlistTotal(res.total ?? res.items?.length ?? 0);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load waitlist');
    } finally {
      setWaitlistLoading(false);
    }
  };

  const handleApproveWaitlist = async (id: string) => {
    try {
      setApprovingWaitlistId(id);
      await ambassadorAdminApi.approveWaitlist(id);
      toast.success('Ambassador approved and created successfully');
      await loadWaitlist();
      await loadAmbassadors(); // Refresh ambassadors list
    } catch (e: any) {
      toast.error(e?.message || 'Failed to approve waitlist entry');
    } finally {
      setApprovingWaitlistId(null);
    }
  };

  const handleRejectWaitlist = async (id: string) => {
    if (!confirm('Are you sure you want to reject this application?')) {
      return;
    }
    try {
      setRejectingWaitlistId(id);
      await ambassadorAdminApi.rejectWaitlist(id);
      toast.success('Application rejected');
      await loadWaitlist();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to reject waitlist entry');
    } finally {
      setRejectingWaitlistId(null);
    }
  };

  // Calculate real stats from fetched data
  const stats = {
    totalAmbassadors: ambassadorsTotal,
    totalRewards: allRewards.reduce((sum, r) => sum + (r.rewardAmount || 0), 0),
    pendingPayouts: allRewards
      .filter(r => r.status === 'pending' || r.status === 'Pending')
      .reduce((sum, r) => sum + (r.rewardAmount || 0), 0),
    paidPayouts: allRewards
      .filter(r => r.status === 'Paid' || r.status === 'paid')
      .reduce((sum, r) => sum + (r.rewardAmount || 0), 0),
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Campus Ambassador Admin</h1>
          <p className="text-muted-foreground">Manage ambassadors, rewards, and payouts</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Ambassadors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalAmbassadors}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Rewards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₹{stats.totalRewards}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Payouts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">₹{stats.pendingPayouts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Paid Payouts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">₹{stats.paidPayouts}</div>
            </CardContent>
          </Card>
        </div>

        {/* Waitlist Section */}
        {showWaitlist && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Pending Ambassador Applications
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Review and approve new ambassador signups
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowWaitlist(!showWaitlist);
                  }}
                >
                  {showWaitlist ? 'Hide' : 'Show'} Waitlist
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {waitlistLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading waitlist...</div>
              ) : waitlistEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pending applications
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>College</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Applied</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {waitlistEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.name}</TableCell>
                        <TableCell>{entry.email}</TableCell>
                        <TableCell>
                          {entry.phone.startsWith('+91')
                            ? entry.phone
                            : entry.phone.startsWith('+') && entry.phone.length === 11
                              ? entry.phone.replace('+', '+91')
                              : entry.phone.length === 10
                                ? `+91${entry.phone}`
                                : entry.phone}
                        </TableCell>
                        <TableCell>{entry.college || '-'}</TableCell>
                        <TableCell>{entry.city || '-'}</TableCell>
                        <TableCell>
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApproveWaitlist(entry.id)}
                              disabled={approvingWaitlistId === entry.id || rejectingWaitlistId === entry.id}
                            >
                              {approvingWaitlistId === entry.id ? (
                                <>
                                  <Clock className="w-3 h-3 mr-1 animate-spin" />
                                  Approving...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Approve
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectWaitlist(entry.id)}
                              disabled={approvingWaitlistId === entry.id || rejectingWaitlistId === entry.id}
                            >
                              {rejectingWaitlistId === entry.id ? (
                                <>
                                  <Clock className="w-3 h-3 mr-1 animate-spin" />
                                  Rejecting...
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Reject
                                </>
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {waitlistEntries.length > 0 && (
                <TablePagination
                  currentPage={waitlistPage}
                  pageSize={waitlistPageSize}
                  total={waitlistTotal}
                  onPageChange={(page, pageSize) => {
                    setWaitlistPage(page);
                    if (pageSize != null) setWaitlistPageSize(pageSize);
                  }}
                  pageSizeOptions={[10, 20, 50]}
                  itemLabel="applications"
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Search and Ambassadors Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search ambassadors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>College</TableHead>
                   <TableHead>City</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Referral Code</TableHead>
                  <TableHead>Total Rewards</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ambassadors.map((ambassador) => {
                  return (
                    <TableRow key={ambassador.id}>
                      <TableCell className="font-medium">{ambassador.name}</TableCell>
                      <TableCell>{ambassador.college}</TableCell>
                      <TableCell>{ambassador.city || '-'}</TableCell>
                      <TableCell>{ambassador.email}</TableCell>
                      <TableCell>
                        {ambassador.phone.startsWith('+91')
                          ? ambassador.phone
                          : ambassador.phone.startsWith('+') && ambassador.phone.length === 11
                            ? ambassador.phone.replace('+', '+91') // Fix +9876543210 case
                            : ambassador.phone.length === 10
                              ? `+91${ambassador.phone}`
                              : ambassador.phone}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{ambassador.referralCode}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold">₹{ambassador?.totals?.rewardsPaid}</TableCell>
                      <TableCell>
                        <Link to={`/admin/ambassadors/${ambassador.id}`}>
                          <Button variant="outline" size="sm">
                            View Details
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <TablePagination
              currentPage={ambassadorPage}
              pageSize={ambassadorPageSize}
              total={ambassadorsTotal}
              onPageChange={(page, pageSize) => {
                setAmbassadorPage(page);
                if (pageSize != null) setAmbassadorPageSize(pageSize);
              }}
              pageSizeOptions={[10, 20, 50]}
              itemLabel="ambassadors"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
