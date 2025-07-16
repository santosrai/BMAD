import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoginForm from '../../components/auth/LoginForm';
import SignUpForm from '../../components/auth/SignUpForm';
import PasswordResetForm from '../../components/auth/PasswordResetForm';

type AuthMode = 'login' | 'signup' | 'reset';

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  
  // Get the return URL from location state or default to workspace
  const from = (location.state as { from?: string })?.from || '/workspace';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleAuthSuccess = () => {
    // Navigation will happen automatically via the useEffect above
    // when isAuthenticated becomes true
  };

  const renderAuthForm = () => {
    switch (mode) {
      case 'signup':
        return (
          <SignUpForm
            onSuccess={handleAuthSuccess}
            onSwitchToLogin={() => setMode('login')}
          />
        );
      case 'reset':
        return (
          <PasswordResetForm
            onSuccess={() => setMode('login')}
            onBackToLogin={() => setMode('login')}
          />
        );
      default:
        return (
          <LoginForm
            onSuccess={handleAuthSuccess}
            onSwitchToSignUp={() => setMode('signup')}
            onForgotPassword={() => setMode('reset')}
          />
        );
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        {renderAuthForm()}
      </div>
    </div>
  );
}