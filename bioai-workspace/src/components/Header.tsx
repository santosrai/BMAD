import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useUser } from '@clerk/clerk-react';

export default function Header() {
  const { isAuthenticated, isLoading, signOut } = useAuth();
  const { user } = useUser();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          BioAI Workspace
        </Link>
        <nav className="nav">
          <Link to="/" className="nav-link">
            Home
          </Link>
          <Link to="/workspace" className="nav-link">
            Workspace
          </Link>
        </nav>
        
        <div className="auth-section">
          {isLoading ? (
            <div className="auth-loading">Loading...</div>
          ) : isAuthenticated ? (
            <div className="user-menu">
              <span className="user-name">Hello, {user?.firstName || user?.emailAddresses[0]?.emailAddress || 'User'}</span>
              <Link to="/profile" className="nav-link">
                Profile
              </Link>
              <Link to="/settings" className="nav-link">
                Settings
              </Link>
              <button 
                onClick={handleLogout}
                className="logout-button"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/auth" className="nav-link">
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}