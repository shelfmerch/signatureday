import { useCallback, useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { sendOtp, verifyOtp } from '@/lib/otpClient';
import { useOtpTimer } from '@/hooks/useOtpTimer';
import { validatePhoneIndia, toPhone10 } from '@/utils/phoneValidationIndia';
import { cn } from '@/lib/utils';

export type OtpPurpose = 'login' | 'checkout' | 'profile' | 'joinGroup' | 'ambassadorSignup' | 'ambassadorLogin' | string;

export interface PhoneOtpWidgetIndiaProps {
  onVerified: (phone10: string) => void;
  purpose: OtpPurpose;
  className?: string;
  disabled?: boolean;
  hideLabel?: boolean;
}

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

const PhoneOtpWidgetIndia: React.FC<PhoneOtpWidgetIndiaProps> = ({
  onVerified,
  purpose,
  className,
  disabled,
  hideLabel
}) => {
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'waiting' | 'verifying' | 'verified'>('idle');

  const [resendSeconds, startResendTimer] = useOtpTimer(RESEND_COOLDOWN_SECONDS);

  const phone10 = toPhone10(phoneInput);
  const phoneValidation = phone10 ? validatePhoneIndia(phone10) : { valid: false };
  const isPhoneValid = phoneValidation.valid;

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhoneInput(raw);
    setPhoneError(null);
    setServerError(null);
    if (!raw) setPhoneError(null);
    else if (raw.length === 10) {
      const v = validatePhoneIndia(raw);
      if (!v.valid) setPhoneError(v.error ?? 'Invalid phone number');
      else setPhoneError(null);
    } else setPhoneError(null);
  }, []);

  const handleSendOtp = useCallback(async () => {
    if (!isPhoneValid || !phone10 || disabled) return;
    setPhoneError(null);
    setServerError(null);
    setStatus('sending');
    try {
      const result = await sendOtp(phone10, purpose);
      if (result.ok) {
        setOtpSent(true);
        setOtp('');
        setOtpError(null);
        startResendTimer();
        setStatus('waiting');
      } else {
        setServerError(result.error ?? 'Failed to send OTP');
        setStatus('idle');
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to send OTP');
      setStatus('idle');
    }
  }, [isPhoneValid, phone10, purpose, disabled, startResendTimer]);

  // Auto-send OTP when user enters valid 10-digit number (no button click)
  const sentForPhoneRef = useRef<string | null>(null);
  useEffect(() => {
    if (!phone10 || !isPhoneValid || disabled || otpSent || status !== 'idle') return;
    if (sentForPhoneRef.current === phone10) return; // already sent for this number
    sentForPhoneRef.current = phone10;
    handleSendOtp();
  }, [phone10, isPhoneValid, disabled, otpSent, status, handleSendOtp]);

  const handleResend = useCallback(async () => {
    if (resendSeconds > 0 || !phone10 || disabled) return;
    setServerError(null);
    setStatus('sending');
    try {
      const result = await sendOtp(phone10, purpose);
      if (result.ok) {
        setOtp('');
        setOtpError(null);
        startResendTimer();
        setStatus('waiting');
      } else {
        setServerError(result.error ?? 'Failed to resend OTP');
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to resend OTP');
    }
  }, [phone10, purpose, disabled, resendSeconds, startResendTimer]);

  const handleOtpChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setOtp(next);
    setOtpError(null);
  }, []);

  // Auto-verify when user completes 6 digits (only when length just became 6)
  const otpDigits = otp.replace(/\D/g, '');
  const prevOtpLenRef = useRef(0);
  const verifyingRef = useRef(false);
  useEffect(() => {
    const len = otpDigits.length;
    const justBecameSix = prevOtpLenRef.current < OTP_LENGTH && len === OTP_LENGTH;
    prevOtpLenRef.current = len;
    if (!justBecameSix || status !== 'waiting' || !phone10 || disabled || verifyingRef.current) return;
    verifyingRef.current = true;
    setOtpError(null);
    setServerError(null);
    setStatus('verifying');
    verifyOtp(phone10, otpDigits, purpose)
      .then((result) => {
        if (result.ok) {
          setStatus('verified');
          onVerified(phone10);
        } else {
          setOtpError(result.error ?? 'Invalid OTP');
          setStatus('waiting');
        }
      })
      .catch((err) => {
        setOtpError(err instanceof Error ? err.message : 'Invalid OTP');
        setStatus('waiting');
      })
      .finally(() => {
        verifyingRef.current = false;
      });
  }, [otpDigits, phone10, purpose, disabled, onVerified, status]);

  const showPhoneError = phoneInput.length === 10 && !isPhoneValid ? (phoneError ?? 'Invalid phone number') : null;
  // Only use server / OTP errors here so we don't duplicate the phone error line.
  const displayError = serverError ?? otpError;

  return (
    <div
      className={cn(
        'rounded-lg',
        !hideLabel && 'border border-slate-200 p-4 bg-white/70',
        hideLabel && 'w-full',
        className
      )}
    >
      <div className={cn('space-y-2', !hideLabel && 'mb-3')}>
        {!hideLabel && (
          <label className="text-sm font-medium text-slate-700" htmlFor="phone-india">
            Mobile number (10 digits)
          </label>
        )}
        <Input
          id="phone-india"
          type="tel"
          inputMode="numeric"
          maxLength={10}
          placeholder={hideLabel ? '10-digit mobile' : 'Enter 10-digit mobile number'}
          value={phoneInput}
          onChange={handlePhoneChange}
          disabled={disabled || otpSent || status === 'sending' || status === 'verifying' || status === 'verified'}
          className={cn(
            'w-full focus-visible:ring-0 focus-visible:ring-offset-0',
            hideLabel &&
              'pl-12 h-12 bg-slate-50/50 border-slate-200 focus:border-purple-400 focus:ring-purple-400/20 rounded-2xl'
          )}
          aria-invalid={!!showPhoneError}
        />
        {status === 'sending' && <p className="text-xs text-slate-500">Sending OTP…</p>}
        {showPhoneError && <p className="text-xs text-red-600">Invalid phone number</p>}
        {!isPhoneValid && phoneInput.length > 0 && phoneInput.length < 10 && (
          <p className="text-xs text-slate-500">Enter 10 digits (India mobile only)</p>
        )}
      </div>

      {otpSent && (status === 'waiting' || status === 'verifying' || status === 'verified') && (
        <div className={cn('space-y-2', !hideLabel && 'pt-1')}>
          {!hideLabel && (
            <label className="text-sm font-medium text-slate-700" htmlFor="otp-india">
              Enter OTP
            </label>
          )}
          <Input
            id="otp-india"
            type="text"
            inputMode="numeric"
            maxLength={OTP_LENGTH}
            placeholder="6-digit code"
            value={otp}
            onChange={handleOtpChange}
            disabled={disabled || status === 'verifying' || status === 'verified'}
            className={cn(
              'focus-visible:ring-0 focus-visible:ring-offset-0',
              hideLabel &&
                'pl-12 h-12 bg-slate-50/50 border-slate-200 focus:border-purple-400 focus:ring-purple-400/20 rounded-2xl'
            )}
          />
          {status !== 'verified' && (
            <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
              <span>
                {resendSeconds > 0 ? `Resend OTP in ${resendSeconds}s` : `Didn’t get the OTP?`}
              </span>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={handleResend}
                disabled={resendSeconds > 0 || disabled || status === 'verifying' || status === 'verified'}
                className={cn(
                  'h-auto p-0 text-purple-600',
                  (resendSeconds > 0 || disabled || status === 'verifying' || status === 'verified') && 'text-slate-400'
                )}
              >
                Resend OTP
              </Button>
            </div>
          )}
        </div>
      )}

      {displayError && <p className="text-xs text-red-600 mt-2">{displayError}</p>}
      {status === 'verified' && <p className="text-xs text-green-700 mt-2">Phone verified</p>}
    </div>
  );
};

export default PhoneOtpWidgetIndia;
