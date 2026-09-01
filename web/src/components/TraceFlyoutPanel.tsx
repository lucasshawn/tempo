import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Calendar,
  Cloud,
  Sun,
  CloudSun,
  CloudRain,
  CloudFog,
  Play,
  Pause,
  Lock,
  Globe,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Users,
  Quote,
} from 'lucide-react';
import { TraceContext, TraceMediaItem, TraceConnection } from '../types/trace';

export interface TraceFlyoutPanelProps {
  trace: TraceContext;
  onClose: () => void;
}

function formatTraceDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const formattedDate = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const formattedTime = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `${formattedDate} • ${formattedTime}`;
  } catch {
    return isoString;
  }
}

function renderWeatherIcon(iconName?: string, condition?: string) {
  const norm = (iconName || condition || '').toLowerCase();
  if (norm.includes('fog') || norm.includes('mist')) {
    return <CloudFog size={14} style={{ color: '#7a7062' }} />;
  }
  if (norm.includes('rain') || norm.includes('shower')) {
    return <CloudRain size={14} style={{ color: '#5b768d' }} />;
  }
  if (norm.includes('cloud-sun') || norm.includes('partly')) {
    return <CloudSun size={14} style={{ color: '#b88e28' }} />;
  }
  if (norm.includes('cloud') || norm.includes('overcast')) {
    return <Cloud size={14} style={{ color: '#7a7062' }} />;
  }
  if (norm.includes('sun') || norm.includes('clear') || norm.includes('bright')) {
    return <Sun size={14} style={{ color: '#d48b18' }} />;
  }
  return <CloudSun size={14} style={{ color: '#b88e28' }} />;
}

// 1. Audio Waveform Player Feed Renderer
const AudioPlayerFeedItem: React.FC<{ item: TraceMediaItem }> = ({ item }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showTranscript, setShowTranscript] = useState<boolean>(false);
  const [playProgress, setPlayProgress] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const defaultWaveform = [
    0.25, 0.45, 0.7, 0.9, 0.65, 0.8, 0.4, 0.3, 0.6, 0.85, 0.7, 0.5, 0.35, 0.6,
    0.9, 0.75, 0.4, 0.25, 0.5, 0.7, 0.85, 0.6, 0.4, 0.3, 0.55, 0.75, 0.45, 0.3,
  ];
  const waveform = (item.waveform && item.waveform.length > 0) ? item.waveform : defaultWaveform;

  // Handle simulated progress if no real audio element playback
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setPlayProgress((prev) => {
          if (prev >= 1) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.05;
        });
      }, 400);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => {
          // Playback fallback simulation
        });
      }
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="trace-feed-item trace-feed-audio-card">
      {item.url && (
        <audio
          ref={audioRef}
          src={item.url}
          onEnded={() => {
            setIsPlaying(false);
            setPlayProgress(0);
          }}
          style={{ display: 'none' }}
        />
      )}

      {/* Audio Control Row */}
      <div className="trace-audio-controls">
        <button
          onClick={togglePlay}
          className="trace-audio-play-btn"
          aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
        >
          {isPlaying ? <Pause size={15} /> : <Play size={15} style={{ marginLeft: '1.5px' }} />}
        </button>

        {/* Waveform Visualization */}
        <div className="trace-audio-waveform-container" aria-label="Audio waveform">
          {waveform.map((heightFactor, index) => {
            const barProgress = index / (waveform.length - 1);
            const isPassed = barProgress <= playProgress;
            return (
              <div
                key={index}
                className={`trace-waveform-bar ${isPlaying ? 'playing' : ''} ${isPassed ? 'active' : ''}`}
                style={{
                  height: `${Math.max(16, heightFactor * 100)}%`,
                  animationDelay: `${(index % 6) * 0.12}s`,
                }}
                onClick={() => {
                  setPlayProgress(barProgress);
                  if (!isPlaying) setIsPlaying(true);
                }}
              />
            );
          })}
        </div>

        {/* Duration badge */}
        <span className="trace-audio-duration">
          {item.duration || '0:45'}
        </span>
      </div>

      {/* Collapsible Transcript Section */}
      {item.transcript && (
        <div className="trace-transcript-section">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="trace-transcript-toggle"
            aria-expanded={showTranscript}
          >
            <span>TRANSCRIPT</span>
            {showTranscript ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {showTranscript && (
            <div className="trace-transcript-content">
              <Quote size={13} className="trace-transcript-quote-icon" />
              <p>{item.transcript}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 2. Photo Feed Renderer
const PhotoFeedItem: React.FC<{ item: TraceMediaItem }> = ({ item }) => {
  return (
    <div className="trace-feed-item trace-feed-photo-card">
      <div className="trace-photo-container">
        <img
          src={item.url}
          alt={item.text || 'Trace photo observation'}
          className="trace-photo-img"
          loading="lazy"
        />
      </div>
      {item.text && <p className="trace-photo-caption">{item.text}</p>}
    </div>
  );
};

// 3. Note Feed Renderer
const NoteFeedItem: React.FC<{ item: TraceMediaItem }> = ({ item }) => {
  return (
    <div className="trace-feed-item trace-feed-note-card">
      <div className="trace-note-header">
        <Quote size={13} className="trace-note-icon" />
        <span className="trace-note-label">FIELD NOTE</span>
      </div>
      <p className="trace-note-text">{item.text}</p>
    </div>
  );
};

// 4. Video Feed Renderer
const VideoFeedItem: React.FC<{ item: TraceMediaItem }> = ({ item }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleToggle = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {
        setIsPlaying(true);
      });
    }
  };

  return (
    <div className="trace-feed-item trace-feed-video-card" onClick={handleToggle}>
      <div className="trace-video-container">
        {item.url && (
          <video
            ref={videoRef}
            src={item.url}
            poster={item.posterUrl}
            className="trace-video-element"
            playsInline
            onEnded={() => setIsPlaying(false)}
          />
        )}
        {!item.url && item.posterUrl && (
          <img
            src={item.posterUrl}
            alt={item.text || 'Trace video thumbnail'}
            className="trace-video-poster"
          />
        )}
        {!isPlaying && (
          <div className="trace-video-overlay">
            <div className="trace-video-play-badge">
              <Play size={18} style={{ marginLeft: '2px', color: 'var(--color-gold-bright)' }} />
            </div>
            {item.duration && (
              <span className="trace-video-duration-badge">{item.duration}</span>
            )}
          </div>
        )}
      </div>
      {item.text && <p className="trace-video-caption">{item.text}</p>}
    </div>
  );
};

// 5. Connections Feed Renderer
const ConnectionsFeedItem: React.FC<{ item: TraceMediaItem }> = ({ item }) => {
  const people = item.people || [];
  if (people.length === 0) return null;

  return (
    <div className="trace-feed-item trace-feed-connections-card">
      <div className="trace-connections-header">
        <Users size={13} className="trace-connections-icon" />
        <span className="trace-connections-label">CONNECTIONS</span>
      </div>
      <div className="trace-connections-list">
        {people.map((person: TraceConnection) => (
          <div key={person.id} className="trace-connection-chip">
            {person.avatarUrl ? (
              <img
                src={person.avatarUrl}
                alt={person.name}
                className="trace-connection-avatar"
              />
            ) : (
              <div className="trace-connection-avatar-fallback">
                {person.name.charAt(0)}
              </div>
            )}
            <div className="trace-connection-info">
              <span className="trace-connection-name">{person.name}</span>
              {person.role && (
                <span className="trace-connection-role">{person.role}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const TraceFlyoutPanel: React.FC<TraceFlyoutPanelProps> = ({
  trace,
  onClose,
}) => {
  // Listen for Escape key to close panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Sort feed chronologically
  const sortedFeed = [...(trace.feed || [])].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeA - timeB;
  });

  return (
    <div className="trace-flyout-wrapper" onClick={onClose}>
      <aside
        className="trace-flyout-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="trace-flyout-title"
        aria-modal="true"
      >
        {/* Top Header */}
        <header className="trace-flyout-header">
          <div className="trace-flyout-top-row">
            <span className="trace-overline-tag">TRACE</span>
            <button
              onClick={onClose}
              className="trace-close-btn"
              aria-label="Close trace panel"
            >
              <X size={17} />
            </button>
          </div>

          {/* Tier 1 Headline */}
          <h2 id="trace-flyout-title" className="trace-tier1-title">
            {trace.title}
          </h2>

          {/* Tier 2 Subheading */}
          <div className="trace-tier2-subheading">
            {trace.locationSubheading}
          </div>

          {/* Tier 3 Meta Row (Date/Time & Weather) */}
          <div className="trace-tier3-meta-row">
            <div className="trace-meta-item">
              <Calendar size={13} className="trace-meta-icon" />
              <span>{formatTraceDateTime(trace.timestamp)}</span>
            </div>
            {trace.weather && (
              <>
                <span className="trace-meta-divider">•</span>
                <div className="trace-meta-item">
                  {renderWeatherIcon(trace.weather.icon, trace.weather.condition)}
                  <span>
                    {trace.weather.temperatureF}°F
                    {trace.weather.condition ? ` • ${trace.weather.condition}` : ''}
                  </span>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Chronological Feed */}
        <div className="trace-flyout-feed">
          {sortedFeed.map((item) => {
            switch (item.type) {
              case 'photo':
                return <PhotoFeedItem key={item.id} item={item} />;
              case 'audio':
                return <AudioPlayerFeedItem key={item.id} item={item} />;
              case 'note':
                return <NoteFeedItem key={item.id} item={item} />;
              case 'video':
                return <VideoFeedItem key={item.id} item={item} />;
              case 'connections':
                return <ConnectionsFeedItem key={item.id} item={item} />;
              default:
                return null;
            }
          })}
        </div>

        {/* Footer */}
        <footer className="trace-flyout-footer">
          <div className={`trace-privacy-badge ${trace.isPrivate ? 'private' : 'public'}`}>
            {trace.isPrivate ? (
              <>
                <Lock size={12} />
                <span>PRIVATE</span>
              </>
            ) : (
              <>
                <Globe size={12} />
                <span>PUBLIC</span>
              </>
            )}
          </div>

          <button
            className="trace-options-btn"
            aria-label="Trace Options"
            title="More Options"
          >
            <MoreHorizontal size={16} />
          </button>
        </footer>
      </aside>
    </div>
  );
};
