import React, { useState } from 'react';
import { Terminal, Trash2, CheckCircle2, AlertTriangle, AlertCircle, Info, RefreshCw } from 'lucide-react';
import type { ActivityLog } from '../types';

interface ActivityLogsProps {
  logs: ActivityLog[];
  onClearLogs: () => void;
  onRefreshLogs: () => void;
}

export const ActivityLogs: React.FC<ActivityLogsProps> = ({
  logs,
  onClearLogs,
  onRefreshLogs
}) => {
  const [levelFilter, setLevelFilter] = useState('ALL');

  const filteredLogs = levelFilter === 'ALL'
    ? logs
    : logs.filter(l => l.level === levelFilter.toLowerCase());

  const getLogIcon = (level: ActivityLog['level']) => {
    switch (level) {
      case 'success':
        return <CheckCircle2 size={14} color="#10b981" />;
      case 'warn':
        return <AlertTriangle size={14} color="#f59e0b" />;
      case 'error':
        return <AlertCircle size={14} color="#ef4444" />;
      case 'info':
      default:
        return <Info size={14} color="#6366f1" />;
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <Terminal className="card-title-icon" size={20} />
          System Activity & Error Logs ({logs.length})
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            className="form-select"
            style={{ width: 'auto', padding: '4px 10px', fontSize: '0.78rem' }}
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
          >
            <option value="ALL">All Levels</option>
            <option value="SUCCESS">Success</option>
            <option value="INFO">Info</option>
            <option value="WARN">Warnings</option>
            <option value="ERROR">Errors</option>
          </select>
          <button
            className="btn btn-secondary btn-icon"
            onClick={onRefreshLogs}
            title="Refresh logs"
          >
            <RefreshCw size={13} />
          </button>
          <button
            className="btn btn-secondary btn-icon"
            onClick={onClearLogs}
            title="Clear all logs"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div style={{
        background: 'rgba(0, 0, 0, 0.4)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '12px',
        maxHeight: '320px',
        overflowY: 'auto',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.78rem'
      }}>
        {filteredLogs.length === 0 ? (
          <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '24px 0' }}>
            No log entries recorded yet
          </div>
        ) : (
          filteredLogs.map(log => {
            const time = new Date(log.timestamp).toLocaleTimeString();
            return (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '6px 0',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.03)'
                }}
              >
                <span style={{ color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{time}</span>
                <span style={{ flexShrink: 0, marginTop: '2px' }}>{getLogIcon(log.level)}</span>
                <div style={{ flex: 1, wordBreak: 'break-word' }}>
                  <span style={{
                    color: log.level === 'error' ? '#f87171' : (log.level === 'success' ? '#34d399' : (log.level === 'warn' ? '#fbbf24' : '#e2e8f0'))
                  }}>
                    {log.message}
                  </span>
                  {log.details && (
                    <div style={{
                      marginTop: '4px',
                      color: 'var(--text-muted)',
                      fontSize: '0.72rem',
                      background: 'rgba(255, 255, 255, 0.02)',
                      padding: '4px 8px',
                      borderRadius: '4px'
                    }}>
                      {log.details}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
