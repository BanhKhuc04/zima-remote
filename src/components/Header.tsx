import React from 'react';
import { Settings, Minus, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { translations } from '../i18n/translations';
import { Language } from '../types/config';

interface HeaderProps {
  language: Language;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ language, onOpenSettings }) => {
  const t = translations[language];

  const handleMinimize = async () => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.minimize();
    } catch (e) {
      console.error('Minimize window failed', e);
    }
  };

  const handleClose = async () => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.close();
    } catch (e) {
      console.error('Close window failed', e);
    }
  };

  return (
    <header className="header">
      <div className="header-brand">
        <div className="logo-badge">Z</div>
        <span className="header-title">{t.appTitle}</span>
      </div>

      <div className="header-actions">
        <button 
          className="icon-btn" 
          onClick={onOpenSettings}
          title={t.btnSettings}
          id="btn-settings"
        >
          <Settings size={18} />
        </button>
        <button 
          className="icon-btn" 
          onClick={handleMinimize}
          title="Minimize"
          id="btn-minimize"
        >
          <Minus size={18} />
        </button>
        <button 
          className="icon-btn close" 
          onClick={handleClose}
          title="Close"
          id="btn-close"
        >
          <X size={18} />
        </button>
      </div>
    </header>
  );
};
