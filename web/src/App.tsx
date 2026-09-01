import React, { useEffect, useState } from 'react';
import { WorldMap } from './components/WorldMap';
import { Header } from './components/Header';
import { TimelineOverlay } from './components/TimelineOverlay';
import { fetchTimelineSummary, fetchTraces } from './services/api';
import { TimelineSummary, TraceCluster } from './types/trace';

export const App: React.FC = () => {
  const [timeline, setTimeline] = useState<TimelineSummary | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(3);
  const [clusters, setClusters] = useState<TraceCluster[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Initial Timeline Fetch
  useEffect(() => {
    fetchTimelineSummary()
      .then((data) => {
        setTimeline(data);
        if (data.timeSlices && data.timeSlices.length > 0) {
          setCurrentIndex(0);
        }
      })
      .catch((err) => {
        console.error('Failed to load timeline:', err);
        setError('Failed to connect to Tempo API backend');
      });
  }, []);

  // 2. Fetch Traces on time slice or zoom change
  useEffect(() => {
    if (!timeline || !timeline.timeSlices || timeline.timeSlices.length === 0) return;

    const currentIso = timeline.timeSlices[currentIndex];
    if (!currentIso) return;

    fetchTraces(currentIso, zoom)
      .then((res) => {
        setClusters(res.clusters);
      })
      .catch((err) => {
        console.error('Failed to load traces:', err);
      });
  }, [timeline, currentIndex, zoom]);

  // 3. Playback timer (steps through slices every 1.8 seconds)
  useEffect(() => {
    if (!isPlaying || !timeline || !timeline.timeSlices || timeline.timeSlices.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= timeline.timeSlices.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1800);

    return () => clearInterval(timer);
  }, [isPlaying, timeline]);

  return (
    <div
      className="tempo-app"
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: 'var(--color-bg-water)',
      }}
    >
      <Header />
      <WorldMap
        clusters={clusters}
        zoom={zoom}
        onZoomChange={setZoom}
      />
      {timeline && timeline.timeSlices && timeline.timeSlices.length > 0 && (
        <TimelineOverlay
          timeSlices={timeline.timeSlices}
          currentIndex={currentIndex}
          isPlaying={isPlaying}
          onIndexChange={(idx) => setCurrentIndex(idx)}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          onReset={() => {
            setCurrentIndex(0);
            setIsPlaying(false);
          }}
        />
      )}
      {/* Lower-left version watermark */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '24px',
          zIndex: 1000,
          fontSize: '11px',
          letterSpacing: '0.14em',
          color: 'rgba(255, 255, 255, 0.45)',
          fontFamily: 'var(--font-sans-body)',
          pointerEvents: 'none',
          textTransform: 'uppercase',
          userSelect: 'none',
          fontWeight: 500,
        }}
      >
        TEMPO v1.2.0 • BLUE OCEAN
      </div>

      {error && (
        <div
          style={{
            position: 'absolute',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#991b1b',
            color: '#ffffff',
            padding: '10px 20px',
            borderRadius: '8px',
            zIndex: 2000,
            fontSize: '14px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};
