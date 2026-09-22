import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConnectionTile } from './components/ConnectionTile';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FlyoutHeader } from './components/FlyoutHeader';
import { ServerTile } from './components/ServerTile';
import { AppConfig, ServerStatusInfo } from './types/config';

const config: AppConfig = {
  serverName: 'Home Linux Server',
  hostname: 'linux-server',
  ipAddress: '192.168.1.50',
  macAddress: '',
  broadcastAddress: '',
  wolPort: 9,
  dashboardUrl: '',
  sshUser: '',
  sshPort: 22,
  sshKeyPath: '',
  statusIntervalSeconds: 5,
  startWithWindows: true,
  minimizeToTray: true,
  language: 'vi',
  connectionMode: 'AUTO',
  remoteEnabled: true,
  agentUrl: 'http://100.80.12.34:8090',
  agentToken: '',
  zerotierIp: '',
  theme: 'dark',
};

describe('Zima Remote v4 status-only UI', () => {
  it('renders connection status and latency without power controls', () => {
    render(
      <ConnectionTile
        ipAddress="http://100.80.12.34:8090"
        state="ONLINE"
        activeMode="REMOTE"
        latencyMs={12}
      />
    );

    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('TAILSCALE / AGENT')).toBeInTheDocument();
    expect(screen.getByText('12 ms')).toBeInTheDocument();
    expect(screen.queryByText('Bật máy')).not.toBeInTheDocument();
    expect(screen.queryByText('Tắt nguồn')).not.toBeInTheDocument();
  });

  it('renders Linux telemetry', () => {
    const status: ServerStatusInfo = {
      state: 'ONLINE',
      activeMode: 'REMOTE',
      latencyMs: 8,
      lastChecked: '12:00:00',
      uptime: '1d 2h 3m',
      hostname: 'code-server',
      cpuTempC: 51.5,
      load1: 0.42,
      memoryTotalMb: 8192,
      memoryUsedMb: 4096,
      diskTotalGb: 256,
      diskUsedGb: 100,
    };

    render(<ServerTile config={config} statusInfo={status} />);

    expect(screen.getByText('code-server · Online')).toBeInTheDocument();
    expect(screen.getByText('51.5 °C')).toBeInTheDocument();
    expect(screen.getByText(/4096\/8192 MB/)).toBeInTheDocument();
  });

  it('renders the v4 header', () => {
    render(
      <FlyoutHeader
        language="vi"
        autostartEnabled={true}
        theme="dark"
        onToggleTheme={() => {}}
        onOpenSettings={() => {}}
        onOpenDiagnostics={() => {}}
        onCheckStatus={() => {}}
        onToggleAutostart={() => {}}
        onExitApp={() => {}}
        onCloseWindow={() => {}}
      />
    );

    expect(screen.getByText('Zima Remote')).toBeInTheDocument();
    expect(screen.getByText('by VanhKhuc · v4.0.0')).toBeInTheDocument();
  });

  it('renders ErrorBoundary screen when a component throws', () => {
    const ProblematicComponent = () => {
      throw new Error('Test crash event');
    };

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ProblematicComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Ứng dụng đã gặp lỗi giao diện')).toBeInTheDocument();
    spy.mockRestore();
  });
});
