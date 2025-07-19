import React, { useState, useEffect } from 'react';
import { checkBrowserCompatibility, shouldShowCompatibilityWarning, getCompatibilityStatus, generateCompatibilityReport } from '../../utils/browserCompatibility';
import type { BrowserCapabilities } from '../../utils/browserCompatibility';
import './CompatibilityWarning.css';

interface CompatibilityWarningProps {
  onDismiss?: () => void;
}

const CompatibilityWarning: React.FC<CompatibilityWarningProps> = ({ onDismiss }) => {
  const [capabilities, setCapabilities] = useState<BrowserCapabilities | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const caps = checkBrowserCompatibility();
    setCapabilities(caps);
    
    // Check if user has previously dismissed this warning
    const dismissedKey = `molstar-compatibility-dismissed-${caps.performanceScore}`;
    const wasDismissed = localStorage.getItem(dismissedKey);
    if (wasDismissed) {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    if (capabilities) {
      const dismissedKey = `molstar-compatibility-dismissed-${capabilities.performanceScore}`;
      localStorage.setItem(dismissedKey, 'true');
    }
    setIsDismissed(true);
    onDismiss?.();
  };

  if (!capabilities || isDismissed || !shouldShowCompatibilityWarning(capabilities)) {
    return null;
  }

  const status = getCompatibilityStatus(capabilities);
  const statusColors = {
    excellent: '#059669',
    good: '#0d9488',
    fair: '#d97706',
    poor: '#dc2626',
  };

  const statusIcons = {
    excellent: '✅',
    good: '✅',
    fair: '⚠️',
    poor: '❌',
  };

  return (
    <div className="compatibility-warning">
      <div className="warning-header">
        <div className="warning-icon">
          {statusIcons[status]}
        </div>
        <div className="warning-content">
          <h4 className="warning-title">
            Browser Compatibility: {status.charAt(0).toUpperCase() + status.slice(1)}
          </h4>
          <p className="warning-description">
            {capabilities.warnings.length > 0 ? (
              capabilities.warnings[0]
            ) : (
              'Your browser supports the Molstar viewer'
            )}
          </p>
        </div>
        <button 
          className="warning-dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss compatibility warning"
        >
          ×
        </button>
      </div>
      
      <div className="warning-actions">
        <button 
          className="details-toggle"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
        
        <div className="performance-indicator">
          <span className="score-label">Performance Score:</span>
          <span 
            className="score-value"
            style={{ color: statusColors[status] }}
          >
            {capabilities.performanceScore}/100
          </span>
        </div>
      </div>
      
      {showDetails && (
        <div className="warning-details">
          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">WebGL:</span>
              <span className="detail-value">
                {capabilities.webgl ? 'Supported' : 'Not Supported'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">WebGL 2:</span>
              <span className="detail-value">
                {capabilities.webgl2 ? 'Supported' : 'Not Supported'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Graphics:</span>
              <span className="detail-value">
                {capabilities.renderer}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Max Texture Size:</span>
              <span className="detail-value">
                {capabilities.maxTextureSize}px
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Extensions:</span>
              <span className="detail-value">
                {capabilities.supportedExtensions.length}
              </span>
            </div>
          </div>
          
          {capabilities.warnings.length > 1 && (
            <div className="warning-list">
              <h5>Additional Warnings:</h5>
              <ul>
                {capabilities.warnings.slice(1).map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="compatibility-actions">
            <button 
              className="copy-report-button"
              onClick={() => {
                const report = generateCompatibilityReport(capabilities);
                navigator.clipboard.writeText(report);
                alert('Compatibility report copied to clipboard');
              }}
            >
              Copy Full Report
            </button>
            
            <a 
              href="https://get.webgl.org/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="webgl-info-link"
            >
              WebGL Info
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompatibilityWarning;