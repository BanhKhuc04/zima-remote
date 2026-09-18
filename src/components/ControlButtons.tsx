import React from 'react';
import { Zap, Power, RefreshCw, ExternalLink } from 'lucide-react';
import { ServerState, Language } from '../types/config';
import { translations } from '../i18n/translations';

interface ControlButtonsProps {
  state: ServerState;
  language: Language;
  onWake: () => void;
  onShutdown: () => void;
  onRestart: () => void;
  onOpenDashboard: () => void;
}

export const ControlButtons: React.FC<ControlButtonsProps> = ({
  state,
  language,
  onWake,
  onShutdown,
  onRestart,
  onOpenDashboard,
}) => {
  const t = translations[language];

  const isBusy = state === 'CHECKING' || state === 'WAKING_UP' || state === 'SHUTTING_DOWN' || state === 'RESTARTING';
  const isOnline = state === 'ONLINE';
  const isOffline = state === 'OFFLINE' || state === 'ERROR';

  return (
    <>
      <div className="controls-grid">
        <button
          className="action-btn wake"
          disabled={!isOffline || isBusy}
          onClick={onWake}
          id="btn-wake-ol"
        >
          <Zap size={22} />
          <span>{t.btnWake}</span>
        </button>

        <button
          className="action-btn shutdown"
          disabled={!isOnline || isBusy}
          onClick={onShutdown}
          id="btn-poweroff"
        >
          <Power size={22} />
          <span>{t.btnShutdown}</span>
        </button>

        <button
          className="action-btn restart"
          disabled={!isOnline || isBusy}
          onClick={onRestart}
          id="btn-reboot"
        >
          <RefreshCw size={22} />
          <span>{t.btnRestart}</span>
        </button>
      </div>

      <div className="dashboard-btn-container">
        <button 
          className="dashboard-btn" 
          onClick={onOpenDashboard}
          id="btn-open-dashboard"
        >
          <ExternalLink size={16} />
          <span>{t.btnOpenDashboard}</span>
        </button>
      </div>
    </>
  );
};
