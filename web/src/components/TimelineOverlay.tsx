import React from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

export interface TimelineOverlayProps {
  timeSlices: string[];
  currentIndex: number;
  isPlaying: boolean;
  onIndexChange: (index: number) => void;
  onTogglePlay: () => void;
  onReset: () => void;
}

export const TimelineOverlay: React.FC<TimelineOverlayProps> = ({
  timeSlices,
  currentIndex,
  isPlaying,
  onIndexChange,
  onTogglePlay,
  onReset,
}) => {
  const currentIso = timeSlices[currentIndex] || new Date().toISOString();
  const dateObj = new Date(currentIso);

  const formattedDate = dateObj
    .toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    .toUpperCase();

  const formattedTime = dateObj.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingBottom: '32px',
        zIndex: 1000,
        pointerEvents: 'none',
        gap: '14px',
      }}
    >
      {/* Floating Date/Time Badge */}
      <div
        style={{
          pointerEvents: 'auto',
          backgroundColor: 'var(--color-glass-bg)',
          border: '1px solid var(--color-glass-border)',
          borderRadius: '24px',
          padding: '8px 22px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        }}
      >
        <span
          style={{
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 600,
            letterSpacing: '0.08em',
          }}
        >
          {formattedDate}
        </span>
        <span
          style={{
            color: '#cbd5e1',
            fontSize: '13px',
            fontWeight: 400,
          }}
        >
          {formattedTime}
        </span>
      </div>

      {/* Horizontal Scrubber */}
      <div
        style={{
          pointerEvents: 'auto',
          width: 'min(90vw, 560px)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          height: '24px',
        }}
      >
        {/* Track Line */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: '2px',
            backgroundColor: 'rgba(255, 255, 255, 0.45)',
            borderRadius: '1px',
          }}
        />

        {/* Discrete Ticks for Slices */}
        {timeSlices.map((_, i) => {
          const pct = timeSlices.length > 1 ? (i / (timeSlices.length - 1)) * 100 : 50;
          const isPassed = i <= currentIndex;
          const isCurrent = i === currentIndex;

          return (
            <div
              key={i}
              onClick={() => onIndexChange(i)}
              style={{
                position: 'absolute',
                left: `${pct}%`,
                transform: 'translateX(-50%)',
                width: isCurrent ? '14px' : '6px',
                height: isCurrent ? '14px' : '6px',
                borderRadius: '50%',
                backgroundColor: isPassed ? 'var(--color-gold-bright)' : 'rgba(255, 255, 255, 0.6)',
                border: isCurrent ? '2px solid #ffffff' : 'none',
                boxShadow: isCurrent ? '0 0 8px var(--color-gold-bright)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                zIndex: isCurrent ? 2 : 1,
              }}
            />
          );
        })}

        {/* Native Range for Accessibility & Dragging */}
        <input
          type="range"
          min={0}
          max={Math.max(0, timeSlices.length - 1)}
          value={currentIndex}
          onChange={(e) => onIndexChange(Number(e.target.value))}
          aria-label="Timeline Scrubber"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            width: '100%',
            opacity: 0,
            cursor: 'pointer',
            height: '24px',
            margin: 0,
            zIndex: 3,
          }}
        />
      </div>

      {/* Playback Control Buttons */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', pointerEvents: 'auto' }}>
        <button
          onClick={onReset}
          title="Reset to first timestamp"
          aria-label="Reset to first timestamp"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-slate-badge)',
            border: '1.5px solid var(--color-gold-bright)',
            color: 'var(--color-gold-bright)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
            transition: 'transform 0.15s ease, background-color 0.15s ease',
          }}
        >
          <RotateCcw size={16} />
        </button>

        <button
          onClick={onTogglePlay}
          title={isPlaying ? 'Pause playback' : 'Play timeline'}
          aria-label={isPlaying ? 'Pause playback' : 'Play timeline'}
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-slate-badge)',
            border: '2px solid var(--color-gold-bright)',
            color: 'var(--color-gold-bright)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
            transition: 'transform 0.15s ease, background-color 0.15s ease',
          }}
        >
          {isPlaying ? <Pause size={22} /> : <Play size={22} style={{ marginLeft: '2px' }} />}
        </button>
      </div>
    </div>
  );
};
