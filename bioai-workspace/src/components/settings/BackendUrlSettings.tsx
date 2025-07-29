import { useState, useEffect } from 'react';

interface ServiceInfo {
  service: string;
  version: string;
  status: string;
  docs_url: string;
}

export default function BackendUrlSettings() {
  const [backendUrl, setBackendUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [serviceInfo, setServiceInfo] = useState<ServiceInfo | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [autoDetectError, setAutoDetectError] = useState<string | null>(null);

  // Load saved backend URL from localStorage
  useEffect(() => {
    const savedUrl = localStorage.getItem('bioai_backend_url');
    if (savedUrl) {
      setBackendUrl(savedUrl);
      validateServiceUrl(savedUrl);
    }
  }, []);

  // Validate if URL is a valid Python LangGraph service
  const validateServiceUrl = async (url: string): Promise<boolean> => {
    if (!url.trim()) {
      setServiceInfo(null);
      setValidationError(null);
      return false;
    }

    setIsValidating(true);
    setValidationError(null);

    try {
      const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
      const response = await fetch(`${cleanUrl}/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Check if response matches expected Python LangGraph service format
      if (data.service === 'python-langgraph-service' && data.status && data.version) {
        setServiceInfo(data);
        setValidationError(null);
        return true;
      } else {
        throw new Error('URL does not point to a valid Python LangGraph service');
      }
    } catch (error) {
      console.error('Service validation failed:', error);
      setServiceInfo(null);
      setValidationError(error instanceof Error ? error.message : 'Failed to validate service');
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      // Validate URL format
      if (backendUrl && !isValidUrl(backendUrl)) {
        throw new Error('Please enter a valid URL');
      }

      // Save to localStorage
      if (backendUrl.trim()) {
        localStorage.setItem('bioai_backend_url', backendUrl.trim());
      } else {
        localStorage.removeItem('bioai_backend_url');
      }

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving backend URL:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleReset = () => {
    setBackendUrl('');
    localStorage.removeItem('bioai_backend_url');
    setSaveStatus('idle');
  };

  const handleAutoDetect = async () => {
    setIsAutoDetecting(true);
    setAutoDetectError(null);

    try {
      // Try multiple detection methods in order of preference
      const methods = [
        { name: 'Python Service API', func: detectViaPythonService },
        { name: 'Local Ngrok API', func: detectViaLocalNgrokApi },
        { name: 'Localhost Fallback', func: detectViaLocalhost }
      ];

      for (const method of methods) {
        try {
          console.log(`Trying auto-detection method: ${method.name}`);
          const detectedUrl = await method.func();
          
          if (detectedUrl) {
            console.log(`✅ Auto-detection successful via ${method.name}:`, detectedUrl);
            setBackendUrl(detectedUrl);
            setAutoDetectError(null);
            
            // Automatically validate the detected URL
            const isValid = await validateServiceUrl(detectedUrl);
            if (isValid) {
              console.log('✅ Auto-detected URL validated successfully');
            }
            
            return; // Success, exit the loop
          }
        } catch (error) {
          console.warn(`❌ Auto-detection method ${method.name} failed:`, error);
        }
      }

      // If we get here, all methods failed
      setAutoDetectError('Could not auto-detect ngrok URL. Please ensure ngrok is running and try manual configuration.');
      
    } catch (error) {
      console.error('Auto-detection error:', error);
      setAutoDetectError(error instanceof Error ? error.message : 'Auto-detection failed');
    } finally {
      setIsAutoDetecting(false);
    }
  };

  const detectViaPythonService = async (): Promise<string | null> => {
    // Try common Python service URLs
    const candidateUrls = [
      'http://localhost:8000',
      // Add any other common local URLs your service might use
    ];

    for (const baseUrl of candidateUrls) {
      try {
        const response = await fetch(`${baseUrl}/api/v1/ngrok/url`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
          const data = await response.json();
          if (data.status === 'success' && data.url) {
            return data.url;
          }
        }
      } catch (error) {
        // Continue to next candidate
      }
    }

    return null;
  };

  const detectViaLocalNgrokApi = async (): Promise<string | null> => {
    try {
      const response = await fetch('http://localhost:4040/api/tunnels', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) return null;

      const data = await response.json();
      const tunnels = data.tunnels || [];

      // Look for HTTPS tunnel first (preferred)
      for (const tunnel of tunnels) {
        if (tunnel.proto === 'https') {
          return tunnel.public_url;
        }
      }

      // Fallback to HTTP tunnel
      for (const tunnel of tunnels) {
        if (tunnel.proto === 'http') {
          return tunnel.public_url;
        }
      }

      return null;
    } catch (error) {
      console.warn('Local ngrok API detection failed:', error);
      return null;
    }
  };

  const detectViaLocalhost = async (): Promise<string | null> => {
    // Last resort: check if localhost Python service is running
    try {
      const response = await fetch('http://localhost:8000/health/live', {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });

      if (response.ok) {
        return 'http://localhost:8000';
      }
    } catch (error) {
      // Service not running locally
    }

    return null;
  };

  return (
    <div className="setting-section">
      <div className="setting-header">
        <h3>Backend Service Configuration</h3>
        <p>Configure the Python LangGraph service URL for direct OpenRouter API key setup</p>
      </div>

      <div className="setting-content">
        <div className="form-group">
          <label htmlFor="backend-url" className="form-label">
            Backend Service URL
          </label>
          <div className="url-input-group">
            <input
              id="backend-url"
              type="url"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              placeholder="https://your-python-service.com or https://abc123.ngrok-free.app"
              className="form-input url-input"
            />
            <div className="button-group">
              <button
                onClick={handleAutoDetect}
                disabled={isAutoDetecting || isSaving}
                className="btn btn-info"
                title="Automatically detect ngrok tunnel URL"
              >
                {isAutoDetecting ? 'Detecting...' : '🔍 Auto-Detect'}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || isAutoDetecting}
                className="btn btn-primary"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleReset}
                disabled={isSaving || isAutoDetecting}
                className="btn btn-secondary"
              >
                Reset
              </button>
            </div>
          </div>
          
          {saveStatus === 'success' && (
            <div className="status-message success">
              ✅ Backend URL saved successfully
            </div>
          )}
          
          {saveStatus === 'error' && (
            <div className="status-message error">
              ❌ Error saving backend URL. Please check the format.
            </div>
          )}

          {autoDetectError && (
            <div className="status-message error">
              ❌ Auto-detection failed: {autoDetectError}
            </div>
          )}

          {isAutoDetecting && (
            <div className="status-message info">
              🔍 Searching for ngrok tunnel URL...
            </div>
          )}
        </div>

        <div className="setting-info">
          <h4>Setup Instructions:</h4>
          <div className="setup-methods">
            <div className="method-section">
              <h5>🚀 Quick Setup (Recommended):</h5>
              <ol>
                <li>Start your Python LangGraph service</li>
                <li>If running locally, start ngrok: <code>./start-python-tunnel.sh</code></li>
                <li>Click the <strong>"🔍 Auto-Detect"</strong> button above</li>
                <li>Save the detected configuration</li>
              </ol>
            </div>
            
            <div className="method-section">
              <h5>📝 Manual Setup:</h5>
              <ol>
                <li>Start your Python LangGraph service</li>
                <li>If running locally, use ngrok to expose it: <code>ngrok http 8000</code></li>
                <li>Copy the ngrok URL (e.g., https://abc123.ngrok-free.app) and paste it above</li>
                <li>Configure your OpenRouter API key directly in the Python service</li>
                <li>Save the configuration to update the frontend</li>
              </ol>
            </div>
          </div>
          
          <div className="info-box">
            <strong>Auto-Detection:</strong> The system can automatically detect your ngrok tunnel URL 
            when the Python service and ngrok are running. This eliminates the need to manually copy 
            and paste URLs every time you restart ngrok.
            <br/><br/>
            <strong>Security:</strong> By configuring the backend URL here, the API key will be handled 
            directly by your Python service instead of being passed from the frontend. 
            This provides better security and control over your API credentials.
          </div>
        </div>
      </div>
    </div>
  );
}