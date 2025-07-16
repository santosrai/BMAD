import { useState } from 'react';
import ApiKeySettings from '../../components/settings/ApiKeySettings';
import '../../styles/settings.css';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('api-keys');

  return (
    <div className="settings-page">
      <div className="settings-container">
        <header className="settings-header">
          <h1>Settings</h1>
          <p>Configure your BioAI Workspace preferences and API integrations</p>
        </header>

        <div className="settings-content">
          <nav className="settings-nav">
            <ul className="settings-tabs">
              <li>
                <button
                  className={`settings-tab ${activeTab === 'api-keys' ? 'active' : ''}`}
                  onClick={() => setActiveTab('api-keys')}
                >
                  API Keys
                </button>
              </li>
              <li>
                <button
                  className={`settings-tab ${activeTab === 'preferences' ? 'active' : ''}`}
                  onClick={() => setActiveTab('preferences')}
                  disabled
                >
                  Preferences (Coming Soon)
                </button>
              </li>
            </ul>
          </nav>

          <main className="settings-main">
            {activeTab === 'api-keys' && <ApiKeySettings />}
            {activeTab === 'preferences' && (
              <div className="coming-soon">
                <h3>Preferences</h3>
                <p>User preferences and workspace settings will be available in a future update.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}