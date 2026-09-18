import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Copy } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleCopyError = () => {
    const details = `${this.state.error?.toString()}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack}`;
    navigator.clipboard.writeText(details);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2500);
  };

  private handleRestartApp = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#111315',
          color: '#F5F6F8',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          boxSizing: 'border-box',
          fontFamily: "'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif",
          borderRadius: '20px',
          border: '1px solid rgba(255, 98, 90, 0.3)',
        }}>
          <AlertTriangle size={44} color="#FF625A" style={{ marginBottom: '12px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px 0', color: '#F5F6F8' }}>
            Ứng dụng đã gặp lỗi giao diện
          </h2>
          <p style={{ fontSize: '13px', color: '#92969F', textAlign: 'center', margin: '0 0 16px 0', maxWidth: '320px' }}>
            Zima Remote đã tự động ngăn hiện màn hình trắng. Hãy sao chép lỗi hoặc tải lại ứng dụng.
          </p>

          <div style={{
            width: '100%',
            maxHeight: '120px',
            overflowY: 'auto',
            backgroundColor: '#141619',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            padding: '10px',
            fontSize: '11px',
            fontFamily: 'monospace',
            color: '#FF625A',
            marginBottom: '16px',
            wordBreak: 'break-word',
          }}>
            {this.state.error?.toString() || 'Unknown error'}
          </div>

          <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
            <button
              onClick={this.handleCopyError}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px',
                backgroundColor: '#1E2025',
                color: '#F5F6F8',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              <Copy size={15} />
              {this.state.copied ? 'Đã sao chép!' : 'Copy Error'}
            </button>

            <button
              onClick={this.handleRestartApp}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px',
                backgroundColor: '#2E7BF6',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              <RefreshCw size={15} />
              Restart App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
