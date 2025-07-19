import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css'
import './styles/auth.css'
import './styles/settings.css'

// Import components with error handling
import Header from './components/Header';
import Landing from './pages/Landing';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Lazy load heavy components to prevent blocking
import { lazy, Suspense } from 'react';
const Workspace = lazy(() => import('./pages/Workspace'));
const AuthPage = lazy(() => import('./pages/auth/AuthPage'));
const ProfilePage = lazy(() => import('./pages/auth/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));

function App() {
  console.log('App component rendering...');
  
  return (
    <Router>
      <div className="app">
        <Header />
        <main className="main">
          <Suspense fallback={<div style={{padding: '20px', textAlign: 'center'}}>Loading...</div>}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route 
                path="/workspace" 
                element={
                  <ProtectedRoute>
                    <Workspace />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </Suspense>
        </main>
      </div>
    </Router>
  );
}

export default App
