import React, { useState } from 'react';
import { ArrowLeft, RefreshCw, Copy, CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import { DiagnosticReport, DiagnosticItem } from '../types/config';

interface DiagnosticsViewProps {
  report: DiagnosticReport | null;
  onRunDiagnostics: () => void;
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

export const DiagnosticsView: React.FC<DiagnosticsViewProps> = ({
  report,
  onRunDiagnostics,
  onBack,
  onShowToast,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyReport = () => {
    if (!report) return;
    const text = JSON.stringify(report, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    onShowToast('Đã sao chép báo cáo chẩn đoán!');
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusIcon = (status: DiagnosticItem['status']) => {
    switch (status) {
      case 'PASS': return <CheckCircle2 size={14} color="var(--status-online)" />;
      case 'WARNING': return <AlertTriangle size={14} color="var(--status-busy)" />;
      case 'FAIL': return <XCircle size={14} color="var(--status-error)" />;
      default: return <HelpCircle size={14} color="var(--text-muted)" />;
    }
  };

  return (
    <div className="subview-container">
      <div className="subview-header">
        <button className="btn-back" onClick={onBack} title="Quay lại">
          <ArrowLeft size={16} />
        </button>
        <span>Tự Chẩn Đoán (Diagnostics v3.0)</span>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          className="btn-dashboard"
          style={{ flex: 1, justifyContent: 'center' }}
          onClick={onRunDiagnostics}
        >
          <RefreshCw size={14} />
          <span>CHẠY CHẨN ĐOÁN</span>
        </button>
        <button
          className="form-input"
          style={{ width: 'auto', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
          onClick={handleCopyReport}
          disabled={!report}
        >
          <Copy size={14} />
          <span>{copied ? 'Đã copy' : 'Copy Report'}</span>
        </button>
      </div>

      {report && (
        <div style={{ display: 'flex', gap: '6px', fontSize: '0.7rem', fontWeight: 700 }}>
          <span style={{ color: 'var(--status-online)', background: 'var(--status-online-bg)', padding: '2px 8px', borderRadius: '12px' }}>
            PASS: {report.pass_count}
          </span>
          <span style={{ color: 'var(--status-busy)', background: 'var(--status-busy-bg)', padding: '2px 8px', borderRadius: '12px' }}>
            WARN: {report.warning_count}
          </span>
          <span style={{ color: 'var(--status-error)', background: 'var(--status-error-bg)', padding: '2px 8px', borderRadius: '12px' }}>
            FAIL: {report.fail_count}
          </span>
        </div>
      )}

      <div className="scrollable-settings-body">
        {report ? (
          report.items.map((item) => (
            <div
              key={item.id}
              style={{
                background: 'var(--bg-card-inner)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.82rem' }}>
                  {getStatusIcon(item.status)}
                  <span>{item.name}</span>
                </div>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  {item.category}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.detail}</span>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            Nhấn "CHẠY CHẨN ĐOÁN" để kiểm tra toàn bộ tiêu chí an toàn.
          </div>
        )}
      </div>
    </div>
  );
};
