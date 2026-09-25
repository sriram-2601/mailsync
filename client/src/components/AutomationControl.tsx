import React from 'react';
import { Play, Pause, RefreshCw, Zap, Clock, CheckCircle2 } from 'lucide-react';
import type { AutomationSettings } from '../types';

interface AutomationControlProps {
  settings: AutomationSettings | null;
  isChecking: boolean;
  onToggleAutomation: (active: boolean) => void;
  onCheckGmailNow: () => void;
}

export const AutomationControl: React.FC<AutomationControlProps> = ({
  settings,
  isChecking,
  onToggleAutomation,
  onCheckGmailNow
}) => {
  const isAutomationActive = Boolean(settings?.isAutomationActive);

  const formatLastSync = (isoStr?: string | null) => {
    if (!isoStr) return 'Never checked yet';
    try {
      const date = new Date(isoStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + 
        ' (' + date.toLocaleDateString() + ')';
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <Zap className="card-title-icon" size={20} />
          Automation Engine
        </div>
        {isAutomationActive ? (
          <span className="badge badge-monitoring">
            <span className="badge-dot" />
            Monitoring
          </span>
        ) : (
          <span className="badge badge-ignored">
            <span className="badge-dot" />
            Paused
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Toggle Automation ON / OFF */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)'
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isAutomationActive ? <Play size={16} color="#10b981" /> : <Pause size={16} color="#94a3b8" />}
              Background Auto-Sync
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {isAutomationActive 
                ? `Automatically polling Gmail inbox every ${settings?.pollIntervalSeconds || 120}s`
                : 'Background sync is paused. Only manual checks will run.'}
            </div>
          </div>

          <label className="switch">
            <input
              type="checkbox"
              checked={isAutomationActive}
              onChange={(e) => onToggleAutomation(e.target.checked)}
            />
            <span className="slider" />
          </label>
        </div>

        {/* Check Gmail Now Button */}
        <div>
          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px 20px', fontSize: '0.95rem' }}
            onClick={onCheckGmailNow}
            disabled={isChecking}
          >
            <RefreshCw size={18} className={isChecking ? 'spinner' : ''} />
            {isChecking ? 'Scanning Gmail & Extracting Events...' : 'Check Gmail Now'}
          </button>
        </div>

        {/* Sync Status / Info */}
        <div style={{
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} color="var(--primary)" />
            <span>Last checked: <strong>{formatLastSync(settings?.lastSyncAt)}</strong></span>
          </div>
          {settings?.lastSyncMessage && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1' }}>
              <CheckCircle2 size={14} color="#10b981" />
              <span>Result: {settings.lastSyncMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
