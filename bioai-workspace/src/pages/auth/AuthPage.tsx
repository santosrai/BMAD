import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/auth.css';

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

  const handleDemoMode = () => {
    localStorage.setItem('bioai-demo-mode', 'true');
    navigate(from, { replace: true });
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Visual Panel */}
        <div className="auth-visual-panel">
          <h1>BioAI Workspace</h1>
          <p>Molecular visualization and AI-powered analysis</p>
        </div>

        {/* Auth Form Panel */}
        <div className="auth-form-panel">
          <div className="auth-form">
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

            {/* Demo Mode Option */}
            <div className="demo-divider">
              <span>OR</span>
            </div>
            
            <div className="demo-section">
              <button
                type="button"
                className="auth-button demo-button"
                onClick={handleDemoMode}
              >
                Continue in Demo Mode
              </button>
              <p className="demo-description">
                Try the application without creating an account. Your data won't be saved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}