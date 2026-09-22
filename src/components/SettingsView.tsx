import React, { useState } from 'react';
import { ArrowLeft, Check, Activity } from 'lucide-react';
import { AppConfig, Language, ConnectionMode } from '../types/config';

interface SettingsViewProps {
  config: AppConfig;
  language: Language;
  autostartEnabled: boolean;
  onSave: (newConfig: AppConfig) => void;
  onBack: () => void;
  onTestConnection: () => void;
  onToggleAutostart: (enable: boolean) => void;
  onTestAgent: (agentUrl: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  autostartEnabled,
  onSave,
  onBack,
  onTestConnection,
  onToggleAutostart,
  onTestAgent,
}) => {
  const [formData, setFormData] = useState<AppConfig>({ ...config });
  const [autostart, setAutostart] = useState(autostartEnabled);

  const save = () => {
    onToggleAutostart(autostart);
    onSave({ ...formData, startWithWindows: autostart });
    onBack();
  };

  return (
    <div className="settings-view" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="subview-header">
        <button className="btn-back" onClick={onBack}><ArrowLeft size={16} /></button>
        <span>Status connection settings</span>
      </div>

      <div className="scrollable-settings-body">
        <div className="form-group">
          <label className="form-label">Server name</label>
          <input className="form-input" value={formData.serverName}
            onChange={(e) => setFormData({ ...formData, serverName: e.target.value })} />
        </div>

        <div className="form-group">
          <label className="form-label">LAN IP</label>
          <input className="form-input" value={formData.ipAddress}
            onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })} />
        </div>

        <div className="form-group">
          <label className="form-label">Connection mode</label>
          <select className="form-select" value={formData.connectionMode}
            onChange={(e) => setFormData({ ...formData, connectionMode: e.target.value as ConnectionMode })}>
            <option value="AUTO">AUTO (Agent first, LAN fallback)</option>
            <option value="REMOTE">TAILSCALE / AGENT</option>
            <option value="LOCAL">LAN only</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Linux Agent URL</label>
          <input className="form-input" placeholder="http://100.x.y.z:8090" value={formData.agentUrl}
            onChange={(e) => setFormData({ ...formData, agentUrl: e.target.value })} />
        </div>

        <div className="form-group">
          <label className="form-label">Refresh interval (seconds)</label>
          <input className="form-input" type="number" min={2} max={120} value={formData.statusIntervalSeconds}
            onChange={(e) => setFormData({ ...formData, statusIntervalSeconds: Number(e.target.value) || 5 })} />
        </div>

        <div className="form-group">
          <label className="form-label">Theme</label>
          <select className="form-select" value={formData.theme || 'dark'}
            onChange={(e) => setFormData({ ...formData, theme: e.target.value as 'dark' | 'light' })}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
          <input type="checkbox" checked={autostart} onChange={(e) => setAutostart(e.target.checked)} />
          Start with Windows
        </label>

        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button className="form-input" style={{ flex: 1, cursor: 'pointer' }} onClick={onTestConnection}>
            <Activity size={14} /> Test status
          </button>
          <button className="form-input" style={{ flex: 1, cursor: 'pointer' }} onClick={() => onTestAgent(formData.agentUrl)}>
            Test agent
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
          <button className="form-input" style={{ flex: 1, cursor: 'pointer' }} onClick={onBack}>Cancel</button>
          <button className="btn-dashboard" style={{ flex: 1, justifyContent: 'center' }} onClick={save}>
            <Check size={15} /> Save
          </button>
        </div>
      </div>
    </div>
  );
};
