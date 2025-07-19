import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { ModelSwitcher } from './ModelSwitcher';
import { PrivateFileUpload } from './PrivateFileUpload';
import { CommandPalette, KeyboardShortcutsHelp } from './CommandPalette';
import { Settings, Zap, FileText, Keyboard, Search, Activity, Download, Puzzle } from 'lucide-react';

interface AdvancedSettingsProps {
  userId: string;
  currentSessionId?: string;
}

export function AdvancedSettings({ userId, currentSessionId }: AdvancedSettingsProps) {
  const [activeTab, setActiveTab] = useState('ai');
  const [showShortcuts, setShowShortcuts] = useState(false);

  const tabs = [
    { id: 'ai', label: 'AI Models', icon: <Zap size={16} /> },
    { id: 'files', label: 'Private Files', icon: <FileText size={16} /> },
    { id: 'shortcuts', label: 'Shortcuts', icon: <Keyboard size={16} /> },
    { id: 'search', label: 'Search', icon: <Search size={16} /> },
    { id: 'performance', label: 'Performance', icon: <Activity size={16} /> },
    { id: 'export', label: 'Export', icon: <Download size={16} /> },
    { id: 'integrations', label: 'Integrations', icon: <Puzzle size={16} /> },
  ];

  const handleModelSwitch = async (modelId: string, options: any) => {
    console.log('Switching to model:', modelId, options);
    // Implementation would go here
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 p-4 border-b">
        <Settings size={20} />
        <h1 className="text-xl font-semibold">Advanced Settings</h1>
        <Badge variant="secondary">Power User</Badge>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Tab Navigation */}
        <div className="w-64 border-r bg-gray-50 p-4">
          <nav className="space-y-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors
                  ${activeTab === tab.id 
                    ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                    : 'hover:bg-gray-100 text-gray-700'
                  }
                `}
              >
                {tab.icon}
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'ai' && (
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">AI Model Configuration</h2>
              <ModelSwitcher
                currentSessionId={currentSessionId || ''}
                currentModel="claude-3-sonnet"
                onModelSwitch={handleModelSwitch}
              />
            </div>
          )}

          {activeTab === 'files' && (
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Private File Management</h2>
              <PrivateFileUpload userId={userId} />
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
                <Button onClick={() => setShowShortcuts(true)}>
                  View All Shortcuts
                </Button>
              </div>
              <Card className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Enable keyboard shortcuts</span>
                    <input type="checkbox" defaultChecked className="rounded" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Show shortcut hints</span>
                    <input type="checkbox" defaultChecked className="rounded" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Custom shortcut profiles</span>
                    <select className="border rounded px-2 py-1">
                      <option>Default</option>
                      <option>Vim-style</option>
                      <option>Custom</option>
                    </select>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'search' && (
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Search & Filtering</h2>
              <Card className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Global search enabled</span>
                    <input type="checkbox" defaultChecked className="rounded" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Search in chat history</span>
                    <input type="checkbox" defaultChecked className="rounded" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Search in file contents</span>
                    <input type="checkbox" defaultChecked className="rounded" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Search result limit</span>
                    <select className="border rounded px-2 py-1">
                      <option>10</option>
                      <option>25</option>
                      <option>50</option>
                      <option>100</option>
                    </select>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Performance Monitoring</h2>
              <div className="space-y-4">
                <Card className="p-4">
                  <h3 className="font-medium mb-3">Performance Profile</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="profile" value="conservative" defaultChecked />
                      <span>Conservative - Minimize resource usage</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="profile" value="balanced" />
                      <span>Balanced - Optimize for general use</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="profile" value="aggressive" />
                      <span>Aggressive - Maximum performance</span>
                    </label>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-medium mb-3">Monitoring Options</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked />
                      <span>Real-time performance monitoring</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" />
                      <span>Performance alerts</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" />
                      <span>Auto-optimization</span>
                    </label>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Export Templates</h2>
              <Card className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Auto-export sessions</span>
                    <input type="checkbox" className="rounded" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Default export format</span>
                    <select className="border rounded px-2 py-1">
                      <option>JSON</option>
                      <option>CSV</option>
                      <option>PDF</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Include metadata</span>
                    <input type="checkbox" defaultChecked className="rounded" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Batch export enabled</span>
                    <input type="checkbox" className="rounded" />
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">External Integrations</h2>
              <div className="space-y-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">PyMOL Integration</h3>
                      <p className="text-sm text-gray-600">Export structures to PyMOL</p>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">ChimeraX Integration</h3>
                      <p className="text-sm text-gray-600">Send structures to ChimeraX</p>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Jupyter Notebooks</h3>
                      <p className="text-sm text-gray-600">Export analysis to Jupyter</p>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>

      <KeyboardShortcutsHelp 
        isOpen={showShortcuts} 
        onClose={() => setShowShortcuts(false)} 
      />
    </div>
  );
}

export function AdvancedFeaturesProvider({ children }: { children: React.ReactNode }) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  React.useEffect(() => {
    const handleShortcut = (e: CustomEvent<{ action: string }>) => {
      if (e.detail.action === 'openCommandPalette') {
        setCommandPaletteOpen(true);
      }
    };

    document.addEventListener('shortcut-action', handleShortcut as EventListener);
    return () => document.removeEventListener('shortcut-action', handleShortcut as EventListener);
  }, []);

  return (
    <>
      {children}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </>
  );
}