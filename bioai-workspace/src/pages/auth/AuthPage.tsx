import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { useAuth } from '../../hooks/useAuth';

type AuthMode = 'login' | 'signup';

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

  return (
    <div className="auth-page">
      <div className="auth-container">
        {mode === 'signup' ? (
          <SignUp 
            afterSignUpUrl={from}
            signInUrl="/auth"
            routing="path"
            path="/auth"
          />
        ) : (
          <SignIn 
            afterSignInUrl={from}
            signUpUrl="/auth?mode=signup"
            routing="path"
            path="/auth"
          />
        )}
        
        <div className="auth-switch">
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button
                type="button"
                className="auth-switch-button"
                onClick={() => setMode('signup')}
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                className="auth-switch-button"
                onClick={() => setMode('login')}
              >
                Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}