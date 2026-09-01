import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  Trash2,
  Download,
  Filter,
  AlertTriangle,
  Radio,
  FileText,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { AdminLogEntry } from '../../types/admin';
import { formatBytes } from './MetricCards';

export interface LogViewerProps {
  logs: AdminLogEntry[];
  onClear?: () => Promise<void> | void;
  onSearchChange?: (query: string) => void;
  onFilterChange?: (filter: string) => void;
  searchQuery?: string;
  statusFilter?: string;
  isLoading?: boolean;
}

export const LogViewer: React.FC<LogViewerProps> = ({
  logs,
  onClear,
  onSearchChange,
  onFilterChange,
  searchQuery: propSearch,
  statusFilter: propFilter,
  isLoading,
}) => {
  const [internalSearch, setInternalSearch] = useState<string>('');
  const [internalFilter, setInternalFilter] = useState<string>('all');
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  const search = propSearch !== undefined ? propSearch : internalSearch;
  const activeFilter = propFilter !== undefined ? propFilter : internalFilter;

  const handleSearchChange = (val: string) => {
    if (propSearch === undefined) {
      setInternalSearch(val);
    }
    if (onSearchChange) {
      onSearchChange(val);
    }
  };

  const handleFilterChange = (filter: string) => {
    if (propFilter === undefined) {
      setInternalFilter(filter);
    }
    if (onFilterChange) {
      onFilterChange(filter);
    }
  };

  const handleClear = async () => {
    if (!onClear) return;
    setIsClearing(true);
    try {
      await onClear();
      setShowClearConfirm(false);
    } catch (err) {
      console.error('Failed to clear logs:', err);
    } finally {
      setIsClearing(false);
    }
  };

  // Client-side filtering
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. Status / Tag Filter
      if (activeFilter === 'errors' && log.statusCode < 400) return false;
      if (activeFilter === '2xx' && (log.statusCode < 200 || log.statusCode >= 300)) return false;
      if (activeFilter === '4xx' && (log.statusCode < 400 || log.statusCode >= 500)) return false;
      if (activeFilter === '5xx' && log.statusCode < 500) return false;
      if (activeFilter === 'api' && !log.path.startsWith('/api')) return false;

      // 2. Search query filter (IP, path, method, user agent)
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesIp = log.clientIp.toLowerCase().includes(q);
        const matchesPath = log.path.toLowerCase().includes(q);
        const matchesMethod = log.method.toLowerCase().includes(q);
        const matchesUa = (log.userAgent || '').toLowerCase().includes(q);
        const matchesStatus = log.statusCode.toString().includes(q);
        if (!matchesIp && !matchesPath && !matchesMethod && !matchesUa && !matchesStatus) {
          return false;
        }
      }

      return true;
    });
  }, [logs, search, activeFilter]);

  const handleExportCsv = () => {
    if (filteredLogs.length === 0) return;

    const headers = [
      'Timestamp (UTC)',
      'Client IP',
      'Method',
      'Path',
      'Status Code',
      'Duration (ms)',
      'Bytes Written',
      'User Agent',
    ];

    const rows = filteredLogs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.clientIp}"`,
      `"${l.method}"`,
      `"${l.path}"`,
      l.statusCode,
      l.durationMs.toFixed(2),
      l.bytesWritten,
      `"${(l.userAgent || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `tempo-telemetry-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getMethodBadgeStyle = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return { bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' };
      case 'POST':
        return { bg: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: 'rgba(34, 197, 94, 0.3)' };
      case 'PUT':
      case 'PATCH':
        return { bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' };
      case 'DELETE':
        return { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: 'rgba(239, 68, 68, 0.3)' };
      default:
        return { bg: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af', border: 'rgba(156, 163, 175, 0.3)' };
    }
  };

  const getStatusBadgeStyle = (code: number) => {
    if (code >= 200 && code < 300) {
      return { bg: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: 'rgba(34, 197, 94, 0.35)' };
    }
    if (code >= 300 && code < 400) {
      return { bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: 'rgba(56, 189, 248, 0.35)' };
    }
    if (code >= 400 && code < 500) {
      return { bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.35)' };
    }
    return { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: 'rgba(239, 68, 68, 0.35)' };
  };

  const formatTimestamp = (ts: string) => {
    try {
      const date = new Date(ts);
      return date.toISOString().replace('T', ' ').replace('Z', ' UTC');
    } catch {
      return ts;
    }
  };

  return (
    <div
      style={{
        backgroundColor: 'rgba(26, 32, 39, 0.85)',
        border: '1px solid var(--color-glass-border, rgba(212, 175, 55, 0.35))',
        borderRadius: '12px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header Controls Bar */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Radio size={18} color="var(--color-gold-bright, #e5c158)" />
          <h3
            style={{
              fontFamily: 'var(--font-serif-display, serif)',
              fontSize: '15px',
              fontWeight: 600,
              color: '#ffffff',
              letterSpacing: '0.08em',
              margin: 0,
              textTransform: 'uppercase',
            }}
          >
            Live Access Logs
          </h3>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '10px',
              backgroundColor: 'rgba(229, 193, 88, 0.12)',
              border: '1px solid rgba(229, 193, 88, 0.25)',
              color: 'var(--color-gold-bright, #e5c158)',
              fontWeight: 600,
            }}
          >
            {filteredLogs.length} / {logs.length} entries
          </span>
          {isLoading && (
            <span style={{ fontSize: '10.5px', color: 'rgba(255, 255, 255, 0.45)' }}>
              (syncing...)
            </span>
          )}
        </div>

        {/* Action Buttons: Clear Buffer & Export CSV */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onClear && (
            <>
              {showClearConfirm ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: '#f87171' }}>Clear 1,000 log buffer?</span>
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={isClearing}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: isClearing ? 'wait' : 'pointer',
                    }}
                  >
                    {isClearing ? 'Clearing...' : 'Confirm'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      backgroundColor: 'transparent',
                      color: 'rgba(255, 255, 255, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  disabled={logs.length === 0}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 500,
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    borderRadius: '6px',
                    cursor: logs.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: logs.length === 0 ? 0.5 : 1,
                  }}
                  title="Clear in-memory ring buffer"
                >
                  <Trash2 size={13} />
                  <span>Clear Buffer</span>
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredLogs.length === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 500,
              backgroundColor: 'rgba(229, 193, 88, 0.1)',
              border: '1px solid rgba(229, 193, 88, 0.3)',
              color: 'var(--color-gold-bright, #e5c158)',
              borderRadius: '6px',
              cursor: filteredLogs.length === 0 ? 'not-allowed' : 'pointer',
              opacity: filteredLogs.length === 0 ? 0.5 : 1,
            }}
            title="Export filtered logs to CSV"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          backgroundColor: 'rgba(18, 23, 28, 0.4)',
        }}
      >
        {/* Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)', marginRight: '4px' }}>
            <Filter size={12} style={{ display: 'inline', marginRight: '4px' }} />
            Filter:
          </span>

          {[
            { id: 'all', label: 'All Logs' },
            { id: 'errors', label: 'Errors Only (4xx/5xx)' },
            { id: '2xx', label: '2xx Success' },
            { id: '4xx', label: '4xx Client' },
            { id: '5xx', label: '5xx Server' },
            { id: 'api', label: 'API Only (/api/*)' },
          ].map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleFilterChange(tab.id)}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  borderRadius: '6px',
                  fontWeight: isActive ? 600 : 400,
                  backgroundColor: isActive ? 'rgba(229, 193, 88, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                  border: isActive
                    ? '1px solid var(--color-gold-bright, #e5c158)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  color: isActive ? 'var(--color-gold-bright, #e5c158)' : 'rgba(255, 255, 255, 0.7)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Live Search Input */}
        <div
          style={{
            position: 'relative',
            minWidth: '240px',
            flex: '1',
            maxWidth: '360px',
          }}
        >
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(255, 255, 255, 0.4)',
            }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search IP, path, method, user agent..."
            aria-label="Filter logs"
            style={{
              width: '100%',
              backgroundColor: 'rgba(36, 44, 52, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '6px',
              padding: '6px 28px 6px 30px',
              color: '#ffffff',
              fontSize: '11px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.4)',
                cursor: 'pointer',
                padding: '2px',
              }}
              title="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Log Entries Table / List */}
      <div
        style={{
          maxHeight: '480px',
          overflowY: 'auto',
          overflowX: 'auto',
        }}
      >
        {filteredLogs.length === 0 ? (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <FileText size={32} style={{ opacity: 0.5 }} />
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.6)' }}>
              No access logs match the selected filter
            </div>
            <div style={{ fontSize: '11px', maxWidth: '340px', lineHeight: '1.4' }}>
              {logs.length === 0
                ? 'The telemetry buffer is currently empty. Make HTTP requests to populate.'
                : 'Try adjusting your search term or selecting "All Logs" above.'}
            </div>
          </div>
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '11px',
              textAlign: 'left',
              fontFamily: 'var(--font-sans-body, sans-serif)',
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: 'rgba(18, 23, 28, 0.7)',
                  color: 'rgba(255, 255, 255, 0.5)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontSize: '10px',
                }}
              >
                <th style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>Timestamp</th>
                <th style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>Client IP</th>
                <th style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>Method</th>
                <th style={{ padding: '10px 14px' }}>Path</th>
                <th style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>Status</th>
                <th style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>Latency</th>
                <th style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>Size</th>
                <th style={{ padding: '10px 14px' }}>User Agent</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, idx) => {
                const methodStyle = getMethodBadgeStyle(log.method);
                const statusStyle = getStatusBadgeStyle(log.statusCode);
                const isSlow = log.durationMs >= 100;
                const isMedium = log.durationMs >= 50 && log.durationMs < 100;

                return (
                  <tr
                    key={log.id || `${log.timestamp}-${idx}`}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    {/* Timestamp */}
                    <td
                      style={{
                        padding: '8px 14px',
                        whiteSpace: 'nowrap',
                        color: 'rgba(255, 255, 255, 0.55)',
                        fontFamily: 'monospace',
                        fontSize: '10.5px',
                      }}
                    >
                      {formatTimestamp(log.timestamp)}
                    </td>

                    {/* Client IP */}
                    <td
                      style={{
                        padding: '8px 14px',
                        whiteSpace: 'nowrap',
                        fontFamily: 'monospace',
                        color: '#93c5fd',
                        fontSize: '11px',
                      }}
                    >
                      {log.clientIp}
                    </td>

                    {/* Method */}
                    <td style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 700,
                          backgroundColor: methodStyle.bg,
                          color: methodStyle.color,
                          border: `1px solid ${methodStyle.border}`,
                          fontFamily: 'monospace',
                        }}
                      >
                        {log.method}
                      </span>
                    </td>

                    {/* Endpoint Path */}
                    <td
                      style={{
                        padding: '8px 14px',
                        fontFamily: 'monospace',
                        color: '#f3f4f6',
                        fontWeight: 500,
                        maxWidth: '280px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={log.path}
                    >
                      {log.path}
                    </td>

                    {/* Status Code */}
                    <td style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          backgroundColor: statusStyle.bg,
                          color: statusStyle.color,
                          border: `1px solid ${statusStyle.border}`,
                        }}
                      >
                        {log.statusCode >= 400 && log.statusCode < 500 && (
                          <AlertTriangle size={11} />
                        )}
                        {log.statusCode >= 500 && <XCircle size={11} />}
                        {log.statusCode >= 200 && log.statusCode < 300 && (
                          <CheckCircle2 size={11} />
                        )}
                        {log.statusCode}
                      </span>
                    </td>

                    {/* Latency */}
                    <td style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10.5px',
                          fontWeight: isSlow ? 700 : 500,
                          backgroundColor: isSlow
                            ? 'rgba(239, 68, 68, 0.15)'
                            : isMedium
                            ? 'rgba(245, 158, 11, 0.15)'
                            : 'rgba(255, 255, 255, 0.05)',
                          color: isSlow ? '#f87171' : isMedium ? '#fbbf24' : '#d1d5db',
                          border: isSlow
                            ? '1px solid rgba(239, 68, 68, 0.3)'
                            : isMedium
                            ? '1px solid rgba(245, 158, 11, 0.3)'
                            : '1px solid rgba(255, 255, 255, 0.08)',
                          fontFamily: 'monospace',
                        }}
                        title={isSlow ? 'Slow Request (>100ms)' : undefined}
                      >
                        {log.durationMs.toFixed(1)} ms
                      </span>
                    </td>

                    {/* Bytes Written */}
                    <td
                      style={{
                        padding: '8px 14px',
                        whiteSpace: 'nowrap',
                        color: 'rgba(255, 255, 255, 0.55)',
                        fontFamily: 'monospace',
                      }}
                    >
                      {formatBytes(log.bytesWritten, 0)}
                    </td>

                    {/* User Agent */}
                    <td
                      style={{
                        padding: '8px 14px',
                        maxWidth: '220px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: 'rgba(255, 255, 255, 0.45)',
                        fontSize: '10px',
                      }}
                      title={log.userAgent}
                    >
                      {log.userAgent || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
