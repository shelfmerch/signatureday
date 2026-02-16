import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { manageGroupsApi, type GroupRowItem } from '@/services/manageGroupsApi';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function ManageGroupsDirect() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupRowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await manageGroupsApi.listDirectGroups(page, pageSize);
        setGroups(res.items || []);
        setTotal(res.total ?? res.items?.length ?? 0);
      } catch (e: unknown) {
        const err = e as { status?: number; message?: string };
        if (err?.status === 401 || err?.status === 403) {
          toast.error('Please sign in as admin');
          navigate('/admin/order');
        } else {
          toast.error((err?.message as string) || 'Failed to load direct groups');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate, page, pageSize]);

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manage Groups — User Created Group</h1>
            <p className="text-muted-foreground mt-1">
              Groups created without an ambassador referral.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
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
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : groups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No direct groups yet.
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
            {total > 0 && (
              <TablePagination
                currentPage={page}
                pageSize={pageSize}
                total={total}
                onPageChange={(p, newSize) => {
                  setPage(p);
                  if (newSize != null) setPageSize(newSize);
                }}
                pageSizeOptions={[10, 20, 50]}
                itemLabel="groups"
              />
            )}
          </div>
      </div>
    </div>
  );
}
