import React from 'react';
import { ActiveMode, ServerState } from '../types/config';

interface ConnectionTileProps {
  ipAddress: string;
  state: ServerState;
  activeMode: ActiveMode;
  latencyMs: number | null;
}

const getStatusDotColor = (state: ServerState): string => {
  switch (state) {
    case 'ONLINE': return 'var(--status-online)';
    case 'ERROR': return 'var(--status-error)';
    case 'CHECKING': return 'var(--status-busy)';
    default: return 'var(--status-offline)';
  }
};

const getModeLabel = (mode: ActiveMode): string => {
  switch (mode) {
    case 'LOCAL': return 'LAN';
    case 'REMOTE': return 'TAILSCALE / AGENT';
    default: return 'NO CONNECTION';
  }
};

export const ConnectionTile: React.FC<ConnectionTileProps> = ({
  ipAddress,
  state,
  activeMode,
  latencyMs,
}) => {
  const online = state === 'ONLINE';

  return (
    <div className="connection-tile">
      <div className="connection-header">
        <div className="connection-mode-wrap">
          <div className="status-dot-pulse" style={{ background: getStatusDotColor(state) }} />
          <span>{online ? 'Connected' : state === 'CHECKING' ? 'Checking...' : 'Disconnected'}</span>
          <span className={'badge-mode ' + activeMode}>{getModeLabel(activeMode)}</span>
        </div>

        {online && latencyMs !== null && (
          <span style={{ fontSize: '12px', color: 'var(--green)', fontWeight: 600 }}>
            {latencyMs} ms
          </span>
        )}
      </div>

      <div className="connection-body">
        <span className="ip-address">{ipAddress}</span>
        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Status only</span>
      </div>
    </div>
  );
};
