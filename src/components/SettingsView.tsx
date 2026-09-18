import React, { useState } from 'react';
import { ArrowLeft, Check, Activity, Zap, Server } from 'lucide-react';
import { AppConfig, Language, ValidationErrors, ConnectionMode } from '../types/config';
import { translations } from '../i18n/translations';

interface SettingsViewProps {
  config: AppConfig;
  language: Language;
  autostartEnabled: boolean;
  onSave: (newConfig: AppConfig) => void;
  onBack: () => void;
  onTestConnection: () => void;
  onTestWakePacket: () => void;
  onToggleAutostart: (enable: boolean) => void;
  onTestAgent: (agentUrl: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  language,
  autostartEnabled,
  onSave,
  onBack,
  onTestConnection,
  onTestWakePacket,
  onToggleAutostart,
  onTestAgent,
}) => {
  const [formData, setFormData] = useState<AppConfig>({ ...config });
  const [autostart, setAutostart] = useState<boolean>(autostartEnabled);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const t = translations[formData.language || language];

  const validate = (): boolean => {
    const errs: ValidationErrors = {};
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(formData.ipAddress)) {
      errs.ipAddress = 'IPv4 không hợp lệ (ví dụ: 192.168.0.110)';
    }

    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    if (!macRegex.test(formData.macAddress)) {
      errs.macAddress = 'MAC không hợp lệ (fc:aa:14:6a:4c:bb)';
    }

    if (!formData.sshKeyPath.trim()) {
      errs.sshKeyPath = 'Đường dẫn SSH key không được trống';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onToggleAutostart(autostart);
      onSave({ ...formData, startWithWindows: autostart });
      onBack();
    }
  };

  return (
    <div className="settings-view" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="subview-header">
        <button className="btn-back" onClick={onBack} title="Quay lại">
          <ArrowLeft size={16} />
        </button>
        <span>{t.btnSettings}</span>
      </div>

      <div className="scrollable-settings-body">
        <div className="form-group">
          <label className="form-label">{t.serverName}</label>
          <input
            type="text"
            className="form-input"
            value={formData.serverName}
            onChange={(e) => setFormData({ ...formData, serverName: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Giao diện (Theme UI)</label>
          <select
            className="form-select"
            value={formData.theme || 'dark'}
            onChange={(e) => setFormData({ ...formData, theme: e.target.value as 'dark' | 'light' })}
          >
            <option value="dark">🌙 Chế độ Tối (Dark Luxury Mode)</option>
            <option value="light">☀️ Chế độ Sáng (Light Pearl Mode)</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Chế độ kết nối (Connection Mode)</label>
          <select
            className="form-select"
            value={formData.connectionMode}
            onChange={(e) => setFormData({ ...formData, connectionMode: e.target.value as ConnectionMode })}
          >
            <option value="AUTO">AUTO (Ưu tiên LAN local, tự chuyển Remote)</option>
            <option value="LOCAL">LOCAL (Chỉ dùng mạng LAN nội bộ)</option>
            <option value="REMOTE">REMOTE (Chỉ dùng ZeroTier qua Orange Pi)</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">{t.ipAddress}</label>
          <input
            type="text"
            className={`form-input ${errors.ipAddress ? 'error' : ''}`}
            value={formData.ipAddress}
            onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
          />
          {errors.ipAddress && <span style={{ color: 'var(--status-error)', fontSize: '0.72rem' }}>{errors.ipAddress}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">{t.macAddress}</label>
          <input
            type="text"
            className={`form-input ${errors.macAddress ? 'error' : ''}`}
            value={formData.macAddress}
            onChange={(e) => setFormData({ ...formData, macAddress: e.target.value })}
          />
          {errors.macAddress && <span style={{ color: 'var(--status-error)', fontSize: '0.72rem' }}>{errors.macAddress}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">{t.sshKeyPath}</label>
          <input
            type="text"
            className={`form-input ${errors.sshKeyPath ? 'error' : ''}`}
            value={formData.sshKeyPath}
            onChange={(e) => setFormData({ ...formData, sshKeyPath: e.target.value })}
          />
        </div>

        {/* Remote Access Section */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '6px' }}>
          <span className="settings-section-title">
            REMOTE ACCESS (ZeroTier & Orange Pi Agent)
          </span>

          <div className="form-group" style={{ marginTop: '8px' }}>
            <label className="form-label">Orange Pi Agent URL (ZeroTier IP:Port)</label>
            <input
              type="text"
              className="form-input"
              placeholder="http://10.42.151.133:8090"
              value={formData.agentUrl}
              onChange={(e) => setFormData({ ...formData, agentUrl: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Agent Bearer Auth Token</label>
            <input
              type="password"
              className="form-input"
              placeholder="Nhập token bảo mật từ Orange Pi"
              value={formData.agentToken}
              onChange={(e) => setFormData({ ...formData, agentToken: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">ZimaOS ZeroTier IP (để Remote Shutdown/SSH)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ví dụ: 10.42.151.110"
              value={formData.zerotierIp}
              onChange={(e) => setFormData({ ...formData, zerotierIp: e.target.value })}
            />
          </div>

          <button
            type="button"
            className="form-input"
            style={{ marginTop: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'var(--bg-hover)', fontWeight: 600 }}
            onClick={() => onTestAgent(formData.agentUrl)}
          >
            <Server size={14} />
            <span>Test Kết Nối Orange Pi Agent</span>
          </button>
        </div>

        <div className="form-group" style={{ marginTop: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem' }}>
            <input
              type="checkbox"
              checked={autostart}
              onChange={(e) => setAutostart(e.target.checked)}
            />
            <span>{t.startWithWindows}</span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button className="form-input" style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }} onClick={onTestConnection}>
            <Activity size={14} />
            <span>Test LAN</span>
          </button>
          <button className="form-input" style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }} onClick={onTestWakePacket}>
            <Zap size={14} />
            <span>Test WOL</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', marginBottom: '8px' }}>
          <button className="form-input" style={{ flex: 1, cursor: 'pointer' }} onClick={onBack}>
            {t.btnCancel}
          </button>
          <button className="btn-dashboard" style={{ flex: 1, justifyContent: 'center' }} onClick={handleSave}>
            <Check size={15} />
            <span>{t.btnSave}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
