import React, { useCallback, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart';
import { FlyoutHeader } from './components/FlyoutHeader';
import { ConnectionTile } from './components/ConnectionTile';
import { ServerTile } from './components/ServerTile';
import { SettingsView } from './components/SettingsView';
import { DiagnosticsView } from './components/DiagnosticsView';
import { AppConfig, DiagnosticReport, ServerStatusInfo } from './types/config';
import { ShieldCheck } from 'lucide-react';

const defaultConfig: AppConfig = {
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
  agentUrl: '',
  agentToken: '',
  zerotierIp: '',
  theme: 'dark',
};

export const App: React.FC = () => {
  const [config, setConfig] = useState<AppConfig>(defaultConfig);
  const [statusInfo, setStatusInfo] = useState<ServerStatusInfo>({
    state: 'CHECKING',
    activeMode: 'UNREACHABLE',
    latencyMs: null,
    lastChecked: '',
    uptime: null,
  });
  const [viewState, setViewState] = useState<'main' | 'settings' | 'diagnostics'>('main');
  const [diagnosticReport, setDiagnosticReport] = useState<DiagnosticReport | null>(null);
  const [autostartEnabled, setAutostartEnabled] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = (message: string) => {
    setToastMsg(message);
    window.setTimeout(() => setToastMsg(null), 3200);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', config.theme || 'dark');
  }, [config.theme]);

  useEffect(() => {
    invoke('get_config')
      .then((loaded) => {
        if (loaded) setConfig({ ...defaultConfig, ...(loaded as AppConfig) });
      })
      .catch(() => {});
    invoke('mark_frontend_ready').catch(() => {});
  }, []);

  useEffect(() => {
    isEnabled()
      .then(setAutostartEnabled)
      .catch(() => {});
  }, []);

  const checkStatusNow = useCallback(async () => {
    try {
      const res = await invoke<any>('check_server_status', {
        mode: config.connectionMode || 'AUTO',
        ip: config.ipAddress,
        sshUser: config.sshUser,
        sshPort: config.sshPort,
        sshKeyPath: config.sshKeyPath,
        agentUrl: config.agentUrl,
        zerotierIp: config.zerotierIp,
      });

      setStatusInfo({
        state: res.online ? 'ONLINE' : 'OFFLINE',
        activeMode: res.active_mode || 'UNREACHABLE',
        latencyMs: res.latency_ms ?? null,
        lastChecked: new Date().toLocaleTimeString('vi-VN'),
        uptime: res.uptime ?? null,
        uptimeSeconds: res.uptime_seconds ?? null,
        hostname: res.hostname ?? null,
        cpuTempC: res.cpu_temp_c ?? null,
        load1: res.load_1 ?? null,
        memoryTotalMb: res.memory_total_mb ?? null,
        memoryUsedMb: res.memory_used_mb ?? null,
        diskTotalGb: res.disk_total_gb ?? null,
        diskUsedGb: res.disk_used_gb ?? null,
        ipAddresses: res.ip_addresses || [],
        errorMessage: res.error_message || undefined,
      });
    } catch (error: any) {
      setStatusInfo((previous) => ({
        ...previous,
        state: 'OFFLINE',
        activeMode: 'UNREACHABLE',
        latencyMs: null,
        lastChecked: new Date().toLocaleTimeString('vi-VN'),
        errorMessage: error?.toString?.() || String(error),
      }));
    }
  }, [config]);

  useEffect(() => {
    checkStatusNow();
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(
      checkStatusNow,
      Math.max(2, config.statusIntervalSeconds || 5) * 1000,
    );

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [checkStatusNow, config.statusIntervalSeconds]);

  useEffect(() => {
    const cleanup: Array<() => void> = [];

    listen('popup-opening', () => setIsExiting(false)).then((fn) => cleanup.push(fn));
    listen('open-settings', () => {
      setIsExiting(false);
      setViewState('settings');
    }).then((fn) => cleanup.push(fn));
    listen('open-diagnostics', () => {
      setIsExiting(false);
      setViewState('diagnostics');
    }).then((fn) => cleanup.push(fn));
    listen('tray-check', () => checkStatusNow()).then((fn) => cleanup.push(fn));

    return () => cleanup.forEach((fn) => fn());
  }, [checkStatusNow]);

  const handleSaveConfig = async (next: AppConfig) => {
    setConfig(next);
    try {
      await invoke('save_config', { config: next });
      showToast('Đã lưu cấu hình.');
    } catch (error: any) {
      showToast('Lỗi lưu cấu hình: ' + (error?.toString?.() || String(error)));
    }
  };

  const handleToggleAutostart = async (requested?: boolean) => {
    const next = requested === undefined ? !autostartEnabled : requested;
    try {
      if (next) await enable();
      else await disable();
      setAutostartEnabled(next);
    } catch (error: any) {
      showToast('Lỗi autostart: ' + (error?.toString?.() || String(error)));
    }
  };

  const handleToggleTheme = () => {
    const nextTheme = config.theme === 'light' ? 'dark' : 'light';
    const next = { ...config, theme: nextTheme as 'dark' | 'light' };
    setConfig(next);
    invoke('save_config', { config: next }).catch(() => {});
  };

  const handleRunDiagnostics = async () => {
    try {
      const report = await invoke<DiagnosticReport>('run_diagnostics');
      setDiagnosticReport(report);
    } catch (error: any) {
      showToast('Diagnostics error: ' + (error?.toString?.() || String(error)));
    }
  };

  const handleTestAgent = async (agentUrl: string) => {
    try {
      const result = await invoke<any>('test_agent_connection', { agentUrl });
      showToast('Agent online: ' + result.agent + ' v' + result.version);
    } catch (error: any) {
      showToast('Agent unavailable: ' + (error?.toString?.() || String(error)));
    }
  };

  const handleSmoothClose = useCallback(() => {
    setIsExiting(true);
    window.setTimeout(() => invoke('close_popup_window').catch(() => {}), 140);
  }, []);

  const handleExitApp = async () => {
    try {
      await getCurrentWindow().destroy();
    } catch {
      handleSmoothClose();
    }
  };

  return (
    <div className={'app-shell ' + (isExiting ? 'flyout-anim-exit' : 'flyout-anim-enter')}>
      {viewState === 'settings' ? (
        <SettingsView
          config={config}
          language={config.language}
          autostartEnabled={autostartEnabled}
          onSave={handleSaveConfig}
          onBack={() => setViewState('main')}
          onTestConnection={checkStatusNow}
          onToggleAutostart={handleToggleAutostart}
          onTestAgent={handleTestAgent}
        />
      ) : viewState === 'diagnostics' ? (
        <DiagnosticsView
          report={diagnosticReport}
          onRunDiagnostics={handleRunDiagnostics}
          onBack={() => setViewState('main')}
          onShowToast={showToast}
        />
      ) : (
        <>
          <FlyoutHeader
            language={config.language}
            autostartEnabled={autostartEnabled}
            theme={config.theme || 'dark'}
            onToggleTheme={handleToggleTheme}
            onOpenSettings={() => setViewState('settings')}
            onOpenDiagnostics={() => {
              setViewState('diagnostics');
              handleRunDiagnostics();
            }}
            onCheckStatus={checkStatusNow}
            onToggleAutostart={() => handleToggleAutostart()}
            onExitApp={handleExitApp}
            onCloseWindow={handleSmoothClose}
          />

          <ConnectionTile
            ipAddress={config.agentUrl || config.ipAddress}
            state={statusInfo.state}
            activeMode={statusInfo.activeMode}
            latencyMs={statusInfo.latencyMs}
          />

          <ServerTile config={config} statusInfo={statusInfo} />

          <div style={{ padding: '0 14px 8px', fontSize: '11px', color: 'var(--muted)' }}>
            Last check: {statusInfo.lastChecked || '-'}
          </div>

          <footer className="flyout-footer">
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--status-online)' }}>
              <ShieldCheck size={12} />
              <span>Status-only desktop client</span>
            </div>
            <span style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>v4.0.0</span>
          </footer>
        </>
      )}

      {toastMsg && <div className="toast-popup">{toastMsg}</div>}
    </div>
  );
};
