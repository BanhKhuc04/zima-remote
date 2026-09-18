import React from 'react';
import { Power, Loader2, AlertTriangle } from 'lucide-react';
import { ServerState, Language } from '../types/config';
import { translations } from '../i18n/translations';

interface StatusRingProps {
  state: ServerState;
  latencyMs: number | null;
  language: Language;
  onRefresh: () => void;
}

export const StatusRing: React.FC<StatusRingProps> = ({
  state,
  latencyMs,
  language,
  onRefresh
}) => {
  const t = translations[language];

  const getStatusLabel = () => {
    switch (state) {
      case 'ONLINE': return t.stateOnline;
      case 'OFFLINE': return t.stateOffline;
      case 'CHECKING': return t.stateChecking;
      case 'WAKING_UP': return t.stateWakingUp;
      case 'SHUTTING_DOWN': return t.stateShuttingDown;
      case 'RESTARTING': return t.stateRestarting;
      case 'ERROR': return t.stateError;
    }
  };

  const renderIcon = () => {
    switch (state) {
      case 'CHECKING':
      case 'WAKING_UP':
      case 'RESTARTING':
      case 'SHUTTING_DOWN':
        return <Loader2 className="power-icon spin" size={64} />;
      case 'ERROR':
        return <AlertTriangle className="power-icon" size={64} />;
      default:
        return <Power className="power-icon" size={64} />;
    }
  };

  return (
    <div className="status-ring-container">
      <div 
        className={`power-ring ${state}`}
        onClick={onRefresh}
        title="Click to refresh status"
      >
        {renderIcon()}
        {state === 'ONLINE' && latencyMs !== null && (
          <span style={{ fontSize: '12px', color: 'var(--status-online)', marginTop: '8px', fontWeight: 600 }}>
            {latencyMs} ms
          </span>
        )}
      </div>

      <div className={`ring-status-label ${state}`}>
        {getStatusLabel()}
      </div>
    </div>
  );
};
