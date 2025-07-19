import React, { useState } from 'react';
import { useMolstarViewer } from '../../hooks/useMolstarViewer';
import { useAuth } from '../../hooks/useAuth';
import type { MolstarViewerPreferences } from '../../types/molstar';
import './MolstarSettings.css';

interface MolstarSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onPreferencesChange: (preferences: MolstarViewerPreferences) => void;
}

const MolstarSettings: React.FC<MolstarSettingsProps> = ({
  isOpen,
  onClose,
  onPreferencesChange,
}) => {
  const { user } = useAuth();
  const { state, actions } = useMolstarViewer(user?.id || '');
  const [activeTab, setActiveTab] = useState<'display' | 'performance' | 'recent'>('display');

  const handlePreferenceChange = async (key: keyof MolstarViewerPreferences, value: any) => {
    const newPreferences = { ...state.viewerPreferences, [key]: value };
    await actions.updatePreferences({ [key]: value });
    onPreferencesChange(newPreferences);
  };

  const handleClearRecent = async () => {
    if (window.confirm('Are you sure you want to clear recent structures?')) {
      await actions.clearRecentStructures();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="molstar-settings-overlay">
      <div className="molstar-settings-modal">
        <div className="molstar-settings-header">
          <h3>Viewer Settings</h3>
          <button className="close-button" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div className="molstar-settings-tabs">
          <button
            className={`tab-button ${activeTab === 'display' ? 'active' : ''}`}
            onClick={() => setActiveTab('display')}
          >
            Display
          </button>
          <button
            className={`tab-button ${activeTab === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            Performance
          </button>
          <button
            className={`tab-button ${activeTab === 'recent' ? 'active' : ''}`}
            onClick={() => setActiveTab('recent')}
          >
            Recent
          </button>
        </div>

        <div className="molstar-settings-content">
          {activeTab === 'display' && (
            <div className="settings-section">
              <div className="setting-item">
                <label htmlFor="representation-style">Representation Style</label>
                <select
                  id="representation-style"
                  value={state.viewerPreferences.representationStyle}
                  onChange={(e) => handlePreferenceChange('representationStyle', e.target.value)}
                >
                  <option value="cartoon">Cartoon</option>
                  <option value="surface">Surface</option>
                  <option value="ball-and-stick">Ball and Stick</option>
                  <option value="spacefill">Spacefill</option>
                </select>
              </div>
              
              <div className="setting-item">
                <label htmlFor="background-color">Background Color</label>
                <input
                  type="color"
                  id="background-color"
                  value={state.viewerPreferences.backgroundColor}
                  onChange={(e) => handlePreferenceChange('backgroundColor', e.target.value)}
                />
              </div>
              
              <div className="setting-item">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={state.viewerPreferences.autoRotate}
                    onChange={(e) => handlePreferenceChange('autoRotate', e.target.checked)}
                  />
                  Auto-rotate structure
                </label>
              </div>
              
              <div className="setting-item">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={state.viewerPreferences.showAxes}
                    onChange={(e) => handlePreferenceChange('showAxes', e.target.checked)}
                  />
                  Show coordinate axes
                </label>
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="settings-section">
              <div className="setting-item">
                <label htmlFor="performance-mode">Performance Mode</label>
                <select
                  id="performance-mode"
                  value={state.viewerPreferences.performanceMode}
                  onChange={(e) => handlePreferenceChange('performanceMode', e.target.value)}
                >
                  <option value="auto">Auto (Recommended)</option>
                  <option value="high">High Quality</option>
                  <option value="medium">Medium Quality</option>
                  <option value="low">Low Quality</option>
                </select>
                <p className="setting-description">
                  Auto mode detects your device capabilities and chooses the best settings.
                </p>
              </div>
              
              <div className="performance-info">
                <h4>Performance Information</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Current Mode:</span>
                    <span className="info-value">{state.viewerPreferences.performanceMode}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">WebGL Support:</span>
                    <span className="info-value">
                      {(() => {
                        const canvas = document.createElement('canvas');
                        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                        return gl ? 'Available' : 'Not Available';
                      })()}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Renderer:</span>
                    <span className="info-value">
                      {(() => {
                        const canvas = document.createElement('canvas');
                        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                        if (!gl) return 'Unknown';
                        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                        return debugInfo ? 
                          gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Unknown' : 
                          'Unknown';
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'recent' && (
            <div className="settings-section">
              <div className="recent-header">
                <h4>Recent Structures</h4>
                <button 
                  className="clear-recent-button"
                  onClick={handleClearRecent}
                  disabled={state.recentStructures.length === 0}
                >
                  Clear All
                </button>
              </div>
              
              {state.recentStructures.length === 0 ? (
                <p className="no-recent">No recent structures</p>
              ) : (
                <div className="recent-list">
                  {state.recentStructures.map((url, index) => (
                    <div key={index} className="recent-item">
                      <div className="recent-info">
                        <span className="recent-name">
                          {url.split('/').pop()?.split('.')[0] || 'Unknown'}
                        </span>
                        <span className="recent-url">{url}</span>
                      </div>
                      <button
                        className="load-structure-button"
                        onClick={() => actions.loadStructure(url)}
                      >
                        Load
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="molstar-settings-footer">
          <button className="settings-button secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MolstarSettings;