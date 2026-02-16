/**
 * OTP API client. India-only: phone10 = 10-digit string, purpose for logging.
 */

export interface SendOtpResponse {
  ok: boolean;
  message?: string;
  error?: string;
  retryAfter?: number;
}

export interface VerifyOtpResponse {
  ok: boolean;
  message?: string;
  error?: string;
  verifiedAt?: string;
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (data as { error?: string })?.error ?? (data as { message?: string })?.message ?? 'OTP request failed';
    throw new Error(message);
  }
  return data as T;
}

export const sendOtp = async (phone10: string, purpose: string): Promise<SendOtpResponse> => {
  const resp = await fetch('/api/otp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone10, purpose })
  });
  return handleResponse<SendOtpResponse>(resp);
};

export const verifyOtp = async (phone10: string, otp: string, purpose: string): Promise<VerifyOtpResponse> => {
  const resp = await fetch('/api/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone10, otp, purpose })
  });
  return handleResponse<VerifyOtpResponse>(resp);
};

export const getOtpStatus = async (phone: string) => {
  const encoded = encodeURIComponent(phone.replace(/\D/g, '').length === 10 ? '+91' + phone.replace(/\D/g, '') : phone);
  const resp = await fetch(`/api/otp/status/${encoded}`);
  return handleResponse(resp);
};
