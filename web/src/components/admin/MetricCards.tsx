import React from 'react';
import {
  Layers,
  Cpu,
  HardDrive,
  Activity,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { AdminSystemMetrics } from '../../types/admin';

export interface MetricCardsProps {
  metrics: AdminSystemMetrics | null;
  isLoading?: boolean;
}

export function formatUptime(seconds: number): string {
  if (seconds <= 0) return '0s';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(' ');
}

export function formatBytes(bytes: number, decimals: number = 1): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i < 0) return `${bytes} B`;
  const sizeIdx = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, sizeIdx)).toFixed(dm))} ${sizes[sizeIdx]}`;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ metrics, isLoading }) => {
  if (!metrics) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              backgroundColor: 'rgba(26, 32, 39, 0.7)',
              border: '1px solid rgba(212, 175, 55, 0.2)',
              borderRadius: '12px',
              padding: '20px',
              height: '140px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255, 255, 255, 0.4)',
              fontSize: '13px',
            }}
          >
            {isLoading ? 'Connecting & loading metrics...' : 'No telemetry metrics available'}
          </div>
        ))}
      </div>
    );
  }

  const totalRequests = metrics.totalRequests || 0;
  const errorCount = (metrics.status4xx || 0) + (metrics.status5xx || 0);
  const errorRate = totalRequests > 0 ? ((errorCount / totalRequests) * 100).toFixed(1) : '0.0';

  const pct2xx = totalRequests > 0 ? (((metrics.status2xx || 0) / totalRequests) * 100).toFixed(1) : '0.0';
  const pct4xx = totalRequests > 0 ? (((metrics.status4xx || 0) / totalRequests) * 100).toFixed(1) : '0.0';
  const pct5xx = totalRequests > 0 ? (((metrics.status5xx || 0) / totalRequests) * 100).toFixed(1) : '0.0';

  const diskUsedPercent = Math.min(Math.max(metrics.diskUsedPercent || 0, 0), 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
      {/* 4 Main Metric Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
        }}
      >
        {/* 1. Memory Card */}
        <div
          style={{
            backgroundColor: 'rgba(26, 32, 39, 0.85)',
            border: '1px solid var(--color-glass-border, rgba(212, 175, 55, 0.35))',
            borderRadius: '12px',
            padding: '20px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'rgba(255, 255, 255, 0.6)',
              }}
            >
              Runtime Memory
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(229, 193, 88, 0.12)',
                border: '1px solid rgba(229, 193, 88, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-gold-bright, #e5c158)',
              }}
            >
              <Layers size={16} />
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 700,
                fontFamily: 'var(--font-serif-display, serif)',
                color: '#ffffff',
                letterSpacing: '0.02em',
              }}
            >
              {formatBytes(metrics.allocBytes)}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '2px' }}>
              Heap Allocated
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '10px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '11px',
            }}
          >
            <div>
              <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>System: </span>
              <span style={{ color: '#e5e7eb', fontWeight: 600 }}>{formatBytes(metrics.sysBytes)}</span>
            </div>
            <div>
              <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>GC Runs: </span>
              <span style={{ color: 'var(--color-gold-bright, #e5c158)', fontWeight: 600 }}>
                {metrics.numGc.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* 2. CPU & Goroutines Card */}
        <div
          style={{
            backgroundColor: 'rgba(26, 32, 39, 0.85)',
            border: '1px solid var(--color-glass-border, rgba(212, 175, 55, 0.35))',
            borderRadius: '12px',
            padding: '20px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'rgba(255, 255, 255, 0.6)',
              }}
            >
              Goroutines &amp; CPU
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8',
              }}
            >
              <Cpu size={16} />
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 700,
                fontFamily: 'var(--font-serif-display, serif)',
                color: '#ffffff',
                letterSpacing: '0.02em',
              }}
            >
              {metrics.numGoroutine.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '2px' }}>
              Active Goroutines
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '10px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '11px',
            }}
          >
            <div>
              <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Logical CPU: </span>
              <span style={{ color: '#e5e7eb', fontWeight: 600 }}>{metrics.numCpu} Cores</span>
            </div>
            <div>
              <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Runtime: </span>
              <span style={{ color: '#38bdf8', fontWeight: 600 }}>Go 1.26</span>
            </div>
          </div>
        </div>

        {/* 3. Disk Usage Card */}
        <div
          style={{
            backgroundColor: 'rgba(26, 32, 39, 0.85)',
            border: '1px solid var(--color-glass-border, rgba(212, 175, 55, 0.35))',
            borderRadius: '12px',
            padding: '20px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'rgba(255, 255, 255, 0.6)',
              }}
            >
              Disk Storage
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(168, 85, 247, 0.12)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#c084fc',
              }}
            >
              <HardDrive size={16} />
            </div>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-serif-display, serif)',
                  color: '#ffffff',
                  letterSpacing: '0.02em',
                }}
              >
                {diskUsedPercent.toFixed(1)}%
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500 }}>
                {formatBytes(metrics.diskUsedBytes)} / {formatBytes(metrics.diskTotalBytes)}
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div
              style={{
                width: '100%',
                height: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '3px',
                overflow: 'hidden',
                marginTop: '8px',
              }}
            >
              <div
                style={{
                  width: `${diskUsedPercent}%`,
                  height: '100%',
                  background:
                    diskUsedPercent > 90
                      ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                      : diskUsedPercent > 75
                      ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                      : 'linear-gradient(90deg, #e5c158, #b88e28)',
                  borderRadius: '3px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '10px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '11px',
            }}
          >
            <div>
              <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Free: </span>
              <span style={{ color: '#4ade80', fontWeight: 600 }}>{formatBytes(metrics.diskFreeBytes)}</span>
            </div>
            <div>
              <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Status: </span>
              <span
                style={{
                  color: diskUsedPercent > 90 ? '#ef4444' : '#4ade80',
                  fontWeight: 600,
                }}
              >
                {diskUsedPercent > 90 ? 'Critical' : 'Healthy'}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Traffic & Uptime Card */}
        <div
          style={{
            backgroundColor: 'rgba(26, 32, 39, 0.85)',
            border: '1px solid var(--color-glass-border, rgba(212, 175, 55, 0.35))',
            borderRadius: '12px',
            padding: '20px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'rgba(255, 255, 255, 0.6)',
              }}
            >
              Traffic &amp; Uptime
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(34, 197, 94, 0.12)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4ade80',
              }}
            >
              <Activity size={16} />
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 700,
                fontFamily: 'var(--font-serif-display, serif)',
                color: '#ffffff',
                letterSpacing: '0.02em',
              }}
            >
              {totalRequests.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '2px' }}>
              Total Requests • {metrics.requestsPerMin.toFixed(1)} RPM
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '10px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '11px',
            }}
          >
            <div>
              <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Uptime: </span>
              <span style={{ color: 'var(--color-gold-bright, #e5c158)', fontWeight: 600 }}>
                {formatUptime(metrics.uptimeSeconds)}
              </span>
            </div>
            <div>
              <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Error Rate: </span>
              <span
                style={{
                  color: parseFloat(errorRate) > 5 ? '#ef4444' : parseFloat(errorRate) > 1 ? '#f59e0b' : '#4ade80',
                  fontWeight: 600,
                }}
              >
                {errorRate}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* HTTP Status Code Breakdown Row */}
      <div
        style={{
          backgroundColor: 'rgba(26, 32, 39, 0.85)',
          border: '1px solid var(--color-glass-border, rgba(212, 175, 55, 0.35))',
          borderRadius: '12px',
          padding: '16px 20px',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'rgba(255, 255, 255, 0.6)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <TrendingUp size={14} color="var(--color-gold-bright, #e5c158)" />
            HTTP Status Breakdown
          </span>
          <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)' }}>
            Total Processed: <strong style={{ color: '#ffffff' }}>{totalRequests.toLocaleString()}</strong>
          </span>
        </div>

        {/* Horizontal Distribution Bar */}
        {totalRequests > 0 ? (
          <div
            style={{
              width: '100%',
              height: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '4px',
              overflow: 'hidden',
              display: 'flex',
            }}
          >
            <div
              style={{
                width: `${pct2xx}%`,
                height: '100%',
                backgroundColor: '#22c55e',
                transition: 'width 0.4s ease',
              }}
              title={`2xx: ${pct2xx}%`}
            />
            <div
              style={{
                width: `${pct4xx}%`,
                height: '100%',
                backgroundColor: '#f59e0b',
                transition: 'width 0.4s ease',
              }}
              title={`4xx: ${pct4xx}%`}
            />
            <div
              style={{
                width: `${pct5xx}%`,
                height: '100%',
                backgroundColor: '#ef4444',
                transition: 'width 0.4s ease',
              }}
              title={`5xx: ${pct5xx}%`}
            />
          </div>
        ) : (
          <div
            style={{
              width: '100%',
              height: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '4px',
            }}
          />
        )}

        {/* Pills Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
          }}
        >
          {/* 2xx Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 14px',
              backgroundColor: 'rgba(34, 197, 94, 0.08)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} color="#4ade80" />
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#4ade80' }}>2xx Success</div>
                <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)' }}>OK / Created</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                {(metrics.status2xx || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '10px', color: '#4ade80' }}>{pct2xx}%</div>
            </div>
          </div>

          {/* 4xx Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 14px',
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} color="#fbbf24" />
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#fbbf24' }}>4xx Client Error</div>
                <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)' }}>Not Found / Auth</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                {(metrics.status4xx || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '10px', color: '#fbbf24' }}>{pct4xx}%</div>
            </div>
          </div>

          {/* 5xx Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <XCircle size={16} color="#f87171" />
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#f87171' }}>5xx Server Error</div>
                <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)' }}>Panics / Internal</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                {(metrics.status5xx || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '10px', color: '#f87171' }}>{pct5xx}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
