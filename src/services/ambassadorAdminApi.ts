import { LocalStorageService } from '@/lib/localStorage';
import { Paginated, AmbassadorRewardItem } from '@/lib/ambassadorApi';

export interface AdminAmbassadorItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  college?: string;
  city?: string;
  referralCode: string;
  referralLink: string;
  upiId?: string;
  createdAt: string;
  totals: {
    rewardsPaid: number;
    rewardsPending: number;
  };
}

const handleResponse = async (res: Response) => {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.message || 'Request failed';
    const status = res.status;
    throw Object.assign(new Error(message), { status, data });
  }
  return data;
};

const authHeaders = (): HeadersInit => {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const token = LocalStorageService.loadAuthToken();
  if (token && token.split('.').length === 3) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const ambassadorAdminApi = {
  listAmbassadors: async (
    page = 1,
    limit = 20,
    search = ''
  ): Promise<Paginated<AdminAmbassadorItem>> => {

    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) qs.set('search', search);

    const res = await fetch(`/api/ambassadors?${qs.toString()}`, {
      credentials: 'include',
      headers: authHeaders(),
    });

    const data = await handleResponse(res);

    // NORMALIZE AMBASSADOR SHAPE
    const items: AdminAmbassadorItem[] = (data.items || []).map((a: any) => {
      // Ensure totals are properly extracted
      const totals = a.totals || {};
      return {
        id: a.id || a._id?.toString?.() || String(a._id),     // normalize id
        name: a.name,
        email: a.email,
        phone: a.phone,
        college: a.college,
        city: a.city,
        referralCode: a.referralCode,
        referralLink: a.referralLink,
        upiId: a.payoutMethod?.upiId ?? a.upiId ?? undefined,   // nested upiId fix
        createdAt: a.createdAt,
        totals: {
          rewardsPaid: Number(totals.rewardsPaid) || 0,       // ensure number type
          rewardsPending: Number(totals.rewardsPending) || 0,
        },
      };
    });

    return {
      items,
      page: data.page || 1,
      limit: data.limit || 20,
      total: data.total || data.totalCount || items.length,
      hasMore: data.hasMore ?? false,
      pages: data.pages,
    };
  },

  getRewards: async (
    page = 1,
    limit = 10,
    status?: 'Pending' | 'Approved' | 'Paid'
  ): Promise<Paginated<AmbassadorRewardItem>> => {

    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) qs.set('status', status);

    const res = await fetch(`/api/rewards?${qs.toString()}`, {
      credentials: 'include',
      headers: authHeaders(),
    });

    const data = await handleResponse(res);

    // NORMALISE REWARD SHAPE
    const items: AmbassadorRewardItem[] = (data.items || []).map((r: any) => ({
      id: r.id || r._id,
      ambassadorId: typeof r.ambassadorId === 'object' ? r.ambassadorId._id : r.ambassadorId,
      groupId: typeof r.groupId === 'object' ? r.groupId._id : r.groupId,
      groupName:
        r.groupName ??
        r.groupNameSnapshot ??
        (typeof r.groupId === 'object' ? r.groupId.name : undefined) ??
        '',
      memberCount: r.memberCount ?? r.memberCountSnapshot ?? 0,
      rewardAmount: r.rewardAmount ?? 0,
      status: r.status,
      orderValue: r.orderValue,
      createdAt: r.createdAt,
      paidAt: r.paidAt,
      paidTxRef: r.paidTxRef,
    }));

    return {
      items,
      page: data.page,
      limit: data.limit,
      hasMore: data.hasMore,
      total: data.total,
      pages: data.pages,
    };
  },

  updateRewardStatus: async (
    id: string,
    status: 'Pending' | 'Approved' | 'Paid'
  ): Promise<{ reward: AmbassadorRewardItem }> => {
    const res = await fetch(`/api/rewards/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    });
    return handleResponse(res);
  },

  // Waitlist management
  listWaitlist: async (
    page = 1,
    limit = 20,
    status: 'pending' | 'approved' | 'rejected' = 'pending',
    search = ''
  ): Promise<Paginated<WaitlistItem>> => {
    const qs = new URLSearchParams({ 
      page: String(page), 
      limit: String(limit),
      status 
    });
    if (search) qs.set('search', search);

    const res = await fetch(`/api/ambassadors/waitlist/list?${qs.toString()}`, {
      credentials: 'include',
      headers: authHeaders(),
    });

    const data = await handleResponse(res);
    return {
      items: data.items || [],
      page: data.page || 1,
      limit: data.limit || 20,
      total: data.total || 0,
      hasMore: data.hasMore ?? false,
      pages: data.pages,
    };
  },

  approveWaitlist: async (id: string): Promise<{ ambassador: any; message: string }> => {
    const res = await fetch(`/api/ambassadors/waitlist/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(),
    });
    return handleResponse(res);
  },

  rejectWaitlist: async (id: string, reason?: string): Promise<{ message: string }> => {
    const res = await fetch(`/api/ambassadors/waitlist/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(),
      body: JSON.stringify({ reason }),
    });
    return handleResponse(res);
  },
};

export interface WaitlistItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  college?: string;
  city?: string;
  state?: string;
  graduationYear?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedAt?: string;
  rejectionReason?: string;
  ambassadorId?: string;
  createdAt: string;
}
