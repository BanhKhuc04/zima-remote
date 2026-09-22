import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Settings, RefreshCw, PowerOff, ShieldCheck, X, Sun, Moon } from 'lucide-react';
import { Language } from '../types/config';
import { translations } from '../i18n/translations';
import k4WhiteLogo from '../assets/k4_logo_white.png';
import k4BlackLogo from '../assets/k4_logo_black.png';

interface FlyoutHeaderProps {
  language: Language;
  autostartEnabled: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenDiagnostics: () => void;
  onCheckStatus: () => void;
  onToggleAutostart: () => void;
  onExitApp: () => void;
  onCloseWindow: () => void;
}

export const FlyoutHeader: React.FC<FlyoutHeaderProps> = ({
  language,
  autostartEnabled,
  theme,
  onToggleTheme,
  onOpenSettings,
  onOpenDiagnostics,
  onCheckStatus,
  onToggleAutostart,
  onExitApp,
  onCloseWindow,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const t = translations[language];
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flyout-header" ref={menuRef}>
      <div className="brand-title">
        <img
          src={theme === 'light' ? k4BlackLogo : k4WhiteLogo}
          alt="K4 / VanhKhuc Logo"
          className="brand-logo-img"
        />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '16px', fontWeight: 650, lineHeight: 1.1, color: 'var(--text)' }}>PC Status</span>
          <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--muted)', letterSpacing: '0.01em' }}>by vanhkhuc.dev · v3.1.0</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          className="header-action-btn"
          onClick={onToggleTheme}
          title={theme === 'light' ? 'Chuyển Chế độ Tối (Dark Mode)' : 'Chuyển Chế độ Sáng (Light Mode)'}
          id="btn-header-theme"
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        <button
          className="header-action-btn"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          title="Menu"
          id="btn-header-menu"
        >
          <MoreVertical size={16} />
        </button>

        <button
          className="header-action-btn"
          onClick={onCloseWindow}
          title="Đóng / Ẩn cửa sổ"
          id="btn-header-close"
        >
          <X size={16} />
        </button>
      </div>

      {isMenuOpen && (
        <div className="dropdown-menu">
          <button
            className="menu-item"
            onClick={() => {
              setIsMenuOpen(false);
              onOpenSettings();
            }}
          >
            <Settings size={15} />
            <span>{t.btnSettings}</span>
          </button>

          <button
            className="menu-item"
            onClick={() => {
              setIsMenuOpen(false);
              onOpenDiagnostics();
            }}
          >
            <ShieldCheck size={15} />
            <span>Tự chẩn đoán (Diagnostics)</span>
          </button>

          <button
            className="menu-item"
            onClick={() => {
              setIsMenuOpen(false);
              onCheckStatus();
            }}
          >
            <RefreshCw size={15} />
            <span>Kiểm tra trạng thái</span>
          </button>

          <button
            className="menu-item"
            onClick={() => {
              setIsMenuOpen(false);
              onToggleAutostart();
            }}
          >
            <ShieldCheck size={15} />
            <span>{autostartEnabled ? '✓ ' : ''}{t.startWithWindows}</span>
          </button>

          <div className="menu-divider" />

          <button
            className="menu-item danger"
            onClick={() => {
              setIsMenuOpen(false);
              onExitApp();
            }}
          >
            <PowerOff size={15} />
            <span>Thoát ứng dụng</span>
          </button>
        </div>
      )}
    </div>
  );
};
