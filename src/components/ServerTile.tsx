import React from 'react';
import { Folder } from 'lucide-react';
import { ServerStatusInfo, AppConfig } from '../types/config';

interface ServerTileProps {
  config: AppConfig;
  statusInfo: ServerStatusInfo;
  onOpenFiles: () => void;
}

export const ServerTile: React.FC<ServerTileProps> = ({ config, statusInfo, onOpenFiles }) => {
  const isOnline = statusInfo.state === 'ONLINE';
  const statusLabel = isOnline
    ? 'Đang hoạt động'
    : statusInfo.state === 'WAKING_UP'
    ? 'Đang bật máy...'
    : statusInfo.state === 'SHUTTING_DOWN'
    ? 'Đang tắt...'
    : statusInfo.state === 'RESTARTING'
    ? 'Đang khởi động lại...'
    : 'Ngoại tuyến (Offline)';

  return (
    <div className="server-tile">
      <div className="server-info-group">
        <span className="server-name">{config.serverName}</span>
        <span className="server-sub">
          {config.hostname} · {statusLabel}
        </span>
        {isOnline && statusInfo.uptime && (
          <span style={{ fontSize: '11px', color: 'var(--subtle)', marginTop: '2px' }}>
            Uptime {statusInfo.uptime}
          </span>
        )}
      </div>

      <button
        className="folder-art-btn"
        onClick={onOpenFiles}
        title="Mở ZimaOS Files / Dashboard"
      >
        <Folder size={20} />
      </button>
    </div>
  );
};
