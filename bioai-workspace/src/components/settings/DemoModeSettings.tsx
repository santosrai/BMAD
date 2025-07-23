import React, { useState } from 'react';
import { Switch } from '../ui/switch';
import { useDemoMode } from '../../hooks/useDemoMode';

export default function DemoModeSettings() {
  const { isDemoMode, isEnvDemo, canToggle, toggleDemoMode } = useDemoMode();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleToggleChange = (enabled: boolean) => {
    if (!enabled && isDemoMode) {
      // Show confirmation dialog when disabling demo mode
      setShowConfirmDialog(true);
    } else if (enabled && !isDemoMode) {
      // Enable demo mode directly
      toggleDemoMode(true);
    }
  };

  const confirmDisableDemo = () => {
    setShowConfirmDialog(false);
    toggleDemoMode(false);
  };

  const cancelDisableDemo = () => {
    setShowConfirmDialog(false);
  };

  return (
    <div className="demo-mode-settings">
      <div className="settings-section">
        <h2>Demo Mode</h2>
        <p className="section-description">
          Demo mode allows you to explore the BioAI Workspace without authentication. 
          Your data will be stored locally and some features may be limited.
        </p>

        {/* Current Status */}
        <div className="demo-status-card">
          <div className="status-header">
            <h3>Current Status</h3>
            <div className={`status-badge ${isDemoMode ? 'status-demo' : 'status-auth'}`}>
              {isDemoMode ? 'Demo Mode Active' : 'Authentication Required'}
            </div>
          </div>
          
          <div className="status-details">
            {isDemoMode ? (
              <div className="demo-active-info">
                <p>✅ You are currently using demo mode</p>
                <ul>
                  <li>No login required</li>
                  <li>Data stored locally in browser</li>
                  <li>Full access to molecular viewer and PDB search</li>
                  <li>Limited chat and AI features</li>
                </ul>
              </div>
            ) : (
              <div className="auth-required-info">
                <p>🔒 Authentication is currently required</p>
                <ul>
                  <li>Login with your account to access features</li>
                  <li>Data synced to cloud storage</li>
                  <li>Full access to all features including AI chat</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Demo Mode Toggle */}
        <div className="demo-toggle-section">
          <div className="toggle-header">
            <h3>Demo Mode Setting</h3>
            {isEnvDemo && (
              <div className="env-override-notice">
                <span className="status-badge status-warning">Environment Override</span>
                <p>Demo mode is currently controlled by environment variable and cannot be changed.</p>
              </div>
            )}
          </div>

          <div className="toggle-control">
            <div className="toggle-row">
              <div className="toggle-info">
                <label htmlFor="demo-mode-switch" className="toggle-label">
                  Enable Demo Mode
                </label>
                <p className="toggle-description">
                  {isDemoMode 
                    ? 'Disable to require authentication and access full features'
                    : 'Enable to use the workspace without logging in'
                  }
                </p>
              </div>
              <Switch
                id="demo-mode-switch"
                checked={isDemoMode}
                onCheckedChange={handleToggleChange}
                disabled={!canToggle}
                aria-label="Toggle demo mode"
                aria-describedby="demo-mode-description"
              />
            </div>

            {isDemoMode && canToggle && (
              <div className="demo-warning">
                <p>⚠️ <strong>Note:</strong> Disabling demo mode will restart the application and redirect you to the login page.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Disable Demo Mode?</h3>
              <button 
                className="modal-close"
                onClick={cancelDisableDemo}
                aria-label="Close dialog"
              >
                ×
              </button>
            </div>
            <div className="modal-form">
              <p className="modal-description">
                Are you sure you want to disable demo mode? This will:
              </p>
              <ul className="confirmation-list">
                <li>Restart the application</li>
                <li>Clear any locally stored demo data</li>
                <li>Redirect you to the login page</li>
                <li>Require authentication to continue</li>
              </ul>
              <div className="modal-actions">
                <button 
                  className="btn-secondary"
                  onClick={cancelDisableDemo}
                >
                  Cancel
                </button>
                <button 
                  className="btn-danger"
                  onClick={confirmDisableDemo}
                >
                  Disable Demo Mode
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}