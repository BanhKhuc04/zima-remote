import React from 'react';
import { Zap, Power, RotateCw, Loader2 } from 'lucide-react';
import { ServerState, Language } from '../types/config';

interface ActionTilesProps {
  state: ServerState;
  language: Language;
  onWake: () => void;
  onShutdown: () => void;
  onRestart: () => void;
}

export const ActionTiles: React.FC<ActionTilesProps> = ({
  state,
  language: _language,
  onWake,
  onShutdown,
  onRestart,
}) => {
  const isBusy = state === 'CHECKING' || state === 'WAKING_UP' || state === 'SHUTTING_DOWN' || state === 'RESTARTING';
  const isOnline = state === 'ONLINE';
  const isOffline = state === 'OFFLINE' || state === 'ERROR';

  return (
    <div className="actions-container">
      <button
        className="action-tile-large"
        disabled={!isOffline || isBusy}
        onClick={onWake}
        id="tile-wake"
      >
        <div className="action-title-group">
          <div className="icon-box">
            {state === 'WAKING_UP' ? <Loader2 size={18} className="spin" /> : <Zap size={18} />}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span className="title-text">
              {state === 'WAKING_UP' ? 'Đang bật máy...' : 'Bật máy'}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Wake-on-LAN</span>
          </div>
        </div>
        <span className="action-sub-badge">
          {isOffline ? 'Sẵn sàng' : isOnline ? 'Máy đang bật' : 'Đang xử lý'}
        </span>
      </button>

      <div className="action-grid-two">
        <button
          className="action-card-small shutdown"
          disabled={!isOnline || isBusy}
          onClick={onShutdown}
          id="tile-shutdown"
        >
          <div className="small-icon-box">
            {state === 'SHUTTING_DOWN' ? <Loader2 size={18} className="spin" /> : <Power size={18} />}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span>
              {state === 'SHUTTING_DOWN' ? 'Đang tắt...' : 'Tắt nguồn'}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 400 }}>Tắt an toàn</span>
          </div>
        </button>

        <button
          className="action-card-small restart"
          disabled={!isOnline || isBusy}
          onClick={onRestart}
          id="tile-restart"
        >
          <div className="small-icon-box">
            {state === 'RESTARTING' ? <Loader2 size={18} className="spin" /> : <RotateCw size={18} />}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span>
              {state === 'RESTARTING' ? 'Đang khởi động...' : 'Khởi động lại'}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 400 }}>Reboot</span>
          </div>
        </button>
      </div>
    </div>
  );
};
