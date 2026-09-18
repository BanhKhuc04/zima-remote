import React from 'react';
import { ExternalLink } from 'lucide-react';
import { ServerState, ActiveMode } from '../types/config';

interface ConnectionTileProps {
  ipAddress: string;
  state: ServerState;
  activeMode: ActiveMode;
  latencyMs: number | null;
  onOpenDashboard: () => void;
}

const getStatusDotColor = (state: ServerState): string => {
  switch (state) {
    case 'ONLINE': return 'var(--status-online)';
    case 'WAKING_UP': return 'var(--status-busy)';
    case 'SHUTTING_DOWN': return 'var(--status-error)';
    case 'RESTARTING': return 'var(--status-busy)';
    case 'ERROR': return 'var(--status-error)';
    case 'CHECKING': return 'var(--status-busy)';
    default: return 'var(--status-offline)';
  }
};

const getModeBadgeClass = (mode: ActiveMode): string => {
  return `badge-mode ${mode}`;
};

const getModeLabel = (mode: ActiveMode): string => {
  switch (mode) {
    case 'LOCAL': return 'LOCAL';
    case 'REMOTE': return 'REMOTE';
    default: return 'UNREACHABLE';
  }
};

export const ConnectionTile: React.FC<ConnectionTileProps> = ({
  ipAddress,
  state,
  activeMode,
  latencyMs,
  onOpenDashboard,
}) => {
  const dotColor = getStatusDotColor(state);

  return (
    <div className="connection-tile">
      <div className="connection-header">
        <div className="connection-mode-wrap">
          <div
            className="status-dot-pulse"
            style={{ background: dotColor }}
          />
          <span>Ethernet</span>
          <span className={getModeBadgeClass(activeMode)}>
            {getModeLabel(activeMode)}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--muted)' }}>
          {state === 'ONLINE' && latencyMs !== null && (
            <span style={{ fontSize: '12px', color: 'var(--green)', fontWeight: 600 }}>
              {latencyMs} ms
            </span>
          )}
        </div>
      </div>

      <div className="connection-body">
        <span className="ip-address">{ipAddress}</span>
        <button
          className="btn-dashboard"
          onClick={onOpenDashboard}
          id="btn-go-dashboard"
        >
          <span>Mở</span>
          <ExternalLink size={12} />
        </button>
      </div>
    </div>
  );
};
