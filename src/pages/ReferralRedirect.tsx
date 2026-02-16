import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

export default function ReferralRedirect() {
  const { referralCode } = useParams<{ referralCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const processedRef = useRef(false);

  useEffect(() => {
    if (!referralCode) {
      navigate('/');
      return;
    }

    if (processedRef.current) return;
    processedRef.current = true;

    const run = async () => {
      try {
        // 1) Validate referral code with backend
        const res = await fetch(`/api/referrals/code/${encodeURIComponent(referralCode)}`);
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ambassadorId) {
          toast.error('Invalid referral code');
          navigate('/');
          return;
        }

        // 2) If logged in, check if user already has a group for this referral
        if (user?.id) {
          try {
            const myGroupRes = await fetch(`/api/referrals/${encodeURIComponent(referralCode)}/my-group`, {
              credentials: 'include',
            });
            const myGroupData = await myGroupRes.json().catch(() => null);
            if (myGroupRes.ok && myGroupData?.group && myGroupData.group.id) {
              toast.success('Welcome back! Opening your existing group.');
              navigate(`/dashboard/${myGroupData.group.id}`);
              return;
            }
          } catch (err) {
            console.warn('Failed to resolve existing referral group for user:', err);
          }
        }

        // 3) Set httpOnly cookie for attribution
        await fetch('/api/referrals/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referralCode })
        }).catch(() => undefined);

        const name = data?.name || data?.ambassadorName || 'your ambassador';
        toast.success(`Welcome! You're creating a group via ${name}'s referral`);
        navigate('/');
      } catch (err) {
        toast.error('Invalid referral code');
        navigate('/');
      }
    };

    run();
  }, [referralCode, navigate, user?.id]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
}
