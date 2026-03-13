import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LocalStorageService } from '@/lib/localStorage';

export const GoogleAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithGoogle } = useAuth();

  useEffect(() => {
    const handleGoogleAuth = async () => {
      const token = searchParams.get('token');

      if (!token) {
        navigate('/auth?error=no_token');
        return;
      }

      try {
        const success = await loginWithGoogle(token);
        if (!success) {
          navigate('/auth?error=google_auth_failed');
          return;
        }

        const userData = LocalStorageService.loadUserData();

        // Admins still go to the admin dashboard.
        // Non-admin users coming from Google OAuth should be taken
        // directly to the GridBoard/create-group flow.
        if (userData?.isAdmin) {
          navigate('/admin');
        } else {
          navigate('/create-group');
        }
      } catch (error) {
        console.error('Google auth callback error:', error);
        navigate('/auth?error=google_auth_failed');
      }
    };

    handleGoogleAuth();
  }, [searchParams, loginWithGoogle, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-lg border-0">
        <CardHeader>
          <CardTitle>Authenticating...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
          <p className="text-center mt-4 text-gray-600">
            Please wait while we complete your Google authentication.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};