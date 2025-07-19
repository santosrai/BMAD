import React from 'react';

interface MolstarErrorBoundaryProps {
  children: React.ReactNode;
}

interface MolstarErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class MolstarErrorBoundary extends React.Component<MolstarErrorBoundaryProps, MolstarErrorBoundaryState> {
  constructor(props: MolstarErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<MolstarErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const timestamp = new Date().toISOString();
    console.error('[MolstarErrorBoundary] Error caught:', error);
    if (error.stack) {
      console.error('[MolstarErrorBoundary] Error stack:', error.stack);
    }
    console.error('[MolstarErrorBoundary] Component stack:', errorInfo.componentStack);
    console.error('[MolstarErrorBoundary] Props at error:', this.props);
    console.error('[MolstarErrorBoundary] State at error:', this.state);
    console.error('[MolstarErrorBoundary] Timestamp:', timestamp);
  }

  render() {
    if (this.state.hasError) {
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
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h3 style={{ color: '#dc2626', marginBottom: '1rem' }}>
            3D Viewer Unavailable
          </h3>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem', maxWidth: '400px' }}>
            The molecular viewer encountered an error and couldn't load. This might be due to browser compatibility issues or network problems.
          </p>
          
          <details style={{ 
            marginBottom: '1.5rem',
            padding: '1rem',
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            maxWidth: '500px',
            width: '100%'
          }}>
            <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>
              Technical Details
            </summary>
            <pre style={{ 
              fontSize: '12px', 
              color: '#dc2626',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              textAlign: 'left',
              marginBottom: '0.5rem'
            }}>
              {this.state.error?.message || 'Unknown error occurred'}
            </pre>
            {this.state.error?.stack && (
              <>
                <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Error Stack:</div>
                <pre style={{
                  fontSize: '11px',
                  color: '#6b7280',
                  background: '#f3f4f6',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  marginBottom: '0.5rem',
                  maxHeight: '120px',
                  overflow: 'auto'
                }}>{this.state.error.stack}</pre>
              </>
            )}
            {/* Show component stack if available (from window._molstarComponentStack, set in componentDidCatch) */}
            {typeof window !== 'undefined' && (window as any)._molstarComponentStack && (
              <>
                <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Component Stack:</div>
                <pre style={{
                  fontSize: '11px',
                  color: '#6b7280',
                  background: '#f3f4f6',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  maxHeight: '120px',
                  overflow: 'auto'
                }}>{(window as any)._molstarComponentStack}</pre>
              </>
            )}
          </details>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => this.setState({ hasError: false, error: null })}
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
              Try Again
            </button>
            <button 
              onClick={() => window.location.reload()}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Reload Page
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
              Alternative Solutions:
            </h4>
            <ul style={{ 
              textAlign: 'left',
              color: '#92400e',
              fontSize: '0.8rem',
              margin: 0,
              paddingLeft: '1.5rem'
            }}>
              <li>Try using a different browser (Chrome, Firefox, Safari)</li>
              <li>Check your internet connection</li>
              <li>Disable browser extensions temporarily</li>
              <li>Clear your browser cache and cookies</li>
            </ul>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MolstarErrorBoundary;