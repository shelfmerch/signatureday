import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { manageGroupsApi, type ParticipantRow } from '@/services/manageGroupsApi';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function ManageGroupsGroupMembers() {
  const navigate = useNavigate();
  const { groupId } = useParams<{ groupId: string }>();
  const [group, setGroup] = useState<{
    id: string;
    teamName: string;
    groupCode: string;
    groupLink: string;
    createdAt: string;
    ambassador: { name: string; referralCode: string } | null;
  } | null>(null);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      navigate('/admin/manage-groups/direct');
      return;
    }
    const load = async () => {
      try {
        setLoading(true);
        const res = await manageGroupsApi.getGroupWithParticipants(groupId);
        setGroup(res.group);
        setParticipants(res.participants || []);
      } catch (e: unknown) {
        const err = e as { status?: number; message?: string };
        if (err?.status === 401 || err?.status === 403) {
          toast.error('Please sign in as admin');
          navigate('/admin/order');
        } else if (err?.status === 404) {
          toast.error('Group not found');
          navigate('/admin/manage-groups/direct');
        } else {
          toast.error((err?.message as string) || 'Failed to load group');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [groupId, navigate]);

  if (!groupId) return null;

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Group Participants</h1>
            <p className="text-muted-foreground mt-1">
              Creator and joined members for this group.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {loading ? (
            <p className="text-muted-foreground">Loading group…</p>
          ) : group ? (
            <>
              <div className="rounded-xl border bg-card shadow-sm p-4 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Team/Group Name:</span>{' '}
                    <span className="font-medium">{group.teamName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Group Code / Link:</span>{' '}
                    <a
                      href={group.groupLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {group.groupCode}
                    </a>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created At:</span>{' '}
                    {group.createdAt
                      ? new Date(group.createdAt).toLocaleString()
                      : '—'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ambassador:</span>{' '}
                    {group.ambassador
                      ? `${group.ambassador.name} (${group.ambassador.referralCode})`
                      : 'N/A'}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-card shadow-sm">
                <h2 className="text-lg font-semibold p-4 border-b">Participants</h2>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Roll Number</TableHead>
                      <TableHead>Joined At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {participants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No participants.
                        </TableCell>
                      </TableRow>
                    ) : (
                      participants.map((p, idx) => (
                        <TableRow key={`${p.role}-${p.name}-${idx}`}>
                          <TableCell>
                            <span
                              className={
                                p.role === 'CREATOR'
                                  ? 'font-medium text-primary'
                                  : 'text-muted-foreground'
                              }
                            >
                              {p.role === 'CREATOR' ? 'Group Leader' : p.role}
                            </span>
                          </TableCell>
                          <TableCell>{p.name}</TableCell>
                          <TableCell>{p.email}</TableCell>
                          <TableCell>{p.phone}</TableCell>
                          <TableCell>{p.rollNumber}</TableCell>
                          <TableCell>
                            {p.joinedAt
                              ? new Date(p.joinedAt).toLocaleString()
                              : '—'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : null}
      </div>
    </div>
  );
}
