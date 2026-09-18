import React, { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { openUrl } from '@tauri-apps/plugin-opener';
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';
import { FlyoutHeader } from './components/FlyoutHeader';
import { ConnectionTile } from './components/ConnectionTile';
import { ServerTile } from './components/ServerTile';
import { ActionTiles } from './components/ActionTiles';
import { InlineConfirmModal } from './components/InlineConfirmModal';
import { SettingsView } from './components/SettingsView';
import { DiagnosticsView } from './components/DiagnosticsView';
import { AppConfig, ServerStatusInfo, DiagnosticReport } from './types/config';
import { translations } from './i18n/translations';
import { ShieldCheck } from 'lucide-react';

const defaultConfig: AppConfig = {
  serverName: 'Home Server',
  hostname: 'ZimaOS',
  ipAddress: '192.168.0.110',
  macAddress: 'fc:aa:14:6a:4c:bb',
  broadcastAddress: '192.168.0.255',
  wolPort: 9,
  dashboardUrl: 'http://192.168.0.110',
  sshUser: 'vanhkhuc',
  sshPort: 22,
  sshKeyPath: 'C:\\Users\\khucv\\.ssh\\zima_remote',
  statusIntervalSeconds: 5,
  startWithWindows: true,
  minimizeToTray: true,
  language: 'vi',
  connectionMode: 'AUTO',
  remoteEnabled: false,
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
  const [confirmType, setConfirmType] = useState<'shutdown' | 'restart' | null>(null);
  const [viewState, setViewState] = useState<'main' | 'settings' | 'diagnostics'>('main');
  const [diagnosticReport, setDiagnosticReport] = useState<DiagnosticReport | null>(null);
  const [autostartEnabled, setAutostartEnabled] = useState<boolean>(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState<boolean>(false);

  const t = translations[config.language];
  const pollTimerRef = useRef<any>(null);
  const wakeTimerRef = useRef<any>(null);

  // Apply Theme attribute to HTML root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', config.theme || 'dark');
  }, [config.theme]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleSmoothClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      invoke('close_popup_window').catch(() => {});
    }, 150);
  }, []);

  const handleToggleTheme = () => {
    const nextTheme = config.theme === 'light' ? 'dark' : 'light';
    const updated = { ...config, theme: nextTheme as 'dark' | 'light' };
    setConfig(updated);
    invoke('save_config', { config: updated }).catch(() => {});
    showToast(nextTheme === 'light' ? 'Đã chuyển sang Chế độ Sáng (Light Mode)' : 'Đã chuyển sang Chế độ Tối (Dark Mode)');
  };

  // Synchronize Autostart plugin state
  useEffect(() => {
    const syncAutostart = async () => {
      try {
        const enabled = await isEnabled();
        setAutostartEnabled(enabled);
        if (!enabled && config.startWithWindows) {
          await enable();
          setAutostartEnabled(true);
        }
      } catch (e) {
        console.warn('Autostart check error', e);
      }
    };
    syncAutostart();
  }, [config.startWithWindows]);

  const handleToggleAutostart = async (shouldEnable?: boolean) => {
    const targetState = shouldEnable !== undefined ? shouldEnable : !autostartEnabled;
    try {
      if (targetState) {
        await enable();
        setAutostartEnabled(true);
        showToast('Đã bật khởi động cùng Windows!');
      } else {
        await disable();
        setAutostartEnabled(false);
        showToast('Đã tắt khởi động cùng Windows!');
      }
    } catch (e: any) {
      showToast(`Lỗi autostart: ${e?.toString() || e}`);
    }
  };

  // Load saved config
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const loaded: AppConfig = await invoke('get_config');
        if (loaded && loaded.ipAddress) {
          setConfig({
            ...loaded,
            theme: loaded.theme || 'dark',
          });
        }
      } catch (e) {
        console.warn('Load config failed', e);
      }
    };
    loadConfig();
  }, []);

  // Notify Rust backend that React frontend is fully mounted & ready
  useEffect(() => {
    invoke('mark_frontend_ready').catch(() => {});
  }, []);

  // Escape key handler to close window smoothly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSmoothClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSmoothClose]);

  // Listen to tray events
  useEffect(() => {
    const unlistens: Array<() => void> = [];

    listen('popup-opening', () => setIsExiting(false)).then((un) => unlistens.push(un));
    listen('open-settings', () => {
      setIsExiting(false);
      setViewState('settings');
    }).then((un) => unlistens.push(un));
    listen('open-diagnostics', () => {
      setIsExiting(false);
      setViewState('diagnostics');
    }).then((un) => unlistens.push(un));
    listen('tray-wake', () => handleWake()).then((un) => unlistens.push(un));
    listen('tray-dashboard', () => handleOpenDashboard()).then((un) => unlistens.push(un));
    listen('tray-check', () => checkStatusNow()).then((un) => unlistens.push(un));

    return () => {
      unlistens.forEach((un) => un());
    };
  }, []);

  // Primary Status Probe
  const checkStatusNow = useCallback(async () => {
    try {
      const res: { online: boolean; active_mode: string; latency_ms: number | null; uptime: string | null; error_message: string | null } =
        await invoke('check_server_status', {
          mode: config.connectionMode || 'AUTO',
          ip: config.ipAddress,
          sshUser: config.sshUser,
          sshPort: config.sshPort,
          sshKeyPath: config.sshKeyPath,
          agentUrl: config.agentUrl,
          zerotierIp: config.zerotierIp,
        });

      const now = new Date().toLocaleTimeString('vi-VN');

      setStatusInfo((prev) => {
        if (prev.state === 'WAKING_UP' && !res.online) return { ...prev, lastChecked: now };
        if (prev.state === 'SHUTTING_DOWN' && res.online) return { ...prev, lastChecked: now };

        return {
          state: res.online ? 'ONLINE' : 'OFFLINE',
          activeMode: (res.active_mode as any) || 'UNREACHABLE',
          latencyMs: res.latency_ms,
          lastChecked: now,
          uptime: res.online ? res.uptime : null,
          errorMessage: res.error_message || undefined,
        };
      });
    } catch (e) {
      const now = new Date().toLocaleTimeString('vi-VN');
      setStatusInfo((prev) => ({
        ...prev,
        state: 'OFFLINE',
        activeMode: 'UNREACHABLE',
        lastChecked: now,
        latencyMs: null,
        uptime: null,
      }));
    }
  }, [config]);

  // Polling loop
  useEffect(() => {
    checkStatusNow();
    const intervalMs = (config.statusIntervalSeconds || 5) * 1000;
    pollTimerRef.current = setInterval(checkStatusNow, intervalMs);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [checkStatusNow, config.statusIntervalSeconds]);

  // Save config
  const handleSaveConfig = async (newConfig: AppConfig) => {
    setConfig(newConfig);
    try {
      await invoke('save_config', { config: newConfig });
      showToast(t.settingsSaved);
    } catch (e: any) {
      showToast(`Lỗi lưu cấu hình: ${e?.toString() || e}`);
    }
  };

  // Diagnostics Runner
  const handleRunDiagnostics = async () => {
    try {
      const rep: DiagnosticReport = await invoke('run_diagnostics');
      setDiagnosticReport(rep);
      showToast('Đã chạy xong tự chẩn đoán!');
    } catch (e: any) {
      showToast(`Lỗi chẩn đoán: ${e?.toString() || e}`);
    }
  };

  // Actions (WAKE, SHUTDOWN, RESTART)
  const handleWake = async () => {
    setStatusInfo((prev) => ({ ...prev, state: 'WAKING_UP' }));

    if (statusInfo.activeMode === 'REMOTE' && config.agentUrl) {
      showToast('Đang gửi tín hiệu Bật Máy từ xa qua Orange Pi Agent (ZeroTier)...');
      try {
        await invoke('send_remote_wake', {
          agentUrl: config.agentUrl,
          token: config.agentToken,
          mac: config.macAddress,
        });
        showToast('Magic Packet đã được Orange Pi phát vào LAN thành công!');
      } catch (err: any) {
        setStatusInfo((prev) => ({ ...prev, state: 'ERROR' }));
        showToast(`Lỗi Remote WOL: ${err?.toString() || err}`);
        return;
      }
    } else {
      showToast(t.magicPacketSent);
      try {
        await invoke('send_wake_packet', {
          mac: config.macAddress,
          broadcastIp: config.broadcastAddress,
          port: config.wolPort,
        });
      } catch (err: any) {
        setStatusInfo((prev) => ({ ...prev, state: 'ERROR' }));
        showToast(`Lỗi WOL: ${err?.toString() || err}`);
        return;
      }
    }

    // Monitor for 90 seconds
    let elapsedSeconds = 0;
    if (wakeTimerRef.current) clearInterval(wakeTimerRef.current);

    wakeTimerRef.current = setInterval(async () => {
      elapsedSeconds += 2;
      try {
        const res: { online: boolean } = await invoke('check_server_status', {
          mode: config.connectionMode || 'AUTO',
          ip: config.ipAddress,
          sshUser: config.sshUser,
          sshPort: config.sshPort,
          sshKeyPath: config.sshKeyPath,
          agentUrl: config.agentUrl,
          zerotierIp: config.zerotierIp,
        });

        if (res.online) {
          if (wakeTimerRef.current) clearInterval(wakeTimerRef.current);
          setStatusInfo((prev) => ({ ...prev, state: 'ONLINE' }));
          showToast(t.serverNowOnline);
          checkStatusNow();
        } else if (elapsedSeconds >= 90) {
          if (wakeTimerRef.current) clearInterval(wakeTimerRef.current);
          setStatusInfo((prev) => ({ ...prev, state: 'OFFLINE' }));
          showToast(t.serverWakeTimeout);
        }
      } catch (e) {
        if (elapsedSeconds >= 90) {
          if (wakeTimerRef.current) clearInterval(wakeTimerRef.current);
          setStatusInfo((prev) => ({ ...prev, state: 'OFFLINE' }));
          showToast(t.serverWakeTimeout);
        }
      }
    }, 2000);
  };

  const handleShutdownConfirm = async () => {
    setConfirmType(null);

    let targetIp = config.ipAddress;
    if (statusInfo.activeMode === 'REMOTE') {
      if (!config.zerotierIp.trim()) {
        showToast('Chưa cấu hình địa chỉ ZeroTier của ZimaOS để Tắt Nguồn từ xa!');
        return;
      }
      targetIp = config.zerotierIp;
    }

    setStatusInfo((prev) => ({ ...prev, state: 'SHUTTING_DOWN' }));

    try {
      await invoke('execute_ssh_shutdown', {
        ip: targetIp,
        user: config.sshUser,
        port: config.sshPort,
        keyPath: config.sshKeyPath,
      });
      showToast(t.shutdownSent);
      setTimeout(checkStatusNow, 4000);
    } catch (err: any) {
      setStatusInfo((prev) => ({ ...prev, state: 'ERROR' }));
      showToast(`${t.sshError}${err?.toString() || err}`);
    }
  };

  const handleRestartConfirm = async () => {
    setConfirmType(null);

    let targetIp = config.ipAddress;
    if (statusInfo.activeMode === 'REMOTE') {
      if (!config.zerotierIp.trim()) {
        showToast('Chưa cấu hình địa chỉ ZeroTier của ZimaOS để Khởi Động Lại từ xa!');
        return;
      }
      targetIp = config.zerotierIp;
    }

    setStatusInfo((prev) => ({ ...prev, state: 'RESTARTING' }));

    try {
      await invoke('execute_ssh_reboot', {
        ip: targetIp,
        user: config.sshUser,
        port: config.sshPort,
        keyPath: config.sshKeyPath,
      });
      showToast(t.restartSent);
      setTimeout(checkStatusNow, 5000);
    } catch (err: any) {
      setStatusInfo((prev) => ({ ...prev, state: 'ERROR' }));
      showToast(`${t.sshError}${err?.toString() || err}`);
    }
  };

  const handleOpenDashboard = async () => {
    const url = statusInfo.activeMode === 'REMOTE' && config.zerotierIp
      ? `http://${config.zerotierIp}`
      : config.dashboardUrl || `http://${config.ipAddress}`;
    try {
      await invoke('open_external_url', { url });
    } catch (e) {
      try {
        await openUrl(url);
      } catch (err) {
        window.open(url, '_blank');
      }
    }
  };

  const handleOpenFiles = async () => {
    const baseUrl = statusInfo.activeMode === 'REMOTE' && config.zerotierIp
      ? `http://${config.zerotierIp}`
      : config.dashboardUrl || `http://${config.ipAddress}`;
    const filesUrl = `${baseUrl.replace(/\/$/, '')}/#/files`;
    try {
      await invoke('open_external_url', { url: filesUrl });
    } catch (e) {
      try {
        await openUrl(filesUrl);
      } catch (err) {
        window.open(filesUrl, '_blank');
      }
    }
  };

  const handleExitApp = async () => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.close();
    } catch (e) {
      console.error('Exit app failed', e);
    }
  };

  const handleTestConnection = async () => {
    try {
      const res: { online: boolean } = await invoke('check_server_status', {
        mode: config.connectionMode || 'AUTO',
        ip: config.ipAddress,
        sshUser: config.sshUser,
        sshPort: config.sshPort,
        sshKeyPath: config.sshKeyPath,
        agentUrl: config.agentUrl,
        zerotierIp: config.zerotierIp,
      });
      if (res.online) showToast(t.connectionSuccess);
      else showToast(t.connectionFailed);
    } catch (e: any) {
      showToast(`${t.connectionFailed}: ${e?.toString() || e}`);
    }
  };

  const handleTestWake = async () => {
    try {
      await invoke('send_wake_packet', {
        mac: config.macAddress,
        broadcastIp: config.broadcastAddress,
        port: config.wolPort,
      });
      showToast(t.magicPacketSent);
    } catch (e: any) {
      showToast(`Lỗi gửi WOL: ${e?.toString() || e}`);
    }
  };

  const handleTestAgent = async (agentUrl: string) => {
    try {
      const res: { status: string; agent: string; version: string } = await invoke('test_agent_connection', { agentUrl });
      showToast(`Kết nối Agent THÀNH CÔNG! (${res.agent} v${res.version})`);
    } catch (e: any) {
      showToast(`Lỗi kết nối Agent: ${e?.toString() || e}`);
    }
  };

  return (
    <div className={`app-shell ${isExiting ? 'flyout-anim-exit' : 'flyout-anim-enter'}`}>
      {viewState === 'settings' ? (
        <SettingsView
          config={config}
          language={config.language}
          autostartEnabled={autostartEnabled}
          onSave={handleSaveConfig}
          onBack={() => setViewState('main')}
          onTestConnection={handleTestConnection}
          onTestWakePacket={handleTestWake}
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
            onToggleAutostart={handleToggleAutostart}
            onExitApp={handleExitApp}
            onCloseWindow={handleSmoothClose}
          />

          <ConnectionTile
            ipAddress={config.ipAddress}
            state={statusInfo.state}
            activeMode={statusInfo.activeMode}
            latencyMs={statusInfo.latencyMs}
            onOpenDashboard={handleOpenDashboard}
          />

          <ServerTile config={config} statusInfo={statusInfo} onOpenFiles={handleOpenFiles} />

          <ActionTiles
            state={statusInfo.state}
            language={config.language}
            onWake={handleWake}
            onShutdown={() => setConfirmType('shutdown')}
            onRestart={() => setConfirmType('restart')}
          />

          <footer className="flyout-footer">
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--status-online)' }}>
              <ShieldCheck size={12} />
              <span>ZeroTier & LAN Secured</span>
            </div>
            <span style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>by VanhKhuc · v3.0.0</span>
          </footer>
        </>
      )}

      <InlineConfirmModal
        type={confirmType}
        language={config.language}
        onConfirm={confirmType === 'shutdown' ? handleShutdownConfirm : handleRestartConfirm}
        onCancel={() => setConfirmType(null)}
      />

      {toastMsg && <div className="toast-popup">{toastMsg}</div>}
    </div>
  );
};
