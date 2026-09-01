import React from 'react';
import { MoreHorizontal, Shield } from 'lucide-react';

export interface HeaderProps {
  onNavigateAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigateAdmin }) => {
  const handleAdminClick = () => {
    if (onNavigateAdmin) {
      onNavigateAdmin();
    } else {
      window.history.pushState({}, '', '/admin');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <header
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 1000,
        pointerEvents: 'none',
      }}
    >
      {/* Left Astro/Compass Symbol */}
      <div
        style={{
          pointerEvents: 'auto',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: '1.5px solid var(--color-gold-bright)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          backgroundColor: 'rgba(30, 36, 42, 0.4)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-gold-bright)',
            boxShadow: '0 0 6px var(--color-gold-bright)',
          }}
        />
      </div>

      {/* Center Title */}
      <h1
        style={{
          fontFamily: 'var(--font-serif-display)',
          fontSize: '18px',
          letterSpacing: '0.35em',
          color: '#2d3339',
          fontWeight: 600,
          textTransform: 'uppercase',
          textShadow: '0 1px 2px rgba(255, 255, 255, 0.6)',
        }}
      >
        W O R L D
      </h1>

      {/* Right Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          pointerEvents: 'auto',
        }}
      >
        <button
          onClick={handleAdminClick}
          aria-label="Admin Telemetry Dashboard"
          title="Admin Telemetry Dashboard"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: '1.5px solid var(--color-gold-bright)',
            backgroundColor: 'rgba(30, 36, 42, 0.4)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--color-gold-bright)',
            transition: 'all 0.2s ease',
          }}
        >
          <Shield size={18} />
        </button>

        <button
          aria-label="Options"
          title="Options"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: '1.5px solid var(--color-gold-bright)',
            backgroundColor: 'rgba(30, 36, 42, 0.4)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--color-gold-bright)',
            transition: 'all 0.2s ease',
          }}
        >
          <MoreHorizontal size={18} />
        </button>
      </div>
    </header>
  );
};
