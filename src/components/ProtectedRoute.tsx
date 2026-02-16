
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiresLeader?: boolean;
  requiresAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiresLeader = false,
  requiresAdmin = false,
}) => {
  const { isAuthenticated, isLeader, user, isLoading } = useAuth();

  // While auth state is loading, avoid redirecting prematurely
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-gray-500">Loading…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (requiresLeader && !isLeader) {
    return <Navigate to="/" replace />;
  }

  if (requiresAdmin && !user?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
