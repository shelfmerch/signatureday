import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TablePagination } from '@/components/admin/TablePagination';
import { manageGroupsApi, type AmbassadorWithGroupsItem, type GroupRowItem } from '@/services/manageGroupsApi';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function ManageGroupsAmbassadorLed() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ambassadorId = searchParams.get('ambassadorId');

  const [ambassadors, setAmbassadors] = useState<AmbassadorWithGroupsItem[]>([]);
  const [groups, setGroups] = useState<GroupRowItem[]>([]);
  const [loadingAmbassadors, setLoadingAmbassadors] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [selectedAmbassadorName, setSelectedAmbassadorName] = useState<string | null>(null);
  const [groupsPage, setGroupsPage] = useState(1);
  const [groupsPageSize, setGroupsPageSize] = useState(20);
  const [groupsTotal, setGroupsTotal] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingAmbassadors(true);
        const res = await manageGroupsApi.listAmbassadorsWithGroups();
        setAmbassadors(res.items || []);
      } catch (e: unknown) {
        const err = e as { status?: number; message?: string };
        if (err?.status === 401 || err?.status === 403) {
          toast.error('Please sign in as admin');
          navigate('/admin/order');
        } else {
          toast.error((err?.message as string) || 'Failed to load ambassadors');
        }
      } finally {
        setLoadingAmbassadors(false);
      }
    };
    load();
  }, [navigate]);

  useEffect(() => {
    if (!ambassadorId) {
      setGroups([]);
      setSelectedAmbassadorName(null);
      setGroupsTotal(0);
      return;
    }
    setGroupsPage(1);
  }, [ambassadorId]);

  useEffect(() => {
    if (!ambassadorId) return;
    const load = async () => {
      try {
        setLoadingGroups(true);
        const res = await manageGroupsApi.listAmbassadorGroups(
          ambassadorId,
          groupsPage,
          groupsPageSize
        );
        setGroups(res.items || []);
        setGroupsTotal(res.total ?? res.items?.length ?? 0);
      } catch (e: unknown) {
        const err = e as { status?: number; message?: string };
        if (err?.status === 401 || err?.status === 403) {
          toast.error('Please sign in as admin');
          navigate('/admin/order');
        } else {
          toast.error((err?.message as string) || 'Failed to load groups');
        }
      } finally {
        setLoadingGroups(false);
      }
    };
    load();
  }, [ambassadorId, navigate, groupsPage, groupsPageSize]);

  useEffect(() => {
    if (!ambassadorId || ambassadors.length === 0) return;
    const amb = ambassadors.find((a) => a.id === ambassadorId);
    setSelectedAmbassadorName(amb?.ambassadorName ?? null);
  }, [ambassadorId, ambassadors]);

  const handleViewGroups = (id: string) => {
    navigate(`/admin/manage-groups/ambassador-led?ambassadorId=${encodeURIComponent(id)}`);
  };

  const showGroupsSection = Boolean(ambassadorId);

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manage Groups — Ambassador Group</h1>
            <p className="text-muted-foreground mt-1">
              Ambassadors who have created or referred groups.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        {!showGroupsSection && (
            <div className="rounded-xl border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ambassador Name</TableHead>
                    <TableHead>Referral Code</TableHead>
                    <TableHead>Groups Count</TableHead>
                    <TableHead>Total Members Joined</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingAmbassadors ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : ambassadors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No ambassadors with groups yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    ambassadors.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.ambassadorName}</TableCell>
                        <TableCell>{a.referralCode}</TableCell>
                        <TableCell>{a.groupsCount}</TableCell>
                        <TableCell>{a.totalMembersJoined}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => handleViewGroups(a.id)}>
                            View Groups
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
        )}

        {showGroupsSection && (
            <>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/admin/manage-groups/ambassador-led')}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to ambassadors
                </Button>
                {selectedAmbassadorName && (
                  <span className="text-muted-foreground">
                    Groups for: <strong>{selectedAmbassadorName}</strong>
                  </span>
                )}
              </div>
              <div className="rounded-xl border bg-card shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team/Group Name</TableHead>
                      <TableHead>Group Code / Link</TableHead>
                      <TableHead>Group Leader</TableHead>
                      <TableHead>Members Joined</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingGroups ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Loading…
                        </TableCell>
                      </TableRow>
                    ) : groups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No groups for this ambassador.
                        </TableCell>
                      </TableRow>
                    ) : (
                      groups.map((g) => (
                        <TableRow key={g.id}>
                          <TableCell className="font-medium">{g.teamName}</TableCell>
                          <TableCell>
                            <a
                              href={g.groupLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {g.groupCode}
                            </a>
                          </TableCell>
                          <TableCell>
                            {g.creatorName}
                            {(g.creatorEmail !== '—' || g.creatorPhone !== '—') && (
                              <span className="block text-xs text-muted-foreground">
                                {g.creatorEmail !== '—' && g.creatorEmail}
                                {g.creatorEmail !== '—' && g.creatorPhone !== '—' && ' · '}
                                {g.creatorPhone !== '—' && g.creatorPhone}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{g.membersJoined}</TableCell>
                          <TableCell>
                            {g.createdAt
                              ? new Date(g.createdAt).toLocaleDateString()
                              : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/admin/manage-groups/group/${g.id}`)}
                            >
                              View Members
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {groupsTotal > 0 && (
                  <TablePagination
                    currentPage={groupsPage}
                    pageSize={groupsPageSize}
                    total={groupsTotal}
                    onPageChange={(p, newSize) => {
                      setGroupsPage(p);
                      if (newSize != null) setGroupsPageSize(newSize);
                    }}
                    pageSizeOptions={[10, 20, 50]}
                    itemLabel="groups"
                  />
                )}
              </div>
            </>
        )}
      </div>
    </div>
  );
}
