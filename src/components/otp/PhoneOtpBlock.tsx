import { useCallback, useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { sendOtp, verifyOtp } from '@/lib/otpClient';
import { cn } from '@/lib/utils';

interface PhoneOtpBlockProps {
  value: string;
  onChange: (value: string) => void;
  onVerified: (normalizedPhone: string) => void;
  source?: string;
  className?: string;
  disabled?: boolean;
  hideLabel?: boolean;
}

const normalizePhone = (raw: string) => raw.replace(/[^0-9+]/g, '');
const phoneDigits = (value: string) => value.replace(/[^0-9]/g, '');

const isValidPhone = (normalized: string) => {
  const digits = normalized.replace(/[^0-9]/g, '');
  return digits.length >= 10;
};

const OTP_LENGTH = 6;
const MAX_ATTEMPTS = 5;

const PhoneOtpBlock: React.FC<PhoneOtpBlockProps> = ({
  value,
  onChange,
  onVerified,
  source = 'joinGroup',
  className,
  disabled,
  hideLabel
}) => {
  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'waiting' | 'verifying' | 'verified' | 'locked'>('idle');
  // ... rest of state ...
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState<number>(0);
  const [lastPhoneDigits, setLastPhoneDigits] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<number>(0);
  const [otpSent, setOtpSent] = useState<boolean>(false);

  const normalizedPhone = useMemo(() => normalizePhone(value), [value]);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => setResendCountdown((prev) => Math.max(prev - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  useEffect(() => {
    const currentDigits = phoneDigits(normalizedPhone);
    if (currentDigits !== lastPhoneDigits) {
      setStatus('idle');
      setOtp('');
      setError(null);
      setInfo(null);
      setLastPhoneDigits(currentDigits);
      setAttempts(0);
      setOtpSent(false);
    }
  }, [normalizedPhone, lastPhoneDigits]);

  const sendOtpIfNeeded = useCallback(async () => {
    if (disabled) return;
    if (!isValidPhone(normalizedPhone)) return;
    if (otpSent) return;
    if (status === 'sending' || status === 'waiting' || status === 'verified') return;
    if (resendCountdown > 0) return;
    if (attempts >= MAX_ATTEMPTS) return;

    try {
      setStatus('sending');
      setError(null);
      setInfo(null);
      const result = await sendOtp(normalizedPhone, source);
      const retryAfter = typeof result?.retryAfter === 'number' && result.retryAfter > 0 ? result.retryAfter : 30;
      setStatus('waiting');
      setResendCountdown(retryAfter);
      setInfo(result?.message || 'OTP sent. Enter the 6-digit code.');
      setOtpSent(true);
    } catch (err) {
      setStatus('idle');
      setError(err instanceof Error ? err.message : 'Failed to send OTP. Try again later.');
    }
  }, [normalizedPhone, source, status, resendCountdown, disabled, attempts, otpSent]);

  useEffect(() => {
    sendOtpIfNeeded();
  }, [sendOtpIfNeeded]);

  useEffect(() => {
    if (!otp || otp.length !== OTP_LENGTH) {
      return;
    }

    const verifyOtpCode = async () => {
      try {
        setStatus('verifying');
        setError(null);
        await verifyOtp(normalizedPhone, otp);
        setStatus('verified');
        setInfo('Phone number verified successfully.');

        let finalPhone = normalizedPhone;
        // Basic India logic: if 10 digits, add +91
        if (finalPhone.length === 10) {
          finalPhone = `+91${finalPhone}`;
        } else if (finalPhone.length === 12 && finalPhone.startsWith('91')) {
          finalPhone = `+${finalPhone}`;
        } else if (!finalPhone.startsWith('+')) {
          finalPhone = `+${finalPhone}`;
        }

        onVerified(finalPhone);
      } catch (err) {
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        setError(
          nextAttempts >= MAX_ATTEMPTS
            ? 'Too many incorrect attempts. Please request a new OTP.'
            : err instanceof Error
              ? err.message
              : 'Invalid OTP. Please try again.'
        );
        setOtp('');
        if (nextAttempts >= MAX_ATTEMPTS) {
          setStatus('locked');
        } else {
          setStatus('waiting');
        }
      }
    };

    verifyOtpCode();
  }, [otp, normalizedPhone, onVerified, attempts]);

  const handlePhoneChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    onChange(raw);
    setError(null);
    setInfo(null);
  }, [onChange]);

  const handleOtpChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH);
    setOtp(next);
    if (error) setError(null);
  }, [error]);

  const handleManualResend = useCallback(async () => {
    if (disabled) return;
    if (!isValidPhone(normalizedPhone)) return;
    if (resendCountdown > 0) return;

    try {
      setStatus('sending');
      setError(null);
      setInfo(null);
      const result = await sendOtp(normalizedPhone, source);
      const retryAfter = typeof result?.retryAfter === 'number' && result.retryAfter > 0 ? result.retryAfter : 30;
      setStatus('waiting');
      setResendCountdown(retryAfter);
      setInfo(result?.message || 'OTP sent. Enter the 6-digit code.');
      setAttempts(0);
      setOtp('');
      setOtpSent(true);
    } catch (err) {
      setStatus('idle');
      setError(err instanceof Error ? err.message : 'Failed to resend OTP. Try again later.');
    }
  }, [disabled, normalizedPhone, resendCountdown, source]);

  const canEditPhone = status !== 'verifying' && status !== 'sending';

  return (
    <div className={cn(
      'rounded-lg',
      !hideLabel && 'border border-slate-200 p-4 bg-white/70 space-y-3',
      hideLabel && 'w-full',
      className
    )}>
      <div className="space-y-2">
        {!hideLabel && (
          <label className="text-sm font-medium text-slate-700" htmlFor="join-phone">
            Phone Number
          </label>
        )}
        <Input
          id="join-phone"
          type="tel"
          placeholder={hideLabel ? "WhatsApp Number" : "Enter phone number"}
          value={value}
          onChange={handlePhoneChange}
          disabled={!canEditPhone || disabled}
          className={cn(hideLabel && "pl-12 h-12 bg-slate-50/50 border-slate-200 focus:border-purple-400 focus:ring-purple-400/20 rounded-2xl")}
        />
        {!isValidPhone(normalizedPhone) && !hideLabel && (
          <p className="text-xs text-slate-500">We’ll send an OTP automatically when you enter a valid number.</p>
        )}
      </div>

      {(status === 'waiting' || status === 'verifying' || status === 'verified') && (
        <div className="space-y-2">
          {!hideLabel && (
            <label className="text-sm font-medium text-slate-700" htmlFor="join-otp">
              Enter OTP
            </label>
          )}
          <Input
            id="join-otp"
            type="text"
            inputMode="numeric"
            maxLength={OTP_LENGTH}
            placeholder={hideLabel ? "OTP Code" : "6-digit code"}
            value={otp}
            onChange={handleOtpChange}
            disabled={disabled || status === 'verified'}
            className={cn(hideLabel && "pl-12 h-12 bg-slate-50/50 border-slate-200 focus:border-purple-400 focus:ring-purple-400/20 rounded-2xl")}
          />
        </div>
      )}

      {info && !error && <p className="text-xs text-green-600">{info}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {status === 'verified' && <p className="text-xs text-green-700">Phone verified ✔️</p>}
      {status === 'locked' && (
        <p className="text-xs text-slate-600">
          Need another try?{' '}
          <button
            type="button"
            className="text-purple-600 underline"
            onClick={handleManualResend}
            disabled={resendCountdown > 0 || disabled}
          >
            {resendCountdown > 0 ? `Resend available in ${resendCountdown}s` : 'Send a new OTP'}
          </button>
        </p>
      )}
    </div>
  );
};

export default PhoneOtpBlock;


