import React from 'react';
import { AppConfig, ServerStatusInfo, Language } from '../types/config';
import { translations } from '../i18n/translations';
import { Server, Wifi, Clock, Activity } from 'lucide-react';

interface ServerCardProps {
  config: AppConfig;
  statusInfo: ServerStatusInfo;
  language: Language;
}

export const ServerCard: React.FC<ServerCardProps> = ({ config, statusInfo, language }) => {
  const t = translations[language];

  return (
    <div className="server-card">
      <div className="info-item">
        <span className="info-label">{t.serverName}</span>
        <div className="info-value">
          <Server size={16} color="var(--accent-cyan)" />
          {config.serverName} ({config.hostname})
        </div>
      </div>

      <div className="info-item">
        <span className="info-label">{t.ipAddress}</span>
        <div className="info-value">
          <Wifi size={16} color="var(--accent-cyan)" />
          {config.ipAddress}
        </div>
      </div>

      <div className="info-item">
        <span className="info-label">{t.lastChecked}</span>
        <div className="info-value">
          <Clock size={16} color="var(--text-muted)" />
          {statusInfo.lastChecked || '--:--:--'}
        </div>
      </div>

      <div className="info-item">
        <span className="info-label">{t.uptime}</span>
        <div className="info-value">
          <Activity size={16} color="var(--status-online)" />
          {statusInfo.uptime || 'N/A'}
        </div>
      </div>
    </div>
  );
};
