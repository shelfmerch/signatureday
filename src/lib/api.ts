import { LocalStorageService } from './localStorage';

// Resolve base URLs from environment with safe fallbacks
// Note: In Vite, only variables prefixed with VITE_ are exposed to the client.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Backend URL for direct redirects (like OAuth)
export const BACKEND_URL: string = import.meta.env.VITE_BACKEND_URL || (import.meta.env.PROD ? '' : 'http://localhost:4000');

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Generic API request function
 */
async function apiRequest<T>(
  endpoint: string,
  method: string = 'GET',
  data?: any,
  requiresAuth: boolean = true
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Add auth token if required and available
  if (requiresAuth) {
    const token = LocalStorageService.loadAuthToken();
    // Only attach if it looks like a JWT (three segments)
    if (token && token.split('.').length === 3) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const config: RequestInit = {
    method,
    headers,
    credentials: 'include',
    mode: 'cors'
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, config);
    // Some endpoints (e.g., DELETE) may return 204 No Content
    const raw = await response.text();
    const responseData = raw ? JSON.parse(raw) : null;

    if (!response.ok) {
      // If unauthorized, do not spam malformed token errors; let caller decide next steps
      if (response.status === 401 && requiresAuth) {
        throw new ApiError('Unauthorized', 401, responseData);
      }
      throw new ApiError(
        (responseData && responseData.message) || 'Something went wrong',
        response.status,
        responseData
      );
    }

    return (responseData as T);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      500
    );
  }
}

/**
 * Auth API functions
 */
export const authApi = {
  // Register a new user
  register: async (name: string, email: string, password: string) => {
    try {
      const response = await apiRequest<any>('/users/register', 'POST', { name, email, password }, false);
      return response;
    } catch (error) {
      console.error('[API] Registration error details:', error);
      throw error;
    }
  },

  // Login user
  login: (email: string, password: string) => {
    return apiRequest<any>('/users/login', 'POST', { email, password }, false);
  },

  // Get user profile
  getProfile: () => {
    return apiRequest<any>('/users/profile', 'GET');
  },

  // Update user profile
  updateProfile: (userData: any) => {
    return apiRequest<any>('/users/profile', 'PUT', userData);
  },

  // Get all users (admin only)
  getUsers: () => {
    return apiRequest<any[]>('/users', 'GET');
  },

  // Forgot password - send reset email (public)
  forgotPassword: (email: string) => {
    return apiRequest<{ message: string }>('/users/forgot-password', 'POST', { email }, false);
  },

  // Reset password using token (public)
  resetPassword: (email: string, token: string, password: string) => {
    return apiRequest<{ message: string }>('/users/reset-password', 'POST', { email, token, password }, false);
  }
};

/**
 * Pagination parameters interface
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  yearOfPassing?: string;
}

/**
 * Pagination response interface
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

/**
 * Group API functions
 */
export const groupApi = {
  // Create a new group
  createGroup: (groupData: any) => {
    return apiRequest<any>('/groups', 'POST', groupData);
  },

  // Get all groups with pagination (admin only)
  getGroups: (params: PaginationParams = {}) => {
    // Build query string
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params.search) queryParams.append('search', params.search);
    if (params.yearOfPassing) queryParams.append('yearOfPassing', params.yearOfPassing);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/groups?${queryString}` : '/groups';

    return apiRequest<PaginatedResponse<any>>(endpoint, 'GET');
  },

  // Get group by ID
  getGroupById: (groupId: string) => {
    return apiRequest<any>(`/groups/${groupId}`, 'GET', undefined, false);
  },

  // Get group members with pagination
  getGroupMembers: (groupId: string, params: PaginationParams = {}) => {
    // Build query string
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params.search) queryParams.append('search', params.search);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/groups/${groupId}/members?${queryString}` : `/groups/${groupId}/members`;

    return apiRequest<PaginatedResponse<any>>(endpoint, 'GET');
  },

  // Join a group
  joinGroup: (groupId: string, memberData: any) => {
    console.log('API Layer - joinGroup called with:', memberData);
    console.log('API Layer - Phone in memberData:', memberData.phone);
    return apiRequest<any>(`/groups/${groupId}/join`, 'POST', memberData, false);
  },

  // Update group template
  updateGroupTemplate: (groupId: string, templateData?: { gridTemplate?: string }) => {
    return apiRequest<any>(`/groups/${groupId}/template`, 'PUT', templateData);
  },

  // Update group
  updateGroup: (groupId: string, groupData: any) => {
    return apiRequest<any>(`/groups/${groupId}`, 'PUT', groupData);
  },

  // Delete group
  deleteGroup: (groupId: string) => {
    return apiRequest<any>(`/groups/${groupId}`, 'DELETE');
  }
};

/**
 * Orders API functions
 */
export const ordersApi = {
  // Create a new order (public)
  createOrder: (orderData: any) => {
    // Requires leader auth
    return apiRequest<any>('/orders', 'POST', orderData, true);
  },

  // Create order directly without payment (for Editor checkout)
  createOrderDirect: (orderData: any, invoicePdfBase64?: string, invoiceFileName?: string) => {
    return apiRequest<any>('/orders/create-direct', 'POST', {
      ...orderData,
      invoicePdfBase64,
      invoiceFileName
    }, true);
  },

  // List orders (admin)
  getOrders: (params: PaginationParams & { status?: string; paid?: boolean; search?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.page) q.append('page', String(params.page));
    if (params.limit) q.append('limit', String(params.limit));
    if (params.sortBy) q.append('sortBy', params.sortBy);
    if (params.sortOrder) q.append('sortOrder', params.sortOrder);
    if (params.status) q.append('status', params.status);
    if (typeof params.paid === 'boolean') q.append('paid', String(params.paid));
    if (params.search) q.append('search', params.search);
    const qs = q.toString();
    return apiRequest<{ orders: any[]; total: number }>(qs ? `/orders?${qs}` : '/orders', 'GET');
  },

  // Get order by id (admin)
  getOrder: (id: string) => {
    return apiRequest<any>(`/orders/${id}`, 'GET');
  },

  getOrderCount: () => {
    return apiRequest<{ count: number }>('/orders/count', 'GET');
  },

  // Update order (admin)
  updateOrder: (id: string, updates: any) => {
    return apiRequest<any>(`/orders/${id}`, 'PUT', updates);
  },

  getCenterVariants: (orderId: string) => {
    return apiRequest<{
      variants: any[];
      renderedImages: Record<string, string>;
      hexagonalVariants?: any[];
      hexagonalRenderedImages?: Record<string, string>;
      totalSquare?: number;
      totalHexagonal?: number;
    }>(
      `/orders/${orderId}/center-variants`,
      'GET'
    );
  },

  patchCenterVariants: (orderId: string, data: { centerVariantImages?: { variantId: string; imageUrl: string; centerMemberName?: string }[] } | { variants: any[]; renderedImages: Record<string, string> }) => {
    return apiRequest<any>(`/orders/${orderId}/center-variants`, 'PATCH', data);
  },

  // Delete order (admin)
  deleteOrder: (id: string) => {
    return apiRequest<any>(`/orders/${id}`, 'DELETE');
  },

  // Export orders CSV (admin)
  exportOrders: async (orderIds: string[]): Promise<Blob> => {
    const params = new URLSearchParams();
    params.append('ids', orderIds.join(','));
    const url = `${API_BASE_URL}/orders/export?${params.toString()}`;
    const headers: HeadersInit = {};
    const token = LocalStorageService.loadAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const resp = await fetch(url, { method: 'GET', headers });
    if (!resp.ok) throw new ApiError('Failed to export orders', resp.status);
    return await resp.blob();
  },

  // Ensure render job is enqueued for this order (admin; server pre-generates variants)
  // Pass force=true to re-render even if already completed
  ensureRender: (orderId: string, force: boolean = false) => {
    const renderToken = import.meta.env.VITE_RENDER_TOKEN as string | undefined;
    const params = new URLSearchParams();
    if (renderToken) params.append('token', renderToken);
    if (force) params.append('force', 'true');
    const qs = params.toString() ? `?${params.toString()}` : '';
    const url = `${API_BASE_URL}/render/ensure/${encodeURIComponent(orderId)}${qs}`;
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const authToken = LocalStorageService.loadAuthToken();
    if (authToken && authToken.split('.').length === 3) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    if (renderToken) {
      (headers as Record<string, string>)['x-render-token'] = renderToken;
    }
    return fetch(url, { method: 'POST', headers, credentials: 'include' }).then(async (res) => {
      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : null;
      if (!res.ok) throw new ApiError((data?.message) || 'Failed to ensure render', res.status, data);
      return data as { message?: string };
    });
  },
};

/**
 * User API helpers
 */
export const userApi = {
  // Get groups owned by a user (most recent first)
  getUserGroups: (userId: string) => {
    return apiRequest<{ items: any[] }>(`/users/${encodeURIComponent(userId)}/groups`, 'GET');
  },
};

/**
 * Payments API (Razorpay)
 */
export const paymentsApi = {
  getKey: () => apiRequest<{ keyId: string }>(`/payments/key`, 'GET'),
  createOrder: (amountPaise: number, receipt?: string, notes?: any) =>
    apiRequest<{ id: string; amount: number; currency: string; receipt: string; status: string }>(
      `/payments/order`,
      'POST',
      { amount: amountPaise, currency: 'INR', receipt, notes }
    ),
  verify: (payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    clientOrderId?: string;
    email?: string;
    name?: string;
    amount?: number;
    invoicePdfBase64?: string;
    invoiceFileName?: string;
  }) => apiRequest<{ valid: boolean; emailed: boolean }>(`/payments/verify`, 'POST', payload),
  // Demo payment flow (internal reward bookkeeping)
  // NOTE: backend currently expects { groupId, itemTotal }
  createIntent: (groupId: string, itemTotal: number) =>
    apiRequest<{ paymentId: string; clientSecret: string }>(`/payments/intent`, 'POST', { groupId, itemTotal }),
  confirm: (paymentId: string, outcome?: 'success' | 'fail') =>
    apiRequest<{ paymentId: string; status: string; reward?: { id: string; amount: number; status: string } }>(
      `/payments/confirm`,
      'POST',
      { paymentId, outcome }
    ),
};

/**
 * Fallback to localStorage if API is not available
 */
export const useFallbackStorage = async (apiCall: () => Promise<any>, fallbackFn: () => any) => {
  try {
    return await apiCall();
  } catch (error) {
    console.warn('API call failed, using localStorage fallback:', error);
    return fallbackFn();
  }
};
