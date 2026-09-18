import React from 'react';
import { Language } from '../types/config';
import { translations } from '../i18n/translations';

interface InlineConfirmModalProps {
  type: 'shutdown' | 'restart' | null;
  language: Language;
  onConfirm: () => void;
  onCancel: () => void;
}

export const InlineConfirmModal: React.FC<InlineConfirmModalProps> = ({
  type,
  language,
  onConfirm,
  onCancel,
}) => {
  if (!type) return null;

  const t = translations[language];
  const isShutdown = type === 'shutdown';

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div style={{ fontWeight: 700, fontSize: '1rem' }}>
          {isShutdown ? 'Xác Nhận Tắt Nguồn' : 'Xác Nhận Khởi Động Lại'}
        </div>

        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {isShutdown
            ? 'Bạn có chắc chắn muốn tắt máy chủ Home Server (ZimaOS) qua SSH không?'
            : 'Bạn có chắc chắn muốn khởi động lại Home Server không? Server sẽ ngắt kết nối tạm thời.'}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button
            className="form-input"
            style={{ flex: 1, cursor: 'pointer', textAlign: 'center', fontWeight: 600 }}
            onClick={onCancel}
            id="inline-modal-cancel"
          >
            {t.btnCancel}
          </button>
          <button
            className="btn-dashboard"
            style={{
              flex: 1,
              justifyContent: 'center',
              background: isShutdown
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, #f59e0b, #d97706)',
            }}
            onClick={onConfirm}
            id="inline-modal-confirm"
          >
            {t.confirmActionBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
