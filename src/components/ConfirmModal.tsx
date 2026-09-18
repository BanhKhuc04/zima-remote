import React from 'react';
import { Power, RefreshCw } from 'lucide-react';
import { Language } from '../types/config';
import { translations } from '../i18n/translations';

interface ConfirmModalProps {
  type: 'shutdown' | 'restart' | null;
  language: Language;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
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
      <div className="modal-card">
        <div className={`modal-header ${isShutdown ? 'danger' : 'warning'}`}>
          {isShutdown ? <Power size={24} /> : <RefreshCw size={24} />}
          <span>{isShutdown ? t.confirmShutdownTitle : t.confirmRestartTitle}</span>
        </div>

        <div className="modal-body">
          {isShutdown ? t.confirmShutdownMessage : t.confirmRestartMessage}
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancel} id="modal-cancel">
            {t.btnCancel}
          </button>
          <button
            className={isShutdown ? 'btn-danger' : 'btn-warning'}
            onClick={onConfirm}
            id="modal-confirm"
          >
            {t.confirmActionBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
