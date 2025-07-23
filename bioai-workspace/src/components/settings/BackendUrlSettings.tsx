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
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [serviceInfo, setServiceInfo] = useState<ServiceInfo | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

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
                onClick={handleSave}
                disabled={isSaving}
                className="btn btn-primary"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleReset}
                disabled={isSaving}
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
        </div>

        <div className="setting-info">
          <h4>Setup Instructions:</h4>
          <ol>
            <li>Start your Python LangGraph service</li>
            <li>If running locally, use ngrok to expose it: <code>ngrok http 8000</code></li>
            <li>Copy the ngrok URL (e.g., https://abc123.ngrok-free.app) and paste it above</li>
            <li>Configure your OpenRouter API key directly in the Python service</li>
            <li>Save the configuration to update the frontend</li>
          </ol>
          
          <div className="info-box">
            <strong>Note:</strong> By configuring the backend URL here, the API key will be handled 
            directly by your Python service instead of being passed from the frontend. 
            This provides better security and control over your API credentials.
          </div>
        </div>
      </div>
    </div>
  );
}