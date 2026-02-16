export interface CreateAmbassadorPayload {
  name: string;
  email: string;
  phone: string;
  college?: string;
  city?: string;
  state?: string;
  graduationYear?: number;
  upiId?: string;
}

export interface AmbassadorResponse {
  id: string;
  name: string;
  email: string;
  phone: string;
  referralCode: string;
  referralLink: string;
  upiId?: string;
}

export interface AmbassadorStatsResponse {
  totalGroups: number;
  totalMembers: number;
  totalRewards: number;
  pendingRewards: number;
  paidRewards: number;
  completedOrders: number;
  referredGroups: number;
  totalClicks?: number;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  hasMore: boolean;
  total?: number;
  pages?: number;
}

export interface AmbassadorRewardItem {
  id: string;
  ambassadorId: string;
  groupId: string;
  groupName: string;
  memberCount: number;
  rewardAmount: number;
  status: 'Pending' | 'Approved' | 'Paid' | 'pending' | 'paid';
  orderValue?: number;
  createdAt: string;
  paidAt?: string;
  paidTxRef?: string;
}

export interface AmbassadorSummaryResponse {
  totalGroups: number;
  totalMembers: number;
  totalRewards: {
    paid: number;
    pending: number;
  };
  pendingPayouts: Array<{
    id: string;
    groupId: string;
    groupName: string;
    members: number;
    amount: number;
    status: string;
    createdAt: string;
  }>;
}

export interface AmbassadorGroupItem {
  id: string;
  name: string;
  yearOfPassing: number;
  totalMembers: number;
  currentMemberCount: number;
  gridTemplate: string;
  status: string;
  createdAt: string;
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

export const loginAmbassadorByPhone = async (phone: string): Promise<AmbassadorResponse> => {
  const res = await fetch('/api/ambassadors/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone })
  });
  return handleResponse(res);
};

export const getAmbassador = async (id: string): Promise<AmbassadorResponse> => {
  const res = await fetch(`/api/ambassadors/${encodeURIComponent(id)}`);
  return handleResponse(res);
};

export const getAmbassadorByEmail = async (email: string): Promise<AmbassadorResponse | null> => {
  try {
    const res = await fetch(`/api/ambassadors/by-email?email=${encodeURIComponent(email)}`);
    if (res.status === 404) {
      return null; // Not an ambassador
    }
    return handleResponse(res);
  } catch (error: any) {
    if (error?.status === 404) {
      return null;
    }
    throw error;
  }
};

export const getAmbassadorStats = async (id: string): Promise<AmbassadorStatsResponse> => {
  const res = await fetch(`/api/ambassadors/${encodeURIComponent(id)}/stats`);
  return handleResponse(res);
};

export const getAmbassadorSummary = async (id: string): Promise<AmbassadorSummaryResponse> => {
  const res = await fetch(`/api/ambassadors/${encodeURIComponent(id)}/summary`);
  return handleResponse(res);
};

export const updateAmbassadorPayoutMethod = async (
  id: string,
  payload: { type: 'upi'; upiId: string }
): Promise<AmbassadorResponse> => {
  const res = await fetch(`/api/ambassadors/${encodeURIComponent(id)}/payout-method`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const getAmbassadorRewards = async (
  id: string,
  page = 1,
  limit = 10
): Promise<Paginated<AmbassadorRewardItem>> => {
  const res = await fetch(
    `/api/ambassadors/${encodeURIComponent(id)}/rewards?page=${page}&limit=${limit}`
  );
  const data = await handleResponse(res);

  // Normalise backend reward shape -> AmbassadorRewardItem
  const items: AmbassadorRewardItem[] = (data.items || []).map((r: any) => ({
    id: r.id || r._id,
    ambassadorId: r.ambassadorId,
    groupId: r.groupId,
    groupName:
      r.groupName ??
      r.groupNameSnapshot ??
      (r.groupId && typeof r.groupId === 'object' ? r.groupId.name : undefined) ??
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
};

export const getAmbassadorGroups = async (
  id: string,
  page = 1,
  limit = 10
): Promise<Paginated<AmbassadorGroupItem>> => {
  const res = await fetch(`/api/ambassadors/${encodeURIComponent(id)}/groups?page=${page}&limit=${limit}`);
  return handleResponse(res);
};

export const createAmbassador = async (
  payload: CreateAmbassadorPayload
): Promise<AmbassadorResponse | { waitlistId: string; status: string; message: string }> => {
  const res = await fetch('/api/ambassadors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await handleResponse(res);

  // Check if it's a waitlist response
  if (data.waitlistId) {
    return {
      waitlistId: data.waitlistId,
      status: data.status,
      message: data.message
    };
  }

  // Legacy ambassador response
  return data?.ambassador ?? data;
};
