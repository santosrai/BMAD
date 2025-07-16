import { useState, useEffect } from 'react';
import { useApiKey } from '../../hooks/useApiKey';
import { validateApiKeyFormat, getApiKeyErrorGuidance } from '../../services/openrouter';

export default function ApiKeySettings() {
  const { 
    apiKeyInfo, 
    isValidating, 
    validationError, 
    setApiKey, 
    validateApiKey, 
    removeApiKey,
    clearValidationError 
  } = useApiKey();

  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationKeyInput, setValidationKeyInput] = useState('');

  // Clear errors when input changes
  useEffect(() => {
    if (validationError) {
      clearValidationError();
    }
    if (formatError) {
      setFormatError(null);
    }
  }, [apiKeyInput, validationError, formatError, clearValidationError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKeyInput.trim()) {
      setFormatError('API key is required');
      return;
    }

    // Validate format first
    const formatValidation = validateApiKeyFormat(apiKeyInput);
    if (!formatValidation.isValid) {
      setFormatError(formatValidation.error || 'Invalid API key format');
      return;
    }

    try {
      await setApiKey(apiKeyInput);
      setApiKeyInput('');
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save API key:', error);
    }
  };

  const handleValidate = () => {
    setShowValidationModal(true);
    setValidationKeyInput('');
  };

  const handleValidationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validationKeyInput.trim()) {
      return;
    }

    try {
      await validateApiKey(validationKeyInput);
      setShowValidationModal(false);
      setValidationKeyInput('');
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleValidationCancel = () => {
    setShowValidationModal(false);
    setValidationKeyInput('');
    clearValidationError();
  };

  const handleRemove = async () => {
    if (window.confirm('Are you sure you want to remove your OpenRouter API key? This will disable AI-powered features.')) {
      try {
        await removeApiKey();
        setIsEditing(false);
        setApiKeyInput('');
      } catch (error) {
        console.error('Failed to remove API key:', error);
      }
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setApiKeyInput('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setApiKeyInput('');
    setFormatError(null);
    clearValidationError();
  };

  const getStatusDisplay = () => {
    if (!apiKeyInfo?.hasApiKey) {
      return { text: 'Not configured', className: 'status-warning' };
    }
    
    switch (apiKeyInfo.status) {
      case 'valid':
        return { text: 'Valid', className: 'status-success' };
      case 'invalid':
        return { text: 'Invalid', className: 'status-error' };
      case 'untested':
        return { text: 'Untested', className: 'status-warning' };
      default:
        return { text: 'Unknown', className: 'status-neutral' };
    }
  };

  const getLastValidatedDisplay = () => {
    if (!apiKeyInfo?.lastValidated) return 'Never';
    return new Date(apiKeyInfo.lastValidated).toLocaleString();
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="api-key-settings">
      <div className="settings-section">
        <h2>OpenRouter API Key</h2>
        <p className="section-description">
          Configure your OpenRouter API key to enable AI-powered biological analysis features.
          You can get your API key from your{' '}
          <a 
            href="https://openrouter.ai/keys" 
            target="_blank" 
            rel="noopener noreferrer"
            className="external-link"
          >
            OpenRouter dashboard
          </a>.
        </p>

        {/* API Key Status */}
        <div className="api-key-status">
          <h3>Current Status</h3>
          <div className="status-grid">
            <div className="status-item">
              <label>Configuration:</label>
              <span className={`status-badge ${statusDisplay.className}`}>
                {statusDisplay.text}
              </span>
            </div>
            
            {apiKeyInfo?.hasApiKey && (
              <>
                <div className="status-item">
                  <label>API Key:</label>
                  <span className="masked-key">
                    {showApiKey ? apiKeyInfo.maskedApiKey : '••••••••••••••••'}
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="toggle-visibility"
                      aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                    >
                      {showApiKey ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </span>
                </div>
                
                <div className="status-item">
                  <label>Last Validated:</label>
                  <span>{getLastValidatedDisplay()}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Error Display */}
        {(validationError || formatError || apiKeyInfo?.errorMessage) && (
          <div className="error-section">
            <div className="error-message">
              <h4>⚠️ Issue Detected</h4>
              <p>{validationError || formatError || apiKeyInfo?.errorMessage}</p>
              {validationError && (
                <div className="error-guidance">
                  <details>
                    <summary>Troubleshooting Tips</summary>
                    <p>{getApiKeyErrorGuidance()}</p>
                  </details>
                </div>
              )}
            </div>
          </div>
        )}

        {/* API Key Management */}
        <div className="api-key-management">
          {!apiKeyInfo?.hasApiKey || isEditing ? (
            <form onSubmit={handleSubmit} className="api-key-form">
              <h3>{apiKeyInfo?.hasApiKey ? 'Update API Key' : 'Add API Key'}</h3>
              
              <div className="form-group">
                <label htmlFor="apiKey">
                  OpenRouter API Key
                  <span className="required">*</span>
                </label>
                <input
                  type="password"
                  id="apiKey"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="sk-or-..."
                  className={formatError ? 'error' : ''}
                  disabled={isValidating}
                />
                {formatError && (
                  <span className="field-error">{formatError}</span>
                )}
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  disabled={isValidating || !apiKeyInput.trim()}
                  className="btn-primary"
                >
                  {isValidating ? 'Validating...' : 'Save & Validate'}
                </button>
                
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="btn-secondary"
                    disabled={isValidating}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          ) : (
            <div className="api-key-actions">
              <h3>Manage API Key</h3>
              <div className="action-buttons">
                <button
                  onClick={handleValidate}
                  disabled={isValidating}
                  className="btn-secondary"
                >
                  {isValidating ? 'Validating...' : 'Test Connection'}
                </button>
                
                <button
                  onClick={handleEdit}
                  className="btn-secondary"
                >
                  Update Key
                </button>
                
                <button
                  onClick={handleRemove}
                  className="btn-danger"
                >
                  Remove Key
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Usage Information */}
        <div className="usage-info">
          <h3>About OpenRouter API Keys</h3>
          <ul>
            <li>Your API key is stored securely and encrypted</li>
            <li>Only you can see the last 4 characters of your key</li>
            <li>API calls are made directly from your browser to OpenRouter</li>
            <li>You control your API usage and billing through OpenRouter</li>
            <li>You can update or remove your key at any time</li>
          </ul>
        </div>

        {/* Validation Modal */}
        {showValidationModal && (
          <div className="modal-overlay" onClick={handleValidationCancel}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Test API Key Connection</h3>
                <button
                  onClick={handleValidationCancel}
                  className="modal-close"
                  aria-label="Close modal"
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleValidationSubmit} className="modal-form">
                <p className="modal-description">
                  For security reasons, please re-enter your API key to test the connection to OpenRouter.
                </p>
                
                <div className="form-group">
                  <label htmlFor="validationKey">OpenRouter API Key</label>
                  <input
                    type="password"
                    id="validationKey"
                    value={validationKeyInput}
                    onChange={(e) => setValidationKeyInput(e.target.value)}
                    placeholder="sk-or-..."
                    disabled={isValidating}
                    autoFocus
                  />
                </div>

                <div className="modal-actions">
                  <button
                    type="submit"
                    disabled={isValidating || !validationKeyInput.trim()}
                    className="btn-primary"
                  >
                    {isValidating ? 'Testing...' : 'Test Connection'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleValidationCancel}
                    className="btn-secondary"
                    disabled={isValidating}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}