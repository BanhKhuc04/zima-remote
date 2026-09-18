import React, { useState } from 'react';
import { Settings as SettingsIcon, X, Check, Activity, Zap } from 'lucide-react';
import { AppConfig, Language, ValidationErrors } from '../types/config';
import { translations } from '../i18n/translations';

interface SettingsModalProps {
  isOpen: boolean;
  config: AppConfig;
  language: Language;
  onSave: (newConfig: AppConfig) => void;
  onClose: () => void;
  onTestConnection: () => void;
  onTestWakePacket: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  config,
  language,
  onSave,
  onClose,
  onTestConnection,
  onTestWakePacket,
}) => {
  if (!isOpen) return null;

  const [formData, setFormData] = useState<AppConfig>({ ...config });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const t = translations[formData.language || language];

  const validate = (): boolean => {
    const errs: ValidationErrors = {};
    
    // IPv4 validation
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(formData.ipAddress)) {
      errs.ipAddress = 'IPv4 không hợp lệ (ví dụ: 192.168.0.110)';
    }

    // MAC validation
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    if (!macRegex.test(formData.macAddress)) {
      errs.macAddress = 'Địa chỉ MAC không hợp lệ (ví dụ: fc:aa:14:6a:4c:bb)';
    }

    // Ports
    if (formData.wolPort < 1 || formData.wolPort > 65535) {
      errs.wolPort = 'Port từ 1-65535';
    }
    if (formData.sshPort < 1 || formData.sshPort > 65535) {
      errs.sshPort = 'Port từ 1-65535';
    }

    // SSH key path non-empty check
    if (!formData.sshKeyPath.trim()) {
      errs.sshKeyPath = 'Đường dẫn SSH key không được để trống';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave(formData);
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '640px' }}>
        <div className="modal-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <SettingsIcon size={22} color="var(--accent-cyan)" />
            <span>{t.btnSettings}</span>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="settings-grid">
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
            <label className="form-label">{t.hostname}</label>
            <input
              type="text"
              className="form-input"
              value={formData.hostname}
              onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t.ipAddress}</label>
            <input
              type="text"
              className={`form-input ${errors.ipAddress ? 'error' : ''}`}
              value={formData.ipAddress}
              onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
            />
            {errors.ipAddress && <span className="error-text">{errors.ipAddress}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">{t.macAddress}</label>
            <input
              type="text"
              className={`form-input ${errors.macAddress ? 'error' : ''}`}
              value={formData.macAddress}
              onChange={(e) => setFormData({ ...formData, macAddress: e.target.value })}
            />
            {errors.macAddress && <span className="error-text">{errors.macAddress}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">{t.broadcastAddress}</label>
            <input
              type="text"
              className="form-input"
              value={formData.broadcastAddress}
              onChange={(e) => setFormData({ ...formData, broadcastAddress: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t.wolPort}</label>
            <input
              type="number"
              className={`form-input ${errors.wolPort ? 'error' : ''}`}
              value={formData.wolPort}
              onChange={(e) => setFormData({ ...formData, wolPort: parseInt(e.target.value) || 9 })}
            />
            {errors.wolPort && <span className="error-text">{errors.wolPort}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">{t.sshUser}</label>
            <input
              type="text"
              className="form-input"
              value={formData.sshUser}
              onChange={(e) => setFormData({ ...formData, sshUser: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t.sshPort}</label>
            <input
              type="number"
              className={`form-input ${errors.sshPort ? 'error' : ''}`}
              value={formData.sshPort}
              onChange={(e) => setFormData({ ...formData, sshPort: parseInt(e.target.value) || 22 })}
            />
            {errors.sshPort && <span className="error-text">{errors.sshPort}</span>}
          </div>

          <div className="form-group full-width">
            <label className="form-label">{t.sshKeyPath}</label>
            <input
              type="text"
              className={`form-input ${errors.sshKeyPath ? 'error' : ''}`}
              value={formData.sshKeyPath}
              onChange={(e) => setFormData({ ...formData, sshKeyPath: e.target.value })}
            />
            {errors.sshKeyPath && <span className="error-text">{errors.sshKeyPath}</span>}
          </div>

          <div className="form-group full-width">
            <label className="form-label">{t.dashboardUrl}</label>
            <input
              type="text"
              className="form-input"
              value={formData.dashboardUrl}
              onChange={(e) => setFormData({ ...formData, dashboardUrl: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t.statusInterval}</label>
            <input
              type="number"
              className="form-input"
              value={formData.statusIntervalSeconds}
              onChange={(e) => setFormData({ ...formData, statusIntervalSeconds: Math.max(1, parseInt(e.target.value) || 5) })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t.language}</label>
            <select
              className="form-select"
              value={formData.language}
              onChange={(e) => setFormData({ ...formData, language: e.target.value as Language })}
            >
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="form-group full-width">
            <label className="checkbox-group">
              <input
                type="checkbox"
                checked={formData.minimizeToTray}
                onChange={(e) => setFormData({ ...formData, minimizeToTray: e.target.checked })}
              />
              <span className="form-label" style={{ margin: 0 }}>{t.minimizeToTray}</span>
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={onTestConnection}>
            <Activity size={15} />
            <span>{t.btnTestConnection}</span>
          </button>

          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={onTestWakePacket}>
            <Zap size={15} />
            <span>{t.btnTestWake}</span>
          </button>
        </div>

        <div className="modal-actions" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
          <button className="btn-secondary" onClick={onClose}>{t.btnCancel}</button>
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={handleSave}>
            <Check size={16} />
            <span>{t.btnSave}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
