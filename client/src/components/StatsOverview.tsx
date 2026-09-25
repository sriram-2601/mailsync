import React from 'react';
import { Mail, CalendarCheck, AlertCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { SyncStats } from '../types';

interface StatsOverviewProps {
  stats: SyncStats;
  onFilterTab?: (tab: string) => void;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats, onFilterTab }) => {
  return (
    <div className="stats-grid">
      <div 
        className="stat-card"
        style={{ cursor: onFilterTab ? 'pointer' : 'default' }}
        onClick={() => onFilterTab && onFilterTab('ALL')}
      >
        <div className="stat-card-top">
          <span className="stat-card-label">Emails Scanned</span>
          <div className="stat-card-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
            <Mail size={18} />
          </div>
        </div>
        <div className="stat-card-value">{stats.totalProcessed}</div>
        <div className="stat-card-subtitle">
          <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ShieldCheck size={12} /> Idempotency protected
          </span>
        </div>
      </div>

      <div 
        className="stat-card"
        style={{ cursor: onFilterTab ? 'pointer' : 'default' }}
        onClick={() => onFilterTab && onFilterTab('EVENT_CREATED')}
      >
        <div className="stat-card-top">
          <span className="stat-card-label">Events Created</span>
          <div className="stat-card-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <CalendarCheck size={18} />
          </div>
        </div>
        <div className="stat-card-value" style={{ color: '#34d399' }}>
          {stats.eventsCreated}
        </div>
        <div className="stat-card-subtitle">Synced to Google Calendar</div>
      </div>

      <div 
        className="stat-card"
        style={{ cursor: onFilterTab ? 'pointer' : 'default', border: stats.needsReview > 0 ? '1px solid rgba(245, 158, 11, 0.4)' : undefined }}
        onClick={() => onFilterTab && onFilterTab('NEEDS_REVIEW')}
      >
        <div className="stat-card-top">
          <span className="stat-card-label">Needs Review</span>
          <div className="stat-card-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            <AlertTriangle size={18} />
          </div>
        </div>
        <div className="stat-card-value" style={{ color: stats.needsReview > 0 ? '#fbbf24' : '#ffffff' }}>
          {stats.needsReview}
        </div>
        <div className="stat-card-subtitle">Ambiguous or missing details</div>
      </div>

      <div 
        className="stat-card"
        style={{ cursor: onFilterTab ? 'pointer' : 'default' }}
        onClick={() => onFilterTab && onFilterTab('ERROR')}
      >
        <div className="stat-card-top">
          <span className="stat-card-label">Errors</span>
          <div className="stat-card-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
            <AlertCircle size={18} />
          </div>
        </div>
        <div className="stat-card-value" style={{ color: stats.errors > 0 ? '#f87171' : '#ffffff' }}>
          {stats.errors}
        </div>
        <div className="stat-card-subtitle">API or parsing issues</div>
      </div>
    </div>
  );
};
