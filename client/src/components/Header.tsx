import React from 'react';
import { CalendarSync, Sparkles, HelpCircle, RefreshCw } from 'lucide-react';
import type { AuthStatus } from '../types';

interface HeaderProps {
  authStatus: AuthStatus | null;
  isSyncing: boolean;
  onRefreshAll: () => void;
  onOpenTestParser: () => void;
  onOpenSetupGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  authStatus,
  isSyncing,
  onRefreshAll,
  onOpenTestParser,
  onOpenSetupGuide
}) => {
  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-icon-wrapper">
          <CalendarSync size={24} />
        </div>
        <div>
          <h1 className="brand-title">MailCal Sync</h1>
          <p className="brand-subtitle">Automated Gmail to Google Calendar Scheduler</p>
        </div>
      </div>

      <div className="header-actions">
        <button
          className="btn btn-secondary btn-sm"
          onClick={onOpenTestParser}
          title="Test AI meeting extraction on any email text"
        >
          <Sparkles size={16} color="#8b5cf6" />
          Test Parser
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={onOpenSetupGuide}
          title="View Google OAuth setup guide"
        >
          <HelpCircle size={16} />
          Setup Guide
        </button>

        <button
          className="btn btn-secondary btn-icon"
          onClick={onRefreshAll}
          disabled={isSyncing}
          title="Refresh dashboard data"
        >
          <RefreshCw size={16} className={isSyncing ? 'spinner' : ''} />
        </button>

        {authStatus?.isConnected ? (
          <span className="badge badge-connected">
            <span className="badge-dot" />
            Connected
          </span>
        ) : (
          <span className="badge badge-error">
            <span className="badge-dot" />
            Not Connected
          </span>
        )}
      </div>
    </header>
  );
};
