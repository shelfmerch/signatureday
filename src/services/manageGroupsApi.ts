import { LocalStorageService } from '@/lib/localStorage';

const getAuthHeaders = (): HeadersInit => {
  const token = LocalStorageService.loadAuthToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token && token.split('.').length === 3) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (res: Response) => {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.message || 'Request failed';
    const status = res.status;
    throw Object.assign(new Error(message), { status, data });
  }
  return data;
};

export interface AmbassadorWithGroupsItem {
  id: string;
  ambassadorName: string;
  referralCode: string;
  groupsCount: number;
  totalMembersJoined: number;
}

export interface GroupRowItem {
  id: string;
  teamName: string;
  groupCode: string;
  groupLink: string;
  creatorName: string;
  creatorEmail: string;
  creatorPhone: string;
  membersJoined: number;
  createdAt: string;
}

export interface GroupWithParticipantsGroup {
  id: string;
  teamName: string;
  groupCode: string;
  groupLink: string;
  createdAt: string;
  ambassador: { name: string; referralCode: string } | null;
}

export interface ParticipantRow {
  role: 'CREATOR' | 'MEMBER';
  name: string;
  email: string;
  phone: string;
  rollNumber: string;
  joinedAt: string;
}

export const manageGroupsApi = {
  listAmbassadorsWithGroups: async (): Promise<{
    items: AmbassadorWithGroupsItem[];
    total: number;
  }> => {
    const res = await fetch('/api/admin/manage-groups/ambassadors', {
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  listAmbassadorGroups: async (
    ambassadorId: string,
    page = 1,
    limit = 50
  ): Promise<{
    items: GroupRowItem[];
    page: number;
    limit: number;
    total: number;
    pages: number;
  }> => {
    const res = await fetch(
      `/api/admin/manage-groups/ambassadors/${encodeURIComponent(ambassadorId)}/groups?page=${page}&limit=${limit}`,
      { credentials: 'include', headers: getAuthHeaders() }
    );
    return handleResponse(res);
  },

  listDirectGroups: async (
    page = 1,
    limit = 50
  ): Promise<{
    items: GroupRowItem[];
    page: number;
    limit: number;
    total: number;
    pages: number;
  }> => {
    const res = await fetch(
      `/api/admin/manage-groups/direct?page=${page}&limit=${limit}`,
      { credentials: 'include', headers: getAuthHeaders() }
    );
    return handleResponse(res);
  },

  getGroupWithParticipants: async (
    groupId: string
  ): Promise<{
    group: GroupWithParticipantsGroup;
    participants: ParticipantRow[];
  }> => {
    const res = await fetch(
      `/api/admin/manage-groups/group/${encodeURIComponent(groupId)}`,
      { credentials: 'include', headers: getAuthHeaders() }
    );
    return handleResponse(res);
  },
};
