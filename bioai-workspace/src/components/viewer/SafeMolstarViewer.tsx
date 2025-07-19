import { useState, useEffect, useRef } from 'react';
import MolstarErrorBoundary from './MolstarErrorBoundary';
import FallbackViewer from './FallbackViewer';
import type { MolstarViewerProps } from '../../types/molstar';

// Dynamic import wrapper with error handling
const DynamicMolstarViewer = ({ ...props }: MolstarViewerProps) => {
  const [ViewerComponent, setViewerComponent] = useState<React.ComponentType<MolstarViewerProps> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const loadViewer = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Add a small delay to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if WebGL is available
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl) {
        throw new Error('WebGL is not supported in this browser. The 3D molecular viewer requires WebGL to function properly.');
      }
      
      // Pre-load only the essential Molstar modules that we know exist
      console.log('Loading Molstar modules...');
      
      // Load only the essential modules needed for BasicMolstarViewer
      await import('molstar/lib/mol-plugin-ui');
      await import('molstar/lib/mol-plugin-ui/react18');
      await import('molstar/lib/mol-plugin-ui/spec');
      
      console.log('Essential Molstar modules loaded successfully');
      
      // Use the AdvancedMolstarViewer with comprehensive error handling
      const { default: AdvancedMolstarViewer } = await import('./AdvancedMolstarViewer');
      setViewerComponent(() => AdvancedMolstarViewer);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load MolstarViewer:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load the molecular viewer';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadViewer();
  }, [retryCount]);

  const handleRetry = () => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
    }
  };

  if (isLoading) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        backgroundColor: '#f9fafb',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
        </div>
        <h3 style={{ color: '#374151', marginBottom: '0.5rem' }}>
          Loading 3D Viewer...
        </h3>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          {retryCount > 0 ? `Retry attempt ${retryCount}/${maxRetries}` : 'Initializing molecular viewer'}
        </p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        backgroundColor: '#fef2f2',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h3 style={{ color: '#dc2626', marginBottom: '1rem' }}>
          Failed to Load 3D Viewer
        </h3>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem', maxWidth: '400px' }}>
          {error}
        </p>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          {retryCount < maxRetries && (
            <button 
              onClick={handleRetry}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Retry ({maxRetries - retryCount} attempts left)
            </button>
          )}
          <button 
            onClick={() => setViewerComponent(() => FallbackViewer)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Use Alternative Viewer
          </button>
        </div>
        
        <div style={{ 
          marginTop: '1.5rem',
          padding: '1rem',
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '4px',
          maxWidth: '500px',
          width: '100%'
        }}>
          <h4 style={{ color: '#92400e', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            Browser Requirements:
          </h4>
          <ul style={{ 
            textAlign: 'left',
            color: '#92400e',
            fontSize: '0.8rem',
            margin: 0,
            paddingLeft: '1.5rem'
          }}>
            <li>WebGL support is required</li>
            <li>Modern browser (Chrome 88+, Firefox 85+, Safari 14+)</li>
            <li>Hardware acceleration enabled</li>
          </ul>
        </div>
      </div>
    );
  }

  if (!ViewerComponent) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        backgroundColor: '#f9fafb',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <p style={{ color: '#6b7280' }}>Viewer component not available</p>
      </div>
    );
  }

  return (
    <MolstarErrorBoundary>
      <ViewerComponent {...props} />
    </MolstarErrorBoundary>
  );
};

export default DynamicMolstarViewer;