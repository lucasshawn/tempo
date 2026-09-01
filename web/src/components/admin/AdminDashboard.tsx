import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  LogOut,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react';
import { AdminLogEntry, AdminSystemMetrics } from '../../types/admin';
import { fetchAdminStats, fetchAdminLogs, clearAdminLogs } from '../../services/adminApi';
import { MetricCards } from './MetricCards';
import { LogViewer } from './LogViewer';

export interface AdminDashboardProps {
  token: string;
  userEmail: string;
  onSignOut: () => void;
  onNavigateHome?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  token,
  userEmail,
  onSignOut,
  onNavigateHome,
}) => {
  const [metrics, setMetrics] = useState<AdminSystemMetrics | null>(null);
  const [logs, setLogs] = useState<AdminLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(3000); // default 3s
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const timerRef = useRef<number | null>(null);

  // Load telemetry stats and access logs
  const loadData = useCallback(
    async (isManual: boolean = false) => {
      if (isManual) {
        setIsRefreshing(true);
      }
      try {
        const [statsData, logsData] = await Promise.all([
          fetchAdminStats(token),
          fetchAdminLogs(token, 200),
        ]);

        setMetrics(statsData);
        setLogs(logsData);
        setError(null);
        setLastUpdated(new Date());
      } catch (err: any) {
        console.error('Telemetry fetch error:', err);
        setError(err?.message || 'Failed to fetch telemetry data from server.');
      } finally {
        setIsLoading(false);
        if (isManual) {
          setIsRefreshing(false);
        }
      }
    },
    [token]
  );

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Periodic Auto-refresh Timer
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (refreshInterval > 0) {
      timerRef.current = window.setInterval(() => {
        loadData(false);
      }, refreshInterval);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [refreshInterval, loadData]);

  // Clear Logs Handler
  const handleClearLogs = async () => {
    try {
      await clearAdminLogs(token);
      await loadData(true);
    } catch (err: any) {
      console.error('Failed to clear logs:', err);
      setError(err?.message || 'Failed to clear access logs.');
    }
  };

  const isLive = !error && metrics !== null;

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#12171c',
        backgroundImage:
          'radial-gradient(circle at 50% 10%, rgba(36, 44, 52, 0.85) 0%, #0d1217 100%)',
        color: '#f5f3eb',
        fontFamily: 'var(--font-sans-body, sans-serif)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      {/* Top Navigation Bar */}
      <header
        style={{
          height: '64px',
          backgroundColor: 'rgba(20, 26, 32, 0.95)',
          borderBottom: '1px solid var(--color-glass-border, rgba(212, 175, 55, 0.35))',
          backdropFilter: 'blur(16px)',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Left: Branding & Back Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {onNavigateHome && (
            <button
              type="button"
              onClick={onNavigateHome}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'rgba(36, 44, 52, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                padding: '6px 12px',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              title="Return to World Map"
            >
              <ArrowLeft size={14} />
              <span>Map View</span>
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '1.5px solid var(--color-gold-bright, #e5c158)',
                backgroundColor: 'rgba(30, 36, 42, 0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 10px rgba(229, 193, 88, 0.25)',
              }}
            >
              <ShieldCheck size={18} color="var(--color-gold-bright, #e5c158)" />
            </div>

            <div>
              <h1
                style={{
                  fontFamily: 'var(--font-serif-display, serif)',
                  fontSize: '15px',
                  letterSpacing: '0.18em',
                  fontWeight: 600,
                  color: '#ffffff',
                  margin: 0,
                  textTransform: 'uppercase',
                }}
              >
                TEMPO TELEMETRY
              </h1>
              <div
                style={{
                  fontSize: '10px',
                  letterSpacing: '0.06em',
                  color: 'rgba(255, 255, 255, 0.5)',
                  textTransform: 'uppercase',
                }}
              >
                System Metrics &amp; Live Access Logs
              </div>
            </div>
          </div>
        </div>

        {/* Center: Heartbeat & Auto-Refresh Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Live Heartbeat Indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: isLive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.15)',
              border: isLive ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.4)',
              fontSize: '11px',
              fontWeight: 600,
              color: isLive ? '#4ade80' : '#f87171',
            }}
          >
            <div
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: isLive ? '#22c55e' : '#ef4444',
                boxShadow: isLive ? '0 0 8px #22c55e' : '0 0 8px #ef4444',
                animation: isLive ? 'pulse 2s infinite' : 'none',
              }}
            />
            <span>{isLive ? 'LIVE' : 'RECONNECTING'}</span>
          </div>

          {/* Auto Refresh Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>Auto:</span>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              aria-label="Auto-refresh Interval"
              style={{
                backgroundColor: 'rgba(36, 44, 52, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                padding: '4px 8px',
                color: '#ffffff',
                fontSize: '11px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value={1000}>1s</option>
              <option value={3000}>3s</option>
              <option value={5000}>5s</option>
              <option value={0}>Off</option>
            </select>
          </div>

          {/* Manual Refresh Button */}
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: 'rgba(36, 44, 52, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: 'var(--color-gold-bright, #e5c158)',
              cursor: isRefreshing ? 'wait' : 'pointer',
            }}
            title="Refresh now"
          >
            <RefreshCw size={14} className={isRefreshing ? 'admin-spin-icon' : ''} />
          </button>
        </div>

        {/* Right: Authenticated User Badge & Sign Out */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 10px',
              backgroundColor: 'rgba(36, 44, 52, 0.7)',
              border: '1px solid rgba(229, 193, 88, 0.25)',
              borderRadius: '20px',
            }}
          >
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-gold-bright, #e5c158)',
                color: '#12171c',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {userEmail ? userEmail.charAt(0).toUpperCase() : 'A'}
            </div>
            <span
              style={{
                fontSize: '11px',
                color: '#e5e7eb',
                maxWidth: '180px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {userEmail}
            </span>
            <span
              style={{
                fontSize: '9px',
                fontWeight: 700,
                padding: '1px 5px',
                backgroundColor: 'rgba(229, 193, 88, 0.2)',
                color: 'var(--color-gold-bright, #e5c158)',
                borderRadius: '4px',
                letterSpacing: '0.05em',
              }}
            >
              ADMIN
            </span>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              color: '#f87171',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
            }}
            title="Sign out of Admin Dashboard"
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          padding: '24px',
          maxWidth: '1440px',
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        {/* Error Alert Banner */}
        {error && (
          <div
            role="alert"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              color: '#fca5a5',
              fontSize: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => loadData(true)}
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                borderRadius: '4px',
                padding: '4px 10px',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Section 1: System Metric Cards */}
        <section aria-label="System Metrics">
          <MetricCards metrics={metrics} isLoading={isLoading} />
        </section>

        {/* Section 2: Live Access Log Viewer */}
        <section aria-label="Live Access Logs">
          <LogViewer
            logs={logs}
            onClear={handleClearLogs}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onFilterChange={setStatusFilter}
            isLoading={isLoading}
          />
        </section>
      </main>

      {/* Footer Timestamp */}
      <footer
        style={{
          padding: '12px 24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: 'rgba(255, 255, 255, 0.4)',
          backgroundColor: 'rgba(18, 23, 28, 0.6)',
        }}
      >
        <div>
          Tempo Telemetry System • Go 1.26 runtime • Kubernetes Minikube
        </div>
        <div>
          {lastUpdated ? (
            <span>Last synchronized: {lastUpdated.toLocaleTimeString()}</span>
          ) : (
            <span>Connecting...</span>
          )}
        </div>
      </footer>
    </div>
  );
};
