export type ServerState = 
  | 'ONLINE' 
  | 'OFFLINE' 
  | 'CHECKING' 
  | 'WAKING_UP' 
  | 'SHUTTING_DOWN' 
  | 'RESTARTING' 
  | 'ERROR';

export type ConnectionMode = 'AUTO' | 'LOCAL' | 'REMOTE';
export type ActiveMode = 'LOCAL' | 'REMOTE' | 'UNREACHABLE';

export type Language = 'vi' | 'en';

export interface AppConfig {
  serverName: string;
  hostname: string;
  ipAddress: string;
  macAddress: string;
  broadcastAddress: string;
  wolPort: number;
  dashboardUrl: string;
  sshUser: string;
  sshPort: number;
  sshKeyPath: string;
  statusIntervalSeconds: number;
  startWithWindows: boolean;
  minimizeToTray: boolean;
  language: Language;

  // Remote Access & ZeroTier via Orange Pi Agent
  connectionMode: ConnectionMode;
  remoteEnabled: boolean;
  agentUrl: string;
  agentToken: string;
  zerotierIp: string;
  theme?: 'dark' | 'light';
}

export interface ServerStatusInfo {
  state: ServerState;
  activeMode: ActiveMode;
  latencyMs: number | null;
  lastChecked: string;
  uptime: string | null;
  errorMessage?: string;
}

export interface DiagnosticItem {
  id: string;
  name: string;
  category: string;
  status: 'PASS' | 'WARNING' | 'FAIL' | 'NOT_CONFIGURED';
  detail: string;
}

export interface DiagnosticReport {
  timestamp: string;
  app_version: string;
  os: string;
  items: DiagnosticItem[];
  pass_count: number;
  warning_count: number;
  fail_count: number;
  not_configured_count: number;
}

export interface ValidationErrors {
  ipAddress?: string;
  macAddress?: string;
  wolPort?: string;
  sshPort?: string;
  sshKeyPath?: string;
  agentUrl?: string;
}
