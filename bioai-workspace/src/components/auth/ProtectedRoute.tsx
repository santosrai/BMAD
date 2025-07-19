import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export default function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const location = useLocation();
  
  try {
    const { isAuthenticated, isLoading } = useAuth();

    // Show loading state while checking authentication
    if (isLoading) {
      return (
        <div className="auth-loading-container">
          <div className="auth-loading">Checking authentication...</div>
        </div>
      );
    }

    // If not authenticated, redirect to auth page with return URL
    if (!isAuthenticated) {
      return fallback || (
        <Navigate 
          to="/auth" 
          state={{ from: location.pathname }} 
          replace 
        />
      );
    }

    // If authenticated, render the protected content
    return <>{children}</>;
  } catch (error) {
    console.error('Error in ProtectedRoute:', error);
    // If there's an error with auth, redirect to auth page
    return (
      <Navigate 
        to="/auth" 
        state={{ from: location.pathname, error: 'Authentication error' }} 
        replace 
      />
    );
  }
}