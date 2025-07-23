import { useState } from 'react';
import ApiKeySettings from '../../components/settings/ApiKeySettings';
import DemoModeSettings from '../../components/settings/DemoModeSettings';
import BackendUrlSettings from '../../components/settings/BackendUrlSettings';
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
                  className={`settings-tab ${activeTab === 'backend' ? 'active' : ''}`}
                  onClick={() => setActiveTab('backend')}
                >
                  Backend Service
                </button>
              </li>
              <li>
                <button
                  className={`settings-tab ${activeTab === 'preferences' ? 'active' : ''}`}
                  onClick={() => setActiveTab('preferences')}
                >
                  Preferences
                </button>
              </li>
            </ul>
          </nav>

          <main className="settings-main">
            {activeTab === 'api-keys' && <ApiKeySettings />}
            {activeTab === 'backend' && <BackendUrlSettings />}
            {activeTab === 'preferences' && <DemoModeSettings />}
          </main>
        </div>
      </div>
    </div>
  );
}