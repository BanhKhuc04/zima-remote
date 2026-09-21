import React from 'react';
import { AppConfig, ServerStatusInfo } from '../types/config';

interface ServerTileProps {
  config: AppConfig;
  statusInfo: ServerStatusInfo;
}

const metric = (label: string, value: string) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '11px', padding: '2px 0' }}>
    <span style={{ color: 'var(--muted)' }}>{label}</span>
    <span style={{ color: 'var(--text)', fontWeight: 600 }}>{value}</span>
  </div>
);

export const ServerTile: React.FC<ServerTileProps> = ({ config, statusInfo }) => {
  const isOnline = statusInfo.state === 'ONLINE';
  const ram = statusInfo.memoryTotalMb
    ? Math.round(((statusInfo.memoryUsedMb || 0) / statusInfo.memoryTotalMb) * 100)
    : null;
  const disk = statusInfo.diskTotalGb
    ? Math.round(((statusInfo.diskUsedGb || 0) / statusInfo.diskTotalGb) * 100)
    : null;

  return (
    <div className="server-tile" style={{ alignItems: 'stretch' }}>
      <div className="server-info-group" style={{ width: '100%' }}>
        <span className="server-name">{config.serverName}</span>
        <span className="server-sub">
          {statusInfo.hostname || config.hostname} · {isOnline ? 'Online' : 'Offline'}
        </span>

        {isOnline && (
          <div style={{ marginTop: '8px', width: '100%' }}>
            {metric('Uptime', statusInfo.uptime || '-')}
            {metric('CPU temperature', statusInfo.cpuTempC != null ? statusInfo.cpuTempC.toFixed(1) + ' °C' : '-')}
            {metric('Load (1m)', statusInfo.load1 != null ? statusInfo.load1.toFixed(2) : '-')}
            {metric('RAM', ram != null ? ram + '% (' + (statusInfo.memoryUsedMb || 0) + '/' + statusInfo.memoryTotalMb + ' MB)' : '-')}
            {metric('Disk', disk != null ? disk + '% (' + (statusInfo.diskUsedGb || 0).toFixed(1) + '/' + (statusInfo.diskTotalGb || 0).toFixed(1) + ' GB)' : '-')}
          </div>
        )}

        {!isOnline && statusInfo.errorMessage && (
          <span style={{ fontSize: '11px', color: 'var(--status-error)', marginTop: '6px' }}>
            {statusInfo.errorMessage}
          </span>
        )}
      </div>
    </div>
  );
};
