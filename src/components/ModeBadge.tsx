import React from 'react';
import { ActiveMode } from '../types/config';

interface ModeBadgeProps {
  mode: ActiveMode;
}

export const ModeBadge: React.FC<ModeBadgeProps> = ({ mode }) => {
  if (mode === 'LOCAL') {
    return <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(37, 208, 125, 0.15)', color: 'var(--status-online)', fontWeight: 700 }}>LOCAL</span>;
  }
  if (mode === 'REMOTE') {
    return <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(22, 119, 255, 0.15)', color: 'var(--accent-blue)', fontWeight: 700 }}>REMOTE VIA ORANGE PI</span>;
  }
  return <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(119, 123, 132, 0.15)', color: 'var(--text-muted)', fontWeight: 700 }}>UNREACHABLE</span>;
};
