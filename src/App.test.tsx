import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ModeBadge } from './components/ModeBadge';
import { ConnectionTile } from './components/ConnectionTile';
import { FlyoutHeader } from './components/FlyoutHeader';
import { ActionTiles } from './components/ActionTiles';
import { ErrorBoundary } from './components/ErrorBoundary';

describe('Zima Remote 3.0.0 Component & Integration Unit Tests', () => {
  it('renders mode badge correctly for LOCAL mode', () => {
    render(<ModeBadge mode="LOCAL" />);
    expect(screen.getByText('LOCAL')).toBeInTheDocument();
  });

  it('renders mode badge correctly for REMOTE mode', () => {
    render(<ModeBadge mode="REMOTE" />);
    expect(screen.getByText('REMOTE VIA ORANGE PI')).toBeInTheDocument();
  });

  it('renders connection tile with IP address and latency', () => {
    render(
      <ConnectionTile
        ipAddress="192.168.0.110"
        state="ONLINE"
        activeMode="LOCAL"
        latencyMs={5}
        onOpenDashboard={() => {}}
      />
    );
    expect(screen.getByText('192.168.0.110')).toBeInTheDocument();
    expect(screen.getByText('LOCAL')).toBeInTheDocument();
    expect(screen.getByText('5 ms')).toBeInTheDocument();
  });

  it('renders flyout header title Zima Remote and version v3.0.0', () => {
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
    expect(screen.getByText('by VanhKhuc · v3.0.0')).toBeInTheDocument();
  });

  it('renders action tiles correctly', () => {
    render(
      <ActionTiles
        state="ONLINE"
        language="vi"
        onWake={() => {}}
        onShutdown={() => {}}
        onRestart={() => {}}
      />
    );
    expect(screen.getByText('Bật máy')).toBeInTheDocument();
    expect(screen.getByText('Tắt nguồn')).toBeInTheDocument();
    expect(screen.getByText('Khởi động lại')).toBeInTheDocument();
  });

  it('renders ErrorBoundary screen when a component throws', () => {
    const ProblematicComponent = () => {
      throw new Error('Test crash event');
    };

    // Suppress error console output for expected throw
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ProblematicComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Ứng dụng đã gặp lỗi giao diện')).toBeInTheDocument();
    expect(screen.getByText('Copy Error')).toBeInTheDocument();
    expect(screen.getByText('Restart App')).toBeInTheDocument();

    spy.mockRestore();
  });
});
