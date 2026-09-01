import React from 'react';

export const App: React.FC = () => {
  return (
    <div className="tempo-app" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div className="orbital-ring" />
      <h1
        style={{
          fontFamily: 'var(--font-serif-display)',
          color: 'var(--color-text-light)',
          padding: '24px',
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          fontSize: '18px',
        }}
      >
        Tempo
      </h1>
    </div>
  );
};
