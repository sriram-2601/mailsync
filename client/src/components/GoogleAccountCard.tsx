import React, { useState } from 'react';
import { User, LogOut, Unlink, Calendar, AlertCircle, Shield } from 'lucide-react';
import type { AuthStatus, GoogleCalendar, AutomationSettings } from '../types';

interface GoogleAccountCardProps {
  authStatus: AuthStatus | null;
  calendars: GoogleCalendar[];
  settings: AutomationSettings | null;
  onConnectGoogle: () => void;
  onDisconnectGoogle: () => void;
  onLogout: () => void;
  onUpdateDefaultCalendar: (calendarId: string) => void;
  onOpenSetupGuide: () => void;
}

export const GoogleAccountCard: React.FC<GoogleAccountCardProps> = ({
  authStatus,
  calendars,
  settings,
  onConnectGoogle,
  onDisconnectGoogle,
  onLogout,
  onUpdateDefaultCalendar,
  onOpenSetupGuide
}) => {
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    if (window.confirm('Are you sure you want to disconnect this Google Account? This will revoke access tokens.')) {
      setIsDisconnecting(true);
      try {
        await onDisconnectGoogle();
      } finally {
        setIsDisconnecting(false);
      }
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <User className="card-title-icon" size={20} />
          Google Account & Calendar
        </div>
        {authStatus?.isConnected ? (
          <span className="badge badge-connected">
            <span className="badge-dot" />
            Connected
          </span>
        ) : (
          <span className="badge badge-error">
            <span className="badge-dot" />
            Disconnected
          </span>
        )}
      </div>

      {!authStatus?.isGoogleConfigured ? (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontWeight: 600, marginBottom: '6px' }}>
            <AlertCircle size={18} />
            Google OAuth Credentials Missing
          </div>
          <p style={{ fontSize: '0.84rem', color: '#cbd5e1', marginBottom: '12px' }}>
            Set <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> in your <code>.env</code> file to enable Google authentication.
          </p>
          <button className="btn btn-secondary btn-sm" onClick={onOpenSetupGuide}>
            View Setup Instructions
          </button>
        </div>
      ) : null}

      {authStatus?.isConnected && authStatus.user ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
            {authStatus.user.picture ? (
              <img
                src={authStatus.user.picture}
                alt={authStatus.user.name}
                style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid var(--primary)' }}
              />
            ) : (
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'var(--primary-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                color: '#fff'
              }}>
                {authStatus.user.name ? authStatus.user.name.charAt(0) : 'U'}
              </div>
            )}
            <div>
              <div style={{ fontWeight: 600, fontSize: '1rem', color: '#ffffff' }}>
                {authStatus.user.name || 'Google User'}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {authStatus.user.email}
              </div>
            </div>
          </div>

          {/* Default Calendar Selector */}
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} /> Default Target Calendar
            </label>
            <select
              className="form-select"
              value={settings?.defaultCalendarId || 'primary'}
              onChange={(e) => onUpdateDefaultCalendar(e.target.value)}
            >
              <option value="primary">Primary Calendar (Default)</option>
              {calendars
                .filter(cal => cal.id !== 'primary')
                .map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.summary} {cal.primary ? '(Primary)' : ''}
                  </option>
                ))}
            </select>
            <div className="form-hint">
              Target Google Calendar where new events will be automatically scheduled.
            </div>
          </div>

          {/* Security & Scopes badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            marginBottom: '18px'
          }}>
            <Shield size={16} color="#10b981" />
            <span>Scoped permissions: Gmail read-only + Google Calendar events creation. Tokens securely stored in local SQLite.</span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={onLogout}
              title="Sign out of local session"
            >
              <LogOut size={15} />
              Logout
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              title="Revoke Google access tokens and delete connection"
            >
              <Unlink size={15} />
              {isDisconnecting ? 'Disconnecting...' : 'Disconnect Account'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '16px 8px' }}>
          {authStatus?.user?.email && (
            <div style={{
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              marginBottom: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.85rem',
              color: '#cbd5e1'
            }}>
              <span>Configured Inbox:</span>
              <strong style={{ color: '#fff' }}>{authStatus.user.email}</strong>
            </div>
          )}
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '18px' }}>
            Sign in with your Google account to grant permission to read relevant scheduling emails and auto-create Google Calendar events.
          </p>
          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}
            onClick={onConnectGoogle}
            disabled={!authStatus?.isGoogleConfigured}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Sign in with Google
          </button>
        </div>
      )}
    </div>
  );
};
